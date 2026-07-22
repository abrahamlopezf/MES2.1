type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const isDev = import.meta.env.MODE !== 'production';

export const logger = {
  trace: (...args: any[]) => {
    if (isDev) console.trace(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
    // TODO: Send to external monitoring (Datadog/Sentry) if prod
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
    // TODO: Send to external monitoring
  },
  error: (...args: any[]) => {
    console.error(...args);
    // TODO: Send to external monitoring
  },
  fatal: (...args: any[]) => {
    console.error('FATAL:', ...args);
    // TODO: Send to external monitoring with high priority alert
  }
};
