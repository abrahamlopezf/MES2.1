export const QR_BATCH_MANAGER_ROLES = [
  'SUPERADMIN',
  'ADMIN',
  'ADMIN_GRAL',
  'ADMIN_GENERAL',
  'ADMIN_ALM',
  'ADMIN_ALMACEN',
];

export const getQrRoleCode = (user) => String(
  typeof user?.role === 'string'
    ? user.role
    : user?.role?.code || user?.role?.name || ''
).trim().toUpperCase();

export const canManageQrBatches = (user) => QR_BATCH_MANAGER_ROLES.includes(getQrRoleCode(user));
