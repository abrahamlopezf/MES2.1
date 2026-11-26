'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isAreaAdministrator } = require('../src/shared/security/areaRolePolicy');

const actor = (code) => ({ role: { code } });

test('area catalog write policy permits only the matching area admin and global admins', () => {
  const cases = [
    ['EXTRUSION', 'ADMIN_EXT', true], ['EXTRUSION', 'SUPERVISOR_EXTRUSION', false],
    ['TELARES', 'ADMIN_TELARES', true], ['TELARES', 'SUPERVISOR_TELARES', false],
    ['GLOBO', 'ADMIN_GLOBO', true], ['GLOBO', 'SUPERVISOR_GLOBO', false],
    ['LAMINADO', 'ADMIN_LAMINADO', true], ['LAMINADO', 'ADMIN_GLOBO', false],
    ['TELARES', 'ADMIN_GENERAL', true], ['EXTRUSION', 'SUPERADMIN', true],
  ];
  for (const [area, role, expected] of cases) {
    assert.equal(isAreaAdministrator(actor(role), area), expected, `${role} -> ${area}`);
  }
});
