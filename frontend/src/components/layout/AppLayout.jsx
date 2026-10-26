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

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleNav = (path) => {
    navigate(path);
  };

  const userRole = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name))?.toUpperCase() || '';
  const isWarehouseUser = ['ADMIN_ALM', 'WAREHOUSEMAN'].includes(userRole) || 
                          user?.area?.code === 'ALMACEN' || 
                          user?.area?.code === 'ALM';

  const navItems = [
    {
      icon: <Icon name="home" size={24} />,
      label: 'Home',
      onClick: () => handleNav('/dashboard'),
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
      show: true
    },
    {
      icon: <Icon name="qr_code_scanner" size={24} />,
      label: 'Escanear',
      onClick: () => window.dispatchEvent(new CustomEvent('open-scanner')),
      isActive: false,
      show: true
    },
    {
      icon: <Icon name="assignment" size={24} />,
      label: 'Órdenes',
      onClick: () => handleNav('/warehouse/orders'),
      isActive: location.pathname.startsWith('/warehouse/orders'),
      show: useAuthStore().hasPermission('inventory.view')
    },
    {
      icon: <Icon name="grid_view" size={24} />,
      label: 'Áreas',
      onClick: () => handleNav('/areas'),
      isActive: location.pathname.startsWith('/areas'),
      show: !isWarehouseUser && ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(userRole)
    },
    /* {
      icon: <Icon name="group" size={24} />,
      label: 'Usuarios',
      onClick: () => handleNav('/users'),
      isActive: location.pathname.startsWith('/users'),
      show: useAuthStore().hasPermission('users.read')
    }, */
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
      show: true
    }
  ].filter(item => item.show);

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
          className="fixed inset-0 bg-black/50 lg:hidden z-40 backdrop-blur-sm transition-opacity" 
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
        <PageContainer withBottomNav={true} maxWidth="full" className="px-0 pt-3 lg:pt-3 flex-1 pb-24 lg:pb-28">
          {/* Transition Wrapper */}
          <div key={location.pathname} className="animate-page-enter w-full h-full">
            <Outlet />
          </div>
        </PageContainer>
        
      </div>

      {/* Navegación Inferior Flotante (Solo en mobile/tablet) */}
      <div className="block lg:hidden">
        <BottomNavigation 
          items={navItems} 
          className="left-0 right-0 rounded-t-3xl border-t shadow-2xl" 
        />
      </div>

      {/* Global Scanner Modal */}
      <GlobalScannerModal />

      {/* FAB: Global Scanner Trigger */}
      <div className="hidden lg:block fixed bottom-8 right-8 z-40">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
          aria-label="Abrir escáner global"
          className="h-16 w-16 rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
        >
          <Icon name="qr_code_scanner" size={28} />
        </button>
      </div>

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
