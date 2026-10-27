import React from 'react';
import { 
  Package, 
  Layers, 
  QrCode, 
  Factory, 
  Users, 
  ChevronLeft, 
  ArrowRight,
  BarChart3,
  AlertTriangle,
  MonitorPlay,
  Wind,
  Boxes,
  ClipboardList,
  Beaker,
  ShieldCheck,
  Printer,
  List,
  PackagePlus
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { isAdminUser } from '../../../utils/authHelpers';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();
  const { group } = useParams();
  const { hasPermission, hasAnyPermission, user } = useAuthStore() as any;

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isGlobalAdmin = isAdminUser(user);

  const allAreas = [
    { 
      id: 'almacen', 
      title: 'Almacén General', 
      description: 'Inventario, Movimientos y Reportes', 
      icon: Package,
      gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-500',
      hiddenRoles: ['ADMIN_EXT'],
      children: [
        { id: 'catalogo', title: 'Catálogo de Materiales', description: 'Materiales y clasificaciones', icon: Package, path: '/materials', permission: 'materials.read' },
        { 
          id: 'recepcion', 
          title: 'Recepción de Material', 
          description: 'Escanear QR de ingreso', 
          icon: PackagePlus, 
          onClick: () => window.dispatchEvent(new Event('open-scanner')), 
          permission: 'inventory.receive',
          allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_ALM']
        },
        { id: 'inventario', title: 'Inventario Físico', description: 'Stock valorado y ubicaciones', icon: Layers, path: '/warehouse/inventory', permission: 'inventory.view' },
        { id: 'merma_scrap', title: 'Control Merma y Scrap', description: 'Registro y análisis de bajas', icon: AlertTriangle, path: '/warehouse/merma-scrap', permission: 'warehouse.merma_scrap.view' },
        { id: 'ordenes_consumo', title: 'Órdenes de Consumo', description: 'Solicitudes y surtido', icon: Boxes, path: '/warehouse/orders', permission: '' },
        { 
          id: 'reportes_almacen', 
          title: 'Reportes Ejecutivos', 
          description: 'Balances, compras y tendencias', 
          icon: BarChart3, 
          path: '/warehouse/reports', 
          allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_ALM'] 
        },
      ]
    },
    { 
      id: 'extrusion', 
      title: 'Piso de Extrusión', 
      description: 'Líneas, Racks y Mezclado', 
      icon: Factory,
      gradient: 'from-amber-500/20 to-orange-500/20 text-amber-500',
      allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'],
      children: [
        { id: 'tablero_colas', title: 'Tablero de Colas', description: 'Monitoreo de producción', icon: MonitorPlay, path: '/extrusion/board', allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'], permission: 'extrusion.view' },
        { id: 'rack_ingress', title: 'Ingreso PTI a Racks', description: 'Asignación de racks en piso', icon: Boxes, path: '/extrusion/rack-ingress', allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'], permission: 'extrusion.view' },
        { id: 'formulas', title: 'Fórmulas y Recetas', description: 'Catálogo y especificaciones', icon: ClipboardList, path: '/production/formulas', permission: 'extrusion.formulas.view' },
        { id: 'maquinas', title: 'Máquinas Extrusoras', description: 'Monitoreo de líneas', icon: Factory, path: '/production/machines', permission: 'extrusion.view' },
        { id: 'mezclado', title: 'Centro de Mezclado', description: 'Tinas y preparación WIP', icon: Beaker, path: '/production/mixing', permission: 'extrusion.wip.manage' },
        { id: 'andon', title: 'Tablero Andon', description: 'Alertas y eventos de paro', icon: AlertTriangle, path: '/production/andon', permission: 'extrusion.view' },
      ]
    },
    {
      id: 'telares',
      title: 'Piso de Telares',
      description: 'Telares, operadores y ruteo de producción',
      icon: Factory,
      gradient: 'from-cyan-500/20 to-sky-500/20 text-cyan-600',
      allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'],
      children: [
        { id: 'telares_terminal', title: 'Terminal de Telares', description: 'Operación de producción', icon: Factory, path: '/production/telares', permission: '' },
        { id: 'telares_dashboard', title: 'Tablero de Telares', description: 'Estado de producción', icon: MonitorPlay, path: '/telares/dashboard', permission: '' },
        { id: 'telares_catalog', title: 'Catálogo de Telares', description: 'Configuración de máquinas', icon: Package, path: '/telares/catalogos', permission: '' },
        { id: 'telares_operators', title: 'Operadores', description: 'Personal asignado a telares', icon: Users, path: '/telares/operadores', permission: '' },
        { id: 'corte_terminal', title: 'Estación de Corte', description: 'Operación y ruteo de corte', icon: Layers, path: '/production/corte', permission: '' },
      ]
    },
    {
      id: 'laminado',
      title: 'Piso de Laminado',
      description: 'Estación, catálogo y trabajo en proceso',
      icon: Layers,
      gradient: 'from-violet-500/20 to-purple-500/20 text-violet-600',
      allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'],
      children: [
        { id: 'laminado_station', title: 'Estación de Laminado', description: 'Operación de producción', icon: Layers, path: '/production/laminado', permission: '' },
        { id: 'laminado_wip', title: 'Trabajo en Proceso', description: 'Tablero operativo de Laminado', icon: MonitorPlay, path: '/laminado/wip', permission: '' },
        { id: 'laminado_catalog', title: 'Catálogo de Laminado', description: 'Especificaciones del proceso', icon: Package, path: '/laminado/catalogos', permission: '' },
      ]
    },
    {
      id: 'globo',
      title: 'Piso de Globo',
      description: 'Estación, catálogo y trabajo en proceso',
      icon: Wind,
      gradient: 'from-amber-500/20 to-orange-500/20 text-amber-600',
      allowedRoles: ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'],
      children: [
        { id: 'globo_station', title: 'Estación de Globo', description: 'Operación de producción', icon: Wind, path: '/production/globo', permission: '' },
        { id: 'globo_wip', title: 'Trabajo en Proceso', description: 'Tablero operativo de Globo', icon: MonitorPlay, path: '/globo/wip', permission: '' },
        { id: 'globo_catalog', title: 'Catálogo de Globo', description: 'Especificaciones del proceso', icon: Package, path: '/globo/catalogos', permission: '' },
      ]
    },
    { 
      id: 'identity', 
      title: 'Centro de Identidad', 
      description: 'Gestión y Trazabilidad de QRs', 
      icon: QrCode,
      gradient: 'from-purple-500/20 to-fuchsia-500/20 text-purple-500',
      permission: ['qr.create', 'qr.history.read', 'qr.events.read'],
      children: [
        { id: 'identity_gen', title: 'Generar Lote QR', description: 'Impresión y serialización', icon: Printer, path: '/identity/generate', permission: 'qr.create' },
        { id: 'identity_hist', title: 'Historial de QRs', description: 'Trazabilidad y estados', icon: List, path: '/qrcodes', permission: ['qr.history.read', 'qr.events.read'] },
      ]
    },
    { 
      id: 'admin', 
      title: 'Gestor de Usuarios', 
      description: 'Cuentas, Roles y Seguridad', 
      icon: Users, 
      gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
      permission: ['users.read', 'roles.read'],
      children: [
        { id: 'users_list', title: 'Usuarios del Sistema', description: 'Cuentas y perfiles activos', icon: Users, path: '/users', permission: 'users.read' },
        { id: 'roles_list', title: 'Roles y Permisos', description: 'Matriz de autorización', icon: ShieldCheck, path: '/roles', permission: 'roles.read' },
      ]
    },
  ];

  // Helper de comprobación de permisos y roles
  const checkAccess = (item: any) => {
    if (isGlobalAdmin) return true;
    if (item.hiddenRoles && item.hiddenRoles.includes(userRole)) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) return false;
    if (!item.permission || item.permission === '') return true;
    if (Array.isArray(item.permission)) {
      return hasAnyPermission ? hasAnyPermission(item.permission) : item.permission.some((p: string) => hasPermission(p));
    }
    return hasPermission(item.permission);
  };

  // Filtrar áreas y sus hijos por permisos y roles
  const areas = allAreas
    .filter(checkAccess)
    .map(area => {
      if (area.children) {
        const filteredChildren = area.children.filter(checkAccess);
        return { ...area, children: filteredChildren };
      }
      return area;
    })
    .filter(area => {
      if (area.children) return area.children.length > 0;
      return true;
    });

  const handleCardClick = (item: any) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.children && item.children.length > 0) {
      navigate(`/areas/${item.id}`);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const selectedGroup = areas.find(a => a.id === group);
  const currentList = selectedGroup ? selectedGroup.children : areas;

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 pt-4 pb-32 sm:pb-16 overflow-x-hidden min-h-screen bg-background">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        {selectedGroup && (
          <button
            onClick={() => navigate('/areas')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors w-fit p-1 -ml-1 rounded-md"
          >
            <ChevronLeft size={16} /> Volver a Todas las Áreas
          </button>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {selectedGroup ? selectedGroup.title : "Áreas y Módulos Operativos"}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">
              {selectedGroup 
                ? "Selecciona una opción para acceder a la estación o función." 
                : "Acceso optimizado tanto para terminales móviles como de monitor."}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Cards Optimizadas para Móvil y Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {currentList?.map((area: any) => {
          const itemGradient = area.gradient || 'from-primary/20 to-primary/10 text-primary';
          
          return (
            <div 
              key={area.id} 
              className="group cursor-pointer rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden"
              onClick={() => handleCardClick(area)}
            >
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${itemGradient} flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-105 transition-transform`}>
                    <area.icon size={24} className="sm:size-7" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight leading-snug break-words">
                      {area.title}
                    </h3>
                    <p className="text-sm leading-snug font-medium text-muted-foreground mt-1 break-words">
                      {area.description}
                    </p>
                  </div>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AreasPage;
