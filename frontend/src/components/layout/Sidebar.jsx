import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  Users,
  Boxes,
  LogOut,
  ChevronDown,
  ChevronRight,
  Factory,
  Combine,
  Search,
  List,
  Printer
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUsersQuery } from "../../modules/users/hooks/useUsers";

const menuGroups = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.read",
    isGroup: false
  },
  {
    label: "Usuarios",
    path: "/users",
    icon: Users,
    permission: "users.read",
    isGroup: false
  },
  {
    label: "Generación de QR",
    icon: QrCode,
    permission: "dashboard.read", // Temporalmente
    isGroup: true,
    children: [
      { label: "Escanear QR", path: "#", icon: QrCode, permission: "dashboard.read", onClick: () => window.dispatchEvent(new Event('open-scanner')) },
      { label: "Generar Lote", path: "/identity/generate", icon: Printer, permission: "dashboard.read" },
      { label: "Historial QRs", path: "/qrcodes", icon: List, permission: "dashboard.read" }
    ]
  },
  {
    label: "Almacén",
    icon: Boxes,
    permission: "dashboard.read", // Temporalmente
    isGroup: true,
    children: [
      { label: "Catálogo", path: "/materials", icon: Search, permission: "dashboard.read" },
      { label: "Inventario", path: "/warehouse/inventory", icon: List, permission: "dashboard.read" },
      { label: "Recepción (Terminal)", path: "/warehouse/receive", icon: Boxes, permission: "dashboard.read" }
    ]
  },
  {
    label: "Extrusión",
    icon: Factory,
    permission: "dashboard.read", // Temporalmente
    isGroup: true,
    children: [
      { label: "Terminal", path: "/production/extrusion", icon: Factory, permission: "dashboard.read" }
    ]
  },
  {
    label: "Telares",
    icon: Combine,
    permission: "dashboard.read", // Temporalmente
    isGroup: true,
    children: [
      // En construcción o usar endpoints futuros
    ]
  }
];

const SidebarItem = ({ item, pendingUsersCount }) => {
  const { hasPermission } = useAuthStore();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(
    item.children?.some(child => location.pathname.includes(child.path)) || false
  );

  if (!hasPermission(item.permission)) return null;

  if (!item.isGroup) {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `flex items-center justify-between px-4 py-3 rounded-lg transition-colors border-l-4 ${
            isActive
              ? "bg-primary/10 text-primary border-primary font-bold"
              : "text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
          }`
        }
      >
        <div className="flex items-center gap-4">
          <item.icon size={22} className={location.pathname === item.path ? "text-primary" : "text-muted-foreground"} />
          <span className="whitespace-nowrap">{item.label}</span>
        </div>
        {item.path === '/users' && pendingUsersCount > 0 && (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {pendingUsersCount}
          </span>
        )}
      </NavLink>
    );
  }

  const isActiveGroup = item.children?.some(child => location.pathname === child.path);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors border-l-4 ${
          isActiveGroup
            ? "bg-secondary text-primary border-primary/50 font-bold"
            : "text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
        }`}
      >
        <div className="flex items-center gap-4">
          <item.icon size={22} className={isActiveGroup ? "text-primary" : "text-muted-foreground"} />
          <span className="whitespace-nowrap">{item.label}</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isOpen && (
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
                  <child.icon size={18} />
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
                <child.icon size={18} />
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout, hasPermission } = useAuthStore();
  const canApproveUsers = hasPermission("users.approve");
  const { data: allUsers = [] } = useUsersQuery({ enabled: canApproveUsers });
  const pendingUsersCount = allUsers.filter(u => u.status === 'PENDING').length;

  return (
    <aside
      className={`
        fixed lg:relative top-0 left-0 bottom-0 z-40
        w-[280px] h-full flex-shrink-0 flex flex-col justify-between overflow-hidden
        bg-card border-r border-border
        transition-transform duration-300 ease-in-out shadow-md lg:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="flex flex-col h-full w-full">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-5 shrink-0 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-primary-foreground font-bold text-xl leading-none">TF</span>
          </div>
          <div className="ml-4 flex flex-col whitespace-nowrap">
            <span className="font-bold text-lg text-foreground tracking-tight">TraceFlow</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industrial Core</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
          {menuGroups.map((group, index) => (
            <SidebarItem key={index} item={group} pendingUsersCount={pendingUsersCount} />
          ))}
        </nav>

        {/* Logout Bottom */}
        <div className="p-4 shrink-0 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-danger hover:bg-danger/10 transition-colors font-bold"
          >
            <LogOut size={22} />
            <span className="whitespace-nowrap">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
