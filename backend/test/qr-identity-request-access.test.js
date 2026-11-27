'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canRequestQrForOwnArea, getAreaCode, getAreaId, isWarehouseQrClerk } = require('../src/modules/qrcodes/qrIdentityRequestAccess');

const user = (roleCode, areaCode, areaId) => ({
  id: 10,
  role: { code: roleCode },
  area: { code: areaCode, id: areaId },
});

test('confirmed operational roles can request identities only for their mapped area', () => {
  for (const [role, area, id] of [
    ['SUPERVISOR_CORTE', 'CORTE', 6],
    ['SUPERVISOR_EXTRUSION', 'EXTRUSION', 2],
    ['SUPERVISOR_TELARES', 'TELARES', 3],
    ['SUPERVISOR_LAMINADO', 'LAMINADO', 4],
    ['SUPERVISOR_GLOBO', 'GLOBO', 5],
    ['OPERADOR_TELARES', 'TELARES', 3],
  ]) {
    const actor = user(role, area, id);
    assert.equal(canRequestQrForOwnArea(actor), true, role);
    assert.equal(getAreaCode(actor), area, role);
    assert.equal(getAreaId(actor), id, role);
  }
});

test('warehouse fulfillment is limited to approved warehouse roles and consistent area claims', () => {
  for (const role of ['ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERVISOR_ALMACEN', 'WAREHOUSEMAN', 'SUPERVISOR']) {
    assert.equal(isWarehouseQrClerk(user(role, 'ALMACEN', 1)), true, role);
  }
  assert.equal(isWarehouseQrClerk(user('SUPERVISOR_CORTE', 'ALMACEN', 1)), false);
  assert.equal(isWarehouseQrClerk({ role: { code: 'SUPERVISOR', area: null } }), false);
  assert.equal(isWarehouseQrClerk(user('ADMIN_ALM', 'CORTE', 6)), false);
});

test('global, unknown, and mismatched roles cannot create requests or fulfill them', () => {
  for (const actor of [
    user('SUPERADMIN', 'ALMACEN', 1),
    user('OPERADOR_TELARES', 'CORTE', 6),
    user('UNLISTED_ROLE', 'EXTRUSION', 2),
  ]) {
    assert.equal(canRequestQrForOwnArea(actor), false);
    assert.equal(isWarehouseQrClerk(actor), false);
    assert.equal(getAreaId(actor), null);
  }
});
