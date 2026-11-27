'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/database/models');
const service = require('../src/modules/qrcodes/qrIdentityRequests.service');

const restore = (target, key, value) => {
  const previous = target[key];
  target[key] = value;
  return () => { target[key] = previous; };
};

test('area operative can create a QR request for its own area only', async (t) => {
  const restores = [];
  t.after(() => restores.reverse().forEach((undo) => undo()));
  let payload;
  restores.push(restore(db.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } })));
  restores.push(restore(db.Area, 'findByPk', async (id) => ({ id, code: 'EXTRUSION', name: 'Extrusión' })));
  restores.push(restore(db.QrIdentityRequest, 'create', async (value) => { payload = value; return { id: 41 }; }));
  restores.push(restore(db.QrIdentityRequest, 'findByPk', async () => ({
    id: 41, delivered_at: null, items: [], get() { return this; },
  })));

  const result = await service.createQrIdentityRequest({ requested_quantity: 2, notes: 'Corrida de prueba' }, {
    id: 9, area: { id: 2, code: 'EXTRUSION' }, role: { code: 'SUPERVISOR_EXTRUSION' },
  });

  assert.equal(payload.area_id, 2);
  assert.equal(payload.requested_by, 9);
  assert.equal(payload.requested_quantity, 2);
  assert.equal(result.id, 41);
  assert.equal(result.status, 'PENDING');
});

test('warehouse-only available QR listing rejects another area without querying codes', async (t) => {
  let queried = false;
  const restoreFind = restore(db.QrCode, 'findAll', async () => { queried = true; return []; });
  t.after(restoreFind);
  await assert.rejects(
    service.listAvailableQrCodesForWarehouse({ id: 2, area: { id: 2, code: 'EXTRUSION' }, role: { code: 'SUPERVISOR_EXTRUSION' } }),
    (error) => error.statusCode === 403 && error.code === 'QR_REQUEST_AVAILABLE_CODES_FORBIDDEN',
  );
  assert.equal(queried, false);
});

test('fulfillment rejects a repeated QR id before opening a transaction', async (t) => {
  let transactions = 0;
  const restoreTransaction = restore(db.sequelize, 'transaction', async (callback) => { transactions += 1; return callback({ LOCK: { UPDATE: 'UPDATE' } }); });
  t.after(restoreTransaction);
  await assert.rejects(
    service.fulfillQrIdentityRequest(41, [12, 12], { id: 1, area: { id: 1, code: 'ALMACEN' }, role: { code: 'WAREHOUSEMAN' } }),
    (error) => error.statusCode === 400 && error.code === 'QR_REQUEST_DUPLICATE_CODES',
  );
  assert.equal(transactions, 0);
});

test('fulfillment requires exact quantity and rolls back when a QR is no longer virgin', async (t) => {
  const restores = [];
  let rollbackObserved = false;
  let assignmentsCreated = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  restores.push(restore(db.sequelize, 'transaction', async (callback) => {
    try { return await callback(transaction); }
    catch (error) { rollbackObserved = true; throw error; }
  }));
  restores.push(restore(db.QrIdentityRequest, 'findByPk', async () => ({ id: 41, area_id: 2, requested_by: 9, requested_quantity: 2, delivered_at: null })));
  restores.push(restore(db.QrCode, 'findAll', async () => [{ id: 10, qr_code: 'VIRGIN-10', batch_id: 4, status: 'UNASSIGNED' }]));
  restores.push(restore(db.QrAreaAssignment, 'create', async () => { assignmentsCreated = true; return { id: 1 }; }));
  t.after(() => restores.reverse().forEach((undo) => undo()));

  const warehouseUser = { id: 1, area: { id: 1, code: 'ALMACEN' }, role: { code: 'WAREHOUSEMAN' } };
  await assert.rejects(service.fulfillQrIdentityRequest(41, [10], warehouseUser), (error) => error.code === 'QR_REQUEST_EXACT_QUANTITY_REQUIRED');
  assert.equal(assignmentsCreated, false);
  assert.equal(rollbackObserved, true);

  rollbackObserved = false;
  await assert.rejects(service.fulfillQrIdentityRequest(41, [10, 11], warehouseUser), (error) => error.code === 'QR_REQUEST_CODES_UNAVAILABLE');
  assert.equal(assignmentsCreated, false);
  assert.equal(rollbackObserved, true);
});

test('fulfillment rejects QR or batch preassigned to another area', async (t) => {
  const restores = [];
  let assignmentCount = 0;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  restores.push(restore(db.sequelize, 'transaction', async (callback) => callback(transaction)));
  restores.push(restore(db.QrIdentityRequest, 'findByPk', async () => ({
    id: 41, area_id: 2, requested_by: 9, requested_quantity: 1, delivered_at: null,
  })));
  restores.push(restore(db.QrCode, 'findAll', async () => [{
    id: 10, batch_id: 4, status: 'UNASSIGNED', assigned_area_id: 2,
    batch: { assigned_area_id: 5 },
  }]));
  restores.push(restore(db.QrAreaAssignment, 'create', async () => { assignmentCount += 1; }));
  t.after(() => restores.reverse().forEach((undo) => undo()));

  await assert.rejects(
    service.fulfillQrIdentityRequest(41, [10], { id: 1, area: { id: 1, code: 'ALMACEN' }, role: { code: 'WAREHOUSEMAN' } }),
    (error) => error.statusCode === 409 && error.code === 'QR_REQUEST_AREA_MISMATCH',
  );
  assert.equal(assignmentCount, 0);
});

test('warehouse fulfillment atomically records assignments, QR events, request items, and delivery', async (t) => {
  const restores = [];
  const calls = { assignment: 0, qrUpdate: 0, itemInsert: 0, eventInsert: 0, delivered: 0 };
  restores.push(restore(db.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } })));
  let readCount = 0;
  restores.push(restore(db.QrIdentityRequest, 'findByPk', async () => {
    readCount += 1;
    if (readCount === 1) return { id: 41, area_id: 2, requested_by: 9, requested_quantity: 2, delivered_at: null, update: async (value) => { calls.delivered += 1; assert.equal(value.delivered_by, 1); } };
    return { id: 41, delivered_at: new Date(), items: [{}, {}], get() { return this; } };
  }));
  restores.push(restore(db.QrCode, 'findAll', async () => [
    { id: 10, batch_id: 4, status: 'UNASSIGNED', assigned_area_id: null },
    { id: 11, batch_id: 4, status: 'UNASSIGNED', assigned_area_id: null },
  ]));
  restores.push(restore(db.QrAreaAssignment, 'create', async (value) => { calls.assignment += 1; return { id: 70 + calls.assignment, ...value }; }));
  restores.push(restore(db.QrCode, 'update', async (values) => { calls.qrUpdate += 1; assert.equal(values.status, 'ASSIGNED'); return [2]; }));
  restores.push(restore(db.QrCode, 'count', async () => 0));
  restores.push(restore(db.QrBatch, 'update', async (values) => { assert.equal(values.status, 'ASSIGNED'); }));
  restores.push(restore(db.QrIdentityRequestItem, 'bulkCreate', async (items) => { calls.itemInsert = items.length; }));
  restores.push(restore(db.TraceabilityEvent, 'bulkCreate', async (events) => { calls.eventInsert = events.length; assert.equal(events[0].metadata.warehouse_delivery_confirmed, true); }));
  t.after(() => restores.reverse().forEach((undo) => undo()));

  const result = await service.fulfillQrIdentityRequest(41, [11, 10], {
    id: 1, area: { id: 1, code: 'ALMACEN' }, role: { code: 'WAREHOUSEMAN' },
  });

  assert.equal(result.status, 'DELIVERED');
  assert.equal(result.delivered_quantity, 2);
  assert.equal(calls.assignment, 2);
  assert.equal(calls.qrUpdate, 1);
  assert.equal(calls.itemInsert, 2);
  assert.equal(calls.eventInsert, 2);
  assert.equal(calls.delivered, 1);
});
