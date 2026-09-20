import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalScannerModal } from '../../modules/identity/presentation/context/GlobalScannerModal';
import { ForceChangePasswordModal } from '../../modules/auth/components/ForceChangePasswordModal';
import { NotificationCenter } from '../../modules/notifications/components/NotificationCenter';
import { Home, Grid, QrCode, ScanLine } from 'lucide-react';
import { PageContainer, BottomNavigation, FAB } from '../../design-system';
import { GlobalBreadcrumbs } from './GlobalBreadcrumbs';
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
        <GlobalBreadcrumbs />
        
      {/* Main Content Area */}
        <PageContainer withBottomNav={true} maxWidth="full" className="px-0 pt-4 lg:pt-4 flex-1">
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
      <div className="fixed bottom-[90px] lg:bottom-8 right-4 lg:right-8 z-40 group">
        {/* Animated Glow/Pulse ring behind the button */}
        <div 
          className="absolute inset-0 bg-primary/30 rounded-full animate-ping opacity-50 group-hover:bg-primary/50 transition-colors duration-500"
          style={{ animationDuration: '3s' }}
        ></div>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
          className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.24)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border-[3px] border-background overflow-hidden"
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
          
          <ScanLine size={28} className="drop-shadow-md" />
        </button>
      </div>

      {/* Modal for forcing password change */}
      <ForceChangePasswordModal />

      {/* Notification Center Trigger and Workspace */}
      <NotificationCenter />
    </div>
  );
};

export default AppLayout;