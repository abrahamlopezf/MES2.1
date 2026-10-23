/**
 * Browser Notification Service for TraceFlow MES
 * Handles desktop notification permissions, native notifications, and sound chimes.
 */

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface BrowserNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  silent?: boolean;
  sound?: boolean;
  url?: string;
  onClick?: () => void;
}

/**
 * Checks if the browser supports the Notification API.
 */
export const isBrowserNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Gets the current notification permission status.
 */
export const getBrowserNotificationPermission = (): BrowserNotificationPermission => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationPermission;
};

/**
 * Requests permission from the user to display native browser notifications.
 */
export const requestBrowserNotificationPermission = async (): Promise<BrowserNotificationPermission> => {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotificationPermission;
  } catch (error) {
    console.error('[BrowserNotifications] Error requesting permission:', error);
    return Notification.permission as BrowserNotificationPermission;
  }
};

/**
 * Synthesizes a clean, non-intrusive notification chime using Web Audio API.
 * Requires no external audio files or network traffic.
 */
export const playNotificationChime = (type: 'info' | 'success' | 'warning' | 'alert' = 'info') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'alert' || type === 'warning') {
      // Urgent industrial tone
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Pleasant confirmation tone
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Autoplay policy or unsupported audio context
  }
};

/**
 * Sends a native desktop notification to the operating system if permission is granted.
 */
export const sendBrowserNotification = async (
  title: string,
  options?: BrowserNotificationOptions
): Promise<Notification | null> => {
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/vite.svg',
      badge: options?.badge || '/vite.svg',
      tag: options?.tag,
      data: options?.data,
      silent: options?.silent ?? true, // we handle custom audio chime
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options?.url) {
        window.location.href = options.url;
      }
      if (options?.onClick) {
        options.onClick();
      }
      notification.close();
    };

    if (options?.sound !== false) {
      playNotificationChime('info');
    }

    return notification;
  } catch (error) {
    console.warn('[BrowserNotifications] Failed to create notification:', error);
    return null;
  }
};
