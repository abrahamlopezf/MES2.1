'use strict';

const GLOBAL_ADMIN_CODES = new Set(['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL']);
const AREA_ADMIN_CODES = {
  ALMACEN: new Set(['ADMIN_ALM', 'ADMIN_ALMACEN']),
  EXTRUSION: new Set(['ADMIN_EXT', 'ADMIN_EXTRUSION']),
  TELARES: new Set(['ADMIN_TELARES', 'ADMIN_TEL']),
  LAMINADO: new Set(['ADMIN_LAMINADO']),
  GLOBO: new Set(['ADMIN_GLOBO']),
  CORTE: new Set(['ADMIN_CORTE']),
};

const getRoleCode = (roleOrUser) => {
  const role = roleOrUser?.role || roleOrUser;
  return String(typeof role === 'string' ? role : (role?.code || role?.name || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
};

const isGlobalAdministrator = (roleOrUser) => GLOBAL_ADMIN_CODES.has(getRoleCode(roleOrUser));
const isAreaAdministrator = (roleOrUser, area) => {
  const code = getRoleCode(roleOrUser);
  return isGlobalAdministrator(roleOrUser) || Boolean(AREA_ADMIN_CODES[String(area).toUpperCase()]?.has(code));
};

module.exports = { GLOBAL_ADMIN_CODES, AREA_ADMIN_CODES, getRoleCode, isGlobalAdministrator, isAreaAdministrator };
