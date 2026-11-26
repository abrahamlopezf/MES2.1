'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canViewCosts, isAreaAdmin } = require('../src/shared/security/accessRules');

const actor = (code, areaId = null) => ({ role: { code, area_id: areaId } });

test('financial visibility is limited to global and recognized area administrators', () => {
  for (const [code, areaId] of [
    ['SUPERADMIN', null], ['ADMIN_GENERAL', null], ['ADMIN_GRAL', null], ['ADMIN', null],
    ['ADMIN_ALM', 1], ['ADMIN_EXT', 2], ['ADMIN_TELARES', 3],
    ['ADMIN_LAMINADO', 4], ['ADMIN_GLOBO', 5], ['ADMIN_CORTE', 6],
  ]) {
    assert.equal(canViewCosts(actor(code, areaId)), true, code);
  }

  for (const [code, areaId] of [
    ['SUPERVISOR', 1], ['SUPERVISOR_EXTRUSION', 2], ['OPERADOR_TELARES', 3],
    ['ADMIN_FINANCE', null], ['FINANCE', null], ['ADMIN_UNRELATED', null],
  ]) {
    assert.equal(isAreaAdmin(actor(code, areaId)), false, code);
    assert.equal(canViewCosts(actor(code, areaId)), false, code);
  }
});
