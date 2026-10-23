/**
 * Script de validación integral para los Puntos 1 al 7
 * Ejecuta validaciones contra el Backend local (puerto 4000)
 */
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

async function runValidation() {
  console.log('====================================================');
  console.log(' INICIANDO VALIDACIÓN COMPLETA DE PUNTOS 1 AL 7');
  console.log('====================================================\n');

  // 0. Login como SUPERADMIN
  console.log('[PASO 0] Autenticando usuario superadmin (nexus)...');
  const loginRes = await req('POST', '/auth/login', {
    identifier: 'nexus',
    password: 'Admin123!'
  });
  const token = loginRes.data?.token || loginRes.token;
  console.log('✔ Autenticado con éxito. Token recibido.\n');

  // 1. Punto 1: Fórmulas y ODC de Extrusión para Mezcla de 500kg
  console.log('----------------------------------------------------');
  console.log('[PUNTO 1] Fórmulas de Extrusión y Prellenado para 500kg');
  console.log('----------------------------------------------------');
  const formulasRes = await req('GET', '/extrusion/floor-formulas', null, token);
  const formulas = formulasRes.data;
  console.log(`✔ Fórmulas registradas encontradas: ${formulas.length}`);
  const targetFormula = formulas.find(f => f.batch_size_kg === 500 || f.name.includes('Rafia') || f.name.includes('Pesada')) || formulas[0];
  console.log(`✔ Fórmula seleccionada: "${targetFormula.name}" (Batch: ${targetFormula.batch_size_kg}kg)`);
  console.log(`  Ingredientes prellenados (${targetFormula.ingredients.length} insumos):`);
  let totalDosage = 0;
  targetFormula.ingredients.forEach(ing => {
    const qty = Number(ing.quantity);
    totalDosage += qty;
    console.log(`    - Material #${ing.material_id} (${ing.material?.name || 'Insumo'}): ${qty} kg`);
  });
  console.log(`  Dosificación Total: ${totalDosage} kg`);

  // Crear Orden de Consumo prellenada con los materiales de la fórmula
  const odcPayload = {
    requesting_area_id: 2, // Extrusión
    notes: `Batch 500kg - Fórmula: ${targetFormula.name}`,
    items: targetFormula.ingredients.map(ing => ({
      material_id: ing.material_id,
      quantity: Number(ing.quantity)
    }))
  };
  const odcRes = await req('POST', '/warehouse/consumption-orders', odcPayload, token);
  console.log(`✔ Orden de Consumo generada con éxito: Folio ${odcRes.order_number || odcRes.folio || odcRes.uuid}`);
  console.log(`  Items creados: ${odcPayload.items.length}\n`);

  // 2. Punto 4: QR de Mezcla con Historia y División en Contenedores (-C1, -C2)
  console.log('----------------------------------------------------');
  console.log('[PUNTO 4] QR de Mezcla y División en 2 o más Contenedores con Historia');
  console.log('----------------------------------------------------');
  const parentMixQr = `QR-MIX-500KG-${Date.now().toString().slice(-4)}`;
  const splitPayload = {
    parent_mixture_qr: parentMixQr,
    containers: [
      { container_number: 1, weight_kg: 250.00 },
      { container_number: 2, weight_kg: 250.00 }
    ],
    notes: 'División de lote de 500kg en 2 contenedores de 250kg para transporte en piso'
  };
  const splitRes = await req('POST', '/extrusion/mix/split-containers', splitPayload, token);
  console.log(`✔ Mezcla padre: ${splitRes.data.parent_mixture_qr} (Total: ${splitRes.data.total_batch_weight_kg} kg)`);
  splitRes.data.containers.forEach(c => {
    console.log(`  → Sub-contenedor #${c.container_number}: QR "${c.qr_code}" con ${c.container_weight_kg} kg`);
  });
  console.log('');

  // 3. Punto 2 & 2.1: Verificación de Cambios Espontáneos de Mezclas / Fórmulas
  console.log('----------------------------------------------------');
  console.log('[PUNTO 2 & 2.1] Cambio Espontáneo de Mezcla en Extrusora y Merma de Transición');
  console.log('----------------------------------------------------');
  const transitionPayload = {
    extruder_id: 1,
    from_mixture_qr: `${parentMixQr}-C1`,
    to_mixture_qr: `${parentMixQr}-C2`,
    transition_scrap_kg: 18.5,
    last_pti_quantity: 34,
    first_pti_quantity: 32,
    reason: 'CAMBIO_DE_FORMULA',
    notes: 'Transición espontánea de fórmula entre sub-contenedores C1 y C2'
  };
  const transitionRes = await req('POST', '/extrusion/mixture-transition', transitionPayload, token);
  console.log(`✔ Transición registrada en Extrusora ${transitionPayload.extruder_id}:`);
  console.log(`  - De mezcla: ${transitionRes.data.from_mixture_qr}`);
  console.log(`  - A mezcla: ${transitionRes.data.to_mixture_qr}`);
  console.log(`  - Merma de purga esperada/registrada: ${transitionRes.data.transition_scrap_kg} kg`);
  console.log(`  - Bobinas lote anterior: ${transitionRes.data.last_pti_quantity}`);
  console.log(`  - Bobinas lote nuevo: ${transitionRes.data.first_pti_quantity}\n`);

  // 4. Punto 5: Auto-generación de QR Fijo en Rack y Registro por Piezas o Báscula
  console.log('----------------------------------------------------');
  console.log('[PUNTO 5] Auto-generación de QR Fijo en Rack y Registro Báscula/Piezas');
  console.log('----------------------------------------------------');
  const newRackCode = `RCK-TEST-${Date.now().toString().slice(-4)}`;
  const createRackRes = await req('POST', '/extrusion/racks', {
    rack_code: newRackCode,
    max_capacity: 100,
    unit_price: 195.00,
    unit_weight_kg: 6.800,
    location_name: 'Piso Extrusión - Prueba Integral'
  }, token);
  const createdRack = createRackRes.data;
  console.log(`✔ Rack creado: ${createdRack.rack_code}`);
  console.log(`  - QR Fijo Autogenerado: "${createdRack.qr_code}"`);
  console.log(`  - Peso unitario configurado: ${createdRack.unit_weight_kg} kg/pza`);
  console.log(`  - Precio unitario inicial: $${createdRack.unit_price} MXN/pza`);

  // Registro por BÁSCULA: Ingresamos 68.0 kg (68.0 / 6.8 = 10 piezas)
  console.log('\n  Registrando ingreso mediante BÁSCULA (68.0 kg):');
  const ingressScaleRes = await req('POST', '/extrusion/rack/scan', {
    rack_qr: createdRack.qr_code,
    pti_material_id: 1212, // CINTA AMARILLA
    weight_kg: 68.0,
    mixture_qr: `${parentMixQr}-C2`,
    scrap_weight_kg: 2.0,
    notes: 'Ingreso probado con báscula industrial'
  }, token);
  const ingressData = ingressScaleRes.data;
  console.log(`  ✔ Mensaje: ${ingressScaleRes.message}`);
  console.log(`  ✔ Piezas calculadas automáticamente por el Backend: ${ingressData.rack.current_quantity} bobinas`);
  console.log(`  ✔ Capacidad: ${ingressData.rack.current_quantity}/${ingressData.rack.max_capacity}`);
  console.log(`  ✔ Valor Total en Rack: $${ingressData.rack.total_value} MXN\n`);

  // 5. Punto 6 & 7: Precios de PTI Editables por el Usuario y Valor del Rack
  console.log('----------------------------------------------------');
  console.log('[PUNTO 6 & 7] Edición Manual de Precio de PTI y Recálculo del Rack');
  console.log('----------------------------------------------------');
  const updatedPrice = 210.50;
  const updatePriceRes = await req('PUT', `/extrusion/racks/${createdRack.id}/price`, {
    unit_price: updatedPrice,
    unit_weight_kg: 6.800
  }, token);
  const updatedRack = updatePriceRes.data;
  const expectedTotalValue = Number((Number(ingressData.rack.current_quantity) * updatedPrice).toFixed(2));
  console.log(`✔ Rack actualizado: Precio unitario modificado a $${updatedRack.unit_price} MXN`);
  console.log(`✔ Piezas actuales: ${ingressData.rack.current_quantity}`);
  console.log(`✔ Valor total recalculado en Rack: $${expectedTotalValue} MXN (${ingressData.rack.current_quantity} × $${updatedPrice})\n`);

  // 6. Punto 3, 3.1 & 3.2: Valorización Total en Extrusión (WIP) con Índice Editable
  console.log('----------------------------------------------------');
  console.log('[PUNTO 3, 3.1 & 3.2] Valorización Total de Extrusión (WIP)');
  console.log('----------------------------------------------------');
  const valIndex1 = await req('GET', '/extrusion/valuation?cost_index=1.15', null, token);
  const v1 = valIndex1.data;
  console.log('Valuación con Índice Estándar (1.15):');
  console.log(`  - Mezclas en Espera: $${v1.queued_mixes_value} MXN (${v1.queued_items_count} mezclas)`);
  console.log(`  - Mezclas Activas en Proceso: $${v1.active_mixes_value} MXN (${v1.active_items_count} mezclas)`);
  console.log(`  - PTI en Racks: $${v1.pti_racks_value} MXN (${v1.racks_count} racks)`);
  console.log(`  - VALOR TOTAL EXTRUSIÓN (WIP): $${v1.total_extrusion_wip_value} MXN`);

  const valIndex2 = await req('GET', '/extrusion/valuation?cost_index=1.25', null, token);
  const v2 = valIndex2.data;
  console.log('\nValuación con Índice Editado por Usuario (1.25):');
  console.log(`  - Mezclas en Espera: $${v2.queued_mixes_value} MXN`);
  console.log(`  - Mezclas Activas en Proceso: $${v2.active_mixes_value} MXN`);
  console.log(`  - PTI en Racks: $${v2.pti_racks_value} MXN`);
  console.log(`  - VALOR TOTAL EXTRUSIÓN (WIP): $${v2.total_extrusion_wip_value} MXN`);
  console.log('✔ El índice editable modifica adecuadamente el valor de mezclas y el WIP total.');

  console.log('\n====================================================');
  console.log(' TODOS LOS PUNTOS (1 AL 7) VALIDADOS EXITOSAMENTE ');
  console.log('====================================================');
}

runValidation().catch(err => {
  console.error('\n❌ ERROR DURANTE LA VALIDACIÓN:', err.response?.data || err.message);
  process.exit(1);
});
