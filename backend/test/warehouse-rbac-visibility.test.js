'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getAreaInventoryScope, hideCostsUnlessAuthorized } = require('../src/modules/warehouse/warehouse.service');
const roleMiddleware = require('../src/middlewares/role.middleware');

const actor = (code, areaId = null) => ({ role: { code, area_id: areaId } });

test('area inventory is scoped to the caller area; only global admins see all areas', () => {
  assert.deepEqual(getAreaInventoryScope(actor('ADMIN_ALM', 1)), { area_id: 1 });
  assert.deepEqual(getAreaInventoryScope(actor('SUPERVISOR_EXTRUSION', 2)), { area_id: 2 });
  assert.deepEqual(getAreaInventoryScope(actor('ADMIN_TELARES', 3)), { area_id: 3 });
  assert.deepEqual(getAreaInventoryScope(actor('ADMIN_GENERAL')), {});
  assert.throws(() => getAreaInventoryScope(actor('OPERADOR', null)), { statusCode: 403 });
});

test('financial fields are removed recursively for supervisors and retained for area admins', () => {
  const payload = {
    lote: { unit_cost: 12.5, invoice_unit_cost_usd: 2, folio: 'F-1' },
    report: [{ total_loss_cost: 5, warehouse_value: 25, quantity: 3 }],
  };

  assert.deepEqual(hideCostsUnlessAuthorized(payload, actor('SUPERVISOR_EXTRUSION', 2)), {
    lote: { folio: 'F-1' },
    report: [{ quantity: 3 }],
  });
  assert.deepEqual(hideCostsUnlessAuthorized(payload, actor('ADMIN_EXT', 2)), payload);
});

test('warehouse-wide reports and stock mutations stay within Warehouse roles and global admins', () => {
  const authorizeWarehouseArea = roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN', 'SUPERVISOR');
  const canContinue = (code) => {
    let allowed = false;
    let statusCode = null;
    const req = { user: actor(code, code === 'SUPERVISOR_EXTRUSION' ? 2 : 1) };
    const res = {
      status(value) { statusCode = value; return this; },
      json() { return this; },
    };
    authorizeWarehouseArea(req, res, () => { allowed = true; });
    return { allowed, statusCode };
  };

  for (const code of ['ADMIN_ALM', 'WAREHOUSEMAN', 'SUPERVISOR', 'ADMIN_GENERAL', 'SUPERADMIN']) {
    assert.equal(canContinue(code).allowed, true, code);
  }
  assert.deepEqual(canContinue('SUPERVISOR_EXTRUSION'), { allowed: false, statusCode: 403 });
  assert.deepEqual(canContinue('ADMIN_TELARES'), { allowed: false, statusCode: 403 });
});
