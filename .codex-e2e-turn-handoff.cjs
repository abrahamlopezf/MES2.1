const base='http://127.0.0.1:4001/api';
async function login(id){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:id,password:'Admin123!'})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${id}: ${r.status}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){const receiver=await login('supervisor_extrusion'),outgoing=await login('supervisor_extrusion_e2e');async function call(h,m,p,b){const r=await fetch(`${base}${p}`,{method:m,headers:h,...(b?{body:JSON.stringify(b)}:{})});const j=await r.json().catch(()=>({}));console.log(`${m} ${p}: ${r.status} ${JSON.stringify(j).slice(0,750)}`);if(!r.ok)throw Error(j.message||j.error||String(r.status));return j.data;}
const w=await call(outgoing,'GET','/extrusion/wip/inventory');const wanted=new Set([1222,1146,1223]);console.log('AVAILABLE_QRS',JSON.stringify(w.items.filter(x=>wanted.has(Number(x.material_id))).map(x=>({material_id:x.material_id,amount:x.amount_kg,qr:x.qr_code}))));
const inputs=[
 {material_id:1222,quantity:4.2,qr_code:'QR-LOT-CARB-1792473242013-87587-SN14'},
 {material_id:1146,quantity:2.8,qr_code:'QR-LOT-MB-BCO-1792473243743-73422-SN6'},
 {material_id:1146,quantity:2,qr_code:'QR-LOT-MB-BCO-1792473308945-45691-SN1'},
 {material_id:1146,quantity:1.2,qr_code:'QR-LOT-MB-BCO-1792473308945-45691-SN2'},
 {material_id:1223,quantity:4.2,qr_code:'QR-LOT-UV-1792473245469-40277-SN5'}
];
const prep=await call(outgoing,'POST','/extrusion/mix',{formula_id:17,output_color:'Blanco',container_count:2,extruder_id:5,destination_qr_code:'E2E-EXT-HANDOFF-20261109',notes:'E2E local: prueba de continuidad entre Turno 2 y siguiente turno.',inputs});const qrs=(prep.containers||[]).map(x=>x.qr_code);console.log('PREP_QRS',JSON.stringify(qrs));if(qrs.length!==2)throw Error('No dividió la preparación en dos contenedores QR.');
const all=await call(outgoing,'GET','/extrusion/queue');const ext=all.find(x=>x.machine.id===5);const first=ext.waiting.find(x=>qrs.includes(x.consumption_order_qr_id));if(!first)throw Error('No está la preparación nueva en cola.');
await call(outgoing,'POST','/extrusion/queue/switch',{extruder_id:5,target_queue_id:first.id,prioritize_formula_id:17,scanned_qr:first.consumption_order_qr_id,shift_code:'TURNO_2'});
const ready=await call(outgoing,'POST',`/extrusion/shifts/session/${6}/close`,{});if(!ready.handoff_ready)throw Error('Turno 2 no quedó listo para relevo.');
const incomingSuggestion=await call(receiver,'POST','/extrusion/shifts/session/entry',{});const shift=incomingSuggestion.suggested_shift;if(!shift)throw Error('No hay sugerencia para turno entrante.');
const received=await call(receiver,'POST','/extrusion/shifts/session/open',{shift_date:shift.shift_date,shift_code:shift.shift_code,confirm_carryover:true,confirm_active_mixture:true,confirmed_mixture_qrs:qrs});
const queues=await call(receiver,'GET','/extrusion/queue');const newExt=queues.find(x=>x.machine.id===5);const activity=await call(receiver,'GET',`/extrusion/shifts/activity?shift_date=${encodeURIComponent(shift.shift_date)}&shift_code=${encodeURIComponent(shift.shift_code)}`);
console.log('HANDOFF_ASSERTIONS',JSON.stringify({from_session:ready.id,to_session:received.id,to_date:received.shift_date,to_code:received.shift_code,confirmed_qrs:qrs,active:newExt.active?.consumption_order_qr_id,waiting:newExt.waiting.map(x=>x.consumption_order_qr_id),incoming_handoffs:received.mixture_handoffs_in?.length||null}));
}
main().catch(e=>{console.error('E2E-HANDOFF-FAIL',e.message);process.exitCode=1;});
