import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  Users,
  Boxes,
  LogOut,
  ChevronDown,
  ChevronRight,
  Search,
  List,
  Printer,
  ShieldCheck,
  MapPin,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  Package,
  PackagePlus,
  AlertTriangle
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUsersQuery } from "../../modules/users/hooks/useUsers";

const menuGroups = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    permission: ["dashboard.read", "warehouse.dashboard.view"],
    isGroup: false
  },
  {
    label: "Gestión de Usuarios",
    icon: Users,
    permission: ["users.read", "roles.read", "areas.read"],
    isGroup: true,
    children: [
      { label: "Usuarios", path: "/users", icon: UserIcon, permission: "users.read" },
      { label: "Roles", path: "/roles", icon: ShieldCheck, permission: "roles.read" },
      //{ label: "Áreas", path: "/areas", icon: MapPin, permission: "areas.read" }
    ]
  },
  {
    label: "Identidad y Lotes",
    icon: QrCode,
    permission: "qr.create",
    isGroup: true,
    children: [
      { label: "Generar Lote", path: "/identity/generate", icon: Printer, permission: "qr.create" }
    ]
  },
  {
    label: "Almacén",
    icon: Boxes,
    permission: "inventory.view",
    isGroup: true,
    children: [
      { label: "Catálogo", path: "/materials", icon: Package, permission: "materials.read" },
      { label: "Recepción", onClick: () => window.dispatchEvent(new Event('open-scanner')), icon: PackagePlus, permission: "inventory.receive" },
      { label: "Inventario", path: "/warehouse/inventory", icon: List, permission: "inventory.view" },
      { label: "Control Merma/Scrap", path: "/warehouse/merma-scrap", icon: AlertTriangle, permission: "warehouse.merma_scrap.view" }
    ]
  }
];

const SidebarItem = ({ item, pendingUsersCount, isCollapsed, onExpand }) => {
  const { hasPermission, hasAnyPermission, user } = useAuthStore();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(
    item.children?.some(child => location.pathname.includes(child.path)) || false
  );

  let hasAccess = Array.isArray(item.permission)
    ? hasAnyPermission(item.permission)
    : hasPermission(item.permission);

  if (!hasAccess) return null;

  if (!item.isGroup) {
    return (
      <NavLink
        to={item.path}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          `flex items-center ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'justify-between px-4 py-3'} rounded-lg transition-colors border-l-4 ${
            isActive
              ? "bg-primary/10 text-primary border-primary font-bold"
              : "text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
          }`
        }
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'gap-4'}`}>
          <item.icon size={26} className={`shrink-0 ${location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
        {!isCollapsed && item.path === '/users' && pendingUsersCount > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingUsersCount}
          </span>
        )}
        {/* On collapsed, show small dot if pending users */}
        {isCollapsed && item.path === '/users' && pendingUsersCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full"></span>
        )}
      </NavLink>
    );
  }

  const isActiveGroup = item.children?.some(child => location.pathname === child.path);

  const handleGroupClick = () => {
    if (isCollapsed) {
      onExpand();
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="flex flex-col gap-1 relative">
      <div
        onClick={handleGroupClick}
        title={isCollapsed ? item.label : undefined}
        className={`flex items-center cursor-pointer ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'justify-between px-4 py-3'} rounded-lg transition-colors border-l-4 ${
          isActiveGroup
            ? "bg-secondary text-primary border-primary/50 font-bold"
            : "text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
        }`}
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'gap-4'}`}>
          <item.icon size={26} className={`shrink-0 ${isActiveGroup ? "text-primary" : "text-muted-foreground"}`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
        {!isCollapsed && (
          isOpen ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />
        )}
      </div>

      {isOpen && !isCollapsed && (
        <div className="flex flex-col ml-8 gap-1 mt-1 border-l border-border pl-2">
          {item.children?.map(child => {
            if (!hasPermission(child.permission)) return null;
            if (child.onClick) {
              return (
                <button
                  key={child.label}
                  onClick={child.onClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground w-full text-left"
                >
                  <child.icon size={22} />
                  <span>{child.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`
                }
              >
                <child.icon size={22} />
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen: mobileIsOpen, setIsOpen: setMobileIsOpen }) => {
  const { logout, hasPermission } = useAuthStore();
  const canApproveUsers = hasPermission("users.approve");
  const { data: allUsers = [] } = useUsersQuery({ enabled: canApproveUsers });
  const pendingUsersCount = allUsers.filter(u => u.status === 'PENDING').length;

  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  return (
    <aside
      className={`
        fixed lg:relative top-0 left-0 bottom-0 z-40
        ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} h-full flex-shrink-0 flex flex-col justify-between overflow-hidden
        bg-card border-r border-border
        transition-all duration-300 ease-in-out shadow-md lg:shadow-none group
        ${mobileIsOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="flex flex-col h-full w-full relative">
        {/* Logo Section */}
        <div className={`h-20 flex items-center shrink-0 border-b border-border ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
          
          <div 
            className={`flex items-center min-w-0 ${isCollapsed ? 'cursor-pointer w-10 h-10 group/logo' : ''}`}
            onClick={() => isCollapsed && setIsCollapsed(false)}
            title={isCollapsed ? "Expandir menú" : undefined}
          >
            <div className={`w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 ${!isCollapsed ? 'hover:rotate-6' : ''} relative overflow-hidden`}>
              <span className={`text-primary-foreground font-bold text-xl leading-none transition-opacity duration-300 ${isCollapsed ? 'group-hover/logo:opacity-0' : ''}`}>TF</span>
              {isCollapsed && (
                <PanelLeftOpen size={24} className="absolute inset-0 m-auto text-primary-foreground opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300" strokeWidth={2.5} />
              )}
            </div>
            {!isCollapsed && (
              <div className="ml-3 flex flex-col whitespace-nowrap animate-in fade-in duration-300 overflow-hidden">
                <span className="font-bold text-lg text-foreground tracking-tight truncate">TraceFlow</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Industrial Core</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-md transition-colors"
              title="Ocultar menú"
            >
              <PanelLeftClose size={22} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 ${isCollapsed ? 'px-2' : 'px-4'} flex flex-col gap-2 overflow-y-auto custom-scrollbar`}>
          {menuGroups.map((group, index) => (
            <SidebarItem 
              key={index} 
              item={group} 
              pendingUsersCount={pendingUsersCount} 
              isCollapsed={isCollapsed}
              onExpand={() => setIsCollapsed(false)}
            />
          ))}
        </nav>

        {/* Logout Bottom */}
        <div className="p-4 shrink-0 border-t border-border">
          <button
            onClick={logout}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-4 px-4 py-3'} rounded-lg text-danger hover:bg-danger/10 transition-colors font-bold`}
          >
            <LogOut size={26} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
