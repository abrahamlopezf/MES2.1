const API_BASE = 'http://localhost:4000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.response = { data, status: res.status };
    throw error;
  }
  return data;
}

async function run() {
  console.log('--- Probando Autenticación ---');
  const loginRes = await req('POST', '/auth/login', {
    identifier: 'nexus',
    password: 'Admin123!'
  });
  const token = loginRes.data?.token || loginRes.token;
  console.log('✔ Login exitoso.');

  // 1. GET /extrusion/floor-formulas
  const fRes = await req('GET', '/extrusion/floor-formulas', null, token);
  console.log(`✔ 1. GET floor-formulas: Fórmulas encontradas: ${fRes.data?.length}`);
  const f1 = fRes.data?.[0];
  console.log('   Fórmula 1:', {
    name: f1?.name,
    cost_index: f1?.cost_index,
    raw_cost: f1?.raw_materials_cost,
    transformed_val: f1?.transformed_mixture_value,
    suggested_pti_price: f1?.suggested_pti_unit_price,
    ptis: f1?.ptiProducts?.map(p => p.code)
  });

  // 2. PUT /extrusion/floor-formulas/1
  const updateRes = await req('PUT', '/extrusion/floor-formulas/1', { cost_index: 1.2500 }, token);
  console.log('✔ 2. PUT floor-formulas/1 exitoso:', {
    cost_index: updateRes.data?.cost_index,
    transformed_val: updateRes.data?.transformed_mixture_value,
    suggested_pti_price: updateRes.data?.suggested_pti_unit_price
  });

  // 3. GET /extrusion/pti-products
  const ptiListRes = await req('GET', '/extrusion/pti-products', null, token);
  console.log(`✔ 3. GET pti-products: PTIs en catálogo: ${ptiListRes.data?.length}`);
  console.log('   PTIs existentes:', ptiListRes.data?.map(p => `${p.code} (${p.name}) - Formula: ${p.formula?.name}`));

  // 4. POST /extrusion/pti-products
  const createRes = await req('POST', '/extrusion/pti-products', {
    code: 'PTI-TEST-AUTO-01',
    name: 'Carrete Test Automatizado 1200D',
    specifications: 'Tenacidad 6.0, Calibre 2.8mm, Bobina Industrial Amarilla',
    unit_weight_kg: 6.850,
    unit_price: 215.50,
    formula_id: 1,
    is_active: true
  }, token);
  console.log(`✔ 4. POST pti-products: Creado ID: ${createRes.data?.id}, Código: ${createRes.data?.code}`);
  const createdId = createRes.data?.id;

  // 5. PUT /extrusion/pti-products/:id
  const putRes = await req('PUT', `/extrusion/pti-products/${createdId}`, {
    unit_price: 225.00,
    specifications: 'Actualizado: Tenacidad 6.5, Resistencia alta'
  }, token);
  console.log(`✔ 5. PUT pti-products: Actualizado! Nuevo Precio: $${putRes.data?.unit_price}`);

  // 6. DELETE /extrusion/pti-products/:id
  const delRes = await req('DELETE', `/extrusion/pti-products/${createdId}`, null, token);
  console.log(`✔ 6. DELETE pti-products: Mensaje: ${delRes.message}`);

  // Reset Formula 1 cost_index back to 1.1500
  await req('PUT', '/extrusion/floor-formulas/1', { cost_index: 1.1500 }, token);
  console.log('✔ Fórmula 1 restablecida a cost_index 1.1500.');
  console.log('\n======================================================');
  console.log(' TODOS LOS ENDPOINTS DE FÓRMULAS Y PTI FUNCIONAN AL 100%');
  console.log('======================================================');
}

run().catch(console.error);
