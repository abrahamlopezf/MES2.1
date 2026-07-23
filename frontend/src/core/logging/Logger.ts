type LogLevel = 'info' | 'warn' | 'error' | 'audit';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
}

class LoggerService {
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      // correlationId podría extraerse del Contexto global si estuviera disponible
    };

    // En desarrollo, imprimimos en consola.
    // En producción, aquí se puede enviar a ELK, Sentry, Datadog, etc.
    if (import.meta.env.VITE_ENV !== 'production' || level === 'error') {
      switch (level) {
        case 'info':
          console.info(`[INFO] ${message}`, context || '');
          break;
        case 'warn':
          console.warn(`[WARN] ${message}`, context || '');
          break;
        case 'error':
          console.error(`[ERROR] ${message}`, context || '');
          break;
        case 'audit':
          console.log(`[AUDIT] 🛡️ ${message}`, context || '');
          break;
      }
    }
  }

  public info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  public audit(message: string, context?: Record<string, any>) {
    this.log('audit', message, context);
  }
}

export const Logger = new LoggerService();
