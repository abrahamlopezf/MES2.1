'use strict';

const { errorResponse } = require('../shared/responses/apiResponse');

const FINANCIAL_ROLE_CODES = new Set([
  'SUPERADMIN',
  'ADMIN_GRAL',
  'ADMIN_GENERAL',
  'ADMIN',
]);

const requireFinancialAccess = (req, res, next) => {
  const roleCode = req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '');

  if (FINANCIAL_ROLE_CODES.has(String(roleCode).toUpperCase())) {
    return next();
  }

  return errorResponse(
    res,
    'No tienes permisos para consultar información financiera.',
    [{ allowedRoles: [...FINANCIAL_ROLE_CODES] }],
    403
  );
};

module.exports = requireFinancialAccess;
