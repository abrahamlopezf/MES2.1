const base='http://127.0.0.1:4001/api';
async function login(identifier){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier,password:'Admin123!'})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${identifier}: ${r.status} ${j.message||j.error||''}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){
 const sup=await login('supervisor_extrusion');
 const post=async(h,p,b)=>{const r=await fetch(`${base}${p}`,{method:'POST',headers:h,body:JSON.stringify(b)});return [r,await r.json().catch(()=>({}))]};
 const [created,order]=await post(sup,'/warehouse/consumption-orders',{requesting_area_id:2,items:[{material_id:1222,quantity:4.2}],notes:'E2E Extrusión copia local: reposición de carbonato para probar ODC y QR hijo.'});
 console.log('CREATE',created.status,JSON.stringify({order_number:order.order_number,uuid:order.uuid,status:order.status})); if(!created.ok||!order.uuid)throw Error('ODC no pudo crearse.');
 const alm=await login('admin_alm');
 let r=await fetch(`${base}/warehouse/consumption-orders/${order.uuid}`,{headers:alm}); let details=await r.json(); console.log('DETAILS',r.status,JSON.stringify((details.items||[]).map(i=>({material:i.material?.internal_code,qty:i.requested_quantity,folio:i.lote?.folio,qr:i.lote?.qr_code?.qr_code}))));
 r=await fetch(`${base}/warehouse/consumption-orders/${order.uuid}/status`,{method:'PUT',headers:alm,body:JSON.stringify({status:'PREPARANDO'})});details=await r.json(); console.log('PREPARANDO',r.status,JSON.stringify({status:details.status,error:details.error}));if(!r.ok)throw Error('No entró a preparación.');
 r=await fetch(`${base}/warehouse/consumption-orders/${order.uuid}`,{headers:alm});details=await r.json();const row=(details.items||[]).find(i=>Number(i.material_id)===1222);const qr=row?.lote?.qr_code?.qr_code||row?.lote?.folio;if(!qr)throw Error(`ODC no proporcionó QR padre. ${JSON.stringify(details.items).slice(0,500)}`);
 [r,details]=await post(alm,`/warehouse/consumption-orders/${order.uuid}/scan-item`,{qr_code:qr});console.log('SURTIR',r.status,JSON.stringify({status:details.status,items:(details.items||[]).map(i=>({requested:i.requested_quantity,fulfilled:i.fulfilled_quantity,child:i.child_qr?.qr_code,child_status:i.child_qr?.status}))}));if(!r.ok||details.status!=='SURTIDA')throw Error('Surtido no quedó completo.');
 const [wipR,wip]=await (async()=>{const x=await fetch(`${base}/extrusion/wip/inventory`,{headers:sup});return [x,await x.json()]})();console.log('WIP',wipR.status,JSON.stringify((wip.data||[]).filter(x=>x.material_id===1222).map(x=>({amount:x.amount,qr:x.qr_code?.qr_code,area_id:x.area_id}))));
 console.log('ODC_UUID',order.uuid);
}
main().catch(e=>{console.error('E2E-ODC-FAIL',e.message);process.exitCode=1;});
