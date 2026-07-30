const { errorResponse } = require('../shared/responses/apiResponse');

const permissionMiddleware = (...requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];

    const isSuperAdmin = req.user?.role?.code === 'SUPERADMIN';
    const hasPermission = isSuperAdmin || requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return errorResponse(
        res,
        'No tienes permisos para realizar esta acción.',
        [
          {
            requiredPermissions,
          },
        ],
        403
      );
    }

    return next();
  };
};

module.exports = permissionMiddleware;