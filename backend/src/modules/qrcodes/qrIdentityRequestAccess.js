'use strict';

const GLOBAL_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL']);

// Role/area pairings already used by the authorization and area access policies.
// Keep this capability explicit: a stale/mistyped area claim must never turn an
// unrelated account into a warehouse fulfiller.
const ROLE_AREA = Object.freeze({
  ADMIN_ALM: { code: 'ALMACEN', id: 1, warehouse: true },
  ADMIN_ALMACEN: { code: 'ALMACEN', id: 1, warehouse: true },
  SUPERVISOR_ALMACEN: { code: 'ALMACEN', id: 1, warehouse: true },
  WAREHOUSEMAN: { code: 'ALMACEN', id: 1, warehouse: true },
  SUPERVISOR: { code: 'ALMACEN', id: 1, warehouse: true },
  ADMIN_EXT: { code: 'EXTRUSION', id: 2 },
  ADMIN_EXTRUSION: { code: 'EXTRUSION', id: 2 },
  SUPERVISOR_EXTRUSION: { code: 'EXTRUSION', id: 2 },
  OPERADOR_EXTRUSION: { code: 'EXTRUSION', id: 2 },
  ADMIN_TELARES: { code: 'TELARES', id: 3 },
  ADMIN_TEL: { code: 'TELARES', id: 3 },
  SUPERVISOR_TELARES: { code: 'TELARES', id: 3 },
  OPERADOR_TELARES: { code: 'TELARES', id: 3 },
  ADMIN_LAMINADO: { code: 'LAMINADO', id: 4 },
  SUPERVISOR_LAMINADO: { code: 'LAMINADO', id: 4 },
  OPERADOR_LAMINADO: { code: 'LAMINADO', id: 4 },
  ADMIN_GLOBO: { code: 'GLOBO', id: 5 },
  SUPERVISOR_GLOBO: { code: 'GLOBO', id: 5 },
  OPERADOR_GLOBO: { code: 'GLOBO', id: 5 },
  ADMIN_CORTE: { code: 'CORTE', id: 6 },
  SUPERVISOR_CORTE: { code: 'CORTE', id: 6 },
  OPERADOR_CORTE: { code: 'CORTE', id: 6 },
});

const getRoleCode = (user) => String(typeof user?.role === 'string' ? user.role : user?.role?.code || '').trim().toUpperCase();
const getPolicy = (user) => ROLE_AREA[getRoleCode(user)] || null;

const isAreaClaimConsistent = (user, policy) => {
  if (!policy) return false;
  const areaCode = String(user?.area?.code || user?.role?.area?.code || '').trim().toUpperCase();
  const areaId = Number(user?.area?.id || user?.areaId || user?.role?.area?.id || user?.role?.area_id || 0) || null;
  if (!areaCode && !areaId) return false;
  if (areaCode && areaCode !== policy.code) return false;
  if (areaId && areaId !== policy.id) return false;
  return true;
};

const getAreaCode = (user) => {
  const policy = getPolicy(user);
  return isAreaClaimConsistent(user, policy) ? policy.code : '';
};

const getAreaId = (user) => {
  const policy = getPolicy(user);
  return isAreaClaimConsistent(user, policy) ? policy.id : null;
};

const isWarehouseQrClerk = (user) => {
  const policy = getPolicy(user);
  return !GLOBAL_ROLES.has(getRoleCode(user)) && Boolean(policy?.warehouse && isAreaClaimConsistent(user, policy));
};

const canRequestQrForOwnArea = (user) => {
  const roleCode = getRoleCode(user);
  const policy = getPolicy(user);
  return !GLOBAL_ROLES.has(roleCode) && Boolean(policy && !policy.warehouse && isAreaClaimConsistent(user, policy));
};

module.exports = { canRequestQrForOwnArea, getAreaCode, getAreaId, isWarehouseQrClerk };
