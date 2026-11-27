'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  requireCorte,
  requireCorteOrLaminado,
  requireLaminado,
  requireProcess,
} = require('../src/modules/corte/corte.access');
const {
  canAccessTelaresRoutes,
  requireTelaresAdministrator,
  requireTelaresAreaAccess,
  requireTelaresCatalogAdministrator,
} = require('../src/modules/telares/telares.access');

const makeUser = (roleCode, areaCode) => ({
  role: { code: roleCode },
  area: { code: areaCode },
});

const invoke = (middleware, user) => {
  let nextCalled = false;
  let responseStatus;
  let responseBody;
  const result = middleware(
    { user },
    {
      status(status) { responseStatus = status; return this; },
      json(body) { responseBody = body; return body; },
    },
    () => { nextCalled = true; },
  );
  return { nextCalled, responseStatus, responseBody, result };
};

test('Corte supervisor can access demand and create routes by confirmed role code', () => {
  const user = makeUser('SUPERVISOR_CORTE', 'CORTE');
  assert.equal(invoke(requireCorte, user).nextCalled, true);
  assert.equal(invoke(requireCorteOrLaminado, user).nextCalled, true);
});

test('Corte denies other-area roles while process routes admit their destination areas', () => {
  const telares = makeUser('SUPERVISOR_TELARES', 'TELARES');
  assert.equal(invoke(requireCorte, telares).responseStatus, 403);
  assert.equal(invoke(requireProcess, telares).responseStatus, 403);
  assert.equal(invoke(requireCorteOrLaminado, telares).responseStatus, 403);
  assert.equal(invoke(requireProcess, makeUser('SUPERVISOR_LAMINADO', 'LAMINADO')).nextCalled, true);
  assert.equal(invoke(requireProcess, makeUser('SUPERVISOR_GLOBO', 'GLOBO')).nextCalled, true);
  assert.equal(invoke(requireLaminado, makeUser('SUPERVISOR_GLOBO', 'GLOBO')).responseStatus, 403);
});

test('Telares supervisor retains operating routes but cannot administer configuration', () => {
  const supervisor = makeUser('SUPERVISOR_TELARES', 'TELARES');
  assert.equal(canAccessTelaresRoutes(supervisor), true);
  assert.equal(invoke(requireTelaresAreaAccess, supervisor).nextCalled, true);
  assert.equal(invoke(requireTelaresAdministrator, supervisor).responseStatus, 403);
  assert.equal(invoke(requireTelaresCatalogAdministrator, supervisor).responseStatus, 403);
});

test('Telares rejects Corte and Globo users even when area claims point at Telares', () => {
  for (const code of ['SUPERVISOR_CORTE', 'SUPERVISOR_GLOBO', 'ADMIN_ALM']) {
    const user = makeUser(code, 'TELARES');
    assert.equal(canAccessTelaresRoutes(user), false, code);
    assert.equal(invoke(requireTelaresAreaAccess, user).responseStatus, 403, code);
  }
});

test('only Telares area administrators can change loom and PTI catalog settings', () => {
  const administrator = makeUser('ADMIN_TELARES', 'TELARES');
  assert.equal(invoke(requireTelaresAdministrator, administrator).nextCalled, true);
  assert.equal(invoke(requireTelaresCatalogAdministrator, administrator).nextCalled, true);
  assert.equal(invoke(requireTelaresAdministrator, makeUser('ADMIN_CORTE', 'CORTE')).responseStatus, 403);
});
