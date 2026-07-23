/**
 * Motor de Autorización Basado en Capacidades (RBAC Orientado a Permisos Frecuentes).
 */

export type AppPermission = 
  // Identity Center
  | 'identity.batch.generate'
  | 'identity.batch.approve'
  | 'identity.print'
  | 'identity.custody.transfer'
  // Traceability
  | 'traceability.consume'
  | 'traceability.generateChild'
  // Inventory
  | 'inventory.transfer'
  // Scrap
  | 'scrap.generate';

export interface AuthUser {
  id: string;
  roles: string[];
  permissions: AppPermission[];
}

/**
 * Evalúa si el usuario activo tiene una capacidad específica.
 */
export const can = (user: AuthUser | null, permission: AppPermission): boolean => {
  if (!user) return false;
  // Bypass para SuperAdmin
  if (user.roles.includes('superadmin')) return true;
  
  return user.permissions.includes(permission);
};

/**
 * Evalúa si el usuario activo tiene un rol específico.
 */
export const hasRole = (user: AuthUser | null, role: string): boolean => {
  if (!user) return false;
  return user.roles.includes(role);
};
