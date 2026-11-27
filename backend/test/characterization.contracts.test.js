'use strict';

/**
 * Suite de Pruebas de Caracterización de Contratos, Reglas de Dominio y Protección de BD — TraceFlow MES (Fase 6.4)
 *
 * Objetivo:
 * Fijar como barrera de protección verificable el comportamiento actual confirmado del sistema
 * antes de iniciar cualquier refactorización MVC:
 * 1. Contratos HTTP de Express (health, 404, 401 auth guard, 400 validation format).
 * 2. Registro e integridad de los 77 modelos Sequelize y sus asociaciones.
 * 3. Cálculos y reglas de negocio puras en Extrusión, Almacén, Telares y Trazabilidad QR.
 * 4. Cifrado y descifrado de payloads QR (crypto.utils).
 * 5. Protección efectiva de Master Data en la base aislada de pruebas (sistema_enterprise_test)
 *    mediante triggers PostgreSQL [QA_MASTER_DATA_GUARD].
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Client } = require('pg');

require('dotenv').config({ quiet: true });

const app = require('../src/app');
const db = require('../src/database/models');
const { validateAndResolveDbConfig } = require('../src/config/dbGuard');
const { encryptQrData, decryptQrData } = require('../src/shared/utils/crypto.utils');
const { planFifoPackageAllocations } = require('../src/modules/warehouse/consumptionPackageAllocator');
const { getLotBackedInventoryReconciliation } = require('../src/modules/warehouse/inventoryLotReconciliation');
const { buildSiloReceiptMovementRows } = require('../src/modules/warehouse/siloReceiptMovement');
const {
  getClientFormulaKind,
  isClientFormulaAllowedOnMachine,
  selectLeastLoadedMachine,
} = require('../src/modules/extrusion/services/formulaMachinePolicy');
const {
  calculateShiftBalance,
  allocateVarianceByInput,
  calculatePtiOutputEstimate,
} = require('../src/modules/extrusion/services/shiftBalance');
const { allocateBalancedSiloConsumption } = require('../src/modules/extrusion/services/siloConsumptionAllocator');
const {
  calculateFabricWeightKg,
  validateOperatorMeterCoverage,
  validateOperatorWeightCoverage,
  validateOutputMeasures,
  assertPtiIncludedInBom,
  normalizeProductionRoute,
} = require('../src/modules/telares/productionRules');
const { computeOperationalRouting, normalizeAreaCode } = require('../src/modules/qrcodes/qrTraceabilityTree.service');

// Helper para peticiones HTTP efímeras al app de Express sin abrir puertos fijos
async function requestApp(method, path, body = null, headers = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...(body !== null ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body: json };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Caracterización HTTP 1: Endpoints /health y /api/health responden 200 con contrato estándar', async () => {
  const rootHealth = await requestApp('GET', '/health');
  assert.equal(rootHealth.status, 200);
  assert.equal(rootHealth.body.status, 'OK');
  assert.equal(typeof rootHealth.body.uptime, 'number');
  assert.equal(typeof rootHealth.body.timestamp, 'string');

  const apiHealth = await requestApp('GET', '/api/health');
  assert.equal(apiHealth.status, 200);
  assert.equal(apiHealth.body.success, true);
});

test('Caracterización HTTP 2: Ruta inexistente responde 404 con estructura errorResponse estándar', async () => {
  const res = await requestApp('GET', '/api/ruta-inexistente-caracterizacion');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(typeof res.body.message, 'string');
});

test('Caracterización HTTP 3: Validación Joi en POST /api/auth/login rechaza payload vacío con HTTP 400', async () => {
  const res = await requestApp('POST', '/api/auth/login', {});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Revisa la información capturada.');
  assert.ok(Array.isArray(res.body.errors) && res.body.errors.length > 0);
});

test('Caracterización HTTP 4: Guardas de autenticación protegen todos los dominios operativos con HTTP 401', async () => {
  const protectedEndpoints = [
    '/api/users',
    '/api/roles',
    '/api/materials',
    '/api/warehouse/inventory',
    '/api/extrusion/queue',
    '/api/telares/looms',
    '/api/laminado/wip',
    '/api/globo/wip',
    '/api/corte/orders',
    '/api/qr/batches',
    '/api/dashboard/operations',
  ];

  for (const endpoint of protectedEndpoints) {
    const res = await requestApp('GET', endpoint);
    assert.equal(res.status, 401, `El endpoint protegido ${endpoint} debe responder 401 sin token JWT`);
    assert.equal(res.body.success, false);
  }
});

test('Caracterización ORM 5: Registro central de Sequelize expone los 79 modelos del dominio con sus asociaciones', () => {
  const modelNames = Object.keys(db).filter((k) => k !== 'sequelize' && k !== 'Sequelize');
  assert.equal(modelNames.length, 79);

  const criticalModels = [
    'User',
    'Role',
    'Permission',
    'Area',
    'Subarea',
    'Material',
    'Lote',
    'Inventory',
    'InventoryMovement',
    'ConsumptionOrder',
    'ConsumptionOrderItem',
    'WipInventory',
    'QrBatch',
    'QrCode',
    'QrIdentityRequest',
    'QrIdentityRequestItem',
    'TraceableItem',
    'TraceabilityEvent',
    'TraceabilityLink',
    'Formula',
    'FormulaIngredient',
    'PtiProduct',
    'PtiRack',
    'Extruder',
    'ExtruderQueue',
    'ExtrusionShiftSession',
    'ExtrusionProductionEntry',
    'Silo',
    'SiloReceiptLot',
    'Loom',
    'LoomPtiWip',
    'ProductionBom',
    'ProductionBomItem',
    'LoomRun',
    'ViajeroRoll',
    'GloboSpecification',
    'LaminadoSpecification',
    'CorteLaminadoOrder',
  ];

  for (const name of criticalModels) {
    assert.ok(db[name], `El modelo crítico ${name} debe estar registrado en database/models/index.js`);
    assert.ok(db[name].associations, `El modelo ${name} debe tener mapa de asociaciones inicializado`);
  }
});

test('Caracterización Dominio 6: Almacén — Planificación FIFO por empaque, reconciliación de lotes y movimientos de silo', () => {
  // 1. Planificación FIFO con redondeo a presentación de empaque (ej. sacos de 25 kg)
  const plan = planFifoPackageAllocations(
    [
      { id: 101, available_amount: 50, presentation_quantity: 25, presentation_unit: 'KG' },
      { id: 102, available_amount: 50, presentation_quantity: 25, presentation_unit: 'KG' },
    ],
    30
  );
  assert.equal(plan.requested_quantity, 30);
  assert.equal(plan.allocated_quantity, 50);
  assert.equal(plan.pending_quantity, 0);
  assert.equal(plan.allocations.length, 1);
  assert.equal(plan.allocations[0].quantity, 50);

  // 2. Reconciliación de inventario respaldado por lotes
  const recon = getLotBackedInventoryReconciliation(100, 145, 5);
  assert.deepEqual(recon, { expectedBeforeScan: 150, delta: 50 });

  // 3. Movimientos trazables de recepción en silo
  const siloRows = buildSiloReceiptMovementRows({
    entries: [{ folio: 'FAC-CHAR-01', quantity: 1000, unit_cost: 22.5, currency: 'MXN' }],
    inventoryId: 10,
    userId: 1,
    siloId: 2,
    siloCode: 'SILO-02',
    auditLogId: 50,
    unitCostFor: (e) => e.unit_cost,
  });
  assert.equal(siloRows.length, 1);
  assert.equal(siloRows[0].type, 'SILO_ENTRY');
  assert.equal(siloRows[0].total_cost, 22500);
  assert.equal(siloRows[0].source_reference, 'FAC-CHAR-01#1');
});

test('Caracterización Dominio 7: Extrusión — Balance de masa de turno, varianza, estimación PTI y asignación 50/50 de silos', () => {
  const balance = calculateShiftBalance({
    goodOutputKg: 400,
    openingMixtureKg: 100,
    loadedMixtureKg: 400,
    closingRemnantKg: 50,
    purgeKg: 15,
    actualScrapKg: 60,
  });
  assert.equal(balance.mixture_input_kg, 500);
  assert.equal(balance.consumed_mixture_kg, 450);
  assert.equal(balance.theoretical_scrap_kg, 50);
  assert.equal(balance.variance_kg, 10);

  const variance = allocateVarianceByInput(
    [
      { mixture_qr: 'MIX-1', input_kg: 150 },
      { mixture_qr: 'MIX-2', input_kg: 300 },
    ],
    9
  );
  assert.deepEqual(
    variance.map((v) => v.variance_kg),
    [3, 6]
  );

  const ptiEst = calculatePtiOutputEstimate(
    [{ pieces: 50, standard_unit_weight_kg: 6.8, net_weight_kg: 340 }],
    340
  );
  assert.equal(ptiEst.useful_pti_kg, 340);
  assert.equal(ptiEst.observed_pieces, 50);

  const siloPlan = allocateBalancedSiloConsumption(600, [
    { id: 1, current_stock_kg: 200 },
    { id: 2, current_stock_kg: 800 },
  ]);
  assert.deepEqual(
    siloPlan.map((s) => s.quantityKg),
    [200, 400]
  );

  assert.equal(getClientFormulaKind('F-EXT-1-VERDE'), 'EXTRUDER_1');
  assert.equal(
    isClientFormulaAllowedOnMachine('F-EXT-1-VERDE', { id: 1, code: 'EXT-01', is_active: true, status: 'ACTIVE' }),
    true
  );
  assert.equal(selectLeastLoadedMachine([{ id: 2 }, { id: 4 }], [{ extruder_id: 2 }]).id, 4);
});

test('Caracterización Dominio 8: Telares — Conversión metros-kg, cobertura de operadores, validación PTI en BOM y rutas confirmadas', () => {
  const conv = calculateFabricWeightKg({ meters: 100, widthMeters: 1.9, ouncesYd2: 6.5, layerFactor: 2 });
  assert.deepEqual(conv, { weight_kg: 83.733, grams_per_meter: 837.33 });

  assert.equal(
    validateOperatorMeterCoverage(
      [
        { meters_start: 0, meters_end: 250 },
        { meters_start: 250.01, meters_end: 500 },
      ],
      500
    ),
    true
  );

  assert.equal(
    validateOperatorWeightCoverage(
      [
        { weight_start_kg: 0, weight_end_kg: 20 },
        { weight_start_kg: 20, weight_end_kg: 40 },
      ],
      40
    ),
    true
  );

  assert.deepEqual(validateOutputMeasures(500, 42.5), { meters: 500, weight_kg: 42.5 });

  const sampleBom = {
    code: 'BOM-CHAR-01',
    items: [{ pti_product_id: 10 }, { pti_product_id: 20 }],
  };
  assert.equal(assertPtiIncludedInBom(10, sampleBom), true);
  assert.throws(
    () => assertPtiIncludedInBom(99, sampleBom),
    (err) => err.code === 'PTI_NOT_IN_SELECTED_BOM'
  );

  // Rutas confirmadas sin discrepancia:
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE'], 'ROLLO_TELA'), [
    'TELARES',
    'LAMINADO',
    'CORTE',
  ]);
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'CORTE'], 'BANDA'), ['TELARES', 'CORTE']);
  assert.throws(
    () => normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE'], 'BANDA'),
    (err) => err.code === 'INVALID_BANDA_CINTA_ROUTE'
  );
});

test('Caracterización Dominio 9: Trazabilidad QR y Criptografía — Ruteo operativo por área y cifrado AES round-trip', () => {
  assert.equal(normalizeAreaCode('Almacén de Materia Prima'), 'ALMACEN');
  assert.equal(normalizeAreaCode('Telares de Rollo'), 'TELARES');

  const rackRouting = computeOperationalRouting({
    scannedCode: 'RACK-CHAR-01',
    ptiRack: {
      id: 1,
      rack_code: 'RACK-CHAR-01',
      qr_code: 'RACK-CHAR-01',
      current_quantity: 50,
      status: 'DISPONIBLE',
    },
  });
  assert.equal(rackRouting.qr_kind, 'PTI_RACK');
  assert.ok(rackRouting.actions_by_area.EXTRUSION);
  assert.ok(rackRouting.actions_by_area.TELARES);

  const sampleQrText = JSON.stringify({ uuid: '123e4567-e89b-12d3-a456-426614174000', code: 'ALM-000000100', type: 'LOT' });
  const encrypted = encryptQrData(sampleQrText);
  assert.equal(typeof encrypted, 'string');
  assert.ok(encrypted.startsWith('AGY:v2:'));
  const decrypted = decryptQrData(encrypted);
  assert.equal(decrypted, sampleQrText);
});

test('Caracterización BD QA 10: La protección QA cubre las 30 tablas de Master Data sin intentar DML destructivo', async () => {
  const cfg = validateAndResolveDbConfig({
    ...process.env,
    APP_ENV: 'test',
    NODE_ENV: 'test',
    DB_NAME: process.env.DB_TEST_NAME || 'sistema_enterprise_test',
  }, { requireTestDb: true });
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    database: cfg.name,
    user: cfg.user,
    password: cfg.password,
    ssl: false,
  });

  try {
    await client.connect();
    const coverage = await client.query(`
      SELECT count(*) FILTER (WHERE p.proname = 'tf_qa_protect_master_data')::int AS protection_triggers,
             count(*) FILTER (WHERE p.proname = 'tf_qa_protect_master_data' AND t.tgenabled <> 'D')::int AS enabled_protection_triggers,
             count(DISTINCT t.tgrelid) FILTER (WHERE p.proname = 'tf_qa_protect_master_data')::int AS protected_tables
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
    `);
    assert.deepEqual(coverage.rows[0], {
      protection_triggers: 60,
      enabled_protection_triggers: 60,
      protected_tables: 30,
    }, 'QA debe proteger las 30 tablas maestras físicas antes de permitir corridas con escritura.');
  } finally {
    await client.end();
  }
});
