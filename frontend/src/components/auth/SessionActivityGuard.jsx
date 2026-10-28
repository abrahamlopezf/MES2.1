import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import axiosClient from '../../api/axiosClient';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'click'];

/** Renueva mientras hay actividad. Tras 10 minutos inactiva, deja correr el vencimiento JWT de 12 horas. */
export default function SessionActivityGuard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let lastActivityAt = Date.now();
    let lastHeartbeatAt = Date.now();
    let heartbeatInFlight = false;
    const markActivity = () => { lastActivityAt = Date.now(); };
    const renewIfActive = async () => {
      const now = Date.now();
      if (now - lastActivityAt >= INACTIVITY_LIMIT_MS || now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS || heartbeatInFlight) return;
      heartbeatInFlight = true;
      try {
        await axiosClient.get('/auth/me');
        lastHeartbeatAt = Date.now();
      } catch {
        // The API interceptor handles expired or revoked sessions; transient errors are retried next interval.
      } finally {
        heartbeatInFlight = false;
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener('focus', markActivity);
    const intervalId = window.setInterval(() => { void renewIfActive(); }, CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener('focus', markActivity);
    };
  }, [isAuthenticated]);

  return null;
}
