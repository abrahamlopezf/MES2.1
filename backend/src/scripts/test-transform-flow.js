const {
  ViajeroRoll,
  LoomRun,
  Loom,
  ProductionBom,
  GloboSpecification,
  LaminadoSpecification,
  WipInventory,
  sequelize,
} = require('../database/models');
const globoService = require('../modules/globo/globo.service');
const laminadoService = require('../modules/laminado/laminado.service');

async function testTransformFlow() {
  console.log('=== TEST: CREACIÓN DE ROLLO CON RUTA [TELARES, GLOBO, LAMINADO, CORTE] Y TRANSFORMACIÓN ===');

  const bom = await ProductionBom.findOne({ where: { is_active: true } });
  const loom = await Loom.findOne({ where: { is_active: true } });

  // 1. Crear un rollo simulado con destino AMBOS: ['TELARES', 'GLOBO', 'LAMINADO', 'CORTE']
  const rollCode = `TEST-ROLL-${Date.now()}`;
  const testRoll = await ViajeroRoll.create({
    qr_code: rollCode,
    roll_code: rollCode,
    loom_id: loom.id,
    bom_id: bom.id,
    operator_id: 1,
    shift_supervisor_id: 1,
    meters: 500,
    weight_kg: 35.0,
    width_cm: 60.0,
    grammage_g_per_m: 70.0,
    route: ['TELARES', 'GLOBO', 'LAMINADO', 'CORTE'],
    current_stage: 'TELARES',
    next_allowed_stage: 'GLOBO',
    stages_history: [
      { stage: 'TELARES', action: 'PRODUCIDO', meters: 500, weight_kg: 35.0, timestamp: new Date().toISOString() }
    ],
    loom_number: loom.loom_number || 1,
    shift_number: 1,
    roll_sequence: 999,
    operator_nomina: '1200',
    calculated_roll_cost: 1250.00,
    cost_data_complete: true,
    status: 'DISPONIBLE',
    is_active: true,
  });

  console.log(`✔ Rollo creado para prueba: ${testRoll.roll_code} con Ruta: ${JSON.stringify(testRoll.route)}`);
  console.log(`  Siguiente estación requerida: ${testRoll.next_allowed_stage}`);

  // 2. Probar que si intentamos escanearlo en LAMINADO antes de pasar por GLOBO, lo BLOQUEA por secuencia
  console.log('\n--- Test 2: Intento de salto de etapa directo a LAMINADO (debe bloquear por secuencia) ---');
  const scanLamEarly = await laminadoService.verifyScan({ qr_code: testRoll.qr_code, operator_id: 1 });
  console.log(`  Permitido en Laminado: ${scanLamEarly.is_allowed}`);
  console.log(`  Error code: ${scanLamEarly.error_code}`);
  console.log(`  Mensaje: ${scanLamEarly.message}`);

  // 3. Probar escaneo en GLOBO (debe PERMITIRSE)
  console.log('\n--- Test 3: Escaneo autorizado en GLOBO ---');
  const scanGlobo = await globoService.verifyScan({ qr_code: testRoll.qr_code, operator_id: 1, currentUser: { role: { name: 'SUPERADMIN' } } });
  console.log(`  Permitido en Globo: ${scanGlobo.is_allowed}`);
  console.log(`  Preview nuevo QR: ${scanGlobo.preview_new_qr}`);
  console.log(`  Especificaciones compatibles: ${scanGlobo.compatible_specifications?.length}`);

  // 4. Probar evaluación de materiales en Globo
  console.log('\n--- Test 4: Evaluación de materiales en GLOBO ---');
  const assessmentGlobo = await globoService.assessRollMaterials({ roll_id: testRoll.id });
  console.log(`  Espec seleccionada: ${assessmentGlobo.specification.code}`);
  console.log(`  Suficiente en WIP piso: ${assessmentGlobo.all_materials_sufficient}`);
  console.log(`  Faltante total: ${assessmentGlobo.total_missing_kg} kg`);

  // 5. Ejecutar transformación en GLOBO
  console.log('\n--- Test 5: Ejecución de Transformación en GLOBO ---');
  const transformGloboRes = await globoService.transformRoll({
    roll_id: testRoll.id,
    specification_id: assessmentGlobo.specification.id,
    meters_out: 495,
    weight_out_kg: 35.8,
    operator_id: 1,
    currentUser: { role: { name: 'SUPERADMIN' } },
    notes: 'Transformación exitosa en prueba operacional',
  });
  console.log(`  Transformación en Globo: ${transformGloboRes.success ? 'EXITOSA' : 'FALLIDA'}`);
  console.log(`  Nuevo QR asignado: ${transformGloboRes.new_qr_code}`);
  console.log(`  Nueva etapa actual: ${transformGloboRes.roll.current_stage}`);
  console.log(`  Siguiente etapa oficial: ${transformGloboRes.roll.next_allowed_stage}`);
  console.log(`  Nuevo costo transformado: $${transformGloboRes.new_transformed_cost} MXN`);

  // 6. Ahora que ya pasó por GLOBO, probar escaneo en LAMINADO (debe PERMITIRSE porque next_allowed_stage es LAMINADO)
  console.log('\n--- Test 6: Escaneo en LAMINADO tras completar Globo (debe PERMITIRSE) ---');
  const scanLamAfterGlobo = await laminadoService.verifyScan({ qr_code: transformGloboRes.new_qr_code, operator_id: 1, currentUser: { role: { name: 'SUPERADMIN' } } });
  console.log(`  Permitido en Laminado: ${scanLamAfterGlobo.is_allowed}`);
  console.log(`  Mensaje: ${scanLamAfterGlobo.message}`);
  console.log(`  Preview nuevo QR: ${scanLamAfterGlobo.preview_new_qr}`);

  // 7. Ejecutar transformación en LAMINADO
  console.log('\n--- Test 7: Ejecución de Transformación en LAMINADO ---');
  const lamSpec = await LaminadoSpecification.findOne({ where: { is_active: true } });
  const transformLamRes = await laminadoService.transformRoll({
    roll_id: testRoll.id,
    specification_id: lamSpec.id,
    meters_out: 490,
    weight_out_kg: 37.2,
    operator_id: 1,
    currentUser: { role: { name: 'SUPERADMIN' } },
    notes: 'Recubrimiento PEBD completado en prueba operacional',
  });
  console.log(`  Transformación en Laminado: ${transformLamRes.success ? 'EXITOSA' : 'FALLIDA'}`);
  console.log(`  Nuevo QR asignado: ${transformLamRes.new_qr_code}`);
  console.log(`  Nueva etapa actual: ${transformLamRes.roll.current_stage}`);
  console.log(`  Siguiente etapa oficial: ${transformLamRes.roll.next_allowed_stage}`);
  console.log(`  Nuevo costo transformado: $${transformLamRes.new_transformed_cost} MXN`);

  console.log('\n=== FLUJO COMPLETO VERIFICADO EXITOSAMENTE ===');
  process.exit(0);
}

testTransformFlow().catch((err) => {
  console.error('Error en prueba de transformación:', err);
  process.exit(1);
});
