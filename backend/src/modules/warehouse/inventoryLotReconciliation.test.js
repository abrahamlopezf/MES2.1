'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getLotBackedInventoryReconciliation } = require('./inventoryLotReconciliation');

test('reconciles a stale global balance upward to the scanned lot-backed stock', () => {
  assert.deepEqual(getLotBackedInventoryReconciliation(96.5, 592.3, 4.2), {
    expectedBeforeScan: 596.5,
    delta: 500,
  });
});

test('never raises inventory above the known lot-backed balance', () => {
  assert.deepEqual(getLotBackedInventoryReconciliation(600, 496, 4), {
    expectedBeforeScan: 500,
    delta: 0,
  });
});
