import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Home,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';

const MobileBottomNav = () => {
  const { hasPermission } = useAuthStore();

  const items = [
    {
      label: 'Inicio',
      path: '/dashboard',
      icon: Home,
      permission: 'dashboard.read',
      priority: 1,
    },
    {
      label: 'QR',
      path: '/qr',
      icon: QrCode,
      permission: 'qr.read',
      priority: 2,
    },
    {
      label: 'Usuarios',
      path: '/users',
      icon: Users,
      permission: 'users.read',
      priority: 3,
    },
    {
      label: 'Roles',
      path: '/roles',
      icon: ShieldCheck,
      permission: 'roles.read',
      priority: 4,
    },
    {
      label: 'Áreas',
      path: '/areas',
      icon: Building2,
      permission: 'areas.read',
      priority: 5,
    },
    {
      label: 'Reportes',
      path: '/reports',
      icon: BarChart3,
      permission: 'reports.read',
      priority: 6,
    },
  ];

  const visibleItems = items
    .filter((item) => hasPermission(item.permission))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación móvil principal">
      {visibleItems.map((item) => {
        const Icon = item.icon;

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
            <Icon size={25} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;