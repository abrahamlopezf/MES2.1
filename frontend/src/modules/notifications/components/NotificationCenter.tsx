import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, ShieldAlert, Info, AlertTriangle, UserPlus, UserMinus, X, ArrowLeft, ArrowRight, Loader2, LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { useAuthStore } from '../../../store/authStore';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { BrowserNotificationBanner } from '../../../core/notifications/BrowserNotificationBanner';
import { sendBrowserNotification } from '../../../core/notifications/browserNotifications';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  const { user, logout } = useAuthStore();

  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const navigate = useNavigate();

  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const isInitializedRef = useRef(false);

  // Detector de nuevas notificaciones en tiempo real para disparar alertas de escritorio y sonner
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (!isInitializedRef.current) {
      notifications.forEach((n: any) => knownNotificationIdsRef.current.add(n.id));
      isInitializedRef.current = true;
      return;
    }

    notifications.forEach((n: any) => {
      if (!knownNotificationIdsRef.current.has(n.id)) {
        knownNotificationIdsRef.current.add(n.id);
        if (!n.is_read && !n.read_at) {
          const displayMessage = n.message ? n.message.split('?')[0] : '';
          sendBrowserNotification(n.title || 'Nueva Notificación MES', {
            body: displayMessage,
            sound: true,
            tag: `mes-notif-${n.id}`,
            onClick: () => {
              setIsOpen(true);
            }
          });
          toast.info(n.title || 'Nueva Notificación', {
            description: displayMessage,
          });
        }
      }
    });
  }, [notifications]);

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
      <div className="fixed top-2 right-2 z-[50] sm:top-4 sm:right-4">
        {/* Profile and notifications share one desktop menu trigger. */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
          aria-expanded={isDropdownOpen}
          aria-controls="notification-dropdown"
          data-ignore-accessibility-min-height="true"
          className={`flex h-12 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lg shadow-black/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isDropdownOpen ? 'border-primary/30 bg-primary/5' : 'hover:border-primary/25 hover:bg-secondary/40'}`}
          title="Perfil y notificaciones"
        >
          <span className="hidden size-10 shrink-0 items-center justify-center md:flex">
            <UserAvatar
              name={String(user?.id ?? user?.username ?? '')}
              label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Usuario'}
              src={user?.avatar_url}
              size={32}
            />
          </span>
          <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${isDropdownOpen ? 'bg-primary/10 text-primary' : 'text-foreground hover:text-primary'}`}>
            {isDropdownOpen ? <X size={32} /> : <Bell size={32} />}
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        </button>

        {/* Invisible Overlay to close dropdown */}
        {isDropdownOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Cerrar notificaciones"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <section
            id="notification-dropdown"
            aria-label="Notificaciones recientes"
            className="absolute right-0 top-[calc(100%+0.75rem)] z-50 flex max-h-[min(76dvh,38rem)] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200 sm:w-96 md:w-[min(30rem,calc(100vw-2rem))]"
          >
            <div className="hidden shrink-0 border-b border-border bg-background p-4 md:block">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={String(user?.id ?? user?.username ?? '')}
                  label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Usuario'}
                  src={user?.avatar_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.username || 'Usuario'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user?.role?.name ?? user?.role?.code ?? 'Cuenta de usuario'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserRound className="size-4" />
                  Mi perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    void logout();
                  }}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bell className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground">Notificaciones</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} pendiente${unreadCount === 1 ? '' : 's'}` : 'Estás al día'}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {markAllAsReadMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  <span>Leer todo</span>
                </button>
              )}
            </div>
            <div className="shrink-0 border-b border-border px-3 py-2.5">
              <BrowserNotificationBanner compact={true} />
            </div>
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm font-medium text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Cargando notificaciones
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-9 text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary/70 text-muted-foreground">
                    <Bell className="size-5" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Sin notificaciones nuevas</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aquí aparecerán las novedades del sistema.</p>
                </div>
              ) : (
                notifications.slice(0, 3).map((n: any) => (
                  <button
                    type="button"
                    key={n.id} 
                    onClick={() => {
                      handleActionClick(n);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${n.is_read || n.read_at ? 'bg-card hover:bg-secondary/50' : 'bg-primary/[0.04] hover:bg-primary/[0.08]'}`}
                  >
                    <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${n.is_read || n.read_at ? 'bg-secondary/70' : 'bg-primary/10'}`}>
                      <span className="scale-[0.6]">
                        {getIcon(n.type)}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`truncate text-sm font-semibold ${n.is_read || n.read_at ? 'text-foreground' : 'text-primary'}`}>
                        {n.title || 'Notificación del sistema'}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {n.message ? n.message.split('?')[0] : ''}
                      </p>
                      <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
                        {(n.created_at || n.createdAt) ? new Date(n.created_at || n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha desconocida'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="shrink-0 border-t border-border bg-secondary/20 p-3">
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsOpen(true);
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ver todas las notificaciones
                <ArrowRight className="size-4" />
              </button>
            </div>
          </section>
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
              <BrowserNotificationBanner compact={false} />
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
