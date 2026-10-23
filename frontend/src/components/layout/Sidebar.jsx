import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUsersQuery } from "../../modules/users/hooks/useUsers";
import { Icon, renderAnyIcon } from "../../design-system";

const menuGroups = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    permission: ["dashboard.read", "warehouse.dashboard.view"],
    isGroup: false
  },
  {
    label: "Gestión de Usuarios",
    icon: "manage_accounts",
    permission: ["users.read", "roles.read", "areas.read"],
    isGroup: true,
    children: [
      { label: "Usuarios", path: "/users", icon: "group", permission: "users.read" },
      { label: "Roles", path: "/roles", icon: "shield_person", permission: "roles.read" },
      //{ label: "Áreas", path: "/areas", icon: "apartment", permission: "areas.read" }
    ]
  },
  {
    label: "Identidad y Lotes",
    icon: "qr_code_2",
    permission: ["qr.create", "qr.history.read", "qr.events.read"],
    isGroup: true,
    children: [
      { label: "Generar Lote", path: "/identity/generate", icon: "qr_code", permission: "qr.create" },
      { label: "Historial QRs", path: "/qrcodes", icon: "format_list_bulleted", permission: ["qr.history.read", "qr.events.read"] }
    ]
  },
  {
    label: "Almacén",
    icon: "warehouse",
    permission: "",
    hiddenRoles: ["ADMIN_EXT"],
    isGroup: true,
    children: [
      { label: "Catálogo", path: "/materials", icon: "inventory_2", permission: "materials.read" },
      { 
        label: "Recepción", 
        onClick: () => window.dispatchEvent(new Event('open-scanner')), 
        icon: "move_to_inbox", 
        permission: "inventory.receive",
        allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_ALM"]
      },
      { label: "Inventario", path: "/warehouse/inventory", icon: "inventory", permission: "inventory.view" },
      // { label: "Inventario de Área", path: "/warehouse/area-inventory", icon: "layers", permission: "inventory.view", hiddenRoles: ["SUPERADMIN", "ADMIN_GRAL"] },
      { label: "Control Merma/Scrap", path: "/warehouse/merma-scrap", icon: "delete_sweep", permission: "warehouse.merma_scrap.view" },
      { label: "Órdenes de Consumo", path: "/warehouse/orders", icon: "assignment", permission: "" },
      { 
        label: "Reportes de Almacén", 
        path: "/warehouse/reports", 
        icon: "bar_chart", 
        permission: "", 
        allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_ALM"] 
      }
    ]
  },
  {
    label: "Extrusión",
    icon: "precision_manufacturing",
    permission: "extrusion.view",
    allowedRoles: ["SUPERADMIN"],
    isGroup: true,
    children: [
      { label: "Fórmulas y PTI", path: "/production/formulas", icon: "science", permission: "extrusion.formulas.view" },
      { label: "Máquinas Extrusoras", path: "/production/machines", icon: "precision_manufacturing", permission: "extrusion.view" },
      { label: "Centro de Mezclado", path: "/production/mixing", icon: "blender", permission: "extrusion.wip.manage" },
      { label: "Tablero de Colas", path: "/extrusion/board", icon: "view_kanban", permission: "extrusion.view", allowedRoles: ["SUPERADMIN"] },
      { label: "Terminal de Extrusión", path: "/production/extrusion", icon: "settings", permission: "extrusion.view", allowedRoles: ["SUPERADMIN"] },
      { label: "Ingreso PTI a Racks", path: "/extrusion/rack-ingress", icon: "shelves", permission: "extrusion.view", allowedRoles: ["SUPERADMIN"] },
      { label: "Órdenes de Consumo", path: "/warehouse/orders", icon: "assignment", permission: "" }
    ]
  }
];

const SidebarItem = ({ item, pendingUsersCount, isCollapsed, onExpand, onMobileClick }) => {
  const { hasPermission, hasAnyPermission, user } = useAuthStore();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(
    item.children?.some(child => location.pathname.includes(child.path)) || false
  );

  let hasAccess = Array.isArray(item.permission)
    ? hasAnyPermission(item.permission)
    : hasPermission(item.permission);

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isHiddenForRole = item.hiddenRoles?.some(r => r.toUpperCase() === userRole);
  const isAllowedRole = !item.allowedRoles || item.allowedRoles.some(r => r.toUpperCase() === userRole);
  if (!hasAccess || isHiddenForRole || !isAllowedRole) return null;

  if (!item.isGroup) {
    return (
      <NavLink
        to={item.path}
        title={isCollapsed ? item.label : undefined}
        onClick={() => {
          if (window.innerWidth < 1024 && typeof onMobileClick === 'function') {
            onMobileClick();
          }
        }}
        className={({ isActive }) =>
          `flex items-center ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'justify-between px-4 py-3'} rounded-lg transition-colors border-l-4 ${
            isActive
              ? "bg-primary/10 text-primary border-primary font-bold"
              : "text-foreground hover:bg-secondary/50 border-transparent hover:border-border/50"
          }`
        }
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'gap-4'}`}>
          {renderAnyIcon(item.icon, {
            size: 24,
            className: `shrink-0 ${location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`
          })}
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
          {renderAnyIcon(item.icon, {
            size: 24,
            className: `shrink-0 ${isActiveGroup ? "text-primary" : "text-muted-foreground"}`
          })}
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
        {!isCollapsed && (
          <Icon name={isOpen ? "expand_more" : "chevron_right"} size={20} className="shrink-0 text-muted-foreground" />
        )}
      </div>

      {isOpen && !isCollapsed && (
        <div className="flex flex-col ml-8 gap-1 mt-1 border-l border-border pl-2">
          {item.children?.map(child => {
            const hasChildAccess = Array.isArray(child.permission)
              ? hasAnyPermission(child.permission)
              : hasPermission(child.permission);
            const isHiddenForRole = child.hiddenRoles?.some(r => r.toUpperCase() === userRole);
            const isAllowedRole = !child.allowedRoles || child.allowedRoles.some(r => r.toUpperCase() === userRole);
            if (!hasChildAccess || isHiddenForRole || !isAllowedRole) return null;
            if (child.onClick) {
              return (
                <button
                  key={child.label}
                  onClick={child.onClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground w-full text-left"
                >
                  {renderAnyIcon(child.icon, { size: 20, className: "shrink-0" })}
                  <span>{child.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={() => {
                  if (window.innerWidth < 1024 && typeof onMobileClick === 'function') {
                    onMobileClick();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`
                }
              >
                {renderAnyIcon(child.icon, { size: 20, className: "shrink-0" })}
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
                <Icon name="dock_to_left" size={22} className="absolute inset-0 m-auto text-primary-foreground opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300" />
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
              <Icon name="dock_to_left" size={22} />
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
              onMobileClick={() => setMobileIsOpen(false)}
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
            <Icon name="logout" size={24} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
