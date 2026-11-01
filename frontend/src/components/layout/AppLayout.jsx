import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalScannerModal } from '../../modules/identity/presentation/context/GlobalScannerModal';
import { ForceChangePasswordModal } from '../../modules/auth/components/ForceChangePasswordModal';
import { ExtruderSelectionModal } from '../../modules/production/presentation/components/ExtruderSelectionModal';
import { NotificationCenter } from '../../modules/notifications/components/NotificationCenter';
import { PageContainer, BottomNavigation, FAB, Icon } from '../../design-system';
import { GlobalBreadcrumbs } from './GlobalBreadcrumbs';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { UserAvatar } from '../ui/UserAvatar';
import { getUserAreaCode, isAdminUser } from '../../utils/authHelpers';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  const isExtrusionCatalog = ['/production/machines', '/production/formulas'].includes(location.pathname);

  const handleNav = (path) => {
    navigate(path);
  };

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isGlobalAdmin = isAdminUser(user);
  const userArea = getUserAreaCode(user);
  const isWarehouseUser = !isGlobalAdmin && (['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN'].includes(userRole) ||
                          user?.area?.code === 'ALMACEN' || 
                          user?.area?.code === 'ALM');

  const baseNavItems = [
    {
      icon: <Icon name="home" size={24} />,
      label: 'Inicio',
      onClick: () => handleNav('/dashboard'),
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
      path: '/dashboard',
    },
    {
      icon: <Icon name="qr_code_scanner" size={24} />,
      label: 'Escanear',
      onClick: () => window.dispatchEvent(new CustomEvent('open-scanner')),
      isActive: false,
      show: true,
    },
    {
      icon: (
        <UserAvatar
          name={String(user?.id ?? user?.username ?? '')}
          label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Usuario'}
          src={user?.avatar_url}
          size={26}
        />
      ),
      label: 'Perfil',
      onClick: () => handleNav('/profile'),
      isActive: location.pathname.startsWith('/profile'),
      show: true,
      path: '/profile',
    }
  ];

  const areaNavItems = {
    EXTRUSION: [
      { label: 'Colas', path: '/extrusion/board', icon: 'view_kanban' },
      { label: 'WIP', path: '/extrusion/wip', icon: 'inventory_2' },
    ],
    TELARES: [
      { label: 'Tablero', path: '/telares/dashboard', icon: 'dashboard' },
      { label: 'Terminal', path: '/production/telares', icon: 'precision_manufacturing' },
    ],
    GLOBO: [
      { label: 'WIP', path: '/globo/wip', icon: 'inventory_2' },
      { label: 'Estación', path: '/production/globo', icon: 'air' },
    ],
    LAMINADO: [
      { label: 'WIP', path: '/laminado/wip', icon: 'inventory_2' },
      { label: 'Estación', path: '/production/laminado', icon: 'layers' },
    ],
    ALMACEN: [
      { label: 'Inventario', path: '/warehouse/inventory', icon: 'inventory' },
      { label: 'Órdenes', path: '/warehouse/orders', icon: 'assignment' },
    ],
  };

  const areaLinks = !isGlobalAdmin ? (areaNavItems[userArea] || []) : [];
  const executiveLinks = isGlobalAdmin
    ? [
        ...(hasPermission('inventory.view') ? [{ label: 'Órdenes', path: '/warehouse/orders', icon: 'assignment' }] : []),
        { label: 'Áreas', path: '/areas', icon: 'grid_view' },
      ]
    : [];
  const navItems = [
    baseNavItems[0],
    ...(areaLinks.length > 0
      ? areaLinks
      : executiveLinks.length > 0
        ? executiveLinks
        : isWarehouseUser && hasPermission('inventory.view')
          ? [{ label: 'Órdenes', path: '/warehouse/orders', icon: 'assignment' }]
          : []
    ).map((item) => ({
      ...item,
      icon: <Icon name={item.icon} size={24} />,
      path: item.path,
      onClick: () => handleNav(item.path),
      isActive: location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    })),
    baseNavItems[1],
    baseNavItems[2],
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOpenSidebar = () => setIsSidebarOpen(true);
    window.addEventListener('open-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-sidebar', handleOpenSidebar);
  }, []);

  return (
    <div className="flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden">
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-[60] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar for Desktop and Mobile */}
      <div className="h-full shrink-0 z-50 pointer-events-auto">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Mobile-First Layout for ALL screens */}
      <div className="flex-1 h-full overflow-y-auto overflow-x-hidden relative custom-scrollbar flex flex-col">
        <GlobalBreadcrumbs />
        
      {/* Main Content Area */}
        <PageContainer withBottomNav={true} maxWidth="full" className="px-0 pt-3 lg:pt-3 flex-1 lg:pb-28">
          {/* Transition Wrapper */}
          <div key={location.pathname} className="animate-page-enter w-full h-full">
            <Outlet />
          </div>
        </PageContainer>
        
      </div>

      {/* Navegación Inferior Flotante (Solo en mobile/tablet) */}
      {!isSidebarOpen && <div className="block lg:hidden">
        <BottomNavigation 
          items={navItems} 
          className="left-0 right-0 rounded-t-3xl border-t shadow-2xl" 
        />
      </div>}

      {/* Global Scanner Modal */}
      <GlobalScannerModal />

      {/* FAB: Global Scanner Trigger */}
      {!isExtrusionCatalog && <div className="hidden lg:block fixed bottom-8 right-8 z-40">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
          aria-label="Abrir escáner global"
          className="h-16 w-16 rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
        >
          <Icon name="qr_code_scanner" size={28} />
        </button>
      </div>}

      {/* Modal for forcing password change */}
      <ForceChangePasswordModal />
      
      {/* Modal for Extrusion Machine Selection */}
      <ExtruderSelectionModal />

      {/* Notification Center Trigger and Workspace */}
      <NotificationCenter />
    </div>
  );
};

export default AppLayout;
