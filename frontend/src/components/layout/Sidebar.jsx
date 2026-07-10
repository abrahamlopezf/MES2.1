import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
  Boxes,
  X,
} from 'lucide-react';

import UserSessionBox from './UserSessionBox';
import { useAuthStore } from '../../store/authStore';

const Sidebar = ({ isOpen, onClose }) => {
  const { hasPermission } = useAuthStore();

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      permission: 'dashboard.read',
    },
    {
      label: 'Códigos QR',
      path: '/qr',
      icon: QrCode,
      permission: 'qr.read',
    },
    {
      label: 'Usuarios',
      path: '/users',
      icon: Users,
      permission: 'users.read',
    },
    {
      label: 'Roles',
      path: '/roles',
      icon: ShieldCheck,
      permission: 'roles.read',
    },
    {
      label: 'Áreas',
      path: '/areas',
      icon: Building2,
      permission: 'areas.read',
    },
    {
      label: 'Materiales',
      path: '/materials',
      icon: Boxes,
      permission: 'materials.read',
    },
    {
      label: 'Reportes',
      path: '/reports',
      icon: BarChart3,
      permission: 'reports.read',
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    hasPermission(item.permission)
  );

  return (
    <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div>
          <span className="brand-mark">TF</span>
        </div>

        <div className="brand-text">
          <strong>TraceFlow</strong>
          <span>Control operativo QR</span>
        </div>

        <button
          type="button"
          className="sidebar-close-button"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Menú principal">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
              }
              onClick={onClose}
            >
              <Icon size={26} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <UserSessionBox />
    </aside>
  );
};

export default Sidebar;