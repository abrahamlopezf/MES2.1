import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ExtrusionRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, hasPermission } = useAuthStore();
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const areaCode = (user?.area?.code || '').toUpperCase();
  const areaId = user?.area?.id || (user as any)?.areaId;

  const isAllowed = 
    ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'SUPERVISOR_EXTRUSION'].includes(roleCode) ||
    areaCode === 'EXTRUSION' ||
    areaId === 2 ||
    (typeof hasPermission === 'function' && hasPermission('extrusion.view'));

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const SuperAdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isAllowed = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const TelaresRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, hasPermission } = useAuthStore();
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const areaCode = (user?.area?.code || '').toUpperCase();
  const areaId = user?.area?.id || (user as any)?.areaId;

  const isAllowed = 
    ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'SUPERVISOR', 'OPERADOR', 'SUPERVISOR_EXTRUSION'].includes(roleCode) ||
    ['TELARES', 'LAMINADO', 'GLOBO', 'CORTE'].includes(areaCode) ||
    [3, 4, 5, 6].includes(Number(areaId)) ||
    (typeof hasPermission === 'function' && (hasPermission('telares.view') || hasPermission('production.view')));

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ExtrusionRoute;
