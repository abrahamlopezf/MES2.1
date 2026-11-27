'use strict';

const EXECUTIVE_ROLES = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'];
const CORTE_ROLES = [...EXECUTIVE_ROLES, 'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE'];
const PROCESS_ROLES = [...EXECUTIVE_ROLES, 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO', 'ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO'];
const LAMINADO_ROLES = [...EXECUTIVE_ROLES, 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO'];
const CORTE_OR_LAMINADO_ROLES = [...CORTE_ROLES, 'ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO'];

const roleCode = (user) => String(user?.role?.code || user?.role || '').toUpperCase();
const hasRole = (user, roles) => roles.includes(roleCode(user));

const requireRoles = (roles, message) => (req, res, next) => (
  hasRole(req.user, roles)
    ? next()
    : res.status(403).json({ success: false, message })
);

const requireCorte = requireRoles(CORTE_ROLES, 'Acceso restringido al personal autorizado de Corte.');
const requireProcess = requireRoles(PROCESS_ROLES, 'Acceso restringido al personal autorizado del proceso.');
const requireLaminado = requireRoles(LAMINADO_ROLES, 'Solo Laminado puede confirmar la salida hacia Corte.');
const requireCorteOrLaminado = requireRoles(CORTE_OR_LAMINADO_ROLES, 'Acceso restringido al seguimiento de transferencias Laminado → Corte.');

module.exports = {
  CORTE_ROLES,
  CORTE_OR_LAMINADO_ROLES,
  LAMINADO_ROLES,
  PROCESS_ROLES,
  hasRole,
  requireCorte,
  requireCorteOrLaminado,
  requireLaminado,
  requireProcess,
};
