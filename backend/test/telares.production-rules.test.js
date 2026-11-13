'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProductionRoute,
  validateOperatorMeterCoverage,
  calculateFabricWeightKg,
  estimateBomFabricWeightKg,
  getTelaresPtiCatalogQr,
  resolveTelaresPtiCatalogQr,
} = require('../src/modules/telares/productionRules');

test('Excel fabric conversion uses width, meters, ounces, and per-ficha layer factor', () => {
  assert.deepEqual(calculateFabricWeightKg({ meters: 15, widthMeters: 1.9, ouncesYd2: 6.5, layerFactor: 2 }), {
    weight_kg: 12.56,
    grams_per_meter: 837.33,
  });
  assert.equal(estimateBomFabricWeightKg({ weight_conversion_width_m: 1.9, ounces_yd2: 6.5, weight_conversion_factor: 1 }, 15), 6.28);
  assert.equal(estimateBomFabricWeightKg({ weight_conversion_width_m: 1.9, ounces_yd2: 6.5, fabric_type: 'TUBULAR' }, 15), null);
});

test('Fabric conversion rejects missing or nonphysical parameters', () => {
  assert.throws(() => calculateFabricWeightKg({ meters: 10, widthMeters: 0, ouncesYd2: 5, layerFactor: 2 }), (error) => error.code === 'INVALID_FABRIC_WEIGHT_INPUT');
  assert.throws(() => calculateFabricWeightKg({ meters: -10, widthMeters: 1, ouncesYd2: 5, layerFactor: 2 }), (error) => error.code === 'INVALID_FABRIC_WEIGHT_INPUT');
});

test('Catalog QR resolves only a known Telares PTI code', () => {
  const boms = [{ code: 'TEL-ROLL-01', id: 10 }, { code: 'TEL-BAND-01', id: 11 }];
  assert.equal(getTelaresPtiCatalogQr(boms[0]), 'TELARES-PTI:TEL-ROLL-01');
  assert.equal(resolveTelaresPtiCatalogQr('telares-pti:tel-roll-01', boms), boms[0]);
  assert.equal(resolveTelaresPtiCatalogQr('TELARES-PTI:NOT-FOUND', boms), null);
  assert.equal(resolveTelaresPtiCatalogQr('random:TEL-ROLL-01', boms), null);
});

test('Telares output routes block Globo for rolls, bands and cintilla alike', () => {
  for (const [productKind, expectedCode] of [
    ['ROLLO_TELA', 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'],
    ['BANDA', 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'],
    ['CINTA', 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'],
  ]) {
    assert.throws(
      () => normalizeProductionRoute(['TELARES', 'GLOBO', 'CORTE'], productKind),
      (error) => error.code === expectedCode,
    );
  }
});

test('Telares Banda and Cintilla do not offer Laminado as a route', () => {
  assert.throws(
    () => normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE'], 'BANDA'),
    (error) => error.code === 'INVALID_BANDA_CINTA_ROUTE',
  );
});

test('Telares output accepts documented internal destinations without Globo', () => {
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'LAMINADO', 'CORTE']), ['TELARES', 'LAMINADO', 'CORTE']);
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'LAMINADO']), ['TELARES', 'LAMINADO']);
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'CORTE']), ['TELARES', 'CORTE']);
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'VENTA']), ['TELARES', 'VENTA']);
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'LONAS']), ['TELARES', 'LONAS']);
});

test('Telares stores alternate destinations as separate routes, never one mixed path', () => {
  const documentedOptions = [
    ['TELARES', 'CORTE'],
    ['TELARES', 'LAMINADO'],
    ['TELARES', 'LONAS'],
    ['TELARES', 'VENTA'],
  ];
  assert.equal(documentedOptions.every((route) => normalizeProductionRoute(route).length > 1), true);
  assert.throws(
    () => normalizeProductionRoute(['TELARES', 'CORTE', 'LAMINADO', 'VENTA']),
    (error) => error.code === 'INVALID_PRODUCTION_ROUTE',
  );
});

test('operator ranges cover the produced meters and accept the documented 0.01 boundary', () => {
  assert.equal(validateOperatorMeterCoverage([
    { meters_start: 0, meters_end: 50 },
    { meters_start: 50.01, meters_end: 100 },
  ], 100), true);
});

test('operator ranges reject missing meters and overlapping attribution', () => {
  assert.throws(
    () => validateOperatorMeterCoverage([{ meters_start: 0, meters_end: 49.98 }], 50),
    (error) => error.code === 'OPERATOR_SEGMENT_GAP',
  );
  assert.throws(
    () => validateOperatorMeterCoverage([
      { meters_start: 0, meters_end: 50 },
      { meters_start: 49.98, meters_end: 100 },
    ], 100),
    (error) => error.code === 'OPERATOR_SEGMENT_OVERLAP',
  );
});
