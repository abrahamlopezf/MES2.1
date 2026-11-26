const QR_BATCH_MANAGER_ROLES = new Set([
  'SUPERADMIN',
  'ADMIN',
  'ADMIN_GRAL',
  'ADMIN_GENERAL',
  'ADMIN_ALM',
  'ADMIN_ALMACEN',
]);

const getRoleCode = (user) => String(
  typeof user?.role === 'string'
    ? user.role
    : user?.role?.code || user?.role?.name || ''
).trim().toUpperCase();

const canManageQrBatches = (user) => QR_BATCH_MANAGER_ROLES.has(getRoleCode(user));

const requireQrBatchManager = (req, res, next) => {
  if (!canManageQrBatches(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'La generación de lotes QR está centralizada en Superadmin, administración general y administración de Almacén.',
      error: 'QR_BATCH_MANAGEMENT_FORBIDDEN',
    });
  }

  return next();
};

module.exports = {
  QR_BATCH_MANAGER_ROLES,
  canManageQrBatches,
  requireQrBatchManager,
};
