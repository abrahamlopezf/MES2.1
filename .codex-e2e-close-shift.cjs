const base='http://127.0.0.1:4001/api';
async function main(){
 const auth=await(await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'supervisor_extrusion',password:'Admin123!'})})).json();const headers={authorization:`Bearer ${auth.data.token}`,'content-type':'application/json'};
 async function call(method,path,body){const r=await fetch(`${base}${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));console.log(`${method} ${path}: ${r.status} ${JSON.stringify(j).slice(0,900)}`);if(!r.ok)throw Error(`${path}: ${j.message||j.error||r.status}`);return j.data;}
 const scrap=await call('POST','/extrusion/scrap',{extruder_id:5,mixture_qr_id:'E2E-EXT-20261109-WHITE-C2',actual_weight_kg:15,reason:'Prueba controlada de cierre de merma por mezcla',category:'MERMA_COLOR',color:'Blanco',shift_code:'TURNO_1',notes:'Dato ficticio E2E: merma pesada 15kg para balancear 485kg útiles del lote de 500kg.'});
 const prod=await call('POST','/extrusion/rack/scan',{rack_qr:'QR-E2E-EXT-RACK-20261109-B',pti_material_id:23,quantity:47,weight_kg:235,mixture_qr:'E2E-EXT-20261109-WHITE-C2',notes:'Prueba E2E controlada: saldo último contenedor, PTI pesado en báscula.'});
 const balance=await call('GET','/extrusion/mass-balance/E2E-EXT-20261109-WHITE-C2');
 const closure=await call('POST','/extrusion/shifts/close',{extruder_id:5,shift_date:'2026-11-09',shift_code:'TURNO_1',shift_session_id:5,actual_scrap_weight_kg:15,notes:'Conciliación sintética de la corrida E2E aislada.'});
 const session=await call('POST','/extrusion/shifts/session/5/close',{});
 console.log('FINAL',{scrap_id:scrap.scrap_log?.id,pti_racks:prod.racks?.length,balance:{useful:balance.good_output_kg,scrap:balance.actual_scrap_kg,remaining:balance.remaining_mixture_kg,variance:balance.unexplained_variance_kg},closure_status:closure.status,session_status:session.status});
}
main().catch(e=>{console.error('E2E-CLOSE-FAIL',e.message);process.exitCode=1;});
