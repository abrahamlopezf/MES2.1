/**
 * Centralized authorization, supervisor role, and area helpers for frontend.
 */

export const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'];

export const AREA_ADMIN_ROLES = [
  'ADMIN_EXT',
  'ADMIN_EXTRUSION',
  'ADMIN_ALM',
  'ADMIN_ALMACEN',
  'ADMIN_TELARES',
  'ADMIN_TEL',
];

export const isAdminUser = (user: any): boolean => {
  if (!user) return false;
  const roleCode = String(
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.code || user?.role?.name || ''
  ).toUpperCase();
  return ADMIN_ROLES.includes(roleCode);
};

export const isSupervisorUser = (user: any): boolean => {
  if (!user) return false;
  const roleCode = String(
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.code || user?.role?.name || ''
  ).toUpperCase();
  const roleName = String(user?.role?.name || '').toUpperCase();
  return roleCode.startsWith('SUPERVISOR') || roleName.includes('SUPERVISOR');
};

export const isAreaAdminUser = (user: any): boolean => {
  if (!user) return false;
  if (isSupervisorUser(user)) return false;
  const roleCode = String(
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.code || user?.role?.name || ''
  ).toUpperCase();
  const roleName = String(user?.role?.name || '').toUpperCase();
  return (
    AREA_ADMIN_ROLES.includes(roleCode) ||
    roleCode.startsWith('ADMIN_') ||
    (roleName.includes('ADMIN') && !roleName.includes('SUPERVISOR'))
  );
};

export const canViewCosts = (user: any): boolean => {
  if (!user) return false;
  // Supervisors of ANY area must NEVER see costs or cost calculations
  if (isSupervisorUser(user)) return false;
  const roleCode = String(
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.code || user?.role?.name || ''
  ).toUpperCase();
  return (
    isAdminUser(user) ||
    isAreaAdminUser(user) ||
    ['FINANCE', 'FINANZAS'].includes(roleCode)
  );
};

export const canManageCosts = (user: any): boolean => {
  if (!user) return false;
  if (isSupervisorUser(user)) return false;
  return canViewCosts(user);
};

export const canManageUsers = (user: any): boolean => {
  if (!user) return false;
  if (isSupervisorUser(user)) return false;
  return isAdminUser(user) || isAreaAdminUser(user);
};

export const getUserAreaCode = (user: any): string => {
  if (!user) return '';
  const areaCode = String(user?.area?.code || user?.role?.area?.code || '').toUpperCase();
  if (areaCode) return areaCode;

  const areaId = Number(user?.area?.id || user?.areaId || user?.role?.area?.id || user?.role?.area_id);
  if (areaId === 1) return 'ALMACEN';
  if (areaId === 2) return 'EXTRUSION';
  if (areaId === 3) return 'TELARES';
  if (areaId === 4) return 'LAMINADO';
  if (areaId === 5) return 'GLOBO';

  const roleCode = String(
    typeof user?.role === 'string'
      ? user.role
      : user?.role?.code || user?.role?.name || ''
  ).toUpperCase();

  if (roleCode.includes('EXTRUSION') || roleCode === 'ADMIN_EXT') return 'EXTRUSION';
  if (roleCode.includes('TELARES')) return 'TELARES';
  if (roleCode.includes('ALMACEN') || roleCode.includes('ALM')) return 'ALMACEN';
  if (roleCode.includes('LAMINADO')) return 'LAMINADO';
  if (roleCode.includes('GLOBO')) return 'GLOBO';
  return '';
};

export const getUserAreaId = (user: any): number | null => {
  if (!user) return null;
  const id = user?.area?.id || user?.areaId || user?.role?.area?.id || user?.role?.area_id;
  if (id) return Number(id);

  const areaCode = getUserAreaCode(user);
  if (areaCode === 'ALMACEN') return 1;
  if (areaCode === 'EXTRUSION') return 2;
  if (areaCode === 'TELARES') return 3;
  if (areaCode === 'LAMINADO') return 4;
  if (areaCode === 'GLOBO') return 5;
  return null;
};
