import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUsersQuery } from "../../modules/users/hooks/useUsers";
import { Icon, renderAnyIcon } from "../../design-system";
import { isAdminUser, isSupervisorUser, getUserAreaCode, ADMIN_ROLES } from "../../utils/authHelpers";

const menuGroups = [
  {
    label: "Dashboard operativo de Globo",
    path: "/globo/wip",
    icon: "air",
    permission: "",
    allowedRoles: ["ADMIN_GLOBO", "SUPERVISOR_GLOBO", "OPERADOR_GLOBO"],
    isGroup: false
  },
  {
    label: "Dashboard operativo de Laminado",
    path: "/laminado/wip",
    icon: "layers",
    permission: "",
    allowedRoles: ["ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"],
    isGroup: false
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    permission: ["dashboard.read", "warehouse.dashboard.view"],
    hiddenRoles: ["SUPERVISOR_GLOBO", "SUPERVISOR_LAMINADO", "OPERADOR_GLOBO", "OPERADOR_LAMINADO"],
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
        allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_ALM", "ADMIN_ALMACEN"]
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
        allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_ALM", "ADMIN_ALMACEN"]
      }
    ]
  },
  {
    label: "Extrusión",
    icon: "precision_manufacturing",
    permission: "extrusion.view",
    allowedRoles: ["ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION", "OPERADOR_EXTRUSION"],
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN"],
    isGroup: true,
    children: [
      { label: "WIP de Extrusión", path: "/extrusion/wip", icon: "inventory_2", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION", "OPERADOR_EXTRUSION"] },
      { label: "Máquinas Extrusoras", path: "/production/machines", icon: "precision_manufacturing", permission: "extrusion.view" },
      { label: "Fórmulas y PTI", path: "/production/formulas", icon: "science", permission: "extrusion.formulas.view" },
      { label: "Centro de Mezclado", path: "/production/mixing", icon: "blender", permission: "extrusion.wip.manage" },
      { label: "Terminal de Extrusión", path: "/production/extrusion", icon: "settings", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Tablero de Colas", path: "/extrusion/board", icon: "view_kanban", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Ingreso PTI a Racks", path: "/extrusion/rack-ingress", icon: "shelves", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] },
      { label: "Órdenes de Consumo", path: "/warehouse/orders", icon: "assignment", permission: "" },
      { label: "Control de Merma/Scrap", path: "/extrusion/scrap-control", icon: "scale", permission: "extrusion.view", allowedRoles: ["SUPERADMIN", "ADMIN_GRAL", "ADMIN_GENERAL", "ADMIN", "ADMIN_EXT", "ADMIN_EXTRUSION", "SUPERVISOR_EXTRUSION"] }
    ]
  },
  {
    label: "Telares",
    icon: "factory",
    permission: "",
    allowedRoles: ["ADMIN_TELARES", "ADMIN_TEL", "SUPERVISOR_TELARES", "OPERADOR_TELARES"],
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
    allowedRoles: ["ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"],
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION"],
    isGroup: true,
    children: [
      { label: "Catálogo de Laminado", path: "/laminado/catalogos", icon: "menu_book", permission: "", allowedRoles: ["ADMIN_LAMINADO"] },
      { label: "Estación de Laminado", path: "/production/laminado", icon: "layers", permission: "", allowedRoles: ["ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"] },
      { label: "Órdenes de Consumo (ODC)", path: "/warehouse/orders?area_id=4&area_name=Laminado", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "Globo",
    icon: "air",
    permission: "",
    allowedRoles: ["ADMIN_GLOBO", "SUPERVISOR_GLOBO", "OPERADOR_GLOBO"],
    hiddenRoles: ["ADMIN_ALM", "WAREHOUSEMAN", "ADMIN_EXT", "ADMIN_EXTRUSION", "ADMIN_LAMINADO", "SUPERVISOR_LAMINADO", "OPERADOR_LAMINADO"],
    isGroup: true,
    children: [
      { label: "Catálogo de Globo", path: "/globo/catalogos", icon: "menu_book", permission: "", allowedRoles: ["ADMIN_GLOBO"] },
      { label: "Estación de Globo", path: "/production/globo", icon: "air", permission: "", allowedRoles: ["ADMIN_GLOBO", "SUPERVISOR_GLOBO", "OPERADOR_GLOBO"] },
      { label: "Órdenes de Consumo (ODC)", path: "/warehouse/orders?area_id=5&area_name=Globo", icon: "assignment", permission: "" }
    ]
  },
  {
    label: "QR Viajero",
    path: "/production/viajero-tracker",
    icon: "qr_code_scanner",
    permission: "",
    allowedRoles: ["ADMIN_TELARES", "ADMIN_TEL", "SUPERVISOR_TELARES", "OPERADOR_TELARES"],
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
  const hasActiveChild = item.children?.some(child =>
    location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)
  );

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild, location.pathname]);

  let hasAccess = Array.isArray(item.permission)
    ? hasAnyPermission(item.permission)
    : hasPermission(item.permission);

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isExtrusionSupervisor = userRole === 'SUPERVISOR_EXTRUSION';
  const isGlobalAdmin = ADMIN_ROLES.includes(userRole);
  const isHiddenForRole = item.hiddenRoles?.some(r => r.toUpperCase() === userRole);
  const isAllowedRole = isGlobalAdmin || !item.allowedRoles || item.allowedRoles.some(r => r.toUpperCase() === userRole);
  if ((!hasAccess && !isGlobalAdmin && !isExtrusionSupervisor) || (isHiddenForRole && !isGlobalAdmin) || !isAllowedRole) return null;

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
          `relative flex min-h-11 items-center ${isCollapsed ? 'justify-center w-12 h-12 p-0 mx-auto' : 'justify-between px-3.5 py-2.5'} rounded-xl transition-colors border-l-2 ${
            isActive
              ? "bg-primary/10 text-primary border-primary font-semibold"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground border-transparent"
          }`
        }
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'gap-3.5'}`}>
          {renderAnyIcon(item.icon, {
            size: 21,
            className: `shrink-0 ${location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`
          })}
          {!isCollapsed && <span className="min-w-0 whitespace-normal break-words text-sm leading-snug">{item.label}</span>}
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

  const isActiveGroup = hasActiveChild;
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
        className={`flex min-h-11 items-center text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isCollapsed ? 'lg:justify-center lg:w-12 lg:h-12 lg:min-h-0 lg:p-0 lg:mx-auto' : 'justify-between px-3.5 py-2.5'} rounded-xl transition-colors border-l-2 ${
          isActiveGroup
            ? "bg-primary/10 text-primary border-primary font-semibold"
            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground border-transparent"
        }`}
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center lg:w-full' : 'gap-3.5'}`}>
          {renderAnyIcon(item.icon, {
            size: 21,
            className: `shrink-0 ${isActiveGroup ? "text-primary" : "text-muted-foreground"}`
          })}
          <span className={`min-w-0 whitespace-normal break-words leading-snug ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        </div>
        {!isCollapsed && (
          <Icon name={isOpen ? "expand_more" : "chevron_right"} size={20} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && !isCollapsed && (
        <div id={groupId} className="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3 lg:ml-5">
          {item.children?.map(child => {
            const hasChildAccess = Array.isArray(child.permission)
              ? hasAnyPermission(child.permission)
              : hasPermission(child.permission);
            const isGlobalAdmin = ADMIN_ROLES.includes(userRole);
            const isHiddenForRole = child.hiddenRoles?.some(r => r.toUpperCase() === userRole);
            const isAllowedRole = isGlobalAdmin || isExtrusionSupervisor || !child.allowedRoles || child.allowedRoles.some(r => r.toUpperCase() === userRole);
            if ((!hasChildAccess && !isGlobalAdmin && !isExtrusionSupervisor) || (isHiddenForRole && !isGlobalAdmin) || !isAllowedRole) return null;
            if (child.onClick) {
              return (
                <button
                  key={child.label}
                  onClick={child.onClick}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
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
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const isCompact = isCollapsed && isDesktop;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = (event) => setIsDesktop(event.matches);
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isExtrusionSupervisor = userRole === 'SUPERVISOR_EXTRUSION';
  const isExecutive = isAdminUser(user);
  const isSupervisor = isSupervisorUser(user);
  const userArea = getUserAreaCode(user);

  const isWarehouseUser = !isExecutive && !isSupervisor && (['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN'].includes(userRole) ||
                          user?.area?.code === 'ALMACEN' || 
                          user?.area?.code === 'ALM');

  const isExtrusionAdmin = !isExecutive && !isSupervisor && (['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(userRole) ||
                           (userArea === 'EXTRUSION' && (userRole.startsWith('ADMIN') || userRole.includes('ADMIN'))));

  const isTelaresAdmin = !isExecutive && !isSupervisor && (['ADMIN_TELARES', 'ADMIN_TEL'].includes(userRole) ||
                         (userArea === 'TELARES' && (userRole.startsWith('ADMIN') || userRole.includes('ADMIN'))));

  const visibleMenuGroups = menuGroups
    .filter(group => {
      // El dashboard principal de SUPERADMIN y ADMIN_GRAL es ejecutivo; no mostrarles
      // accesos directos duplicados a los dashboards operativos de Globo y Laminado.
      if (isExecutive && ['Dashboard operativo de Globo', 'Dashboard operativo de Laminado'].includes(group.label)) {
        return false;
      }

      // 1. REGLA ESTRICTA SUPERVISORES:
      // - Solo Supervisor de Extrusión puede acceder a usuarios de su área
      // - Solo tiene acceso a su propia área (las demás áreas/procesos ocultos)
      // - Dashboard e Identidad y Lotes sí están disponibles (limitados)
      if (isSupervisor) {
        if (group.label === 'Gestión de Usuarios') {
          return userRole === 'SUPERVISOR_EXTRUSION' && userArea === 'EXTRUSION';
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
        return { ...group, label: 'Dashboard de Extrusión', path: '/extrusion/dashboard' };
      }
      if ((isTelaresAdmin || (isSupervisor && userArea === 'TELARES')) && group.label === 'Dashboard') {
        return { ...group, label: 'Dashboard de Telares' };
      }
      if ((isWarehouseUser || isExtrusionAdmin || isTelaresAdmin || (isSupervisor && userRole === 'SUPERVISOR_EXTRUSION')) && group.label === 'Gestión de Usuarios') {
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
        w-[280px] ${isCompact ? 'lg:w-[80px]' : 'lg:w-[280px]'} h-full flex-shrink-0 flex flex-col justify-between overflow-hidden
        bg-card border-r border-border
        transition-[width,transform] duration-200 ease-out shadow-md lg:shadow-none group
        ${mobileIsOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="flex flex-col h-full w-full relative">
        {/* Logo Section */}
        <div className={`h-[72px] flex items-center shrink-0 border-b border-border ${isCompact ? 'justify-center px-0' : 'justify-between px-4'}`}>
          
          <div 
            className={`flex items-center min-w-0 ${isCompact ? 'cursor-pointer w-10 h-10 group/logo' : ''}`}
            onClick={() => isCompact && setIsCollapsed(false)}
            title={isCompact ? "Expandir menú" : undefined}
          >
            <div className={`w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm ${isCompact ? '' : 'hover:rotate-3'} relative overflow-hidden`}>
              <span className={`text-primary-foreground font-bold text-xl leading-none ${isCompact ? 'group-hover/logo:opacity-0' : ''}`}>TF</span>
              {isCompact && (
                <Icon name="dock_to_left" size={22} className="absolute inset-0 m-auto text-primary-foreground opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300" />
              )}
            </div>
            {!isCompact && (
              <div className="ml-3 flex flex-col whitespace-nowrap animate-in fade-in duration-300 overflow-hidden">
                <span className="font-bold text-lg text-foreground tracking-tight truncate">TraceFlow</span>
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Industrial Core</span>
              </div>
            )}
          </div>

          {!isCompact && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-2 ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Ocultar menú"
              aria-label="Contraer menú"
            >
              <Icon name="dock_to_left" size={22} />
            </button>
          )}
          <button
            onClick={() => setMobileIsOpen(false)}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Cerrar menú de navegación"
            title="Cerrar menú"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar py-4 ${isCompact ? 'px-2' : 'px-3'} flex flex-col gap-1.5`} aria-label="Navegación principal">
          {!isCompact && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Navegación</p>}
          {visibleMenuGroups.map((group, index) => (
            <SidebarItem 
              key={index} 
              item={group} 
              pendingUsersCount={pendingUsersCount} 
              isCollapsed={isCompact}
              onExpand={() => setIsCollapsed(false)}
              onMobileClick={() => setMobileIsOpen(false)}
            />
          ))}
        </nav>

        {/* Logout Bottom */}
        <div className="shrink-0 border-t border-border p-3">
          <button
            onClick={logout}
            title={isCompact ? "Cerrar Sesión" : undefined}
            aria-label="Cerrar sesión"
            className={`w-full flex min-h-11 items-center ${isCompact ? 'justify-center p-3' : 'gap-3.5 px-3.5 py-2.5'} rounded-xl text-danger hover:bg-danger/10 transition-colors font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <Icon name="logout" size={24} className="shrink-0" />
            {!isCompact && <span className="whitespace-nowrap text-sm">Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
