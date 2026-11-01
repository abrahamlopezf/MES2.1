'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProductionRoute,
  validateOperatorMeterCoverage,
} = require('../src/modules/telares/productionRules');

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
  assert.deepEqual(normalizeProductionRoute(['TELARES', 'CORTE']), ['TELARES', 'CORTE']);
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
