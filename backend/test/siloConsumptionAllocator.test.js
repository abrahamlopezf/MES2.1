'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateBalancedSiloConsumption } = require('../src/modules/extrusion/services/siloConsumptionAllocator');

test('reparte el consumo en mitades cuando ambos silos tienen stock', () => {
  const plan = allocateBalancedSiloConsumption(500, [
    { id: 1, current_stock_kg: 1000 },
    { id: 2, current_stock_kg: 1000 },
  ]);
  assert.deepEqual(plan.map((entry) => entry.quantityKg), [250, 250]);
});

test('compensa con el otro silo cuando uno no alcanza su mitad', () => {
  const plan = allocateBalancedSiloConsumption(500, [
    { id: 1, current_stock_kg: 100 },
    { id: 2, current_stock_kg: 1000 },
  ]);
  assert.deepEqual(plan.map((entry) => entry.quantityKg), [100, 400]);
});

test('no autoriza un consumo mayor al stock combinado', () => {
  assert.throws(
    () => allocateBalancedSiloConsumption(500, [
      { id: 1, current_stock_kg: 200 },
      { id: 2, current_stock_kg: 299.999 },
    ]),
    /Stock total insuficiente/
  );
});

test('requiere exactamente los dos silos operativos', () => {
  assert.throws(
    () => allocateBalancedSiloConsumption(10, [{ id: 1, current_stock_kg: 10 }]),
    /exactamente 2 silos activos/
  );
});
