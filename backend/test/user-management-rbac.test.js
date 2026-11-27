'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AuthorizationService = require('../src/shared/security/authorization.service');
const { getAreaRoleOptions } = require('../src/modules/roles/roles.service');

const role = (code, area_id, level = 10, extra = {}) => ({ code, area_id, subarea_id: null, level, ...extra });

test('area admins manage only operational roles in their own area regardless of legacy role levels', () => {
  const extrusionAdmin = role('ADMIN_EXT', 2, 10);
  const supervisor = role('SUPERVISOR_EXTRUSION', 2, 50);
  const operator = role('OPERADOR_EXTRUSION', 2, 10);

  assert.equal(AuthorizationService.isAreaAdminRole(extrusionAdmin), true);
  assert.equal(AuthorizationService.canViewUser(extrusionAdmin, supervisor), true);
  assert.equal(AuthorizationService.canManageUser(extrusionAdmin, supervisor), true);
  assert.equal(AuthorizationService.canAssignRole(extrusionAdmin, supervisor), true);
  assert.equal(AuthorizationService.canChangeRole(extrusionAdmin, operator, supervisor), true);
});

test('area admins cannot manage users or assign roles outside their area or elevate to admin/global roles', () => {
  const telaresAdmin = role('ADMIN_TELARES', 3);
  assert.equal(AuthorizationService.canViewUser(telaresAdmin, role('OPERADOR_TELARES', 2)), false);
  assert.equal(AuthorizationService.canManageUser(telaresAdmin, role('ADMIN_TELARES', 3)), false);
  assert.equal(AuthorizationService.canAssignRole(telaresAdmin, role('ADMIN_GENERAL', null, 90)), false);
  assert.equal(AuthorizationService.canAssignRole(telaresAdmin, role('SUPERVISOR_TELARES', 4)), false);
});

test('all supervisor roles are denied user administration even if their legacy hierarchy would allow it', () => {
  for (const supervisorRole of [
    role('SUPERVISOR_EXTRUSION', 2, 50),
    role('SUPERVISOR_TELARES', 3, 10),
    role('SUPERVISOR_LAMINADO', 4, 50),
    role('SUPERVISOR_GLOBO', 5, 50),
    role('SUPERVISOR_CORTE', 6, 20),
    role('SUPERVISOR', 1, 20),
  ]) {
    assert.equal(AuthorizationService.canAdministerUsers({ role: supervisorRole }), false, supervisorRole.code);
    assert.equal(AuthorizationService.canViewUser(supervisorRole, role('OPERADOR_EXTRUSION', 2)), false, supervisorRole.code);
    assert.equal(AuthorizationService.canManageUser(supervisorRole, role('OPERADOR_EXTRUSION', 2)), false, supervisorRole.code);
    assert.equal(AuthorizationService.canAssignRole(supervisorRole, role('OPERADOR_EXTRUSION', 2)), false, supervisorRole.code);
  }
});

test('global administrators retain cross-area user management', () => {
  const adminGeneral = role('ADMIN_GENERAL', null, 90);
  assert.equal(AuthorizationService.canAdministerUsers({ role: adminGeneral }), true);
  assert.equal(AuthorizationService.canViewUser(adminGeneral, role('OPERADOR_GLOBO', 5)), true);
  assert.equal(AuthorizationService.canManageUser(adminGeneral, role('SUPERVISOR_CORTE', 6, 20)), true);
  assert.equal(AuthorizationService.canAssignRole(adminGeneral, role('ADMIN_LAMINADO', 4, 10)), true);
});

test('only recognized area admins receive user-management access', () => {
  assert.equal(AuthorizationService.canAdministerUsers({ role: role('ADMIN_GLOBO', 5) }), true);
  assert.equal(AuthorizationService.canAdministerUsers({ role: role('ADMIN_FINANCE', null, 10) }), false);
  assert.equal(AuthorizationService.canAdministerUsers({ role: role('OPERADOR_TELARES', 3) }), false);
});

test('laminado and globo admins receive only their area operational role options', () => {
  assert.deepEqual(getAreaRoleOptions('ADMIN_LAMINADO'), {
    roles: ['SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO'],
    areaId: 4,
  });
  assert.deepEqual(getAreaRoleOptions('ADMIN_GLOBO'), {
    roles: ['SUPERVISOR_GLOBO', 'OPERADOR_GLOBO'],
    areaId: 5,
  });
  assert.equal(getAreaRoleOptions('ADMIN_GENERAL'), null);

  const laminadoAdmin = role('ADMIN_LAMINADO', 4);
  assert.equal(AuthorizationService.canAssignRole(laminadoAdmin, role('SUPERVISOR_LAMINADO', 4)), true);
  assert.equal(AuthorizationService.canAssignRole(laminadoAdmin, role('OPERADOR_GLOBO', 5)), false);
  const globoAdmin = role('ADMIN_GLOBO', 5);
  assert.equal(AuthorizationService.canAssignRole(globoAdmin, role('SUPERVISOR_GLOBO', 5)), true);
  assert.equal(AuthorizationService.canAssignRole(globoAdmin, role('OPERADOR_LAMINADO', 4)), false);
});
