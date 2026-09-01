const SUPERADMIN_ROLE_CODE = 'SUPERADMIN';
const ADMIN_GENERAL_ROLE_CODE = 'ADMIN_GENERAL';

const isSuperadmin = (user) => {
  return user?.role?.code === SUPERADMIN_ROLE_CODE || user?.role?.code === ADMIN_GENERAL_ROLE_CODE;
};

const isAdmin = (user) => {
  return user?.role?.code === 'ADMIN' || user?.role?.code === ADMIN_GENERAL_ROLE_CODE;
};

const isSuperadminRole = (role) => {
  return role?.code === SUPERADMIN_ROLE_CODE || role?.code === ADMIN_GENERAL_ROLE_CODE;
};

const throwHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const assertCanAccessSuperadminResource = (currentUser, targetRoleCode) => {
  if (targetRoleCode === SUPERADMIN_ROLE_CODE && currentUser?.role?.code !== SUPERADMIN_ROLE_CODE) {
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