const base = 'http://127.0.0.1:4001/api';
async function main() {
  const login = await (await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'supervisor_extrusion', password: 'Admin123!' }) })).json();
  const headers = { authorization: `Bearer ${login.data.token}`, 'content-type': 'application/json' };
  async function post(path, body) { const r = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); console.log(`${path}: ${r.status} ${JSON.stringify(j).slice(0, 1000)}`); return { r, j }; }
  const rack = await post('/extrusion/racks', { rack_code: 'E2E-EXT-RACK-20261109-B', max_capacity: 100, location_name: 'PRUEBA E2E Extrusión' });
  if (!rack.r.ok) throw Error('No se creó el rack secundario.');
  const result = await post('/extrusion/rack/scan', { rack_qr: 'QR-E2E-EXT-RACK-20261109-A', pti_material_id: 23, quantity: 49, weight_kg: 245, mixture_qr: 'E2E-EXT-20261109-WHITE-C1', notes: 'Prueba E2E controlada: vaciado de contenedor 1 dividido' });
  if (!result.r.ok) throw Error('No pudo consumirse por completo el contenedor 1.');
  const qs = await fetch(`${base}/extrusion/queue`, { headers }); const qj = await qs.json();
  const ext5 = qj.data.find(x => x.machine.id === 5);
  console.log('EXT5_STATE', JSON.stringify({ active: ext5.active && { id: ext5.active.id, qr: ext5.active.consumption_order_qr_id, status: ext5.active.status }, waiting: ext5.waiting.map(x => ({ id: x.id, qr: x.consumption_order_qr_id, status: x.status })), completed: qj.data.flatMap(x => [x.active,...x.waiting]).filter(Boolean).length }));
}
main().catch(e => { console.error('E2E-BATCH-FAIL', e.message); process.exitCode = 1; });
