const {
  ViajeroRoll,
  LoomRun,
  Loom,
  ProductionBom,
  GloboSpecification,
  LaminadoSpecification,
  WipInventory,
  Material,
  User,
  sequelize,
} = require('../database/models');
const telaresService = require('../modules/telares/telares.service');
const globoService = require('../modules/globo/globo.service');
const laminadoService = require('../modules/laminado/laminado.service');

async function testFullFlow() {
  console.log('=== TEST OPERACIONAL: RUTEO TELARES -> GLOBO / LAMINADO / AMBOS / CORTE ===');

  // 1. Obtener una corrida activa o buscar telar
  const activeRun = await LoomRun.findOne({
    where: { status: 'EN_PROCESO' },
    include: [{ model: Loom, as: 'loom' }, { model: ProductionBom, as: 'bom' }],
  });

  if (!activeRun) {
    console.log('⚠ No hay corrida activa para probar finishRoll. Buscando rollo existente...');
  } else {
    console.log(`✔ Corrida activa encontrada: Telar ${activeRun.loom?.name}, BOM: ${activeRun.bom?.name}`);
  }

  // 2. Probar assessRollMaterials en Globo con un rollo existente
  const roll = await ViajeroRoll.findOne({
    order: [['id', 'DESC']],
    include: [{ model: ProductionBom, as: 'bom' }],
  });

  if (roll) {
    console.log(`\n--- Evaluando Rollo ${roll.roll_code} en GLOBO ---`);
    try {
      const assessmentGlobo = await globoService.assessRollMaterials({ roll_id: roll.id });
      console.log(`✔ Evaluación en Globo exitosa: Espec ${assessmentGlobo.specification.code}`);
      console.log(`  Suficiente en WIP: ${assessmentGlobo.all_materials_sufficient ? 'SÍ' : 'NO'}`);
      console.log(`  Faltante total: ${assessmentGlobo.total_missing_kg} kg`);
      console.log(`  Materiales evaluados: ${assessmentGlobo.materials.length}`);
    } catch (err) {
      console.error('Error evaluando en Globo:', err.message);
    }

    console.log(`\n--- Evaluando Rollo ${roll.roll_code} en LAMINADO ---`);
    try {
      const assessmentLam = await laminadoService.assessRollMaterials({ roll_id: roll.id });
      console.log(`✔ Evaluación en Laminado exitosa: Espec ${assessmentLam.specification.code}`);
      console.log(`  Suficiente en WIP: ${assessmentLam.all_materials_sufficient ? 'SÍ' : 'NO'}`);
      console.log(`  Faltante total: ${assessmentLam.total_missing_kg} kg`);
      console.log(`  Materiales evaluados: ${assessmentLam.materials.length}`);
    } catch (err) {
      console.error('Error evaluando en Laminado:', err.message);
    }

    // 3. Probar verificación de escaneo con validación de ruteo
    console.log(`\n--- Probando verificación de QR en GLOBO ---`);
    const scanResultGlobo = await globoService.verifyScan({ qr_code: roll.qr_code, operator_id: 1 });
    console.log(`  Permitido en Globo: ${scanResultGlobo.is_allowed}`);
    console.log(`  Mensaje: ${scanResultGlobo.message}`);

    console.log(`\n--- Probando verificación de QR en LAMINADO ---`);
    const scanResultLam = await laminadoService.verifyScan({ qr_code: roll.qr_code, operator_id: 1 });
    console.log(`  Permitido en Laminado: ${scanResultLam.is_allowed}`);
    console.log(`  Mensaje: ${scanResultLam.message}`);
  } else {
    console.log('No se encontraron rollos viajeros en base de datos.');
  }

  console.log('\n=== FIN DE PRUEBAS OPERACIONALES ===');
  process.exit(0);
}

testFullFlow().catch((err) => {
  console.error('Error en prueba:', err);
  process.exit(1);
});
