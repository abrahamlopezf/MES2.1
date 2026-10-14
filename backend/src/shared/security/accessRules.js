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

module.exports = {
  SUPERADMIN_ROLE_CODE,
  isSuperadmin,
  isAdmin,
  isSuperadminRole,
  throwHttpError,
  assertCanAccessSuperadminResource,
};