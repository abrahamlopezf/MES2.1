import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUsersQuery } from "../../modules/users/hooks/useUsers";
import { Icon, renderAnyIcon } from "../../design-system";
import { isSupervisorUser, getUserAreaCode } from "../../utils/authHelpers";

const menuGroups = [
  {
    label: "Dashboard operativo de Globo",
    path: "/globo/wip",
    icon: "air",
    permission: "",
    allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "SUPERVISOR_GLOBO"],
    isGroup: false
  },
  {
    label: "Dashboard operativo de Laminado",
    path: "/laminado/wip",
    icon: "layers",
    permission: "",
    allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "SUPERVISOR_LAMINADO"],
    isGroup: false
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    permission: ["dashboard.read", "warehouse.dashboard.view"],
    hiddenRoles: ["SUPERVISOR_GLOBO", "SUPERVISOR_LAMINADO"],
    isGroup: false
  },
  {
    label: "Gestión de Usuarios",
    icon: "manage_accounts",
    permission: ["users.read", "roles.read", "areas.read"],
    isGroup: true,
    children: [
      { label: "Usuarios", path: "/users", icon: "group", permission: "users.read" },
      { label: "Roles", path: "/roles", icon: "shield_person", permission: "roles.read", hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION"] },
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
    hiddenRoles: ["ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"],
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
      { label: "Control de Silos (PP)", path: "/warehouse/silos", icon: "propane_tank", permission: "inventory.view" },
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
    allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"],
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN"],
    isGroup: true,
    children: [
      { label: "Fórmulas y PTI", path: "/production/formulas", icon: "science", permission: "extrusion.formulas.view" },
      { label: "Máquinas Extrusoras", path: "/production/machines", icon: "precision_manufacturing", permission: "extrusion.view" },
      { label: "Centro de Mezclado", path: "/production/mixing", icon: "blender", permission: "extrusion.wip.manage" },
      { label: "Tablero de Colas", path: "/extrusion/board", icon: "view_kanban", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Terminal de Extrusión", path: "/production/extrusion", icon: "settings", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Ingreso PTI a Racks", path: "/extrusion/rack-ingress", icon: "shelves", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Órdenes de Consumo", path: "/warehouse/orders", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "Telares",
    icon: "factory",
    permission: "",
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION", "ADMIN_GLOBO", "SUPERVISOR_GLOBO", "OPERADOR_GLOBO"],
    isGroup: true,
    children: [
      { label: "Dashboard WIP & Filetas", path: "/telares/dashboard", icon: "dashboard", permission: "" },
      { label: "Catálogo Telas / Bandas", path: "/telares/catalogos", icon: "menu_book", permission: "" },
      { label: "Catálogo de Operadores", path: "/telares/operadores", icon: "group", permission: "" },
      { label: "Terminal de Telares", path: "/production/telares", icon: "precision_manufacturing", permission: "" },
      { label: "Órdenes de Consumo (ODC)", path: "/warehouse/orders?area_id=3&area_name=Telares", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "Laminado",
    icon: "layers",
    permission: "",
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION"],
    isGroup: true,
    children: [
      { label: "Catálogo de Laminado", path: "/laminado/catalogos", icon: "menu_book", permission: "", allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "ADMIN_LAMINADO"] },
      { label: "Estación de Laminado", path: "/production/laminado", icon: "layers", permission: "", allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"] },
      { label: "Órdenes de Consumo (ODC)", path: "/warehouse/orders?area_id=4&area_name=Laminado", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "Globo",
    icon: "air",
    permission: "",
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION", "ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"],
    isGroup: true,
    children: [
      { label: "Catálogo de Globo", path: "/globo/catalogos", icon: "menu_book", permission: "", allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "ADMIN_GLOBO"] },
      { label: "Estación de Globo", path: "/production/globo", icon: "air", permission: "", allowedRoles: ["ADMIN_GENERAL", "ADMIN_GRAL", "ADMIN", "SUPERADMIN", "ADMIN_GLOBO", "SUPERVISOR_GLOBO", "OPERADOR_GLOBO"] },
      { label: "Órdenes de Consumo (ODC)", path: "/warehouse/orders?area_id=5&area_name=Globo", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "QR Viajero",
    path: "/production/viajero-tracker",
    icon: "qr_code_scanner",
    permission: "",
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION"],
    isGroup: false
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
          {!isCollapsed && <span className="min-w-0 whitespace-normal break-words leading-snug">{item.label}</span>}
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
  const groupId = `nav-group-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

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
      <button
        type="button"
        onClick={handleGroupClick}
        aria-expanded={isOpen}
        aria-controls={groupId}
        title={isCollapsed ? item.label : undefined}
        className={`flex items-center text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'justify-between px-4 py-3'} rounded-lg transition-colors border-l-4 ${
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
          {!isCollapsed && <span className="min-w-0 whitespace-normal break-words leading-snug">{item.label}</span>}
        </div>
        {!isCollapsed && (
          <Icon name={isOpen ? "expand_more" : "chevron_right"} size={20} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && !isCollapsed && (
        <div id={groupId} className="flex flex-col ml-8 gap-1 mt-1 border-l border-border pl-2">
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
                  className="flex min-h-12 items-center gap-3 px-3 py-3 rounded-md transition-colors text-base text-muted-foreground hover:bg-secondary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full text-left"
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
                  `flex min-h-12 items-center gap-3 px-3 py-3 rounded-md transition-colors text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
  const { logout, hasPermission, user } = useAuthStore();
  const canApproveUsers = hasPermission("users.approve");
  const { data: allUsers = [] } = useUsersQuery({ enabled: canApproveUsers });
  const pendingUsersCount = allUsers.filter(u => u.status === 'PENDING').length;

  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isSupervisor = isSupervisorUser(user);
  const userArea = getUserAreaCode(user);

  const isWarehouseUser = !isSupervisor && (['ADMIN_ALM', 'WAREHOUSEMAN'].includes(userRole) || 
                          user?.area?.code === 'ALMACEN' || 
                          user?.area?.code === 'ALM');

  const isExtrusionAdmin = !isSupervisor && (['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(userRole) || 
                           (userArea === 'EXTRUSION' && (userRole.startsWith('ADMIN') || userRole.includes('ADMIN'))));

  const isTelaresAdmin = !isSupervisor && (['ADMIN_TELARES', 'ADMIN_TEL'].includes(userRole) || 
                         (userArea === 'TELARES' && (userRole.startsWith('ADMIN') || userRole.includes('ADMIN'))));

  const visibleMenuGroups = menuGroups
    .filter(group => {
      // 1. REGLA ESTRICTA SUPERVISORES:
      // - NUNCA tiene acceso a Gestión de Usuarios
      // - Solo tiene acceso a su propia área (las demás áreas/procesos ocultos)
      // - Dashboard e Identidad y Lotes sí están disponibles (limitados)
      if (isSupervisor) {
        if (group.label === 'Gestión de Usuarios') {
          return false;
        }
        if (group.label === 'Dashboard' || group.label === 'Identidad y Lotes') {
          return true;
        }
        if (userArea === 'EXTRUSION') {
          return group.label === 'Extrusión';
        }
        if (userArea === 'TELARES') {
          return group.label === 'Telares' || group.label === 'QR Viajero';
        }
        if (userArea === 'ALMACEN') {
          return group.label === 'Almacén';
        }
        if (userArea === 'LAMINADO') {
          return group.label === 'Dashboard operativo de Laminado' || group.label === 'Laminado' || group.label === 'QR Viajero';
        }
        if (userArea === 'GLOBO') {
          return group.label === 'Dashboard operativo de Globo' || group.label === 'Globo' || group.label === 'QR Viajero';
        }
        // Si no coincide con su área, ocultar
        return false;
      }

      if (isWarehouseUser) {
        // Para el Admin_ALM no debe de aparecer ninguna otra area o otro apartado en el sidebar mas que las siguientes:
        // 1. Su dashboard de almacen
        // 2. Gestion de Usuario pero solo usuarios, no roles
        // 3. Identidad y lotes completo
        // 4. Almacén completo
        return ['Dashboard', 'Gestión de Usuarios', 'Identidad y Lotes', 'Almacén'].includes(group.label);
      }

      if (isExtrusionAdmin) {
        // Para el Admin de Extrusión solo debe de aparecer:
        // 1. Su dashboard de Extrusión
        // 2. Gestión de Usuarios (solo usuarios de extrusión)
        // 3. Identidad y lotes
        // 4. Extrusión completo
        return ['Dashboard', 'Gestión de Usuarios', 'Identidad y Lotes', 'Extrusión'].includes(group.label);
      }

      if (isTelaresAdmin) {
        // Para el Admin de Telares solo debe de aparecer:
        // 1. Su dashboard de Telares
        // 2. Gestión de Usuarios (solo usuarios de telares)
        // 3. Identidad y lotes
        // 4. Telares completo y QR Viajero
        return ['Dashboard', 'Gestión de Usuarios', 'Identidad y Lotes', 'Telares', 'QR Viajero'].includes(group.label);
      }

      return true;
    })
    .map(group => {
      if ((isWarehouseUser || (isSupervisor && userArea === 'ALMACEN')) && group.label === 'Dashboard') {
        return { ...group, label: 'Dashboard de Almacén' };
      }
      if ((isExtrusionAdmin || (isSupervisor && userArea === 'EXTRUSION')) && group.label === 'Dashboard') {
        return { ...group, label: 'Dashboard de Extrusión' };
      }
      if ((isTelaresAdmin || (isSupervisor && userArea === 'TELARES')) && group.label === 'Dashboard') {
        return { ...group, label: 'Dashboard de Telares' };
      }
      if ((isWarehouseUser || isExtrusionAdmin || isTelaresAdmin) && group.label === 'Gestión de Usuarios') {
        return {
          ...group,
          children: group.children?.filter(child => child.path === '/users')
        };
      }
      return group;
    });

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
          {visibleMenuGroups.map((group, index) => (
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
