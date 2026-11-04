const test = require('node:test');
const assert = require('node:assert/strict');
const { computeOperationalRouting, normalizeAreaCode } = require('../src/modules/qrcodes/qrTraceabilityTree.service');

test('normalizeAreaCode maps area names and objects consistently', () => {
  assert.equal(normalizeAreaCode({ code: 'ALM' }), 'ALMACEN');
  assert.equal(normalizeAreaCode('Almacén de Materia Prima'), 'ALMACEN');
  assert.equal(normalizeAreaCode('Extrusión'), 'EXTRUSION');
  assert.equal(normalizeAreaCode('Telares de Rollo'), 'TELARES');
  assert.equal(normalizeAreaCode('Laminado'), 'LAMINADO');
  assert.equal(normalizeAreaCode('Corte'), 'CORTE');
});

test('computeOperationalRouting maps PTI_RACK to Extrusion and Telares when rack has spools', () => {
  const routing = computeOperationalRouting({
    scannedCode: 'RACK-PTI-01',
    ptiRack: {
      id: 10,
      rack_code: 'RACK-PTI-01',
      qr_code: 'RACK-PTI-01',
      container_type: 'CARRITO',
      current_quantity: 120,
      status: 'DISPONIBLE',
    },
  });

  assert.equal(routing.qr_kind, 'PTI_RACK');
  assert.equal(routing.actions_by_area.EXTRUSION.route, '/production/extrusion?rackQr=RACK-PTI-01');
  assert.equal(routing.actions_by_area.TELARES.route, '/production/telares?ptiRackQr=RACK-PTI-01');
  assert.equal(routing.actions_by_area.ALMACEN, undefined);
});

test('computeOperationalRouting maps VIAJERO_ROLL to Telares and allowed next stages without Globo', () => {
  const routing = computeOperationalRouting({
    scannedCode: 'VIAJ-10-1-1-1200',
    viajeroRoll: {
      id: 55,
      qr_code: 'VIAJ-10-1-1-1200',
      roll_code: '10-1-1-1200',
      output_product_name: 'Tela 6.5 oz',
      current_stage: 'TELARES',
      next_allowed_stage: 'LAMINADO',
      route: ['TELARES', 'LAMINADO', 'CORTE'],
      status: 'DISPONIBLE',
      bom: { allowed_next_stages: ['LAMINADO', 'CORTE', 'GLOBO'] },
    },
  });

  assert.equal(routing.qr_kind, 'VIAJERO_ROLL');
  assert.equal(routing.actions_by_area.TELARES.route, '/production/viajero-tracker?qr=VIAJ-10-1-1-1200');
  assert.equal(routing.actions_by_area.LAMINADO.route, '/production/laminado?qr=VIAJ-10-1-1-1200');
  assert.equal(routing.actions_by_area.CORTE.route, '/production/corte?qr=VIAJ-10-1-1-1200');
  assert.equal(routing.actions_by_area.GLOBO, undefined);
});

test('computeOperationalRouting maps WAREHOUSE_LOT only to ALMACEN when active and available', () => {
  const activeRouting = computeOperationalRouting({
    scannedCode: 'ALM-000000100',
    lote: {
      id: 42,
      folio: 'FAC-2026-100',
      available_amount: 500,
      is_active: true,
      material: { name: 'Polipropileno Rafia' },
    },
  });

  assert.equal(activeRouting.qr_kind, 'WAREHOUSE_LOT');
  assert.equal(activeRouting.actions_by_area.ALMACEN.route, '/warehouse/lotes/42');
  assert.equal(activeRouting.actions_by_area.TELARES, undefined);
});

