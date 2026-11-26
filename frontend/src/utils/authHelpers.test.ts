import { describe, expect, it } from 'vitest';
import { canManageUsers, canViewCosts, getUserAreaCode, isAreaAdminUser, isSupervisorUser } from './authHelpers';

const user = (code: string, areaId: number | null) => ({
  role: { code, area_id: areaId },
});

describe('user administration visibility policy', () => {
  it('denies the module to supervisors in every area', () => {
    for (const code of [
      'SUPERVISOR',
      'SUPERVISOR_EXTRUSION',
      'SUPERVISOR_TELARES',
      'SUPERVISOR_LAMINADO',
      'SUPERVISOR_GLOBO',
      'SUPERVISOR_CORTE',
    ]) {
      const actor = user(code, 2);
      expect(isSupervisorUser(actor)).toBe(true);
      expect(canManageUsers(actor)).toBe(false);
    }
  });

  it('allows explicit area admins and global administrators', () => {
    for (const [code, areaId] of [
      ['ADMIN_ALM', 1],
      ['ADMIN_EXT', 2],
      ['ADMIN_TELARES', 3],
      ['ADMIN_LAMINADO', 4],
      ['ADMIN_GLOBO', 5],
      ['ADMIN_CORTE', 6],
    ] as const) {
      const actor = user(code, areaId);
      expect(isAreaAdminUser(actor)).toBe(true);
      expect(canManageUsers(actor)).toBe(true);
    }
    expect(canManageUsers(user('ADMIN_GENERAL', null))).toBe(true);
    expect(canManageUsers(user('SUPERADMIN', null))).toBe(true);
  });

  it('does not treat unrelated roles with an ADMIN prefix as area administrators', () => {
    expect(canManageUsers(user('ADMIN_FINANCE', null))).toBe(false);
    expect(canManageUsers(user('OPERADOR_TELARES', 3))).toBe(false);
  });

  it('restricts cost visibility to global and recognized area admins', () => {
    expect(canViewCosts(user('ADMIN_LAMINADO', 4))).toBe(true);
    expect(canViewCosts(user('ADMIN_GENERAL', null))).toBe(true);
    expect(canViewCosts(user('SUPERVISOR_LAMINADO', 4))).toBe(false);
    expect(canViewCosts(user('ADMIN_FINANCE', null))).toBe(false);
    expect(canViewCosts(user('FINANCE', null))).toBe(false);
  });
});

describe('operational area resolution', () => {
  it('resolves Corte by its role even when the cached area is absent', () => {
    expect(getUserAreaCode(user('SUPERVISOR_CORTE', null))).toBe('CORTE');
  });

  it('resolves Corte from the configured area ID', () => {
    expect(getUserAreaCode(user('OPERADOR', 6))).toBe('CORTE');
  });
});
