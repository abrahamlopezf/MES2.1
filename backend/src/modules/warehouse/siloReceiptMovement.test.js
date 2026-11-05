'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSiloReceiptMovementRows } = require('./siloReceiptMovement');

test('silo invoice entries create one traceable warehouse movement per invoice row', () => {
  const rows = buildSiloReceiptMovementRows({
    entries: [
      { folio: 'FAC-100', quantity: 100, unit_cost: 2.5, currency: 'USD' },
      { folio: 'FAC-100', quantity: 50, unit_cost: 45, currency: 'MXN' },
    ],
    inventoryId: 20,
    userId: 7,
    siloId: 3,
    siloCode: 'SILO-03',
    auditLogId: 99,
    unitCostFor: (entry) => entry.currency === 'USD' ? 45 : entry.unit_cost,
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.type), ['SILO_ENTRY', 'SILO_ENTRY']);
  assert.deepEqual(rows.map((row) => row.quantity_change), [100, 50]);
  assert.deepEqual(rows.map((row) => row.unit_cost), [45, 45]);
  assert.deepEqual(rows.map((row) => row.total_cost), [4500, 2250]);
  assert.deepEqual(rows.map((row) => row.source_audit_log_id), [99, 99]);
  assert.deepEqual(rows.map((row) => row.source_reference), ['FAC-100#1', 'FAC-100#2']);
  assert.ok(rows.every((row) => row.inventory_id === 20 && row.silo_id === 3));
  assert.match(rows[0].notes, /SILO-03/);
});
