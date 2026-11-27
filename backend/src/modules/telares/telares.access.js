'use strict';

const { isAreaAdministrator } = require('../../shared/security/areaRolePolicy');

const EXECUTIVE_ROLES = new Set(['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN']);
const TELARES_ROLES = new Set(['ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES', 'OPERADOR_TELARES']);

const getRoleCode = (user) => String(user?.role?.code || (typeof user?.role === 'string' ? user.role : '')).toUpperCase();
const canAccessTelaresRoutes = (user) => {
  const code = getRoleCode(user);
  return EXECUTIVE_ROLES.has(code) || TELARES_ROLES.has(code);
};
const requireTelaresAreaAccess = (req, res, next) => (
  canAccessTelaresRoutes(req.user)
    ? next()
    : res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado de Telares.' })
);
const requireTelaresAdministrator = (req, res, next) => (
  isAreaAdministrator(req.user, 'TELARES')
    ? next()
    : res.status(403).json({ success: false, message: 'Solo administración de Telares puede modificar esta configuración.' })
);
const requireTelaresCatalogAdministrator = (req, res, next) => (
  isAreaAdministrator(req.user, 'TELARES')
    ? next()
    : res.status(403).json({ success: false, message: 'Solo administración de Telares puede modificar fichas PTI.' })
);

module.exports = {
  canAccessTelaresRoutes,
  getRoleCode,
  requireTelaresAreaAccess,
  requireTelaresAdministrator,
  requireTelaresCatalogAdministrator,
};
