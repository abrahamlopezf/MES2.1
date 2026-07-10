const SUPERADMIN_ROLE_CODE = 'SUPERADMIN';

const isSuperadmin = (user) => {
  return user?.role?.code === SUPERADMIN_ROLE_CODE;
};

const isAdmin = (user) => {
  return user?.role?.code === 'ADMIN';
};

const isSuperadminRole = (role) => {
  return role?.code === SUPERADMIN_ROLE_CODE;
};

const throwHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const assertCanAccessSuperadminResource = (currentUser, targetRoleCode) => {
  if (targetRoleCode === SUPERADMIN_ROLE_CODE && !isSuperadmin(currentUser)) {
    throwHttpError('Recurso no encontrado.', 404);
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