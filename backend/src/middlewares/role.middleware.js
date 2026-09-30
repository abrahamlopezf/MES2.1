const { errorResponse } = require('../shared/responses/apiResponse');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.code;

    const isSuperAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN_GRAL';
    const hasRole = isSuperAdmin || allowedRoles.includes(userRole);

    if (!hasRole) {
      return errorResponse(
        res,
        'No tienes el rol necesario para realizar esta acción.',
        [
          {
            allowedRoles,
          },
        ],
        403
      );
    }

    return next();
  };
};

module.exports = roleMiddleware;
