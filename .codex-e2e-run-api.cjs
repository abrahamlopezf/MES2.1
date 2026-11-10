const base = 'http://127.0.0.1:4001/api';
async function main() {
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'supervisor_extrusion', password: 'Admin123!' }) });
  const auth = await login.json();
  const token = auth.data?.token;
  if (!login.ok || !token) throw new Error(`login ${login.status}: ${auth.message || 'no token'}`);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  async function call(method, path, body) {
    const response = await fetch(`${base}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    console.log(`${method} ${path}: ${response.status} ${JSON.stringify(result).slice(0, 1200)}`);
    return { response, result };
  }
  const queues = await call('GET', '/extrusion/queue');
  const data = queues.result.data;
  console.log('QUEUE-SHAPE', JSON.stringify(data).slice(0, 1500));
  const created = await call('POST', '/extrusion/racks', { rack_code: 'E2E-EXT-RACK-20261109-A', max_capacity: 20, location_name: 'PRUEBA E2E Extrusión' });
  const rack = created.result.data;
  if (!created.response.ok || !rack?.qr_code) throw new Error('No se pudo crear rack de prueba.');
  const switched = await call('POST', '/extrusion/queue/switch', { extruder_id: 5, target_queue_id: 174, prioritize_formula_id: 17, scanned_qr: 'E2E-EXT-20261109-WHITE-C1', shift_code: 'TURNO_1' });
  if (!switched.response.ok) throw new Error(`No se pudo activar cola ${switched.response.status}`);
  const invalidRack = await call('POST', '/extrusion/rack/scan', { rack_qr: 'E2E-EXT-RACK-INCORRECTO', pti_material_id: 23, quantity: 1, weight_kg: 5, mixture_qr: 'E2E-EXT-20261109-WHITE-C1' });
  const valid = await call('POST', '/extrusion/rack/scan', { rack_qr: rack.qr_code, pti_material_id: 23, quantity: 1, weight_kg: 5, mixture_qr: 'E2E-EXT-20261109-WHITE-C1', notes: 'Prueba E2E controlada 2026-11-09' });
  if (!valid.response.ok) throw new Error(`No se pudo registrar PTI ${valid.response.status}`);
  await call('GET', '/extrusion/queue');
  await call('GET', `/extrusion/mass-balance/${encodeURIComponent('E2E-EXT-20261109-WHITE-C1')}`);
  await call('GET', '/extrusion/scrap-logs?limit=50');
}
main().catch((error) => { console.error('E2E-API-FAIL', error.message); process.exitCode = 1; });
