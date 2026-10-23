import React from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useBrowserNotifications } from './useBrowserNotifications';

interface BrowserNotificationBannerProps {
  compact?: boolean;
}

export const BrowserNotificationBanner: React.FC<BrowserNotificationBannerProps> = ({ compact = false }) => {
  const {
    permission,
    isSupported,
    isGranted,
    isDenied,
    isDefault,
    requestPermission,
    sendTestNotification,
  } = useBrowserNotifications();

  if (!isSupported) {
    return null;
  }

  if (compact) {
    if (isGranted) {
      return (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Notificaciones de escritorio activas</span>
          </div>
          <button
            onClick={sendTestNotification}
            data-ignore-accessibility-min-height="true"
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg transition-colors"
          >
            Probar
          </button>
        </div>
      );
    }

    if (isDenied) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-medium">
          <BellOff className="w-4 h-4 shrink-0" />
          <span>Notificaciones bloqueadas en el navegador</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <BellRing className="w-4 h-4 text-primary shrink-0 animate-pulse" />
          <span>Alertas de escritorio</span>
        </div>
        <button
          onClick={requestPermission}
          data-ignore-accessibility-min-height="true"
          className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          Activar
        </button>
      </div>
    );
  }

  // Full-size banner (for workspace/modal)
  if (isGranted) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Notificaciones de Escritorio Habilitadas
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recibirás avisos críticos y alertas del sistema aunque la ventana esté minimizada.
            </p>
          </div>
        </div>
        <button
          onClick={sendTestNotification}
          data-ignore-accessibility-min-height="true"
          className="self-start sm:self-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Enviar Notificación de Prueba</span>
        </button>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/25 rounded-2xl">
        <div className="p-2.5 bg-destructive/20 text-destructive rounded-xl shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-destructive">
            Permiso de Notificaciones Bloqueado por el Navegador
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tu navegador ha bloqueado las notificaciones para este sitio. Para activarlas, haz clic en el icono del candado o configuración del sitio en la barra de direcciones y selecciona <strong>"Permitir notificaciones"</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-primary/10 border border-primary/25 rounded-2xl">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
          <BellRing className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">
            Activar Alertas de Escritorio
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recibe avisos inmediatos cuando se cree una orden, llegue una solicitud de mezcla o existan alertas de planta.
          </p>
        </div>
      </div>
      <button
        onClick={requestPermission}
        data-ignore-accessibility-min-height="true"
        className="self-start sm:self-auto px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-colors shadow-md flex items-center gap-2"
      >
        <Bell className="w-4 h-4" />
        <span>Habilitar Notificaciones</span>
      </button>
    </div>
  );
};
