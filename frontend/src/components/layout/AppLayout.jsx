import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalScannerModal } from '../../modules/identity/presentation/context/GlobalScannerModal';
import { ForceChangePasswordModal } from '../../modules/auth/components/ForceChangePasswordModal';
import { NotificationCenter } from '../../modules/notifications/components/NotificationCenter';
import { Home, Grid, QrCode } from 'lucide-react';
import { PageContainer, BottomNavigation, FAB } from '../../design-system';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

// Mini avatar for nav — initials or photo
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-600',
];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const MiniAvatar = ({ user, size = 24, ring = false }) => {
  const first = user?.first_name?.[0] ?? '';
  const last  = user?.last_name?.[0]  ?? '';
  const initials = `${first}${last}`.toUpperCase() || '?';
  const color = getAvatarColor(`${user?.first_name ?? ''}${user?.last_name ?? ''}`);
  const dim = `${size}px`;
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={initials}
        style={{ width: dim, height: dim }}
        className={`rounded-full object-cover ${ring ? 'ring-2 ring-primary/40' : ''}`}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      style={{ width: dim, height: dim, fontSize: size < 28 ? '10px' : '13px' }}
      className={`${color} rounded-full flex items-center justify-center font-black text-white ${ring ? 'ring-2 ring-primary/40' : ''}`}
    >
      {initials}
    </div>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

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
    {
      icon: <QrCode size={26} />,
      label: 'Escanear',
      onClick: () => window.dispatchEvent(new Event('open-scanner')),
      isActive: false
    },
    {
      icon: <MiniAvatar user={user} size={26} />,
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
      <div className="flex-1 h-full overflow-y-auto relative custom-scrollbar flex flex-col">
        
      {/* Main Content Area */}
        <PageContainer withBottomNav={true} maxWidth="full" className="px-0 flex-1">
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

      {/* Modal for forcing password change */}
      <ForceChangePasswordModal />

      {/* Notification Center Trigger and Workspace */}
      <NotificationCenter />
    </div>
  );
};

export default AppLayout;