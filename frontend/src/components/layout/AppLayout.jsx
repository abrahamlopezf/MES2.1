import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalScannerModal } from '../../modules/identity/presentation/context/GlobalScannerModal';
import { Home, Grid, QrCode, User } from 'lucide-react';
import { PageContainer, BottomNavigation, FAB } from '../../design-system';
import Sidebar from './Sidebar';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
  };

  const navItems = [
    {
      icon: <Home size={24} />,
      label: 'Home',
      onClick: () => handleNav('/dashboard'),
      isActive: location.pathname === '/dashboard' || location.pathname === '/'
    },
    {
      icon: <Grid size={24} />,
      label: 'Áreas',
      onClick: () => handleNav('/areas'),
      isActive: location.pathname.startsWith('/areas')
    },
    // Botón de Escáner integrado en la barra
    {
      icon: <QrCode size={26} />, 
      label: 'Escanear',
      onClick: () => window.dispatchEvent(new Event('open-scanner')),
      isActive: false
    },
    {
      icon: <User size={24} />,
      label: 'Perfil',
      onClick: () => handleNav('/profile'),
      isActive: location.pathname.startsWith('/profile')
    }
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-background text-foreground font-sans relative overflow-hidden">
      
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar isOpen={true} setIsOpen={() => {}} />
      </div>

      {/* Mobile-First Layout for ALL screens */}
      <div className="flex-1 h-full overflow-y-auto relative custom-scrollbar">
        
        {/* Main Content Area */}
        <PageContainer withBottomNav={true} maxWidth="full" className="px-2 py-4 md:px-6 md:py-6 lg:max-w-7xl w-full">
          <Outlet />
        </PageContainer>
        
      </div>

      {/* Navegación Inferior Flotante (Solo en mobile/tablet) */}
      <div className="block lg:hidden">
        <BottomNavigation 
          items={navItems} 
          className="left-0 right-0 rounded-t-3xl border-t shadow-2xl" 
        />
      </div>

      {/* Global Scanner Modal manages its own state and renders the FAB centrally */}
      <GlobalScannerModal />
    </div>
  );
};

export default AppLayout;