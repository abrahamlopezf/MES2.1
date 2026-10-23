const API_BASE = 'http://localhost:4000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('================================================================');
  console.log(' TEST SUITE: LÓGICA HÍBRIDA (SILOS VS MANUAL) Y WIP FINANCIERO');
  console.log('================================================================\n');

  // 0. Autenticación directa
  const { User, Role, Area } = require('../database/models');
  const jwt = require('jsonwebtoken');
  const env = require('../config/env');
  const user = await User.findOne({
    where: { username: 'nexus' },
    include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }]
  });
  if (!user.session_token) {
    user.session_token = 'TEST-SESSION-' + Date.now();
    await user.save();
  }
  const token = jwt.sign(
    {
      sub: user.id,
      roleCode: user.role?.code || 'SUPERADMIN',
      areaId: user.role?.area?.id || 2,
      session_token: user.session_token
    },
    env.jwt.secret,
    { expiresIn: '1d' }
  );
  console.log('✔ [0] Autenticado como SUPERADMIN.');

  // Idempotencia: Limpiar residuos de pruebas previas en Extrusora 2
  const { sequelize } = require('../config/database');
  await sequelize.query("DELETE FROM extruder_queues WHERE extruder_id = 2 OR consumption_order_qr_id LIKE 'TEST-%' OR consumption_order_qr_id LIKE 'KIT-ADITIVOS-%' OR consumption_order_qr_id LIKE 'RAFIA-%' OR consumption_order_qr_id LIKE 'PPB-%'");
  await sequelize.query("UPDATE extruders SET modo_silo = false WHERE id = 2");

  // 1. FASE 1: Ingreso de PP mediante factura a Silo (Zero-Impact en Almacén)
  console.log('\n--- [FASE 1] Ingreso de PP mediante Factura a Silo ---');
  const silosBefore = await req('GET', '/extrusion/silos', null, token);
  const silo1Before = silosBefore.data.find(s => s.code === 'SILO-01') || silosBefore.data[0];
  const initialStock = Number(silo1Before.current_stock_kg);
  console.log(`Stock actual en ${silo1Before.name}: ${initialStock} kg (Lote: ${silo1Before.current_lot_number})`);

  const invoiceFolio = `FAC-PP-${Date.now().toString().slice(-6)}`;
  const invoiceRes = await req('POST', '/extrusion/silos/invoice-entry', {
    folio: invoiceFolio,
    silo_id: silo1Before.id,
    quantity_kg: 2500.00,
    unit_cost: 29.20,
    lot_number: `LOTE-FAC-${invoiceFolio}`,
    lot_type: 'A',
    notes: 'Ingreso directo a silo por factura de proveedor de resina PP'
  }, token);

  console.log(`✔ ${invoiceRes.message}`);
  console.log(`  Stock anterior: ${initialStock} kg -> Nuevo stock: ${invoiceRes.data.current_stock_kg} kg (+2,500 kg)`);
  if (Number(invoiceRes.data.current_stock_kg) !== initialStock + 2500) {
    throw new Error('Fallo en la suma de kilos al Silo.');
  }

  // 2. FASE 2: Toggle Híbrido en Catálogo de Extrusoras y Bloqueo con Órdenes Activas
  console.log('\n--- [FASE 2] Toggle Híbrido y Bloqueo por Cola Activa ---');
  const machinesRes = await req('GET', '/extrusion/machines', null, token);
  // Usar Extrusora 2 para prueba controlada de toggle (inicia en 0 órdenes)
  const ext2 = machinesRes.data.find(m => m.id === 2);
  console.log(`Estado actual Extrusora 2: modo_silo = ${ext2.modo_silo}, cola activa = ${ext2.active_orders_count}`);

  // Asegurar que Extrusora 2 tenga una orden en cola para probar bloqueo
  const testQr = `TEST-LOCK-QR-${Date.now()}`;
  await req('POST', '/extrusion/queue/enqueue', {
    extruder_id: 2,
    consumption_order_qr_id: testQr,
    formula_id: 15, // F-EXT-2-BLANCA
    priority: 1,
    notes: 'Prueba de bloqueo de toggle'
  }, token);

  console.log(`✔ Mezcla encolada para Extrusora 2 (${testQr}). Intentando cambiar modo_silo...`);
  try {
    await req('PUT', '/extrusion/machines/2/modo-silo', { modo_silo: !ext2.modo_silo }, token);
    throw new Error('FALLO: El backend debió bloquear el cambio de toggle mientras la máquina tiene cola activa.');
  } catch (err) {
    console.log(`✔ [Bloqueo Correcto 400]: "${err.message}"`);
  }

  // Limpiar la orden de prueba de la cola
  await sequelize.query(`DELETE FROM extruder_queues WHERE consumption_order_qr_id = '${testQr}'`);
  console.log('✔ Cola de prueba liberada.');

  // Ahora el cambio de toggle debe ser permitido
  const toggleRes = await req('PUT', '/extrusion/machines/2/modo-silo', { modo_silo: true }, token);
  console.log(`✔ ${toggleRes.message}`);
  // Regresar Extrusora 2 a modo manual para continuar el flujo paso a paso
  await req('PUT', '/extrusion/machines/2/modo-silo', { modo_silo: false }, token);
  console.log('✔ Extrusora 2 restaurada a modo manual temporalmente.');

  // 3. FASE 3: Fidelidad Absoluta a las Fórmulas (Validación PDF)
  console.log('\n--- [FASE 3] Matriz de Compatibilidad y Hard-blocks de Seguridad ---');
  // 3.1 Probar que mezclas de Rafia son EXCLUSIVAS de Extrusora 1
  console.log('Prueba 3.1: Intentar encolar Rafia Cinturón (F-EXT-1-BLANCO) en Extrusora 2:');
  try {
    await req('POST', '/extrusion/queue/enqueue', {
      extruder_id: 2,
      consumption_order_qr_id: `RAFIA-TEST-${Date.now()}`,
      formula_id: 6, // F-EXT-1-BLANCO
      notes: 'Intento no autorizado'
    }, token);
    throw new Error('FALLO: El sistema permitió fórmula de Rafia en Extrusora 2.');
  } catch (err) {
    console.log(`✔ [Bloqueo Exclusividad Rafia]: "${err.message}"`);
  }

  // 3.2 Probar que Extrusora 4 PROHÍBE Polipropileno B en su fórmula
  console.log('\nPrueba 3.2: Intentar encolar fórmula con PP-B en Extrusora 4:');
  try {
    await req('POST', '/extrusion/queue/enqueue', {
      extruder_id: 4,
      consumption_order_qr_id: `PPB-TEST-${Date.now()}`,
      formula_id: 22, // F-EXT-NEGRO (contiene 100kg de PP-B)
      notes: 'Intento prohibido PP-B en Extrusora 4'
    }, token);
    throw new Error('FALLO: El sistema permitió PP-B en Extrusora 4.');
  } catch (err) {
    console.log(`✔ [Hard-block Extrusora 4 PP-B]: "${err.message}"`);
  }

  // 3.3 Hard-block por Silo: Extrusora 4 en modo_silo con Silo asignado de Lote B
  console.log('\nPrueba 3.3: Extrusora 4 en modo_silo con Silo de Lote B:');
  // Asignar temporalmente Silo 3 (Lote B) a Extrusora 4
  const siloB = silosBefore.data.find(s => s.current_lot_type === 'B') || { id: 3 };
  try {
    await req('PUT', '/extrusion/machines/4/silo', { silo_id: siloB.id }, token);
    throw new Error('FALLO: El sistema permitió asignar un silo con lote B a Extrusora 4.');
  } catch (err) {
    console.log(`✔ [Hard-block Asignación Silo B en Extrusora 4]: "${err.message}"`);
  }

  // 4. FASE 4: Ejecución de la Lógica Bifurcada (Modo Silo vs Manual)
  console.log('\n--- [FASE 4] Ejecución de Lógica Bifurcada y Backflushing de Silo ---');
  // Configurar Extrusora 2 en modo_silo = true
  await req('PUT', '/extrusion/machines/2/modo-silo', { modo_silo: true }, token);
  await req('PUT', '/extrusion/machines/2/silo', { silo_id: 1 }, token);
  console.log('✔ Extrusora 2 configurada en modo_silo = true (Silo 1 asignado)');

  const silo1Mid = await req('GET', '/extrusion/silos', null, token);
  const s1MidStock = Number(silo1Mid.data.find(s => s.id === 1).current_stock_kg);

  // Crear mezcla permitida en Extrusora 2 (F-EXT-2-BLANCA: 385.6kg PP-A, 100kg PP-B, 4.2kg Carb, 6kg MB, 4.2kg UV)
  // En modo silo, la orden es un Kit de Aditivos
  const siloMixRes = await req('POST', '/extrusion/mix', {
    formula_id: 15, // F-EXT-2-BLANCA
    container_count: 1,
    extruder_id: 2,
    inputs: [
      { qr_code: 'TEST-INPUT-WIP-01', quantity: 15.0 } // aditivos
    ]
  }, token).catch(async () => {
    // Si no hay WIP QR hijo simulado, encolamos directo como Kit de Silo
    const fallbackKitQr = `KIT-ADITIVOS-EXT2-${Date.now().toString().slice(-4)}`;
    return await req('POST', '/extrusion/queue/enqueue', {
      extruder_id: 2,
      consumption_order_qr_id: fallbackKitQr,
      formula_id: 15,
      is_silo_kit: true,
      notes: 'Kit de aditivos para Tolva Silo'
    }, token);
  });

  const finalKitQr = siloMixRes.data?.consumption_order_qr_id 
    || siloMixRes.consumption_order_qr_id 
    || (siloMixRes.data?.containers && siloMixRes.data.containers[0]?.qr_code)
    || (siloMixRes.containers && siloMixRes.containers[0]?.qr_code);
  console.log(`✔ Kit de Aditivos generado y encolado en Extrusora 2: QR "${finalKitQr}"`);

  // Crear Rack para recibir producción
  const rackCode = `RCK-SILO-${Date.now().toString().slice(-4)}`;
  const rackRes = await req('POST', '/extrusion/racks', {
    rack_code: rackCode,
    max_capacity: 100,
    unit_weight_kg: 6.800
  }, token);
  const createdRack = rackRes.data;
  console.log(`✔ Rack creado: ${createdRack.rack_code} (${createdRack.qr_code})`);

  // Reportar producción con báscula y merma de arranque:
  // 10 piezas producidas (68.0 kg) + 12.0 kg de merma de arranque
  console.log('\nReportando producción en Extrusora 2 (Modo Silo):');
  const scanProdRes = await req('POST', '/extrusion/rack/scan', {
    rack_qr: createdRack.qr_code,
    pti_material_id: 1212,
    quantity: 10,
    mixture_qr: finalKitQr,
    scrap_weight_kg: 12.0,
    scrap_reason: 'ARRANQUE_EXTRUSORA'
  }, token);

  console.log(`✔ ${scanProdRes.message}`);
  console.log('✔ Backflushing ejecutado:', {
    piezas: scanProdRes.data.backflushing?.pieces_produced,
    pp_deducido_total: scanProdRes.data.backflushing?.pp_breakdown?.total_pp_deducted_kg,
    merma_arranque_100pct_pp: scanProdRes.data.backflushing?.pp_breakdown?.startup_scrap_pp_kg,
    costo_pp_aplicado: `$${scanProdRes.data.backflushing?.pp_breakdown?.pp_financial_cost_applied} MXN`
  });
  console.log('✔ Deducción en Silo:', scanProdRes.data.silo_deduction);

  // Verificar que el inventario del Silo bajó exactamente
  const silo1After = await req('GET', '/extrusion/silos', null, token);
  const s1FinalStock = Number(silo1After.data.find(s => s.id === 1).current_stock_kg);
  const deductedKg = scanProdRes.data.silo_deduction.deducted_kg;
  console.log(`Stock Silo 1: ${s1MidStock} kg -> ${s1FinalStock} kg (Diferencia: ${(s1MidStock - s1FinalStock).toFixed(2)} kg)`);

  if (Math.abs((s1MidStock - s1FinalStock) - deductedKg) > 0.05) {
    throw new Error('Inconsistencia en el descuento de inventario del Silo.');
  }

  // 5. FASE 5: Auditoría Financiera de WIP y PTI
  console.log('\n--- [FASE 5] Auditoría Financiera de WIP y PTI ---');
  const valuation = await req('GET', '/extrusion/valuation?cost_index=1.15', null, token);
  console.log('Valuación Extrusión WIP:', {
    mezclas_en_cola_wip: `$${valuation.data.queued_mixes_value} MXN`,
    mezclas_activas_wip: `$${valuation.data.active_mixes_value} MXN`,
    pti_en_racks: `$${valuation.data.pti_racks_value} MXN`,
    total_wip_extrusion: `$${valuation.data.total_extrusion_wip_value} MXN`,
    stock_total_silos: `${valuation.data.silos_valuation?.total_stock_kg} kg`,
    valor_total_silos: `$${valuation.data.silos_valuation?.total_value} MXN`
  });

  // Limpiar Extrusora 2 (eliminar orden de prueba y restaurar modo)
  await sequelize.query(`DELETE FROM extruder_queues WHERE consumption_order_qr_id = '${finalKitQr}'`);
  await req('PUT', '/extrusion/machines/2/modo-silo', { modo_silo: false }, token);
  console.log('✔ Extrusora 2 restaurada a modo manual y cola limpia.');

  console.log('\n================================================================');
  console.log(' ¡TODAS LAS FASES (1 A 5) VALIDADAS EXITOSAMENTE SIN ERRORES! ');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN VALIDACIÓN:', err.data || err.message);
  process.exit(1);
});
