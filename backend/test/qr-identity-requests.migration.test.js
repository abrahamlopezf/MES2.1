'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Sequelize = require('sequelize');
const migration = require('../src/database/migrations/20261127100000-create-qr-identity-requests');

test('QR request migration declares additive request and one-to-one delivery identity tables', async () => {
  const calls = [];
  const queryInterface = {
    sequelize: { transaction: async (callback) => callback({ id: 'TEST_TRANSACTION' }) },
    createTable: async (name, columns) => calls.push({ operation: 'createTable', name, columns }),
    addConstraint: async (name, options) => calls.push({ operation: 'addConstraint', name, options }),
    addIndex: async (name, fields, options) => calls.push({ operation: 'addIndex', name, fields, options }),
  };

  await migration.up(queryInterface, Sequelize);

  const requestTable = calls.find((call) => call.operation === 'createTable' && call.name === 'qr_identity_requests');
  const itemsTable = calls.find((call) => call.operation === 'createTable' && call.name === 'qr_identity_request_items');
  assert.ok(requestTable);
  assert.ok(itemsTable);
  assert.equal(requestTable.columns.requested_quantity.allowNull, false);
  assert.equal(itemsTable.columns.qr_code_id.unique, true);
  assert.equal(itemsTable.columns.qr_area_assignment_id.unique, true);
  assert.ok(calls.some((call) => call.operation === 'addConstraint' && call.options.name === 'qr_identity_requests_quantity_positive'));
  assert.ok(calls.some((call) => call.operation === 'addIndex' && call.options.name === 'qr_identity_requests_pending_idx'));
});

test('QR request migration rollback drops only tables introduced by this migration', async () => {
  const dropped = [];
  await migration.down({
    sequelize: { transaction: async (callback) => callback({ id: 'TEST_TRANSACTION' }) },
    dropTable: async (table) => dropped.push(table),
  });
  assert.deepEqual(dropped, ['qr_identity_request_items', 'qr_identity_requests']);
});
