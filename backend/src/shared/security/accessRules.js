const SUPERADMIN_ROLE_CODE = 'SUPERADMIN';
const ADMIN_GENERAL_ROLE_CODE = 'ADMIN_GENERAL';
const ADMIN_ROLE_CODE = 'ADMIN';
const ADMIN_GRAL_ROLE_CODE = 'ADMIN_GRAL';

const ADMIN_ROLES = [SUPERADMIN_ROLE_CODE, ADMIN_GENERAL_ROLE_CODE, ADMIN_GRAL_ROLE_CODE, ADMIN_ROLE_CODE];

const isSuperadmin = (user) => {
  return ADMIN_ROLES.includes(user?.role?.code);
};

const isAdmin = (user) => {
  return ADMIN_ROLES.includes(user?.role?.code);
};

const isSuperadminRole = (role) => {
  return ADMIN_ROLES.includes(role?.code);
};

const throwHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const assertCanAccessSuperadminResource = (currentUser, targetRoleCode) => {
  if (targetRoleCode === SUPERADMIN_ROLE_CODE && !ADMIN_ROLES.includes(currentUser?.role?.code)) {
    throwHttpError('Recurso no encontrado o no tienes permisos suficientes.', 404);
  }
};

const AREA_ADMIN_ROLES = [
  'ADMIN_EXT',
  'ADMIN_EXTRUSION',
  'ADMIN_ALM',
  'ADMIN_ALMACEN',
  'ADMIN_TELARES',
  'ADMIN_TEL',
];

const isSupervisor = (user) => {
  if (!user) return false;
  const code = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  const name = (user?.role?.name || '').toUpperCase();
  return code.startsWith('SUPERVISOR') || name.includes('SUPERVISOR');
};

const isAreaAdmin = (user) => {
  if (!user) return false;
  if (isSupervisor(user)) return false;
  const code = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  const name = (user?.role?.name || '').toUpperCase();
  return (
    AREA_ADMIN_ROLES.includes(code) ||
    code.startsWith('ADMIN_') ||
    (name.includes('ADMIN') && !name.includes('SUPERVISOR'))
  );
};

const canViewCosts = (user) => {
  if (!user) return false;
  if (isSupervisor(user)) return false;
  const code = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  return (
    ADMIN_ROLES.includes(code) ||
    isAreaAdmin(user) ||
    ['FINANCE', 'FINANZAS'].includes(code)
  );
};

const canManageCosts = (user) => {
  if (!user) return false;
  if (isSupervisor(user)) return false;
  return canViewCosts(user);
};

const getUserAreaId = (user) => {
  return (
    user?.area?.id ||
    user?.areaId ||
    user?.role?.area_id ||
    user?.role?.area?.id ||
    (['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION'].includes(user?.role?.code) ? 2 : null) ||
    (['ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES'].includes(user?.role?.code) ? 3 : null) ||
    (['ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERVISOR'].includes(user?.role?.code) ? 1 : null) ||
    null
  );
};

const getUserAreaCode = (user) => {
  const code = (user?.area?.code || user?.role?.area?.code || '').toUpperCase();
  if (code) return code;
  const areaId = getUserAreaId(user);
  if (areaId === 1) return 'ALMACEN';
  if (areaId === 2) return 'EXTRUSION';
  if (areaId === 3) return 'TELARES';
  if (areaId === 4) return 'LAMINADO';
  if (areaId === 5) return 'GLOBO';
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  if (roleCode.includes('EXTRUSION') || roleCode === 'ADMIN_EXT') return 'EXTRUSION';
  if (roleCode.includes('TELARES')) return 'TELARES';
  if (roleCode.includes('ALMACEN') || roleCode.includes('ALM')) return 'ALMACEN';
  if (roleCode.includes('LAMINADO')) return 'LAMINADO';
  if (roleCode.includes('GLOBO')) return 'GLOBO';
  return '';
};

module.exports = {
  SUPERADMIN_ROLE_CODE,
  AREA_ADMIN_ROLES,
  isSuperadmin,
  isAdmin,
  isSuperadminRole,
  isSupervisor,
  isAreaAdmin,
  canViewCosts,
  canManageCosts,
  getUserAreaId,
  getUserAreaCode,
  throwHttpError,
  assertCanAccessSuperadminResource,
};