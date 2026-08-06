/**
 * Industrial Design System - 3-Tier Design Tokens
 * Primitive -> Semantic -> Component
 */

// 1. PRIMITIVE TOKENS (Base values)
const primitive = {
  colors: {
    blue500: '#3b82f6',
    blue600: '#2563eb',
    blue700: '#1d4ed8',
    blue800: '#1e40af',
    
    green500: '#22c55e',
    green600: '#16a34a',
    
    red500: '#ef4444',
    red600: '#dc2626',
    
    orange500: '#f97316',
    orange600: '#ea580c',
    
    zinc800: '#27272a',
    zinc900: '#18181b',
    zinc950: '#09090b',
    
    slate50: '#f8fafc',
    slate400: '#94a3b8',
    slate600: '#475569',
    
    white: '#ffffff',
    black: '#000000'
  },
  spacing: {
    '4': '4px',
    '8': '8px',
    '16': '16px',
    '24': '24px',
    '32': '32px',
    '48': '48px',
    '56': '56px',
    '72': '72px'
  },
  typography: {
    sans: '"Inter", "Roboto", system-ui, sans-serif',
    sizes: {
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      xxl: '32px'
    }
  },
  animation: {
    success: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    danger: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  elevation: {
    base: '0 1px 3px rgba(0,0,0,0.5)',
    overlay: '0 10px 25px rgba(0,0,0,0.8)'
  }
};

// 2. SEMANTIC TOKENS (Contextual meaning)
const semantic = {
  color: {
    primary: primitive.colors.blue600,
    primaryHover: primitive.colors.blue700,
    primaryPressed: primitive.colors.blue800,
    primaryText: primitive.colors.white,
    
    background: primitive.colors.zinc950,
    surface: primitive.colors.zinc900,
    
    success: primitive.colors.green600,
    danger: primitive.colors.red600,
    warning: primitive.colors.orange600,
    
    textHighEmphasis: primitive.colors.slate50,
    textMediumEmphasis: primitive.colors.slate400,
    textLowEmphasis: primitive.colors.slate600,
    
    borderDefault: primitive.colors.zinc800
  },
  spacing: {
    base: primitive.spacing['16'],
    touchTargetMin: primitive.spacing['48']
  }
};

// 3. COMPONENT TOKENS (Specific usage)
export const tokens = {
  // We expose primitives and semantics if needed for utilities
  primitive,
  semantic,
  
  // Specific component tokens
  components: {
    button: {
      primaryBackground: semantic.color.primary,
      primaryBackgroundHover: semantic.color.primaryHover,
      primaryText: semantic.color.primaryText,
      minHeight: semantic.spacing.touchTargetMin
    },
    actionBar: {
      height: primitive.spacing['72'],
      background: semantic.color.surface,
      borderTop: semantic.color.borderDefault
    },
    statusChip: {
      minHeight: primitive.spacing['32'],
      successBackground: semantic.color.success,
      dangerBackground: semantic.color.danger
    },
    scannerOverlay: {
      background: 'rgba(0,0,0,0.85)',
      flashDuration: '100ms'
    }
  }
};
