import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users,
  Boxes,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const menuItems = [
  { label: 'Control Operativo', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { label: 'Recepción', path: '/recepcion', icon: Boxes, permission: 'materials.read' },
  { label: 'Mezclado', path: '/formulas', icon: Boxes, permission: 'materials.read' },
  { label: 'Extrusión', path: '/extrusion', icon: Boxes, permission: 'materials.read' },
  { label: 'Desperdicios', path: '/scrap', icon: Boxes, permission: 'materials.read' },
  { label: 'Calidad QA', path: '/calidad', icon: ShieldCheck, permission: 'materials.read' },
  { label: 'Códigos QR', path: '/qr', icon: QrCode, permission: 'qr.read' },
  { label: 'Usuarios', path: '/users', icon: Users, permission: 'users.read' },
  { label: 'Roles', path: '/roles', icon: ShieldCheck, permission: 'roles.read' },
  { label: 'Áreas', path: '/areas', icon: Building2, permission: 'areas.read' },
  { label: 'Reportes', path: '/reports', icon: BarChart3, permission: 'reports.read' },
  { label: 'Laboratorio (UI)', path: '/playground', icon: Boxes, permission: 'dashboard.read' },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { hasPermission, logout } = useAuthStore();
  const visibleMenuItems = menuItems.filter((item) => hasPermission(item.permission));

  return (
    <aside
      className={`
        fixed lg:relative top-0 left-0 bottom-0 z-40
        w-[280px] h-full flex-shrink-0 flex flex-col justify-between overflow-hidden
        bg-card border-r border-border
        transition-transform duration-300 ease-in-out shadow-md lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="flex flex-col h-full w-full">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-5 shrink-0 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-xl leading-none">TF</span>
          </div>
          <div className="ml-4 flex flex-col whitespace-nowrap">
            <span className="font-bold text-lg text-foreground tracking-tight">TraceFlow</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industrial Core</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-lg transition-colors border-l-4 ${
                    isActive
                      ? 'bg-primary/10 text-primary border-primary font-bold'
                      : 'text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="whitespace-nowrap">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Bottom */}
        <div className="p-4 shrink-0 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-danger hover:bg-danger/10 transition-colors font-bold"
          >
            <LogOut size={22} />
            <span className="whitespace-nowrap">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;