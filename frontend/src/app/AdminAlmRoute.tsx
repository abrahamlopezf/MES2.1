import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AdminAlmRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isAdminAlm = ['ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode);

  if (!isAdminAlm) {
    return <Navigate to="/warehouse/inventory" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminAlmRoute;
