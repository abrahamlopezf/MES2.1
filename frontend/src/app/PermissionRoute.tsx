import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface PermissionRouteProps {
  permissions: string[];
  children: React.ReactNode;
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ permissions, children }) => {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);

  return hasAnyPermission(permissions) ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export default PermissionRoute;
