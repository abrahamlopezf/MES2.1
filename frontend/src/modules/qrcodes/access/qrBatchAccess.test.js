import { describe, expect, it } from 'vitest';
import { canManageQrBatches } from './qrBatchAccess';

describe('QR batch management access', () => {
  it.each(['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN_ALM', 'ADMIN_ALMACEN'])(
    'allows %s',
    (roleCode) => expect(canManageQrBatches({ role: { code: roleCode } })).toBe(true),
  );

  it.each([
    'SUPERVISOR', 'WAREHOUSEMAN', 'SUPERVISOR_EXTRUSION', 'ADMIN_EXT',
    'SUPERVISOR_TELARES', 'ADMIN_TELARES', 'SUPERVISOR_LAMINADO', 'ADMIN_LAMINADO',
    'SUPERVISOR_GLOBO', 'ADMIN_GLOBO', 'OPERADOR_TELARES',
  ])('denies %s', (roleCode) => {
    expect(canManageQrBatches({ role: { code: roleCode } })).toBe(false);
  });

  it('denies a missing user or role', () => {
    expect(canManageQrBatches(null)).toBe(false);
    expect(canManageQrBatches({})).toBe(false);
  });
});
