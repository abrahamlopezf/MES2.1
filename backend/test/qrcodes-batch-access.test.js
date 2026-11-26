const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageQrBatches, requireQrBatchManager } = require('../src/modules/qrcodes/qrBatchAccess');

test('central QR batch managers are allowed by role', () => {
  for (const code of ['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN_ALM', 'ADMIN_ALMACEN']) {
    assert.equal(canManageQrBatches({ role: { code } }), true, `${code} should be allowed`);
  }
});

test('operational roles and unrelated area admins cannot generate QR batches', () => {
  for (const code of [
    'SUPERVISOR', 'SUPERVISOR_ALMACEN', 'WAREHOUSEMAN',
    'ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION',
    'ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES',
    'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO',
    'ADMIN_GLOBO', 'SUPERVISOR_GLOBO',
    'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE',
  ]) {
    assert.equal(canManageQrBatches({ role: { code } }), false, `${code} should be denied`);
  }
  assert.equal(canManageQrBatches(null), false);
});

test('QR batch middleware rejects disallowed roles before the permission middleware', () => {
  let continued = false;
  let statusCode;
  let body;
  const req = { user: { role: { code: 'SUPERVISOR_EXTRUSION' }, permissions: ['qr.create', 'qr.generate'] } };
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };

  requireQrBatchManager(req, res, () => { continued = true; });

  assert.equal(statusCode, 403);
  assert.equal(body.error, 'QR_BATCH_MANAGEMENT_FORBIDDEN');
  assert.equal(continued, false);
});

test('QR batch middleware allows authorized roles to continue to existing permission checks', () => {
  let continued = false;
  const req = { user: { role: { code: 'ADMIN_ALM' } } };
  const res = {};

  requireQrBatchManager(req, res, () => { continued = true; });

  assert.equal(continued, true);
});
