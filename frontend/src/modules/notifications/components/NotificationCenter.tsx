import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, ShieldAlert, Info, AlertTriangle, UserPlus, UserMinus, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { useAuthStore } from '../../../store/authStore';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  const { user } = useAuthStore();

  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const navigate = useNavigate();

  // Bloquear el scroll del body cuando el workspace está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getIcon = (type: string) => {
    if (type.startsWith('USER_DEACTIVATION_REQUEST')) return <UserMinus className="w-8 h-8 text-destructive" />;
    switch (type) {
      case 'SECURITY': return <ShieldAlert className="w-8 h-8 text-warning" />;
      case 'SYSTEM': return <Info className="w-8 h-8 text-primary" />;
      case 'ALERT': return <AlertTriangle className="w-8 h-8 text-destructive" />;
      case 'USER_ACTION': return <UserPlus className="w-8 h-8 text-success" />;
      default: return <Bell className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const tabs = [
    { id: 'ALL', label: 'Todas' },
    { id: 'ALERT', label: 'Alertas' },
    { id: 'SYSTEM', label: 'Sistema' },
  ];

  const filteredNotifications = notifications.filter((n: any) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ALERT') return n.type === 'ALERT' || n.type === 'SECURITY' || n.type.startsWith('USER_DEACTIVATION');
    if (activeTab === 'SYSTEM') return n.type === 'SYSTEM' || n.type === 'USER_ACTION';
    return true;
  });

  const handleActionClick = (notif: any) => {
    handleMarkAsRead(notif.id);
    if (notif.type.startsWith('USER_DEACTIVATION_REQUEST')) {
      const parts = notif.type.split('userId=');
      if (parts.length > 1) {
        setIsOpen(false);
        navigate(`/users?openUser=${parts[1]}`);
      }
    } else if (notif.type === 'WASTE_REQUEST') {
      const urlMatch = notif.message.match(/\?waste_request_id=(\d+)/);
      if (urlMatch) {
        setIsOpen(false);
        navigate(`/warehouse/inventory?waste_request_id=${urlMatch[1]}`);
      }
    } else if (notif.type === 'SYSTEM' && notif.message.includes('order_uuid')) {
      const urlMatch = notif.message.match(/\?order_uuid=([a-zA-Z0-9-]+)/);
      if (urlMatch) {
        setIsOpen(false);
        navigate(`/warehouse/orders?order_id=${urlMatch[1]}`);
      }
    }
  };

  return (
    <>
      {/* Top-right pill: avatar (md+) + bell */}
      <div className="fixed top-4 right-4 z-[50]">
        <div className="flex items-center gap-0 bg-card border border-border rounded-full shadow-md overflow-hidden">

        {/* Avatar — desktop only */}
        <button
          onClick={() => navigate('/profile')}
          className="hidden md:flex items-center justify-center pl-2 pr-2 py-2 hover:bg-secondary/60 transition-colors h-full border-r border-border"
          title="Mi Perfil"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="perfil"
              className="w-7 h-7 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-[10px]"
              style={{ background: (() => {
                const name = `${user?.first_name ?? ''}${user?.last_name ?? ''}`;
                const colors = ['#7c3aed','#2563eb','#059669','#e11d48','#d97706','#0891b2'];
                let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
                return colors[Math.abs(h) % colors.length];
              })() }}
            >
              {`${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
            </div>
          )}
        </button>

        {/* Bell button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`relative p-3 transition-colors flex items-center justify-center group ${isDropdownOpen ? 'bg-secondary/80' : 'hover:bg-secondary/60'}`}
          title="Notificaciones"
        >
          <Bell className={`w-6 h-6 transition-colors ${isDropdownOpen ? 'text-primary' : 'text-foreground group-hover:text-primary'}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-destructive border-2 border-background text-destructive-foreground rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        </div>

        {/* Invisible Overlay to close dropdown */}
        {isDropdownOpen && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-[110%] right-0 mt-2 w-80 sm:w-96 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-foreground">Recientes</h3>
              {unreadCount > 0 && (
                <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full border border-destructive/20">
                  {unreadCount} Nuevas
                </span>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No tienes notificaciones
                </div>
              ) : (
                notifications.slice(0, 3).map((n: any) => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      handleActionClick(n);
                      setIsDropdownOpen(false);
                    }}
                    className={`p-4 flex gap-3 transition-colors cursor-pointer ${n.is_read ? 'bg-background hover:bg-muted/30' : 'bg-primary/5 hover:bg-primary/10'}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className="scale-75 origin-top-left">
                        {getIcon(n.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold truncate ${n.is_read ? 'text-foreground' : 'text-primary'}`}>
                        {n.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground/70 mt-2 block">
                        {(n.created_at || n.createdAt) ? new Date(n.created_at || n.createdAt).toLocaleString() : 'Fecha desconocida'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border bg-muted/10">
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsOpen(true);
                }}
                className="w-full py-2.5 bg-background border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted hover:text-primary transition-colors flex justify-center items-center gap-2"
              >
                Ver Todas las Notificaciones
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace de Notificaciones (Pantalla Completa) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header del Workspace */}
          <header className="px-4 py-4 md:px-8 md:py-6 border-b border-border bg-card shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 shrink-0">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-bold shrink-0"
              >
                <ArrowLeft className="w-6 h-6 md:w-7 md:h-7" />
                <span className="hidden sm:inline">Volver</span>
              </button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-foreground flex items-center flex-wrap gap-2 md:gap-3">
                Centro de Control
                {unreadCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs md:text-sm font-bold px-3 py-1 rounded-full border border-destructive/20 shrink-0">
                    {unreadCount} Pendientes
                  </span>
                )}
              </h1>
            </div>

            {/* Filtros */}
            <div className="flex flex-nowrap items-center gap-1.5 md:gap-3 overflow-hidden w-full xl:w-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all shrink-0 ${
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {unreadCount > 0 && (
                <div className="ml-auto shrink-0 pl-1">
                  <button 
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-1 text-xs md:text-sm font-bold text-muted-foreground hover:text-foreground border border-border rounded-full hover:bg-secondary transition-colors shrink-0"
                    title="Marcar Todo Leído"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Marcar Todo Leído</span>
                    <span className="hidden max-[350px]:hidden min-[350px]:inline sm:hidden">Leído</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Área Principal: Lista de Notificaciones */}
          <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-4">
              {isLoading ? (
                <div className="p-12 text-center text-muted-foreground font-bold text-lg animate-pulse">
                  Sincronizando sistema...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-24 text-center text-muted-foreground flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
                    <Check className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-2">Todo en orden</h3>
                  <p className="text-lg">No hay alertas ni notificaciones pendientes en esta categoría.</p>
                </div>
              ) : (
                filteredNotifications.map((notif: any) => {
                  // Clean message string (remove query params)
                  const displayMessage = notif.message ? notif.message.split('?')[0] : '';
                  return (
                  <div 
                    key={notif.id} 
                    className={`relative p-6 md:p-8 rounded-2xl border transition-all ${
                      notif.read_at 
                        ? 'bg-card border-border opacity-70 hover:opacity-100' 
                        : 'bg-card border-l-8 border-l-primary shadow-lg border-t-border border-r-border border-b-border scale-[1.01]'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="shrink-0 p-4 rounded-xl bg-muted/50 hidden md:block">
                        {getIcon(notif.type)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="md:hidden">
                            {getIcon(notif.type)}
                          </div>
                          <h4 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                            {notif.title}
                          </h4>
                        </div>
                        <p className="text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
                          {displayMessage}
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground/60 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                          {(notif.created_at || notif.createdAt) ? new Date(notif.created_at || notif.createdAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }) : 'Fecha desconocida'}
                        </p>
                      </div>
                      
                      {/* Botón de Acción Industrial */}
                      {!notif.read_at && (
                        <div className="shrink-0 mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
                          <button 
                            onClick={() => handleActionClick(notif)}
                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 md:px-10 rounded-xl text-sm md:text-lg font-black tracking-widest uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                          >
                            {notif.type.startsWith('USER_DEACTIVATION') || notif.type === 'WASTE_REQUEST' || notif.message.includes('order_uuid') ? 'Revisar Solicitud' : 'Enterado'}
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )})
              )}
            </div>
          </main>
        </div>,
        document.body
      )}
    </>
  );
};
