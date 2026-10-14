import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const SuperAdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.code === 'SUPERADMIN';

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SuperAdminRoute;
