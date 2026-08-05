/**
 * Design Tokens para el Industrial Design System (MES)
 * Desacopla los valores visuales de los componentes React.
 */
export const Tokens = {
  colors: {
    // Brand & Backgrounds
    background: '#09090b', // Deep dark (estilo industrial)
    surface: '#18181b', // Cards
    primary: '#2563eb', // Blue interactivo
    primaryForeground: '#ffffff',
    
    // Status (Domain Semantic Colors)
    success: '#16a34a', // Disponible / Completado
    danger: '#dc2626', // Scrap / Cuarentena / Error
    warning: '#ea580c', // Precaución
    info: '#0284c7', // Informativo
    
    // Typography
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#475569',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px', // Mínimo tamaño táctil industrial
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    sizes: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      xxl: '2rem', // Títulos de alta visibilidad
    },
    weights: {
      normal: 400,
      medium: 500,
      bold: 700,
    }
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  elevation: {
    base: '0 1px 3px rgba(0,0,0,0.5)',
    overlay: '0 10px 25px rgba(0,0,0,0.8)',
  },
  animation: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
  }
};
