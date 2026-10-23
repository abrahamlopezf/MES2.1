import { useState, useEffect, useCallback } from 'react';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  BrowserNotificationPermission
} from './browserNotifications';
import { toast } from 'sonner';

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    getBrowserNotificationPermission()
  );

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isBrowserNotificationSupported()) {
      toast.error('Este navegador no soporta notificaciones de escritorio.');
      return 'unsupported';
    }

    const res = await requestBrowserNotificationPermission();
    setPermission(res);

    if (res === 'granted') {
      toast.success('¡Notificaciones de escritorio activadas!', {
        description: 'Recibirás alertas en tiempo real sobre producción y mezclas.',
      });
      sendBrowserNotification('TraceFlow MES Activo', {
        body: 'Las alertas de planta y mezclas se notificarán directamente aquí.',
        sound: true,
      });
    } else if (res === 'denied') {
      toast.error('Permiso de notificaciones denegado.', {
        description: 'Puedes habilitarlo en la configuración del navegador (icono del candado).',
      });
    }

    return res;
  }, []);

  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.warning('Notificaciones de navegador no activadas', {
        description: 'Haz clic en "Activar Notificaciones" para habilitar los permisos primero.',
      });
      return;
    }

    sendBrowserNotification('TraceFlow MES - Prueba del Sistema', {
      body: 'El sistema de notificaciones de escritorio funciona correctamente.',
      sound: true,
    });

    toast.info('Notificación de prueba enviada al escritorio.', {
      description: 'Revisa las notificaciones del sistema de tu computadora.',
    });
  }, [permission]);

  return {
    permission,
    isSupported: isBrowserNotificationSupported(),
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    requestPermission,
    sendTestNotification,
  };
};
