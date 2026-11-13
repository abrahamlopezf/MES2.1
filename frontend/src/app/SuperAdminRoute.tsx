import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isSupervisorUser, isAdminUser, canManageUsers, getUserAreaCode } from '../utils/authHelpers';

const telaresMenuPaths = [
  '/telares/dashboard',
  '/production/telares-dashboard',
  '/telares/catalogos',
  '/telares/operadores',
  '/production/viajero-tracker',
  '/production/telares',
  '/production/corte',
  '/telares/odc',
  '/telares/scrap-control',
];
const hasTelaresMenuAccess = (pathname: string) => telaresMenuPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const SuperAdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const isAllowed = isAdminUser(user) || canManageUsers(user);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const GlobalAdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!isAdminUser(user)) return <Navigate to="/dashboard" replace />;
  return children ? <>{children}</> : <Outlet />;
};

export const UsersManagementRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const roleCode = String(typeof user?.role === 'string' ? user.role : user?.role?.code || '').toUpperCase();
  const isAllowed = isAdminUser(user) || canManageUsers(user) || ['SUPERVISOR_EXTRUSION', 'SUPERVISOR_TELARES'].includes(roleCode);
  if (!isAllowed) return <Navigate to="/dashboard" replace />;
  return children ? <>{children}</> : <Outlet />;
};

export const ExtrusionRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode)) return children ? <>{children}</> : <Outlet />;
  if (['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode)) {
    return children ? <>{children}</> : <Outlet />;
  }

  const isSupervisor = isSupervisorUser(user);
  const userArea = getUserAreaCode(user);

  // Un supervisor de cualquier otra área NO puede acceder a Extrusión
  if (isSupervisor) {
    if (userArea !== 'EXTRUSION') {
      return <Navigate to="/dashboard" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // Operadores u otros roles
  if (['ADMIN_ALM', 'WAREHOUSEMAN'].includes(roleCode) || userArea === 'ALMACEN') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllowed = userArea === 'EXTRUSION';

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const TelaresRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode)) return children ? <>{children}</> : <Outlet />;
  if (['ADMIN_TELARES', 'ADMIN_TEL'].includes(roleCode)) {
    if (!hasTelaresMenuAccess(location.pathname)) return <Navigate to="/telares/catalogos" replace />;
    return children ? <>{children}</> : <Outlet />;
  }

  if (['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN', 'ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSupervisor = isSupervisorUser(user);
  const userArea = getUserAreaCode(user);

  // Un supervisor de cualquier otra área NO puede acceder a Telares
  if (isSupervisor) {
    if (userArea !== 'TELARES') {
      return <Navigate to="/dashboard" replace />;
    }
    if (!hasTelaresMenuAccess(location.pathname)) return <Navigate to="/telares/catalogos" replace />;
    return children ? <>{children}</> : <Outlet />;
  }

  if (userArea === 'ALMACEN' || userArea === 'EXTRUSION') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllowed = ['TELARES', 'CORTE'].includes(userArea);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const AreaProductionRoute: React.FC<{ area: 'GLOBO' | 'LAMINADO'; children?: React.ReactNode }> = ({ area, children }) => {
  const { user } = useAuthStore();
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const allowedRoles = area === 'GLOBO'
    ? ['ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO']
    : ['ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO'];
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode)) return children ? <>{children}</> : <Outlet />;
  if (allowedRoles.includes(roleCode)) return children ? <>{children}</> : <Outlet />;
  return <Navigate to="/dashboard" replace />;
};

export const GloboRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AreaProductionRoute area="GLOBO">{children}</AreaProductionRoute>
);

export const LaminadoRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AreaProductionRoute area="LAMINADO">{children}</AreaProductionRoute>
);

export const CorteRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const roleCode = String(typeof user?.role === 'string' ? user.role : user?.role?.code || user?.role?.name || '').toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE'].includes(roleCode)) {
    return children ? <>{children}</> : <Outlet />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const WarehouseRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  // Órdenes de Consumo también es el punto de entrada para que Extrusión solicite
  // materiales al Almacén. Limitar esta excepción a esa pantalla mantiene el resto
  // del módulo de Almacén protegido por las reglas habituales.
  const isConsumptionOrdersPage = location.pathname.replace(/\/+$/, '') === '/warehouse/orders';
  if (isConsumptionOrdersPage && getUserAreaCode(user) === 'EXTRUSION') {
    return children ? <>{children}</> : <Outlet />;
  }

  if (isAdminUser(user)) {
    return children ? <>{children}</> : <Outlet />;
  }

  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  if (['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode)) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (['ADMIN_EXT', 'ADMIN_EXTRUSION', 'ADMIN_TELARES', 'ADMIN_TEL'].includes(roleCode)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSupervisor = isSupervisorUser(user);
  const userArea = getUserAreaCode(user);

  // Un supervisor de cualquier otra área NO puede acceder a Almacén
  if (isSupervisor) {
    if (userArea !== 'ALMACEN') {
      return <Navigate to="/dashboard" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  if (userArea === 'EXTRUSION' || userArea === 'TELARES') {
    return <Navigate to="/dashboard" replace />;
  }

  const isAllowed = 
    ['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN'].includes(roleCode) ||
    userArea === 'ALMACEN';

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ExtrusionRoute;
