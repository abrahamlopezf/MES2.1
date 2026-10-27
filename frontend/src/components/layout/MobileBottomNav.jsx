import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { renderAnyIcon } from '../../design-system';
import { isAdminUser } from '../../utils/authHelpers';

const MobileBottomNav = () => {
  const { hasPermission, user } = useAuthStore();
  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isWarehouseUser = !isAdminUser(user) && (['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN'].includes(userRole) ||
                          user?.area?.code === 'ALMACEN' || 
                          user?.area?.code === 'ALM');

  const items = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: 'home',
      permission: 'dashboard.read',
      priority: 1,
    },
    {
      label: 'QR',
      path: '/qr',
      icon: 'qr_code_scanner',
      permission: 'qr.read',
      priority: 2,
    },
    /* {
      label: 'Usuarios',
      path: '/users',
      icon: 'group',
      permission: 'users.read',
      priority: 3,
    }, */
    {
      label: 'Roles',
      path: '/roles',
      icon: 'shield_person',
      permission: 'roles.read',
      priority: 4,
    },
    {
      label: 'Áreas',
      path: '/areas',
      icon: 'apartment',
      permission: 'areas.read',
      priority: 5,
    },
    {
      label: 'Reportes',
      path: '/reports',
      icon: 'bar_chart',
      permission: 'reports.read',
      priority: 6,
    },
  ];

  const visibleItems = items
    .filter((item) => {
      if (isWarehouseUser && ['/roles', '/areas', '/reports'].includes(item.path)) {
        return false;
      }
      return hasPermission(item.permission);
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil principal">
      {visibleItems.map((item) => {
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'mobile-bottom-link mobile-bottom-link-active'
                : 'mobile-bottom-link'
            }
          >
            {renderAnyIcon(item.icon, { size: 24 })}
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
