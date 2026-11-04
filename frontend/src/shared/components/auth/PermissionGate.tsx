import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { getUserAreaCode } from '@/utils/authHelpers';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission, user } = useAuthStore();
  const roleCode = String(user?.role?.code || '').toUpperCase();
  const areaSupervisorCanManageUsers = ['SUPERVISOR_EXTRUSION', 'SUPERVISOR_TELARES'].includes(roleCode)
    && getUserAreaCode(user) === (roleCode === 'SUPERVISOR_TELARES' ? 'TELARES' : 'EXTRUSION')
    && ['users.read', 'users.create', 'users.update'].includes(permission);

  if (hasPermission(permission) || areaSupervisorCanManageUsers) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
