import React, { forwardRef } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';

/**
 * PrimitiveButton (Base HTML + A11y + Tokens)
 * Solo estilos y accesibilidad. Sin lógica de negocio ni dependencias del runtime.
 */
export const PrimitiveButton = forwardRef(({
  children,
  variant = 'primary', // primary | secondary | ghost | danger
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  className = '',
  style,
  ...props
}, ref) => {
  // Verificación de salud interna
  ComponentHealth.check('PrimitiveButton');

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.primitive.spacing['8'],
    minHeight: tokens.components.button.minHeight, // Mínimo 56px (Thumb Zone)
    minWidth: tokens.components.button.minHeight, // Táctil mínimo 56x56
    padding: `0 ${tokens.primitive.spacing['24']}`,
    borderRadius: tokens.primitive.spacing['8'], // sm
    fontFamily: tokens.primitive.typography.sans,
    fontSize: '16px',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 120ms ease-in-out',
    outline: 'none',
    border: '1px solid transparent',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.semantic.color.primary,
          color: tokens.semantic.color.primaryText,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: tokens.semantic.color.primary,
          border: `1px solid ${tokens.semantic.color.primary}`,
        };
      case 'danger':
        return {
          backgroundColor: tokens.semantic.color.danger,
          color: tokens.semantic.color.primaryText,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: tokens.semantic.color.textMediumEmphasis,
        };
      default:
        return {};
    }
  };

  // Loader integrado (mismo ancho)
  const renderContent = () => {
    if (loading) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: tokens.primitive.spacing['8'] }}>
          {/* Simple SVG Spinner */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
          </style>
          Cargando...
        </span>
      );
    }
    return (
      <>
        {iconLeft}
        {children}
        {iconRight}
      </>
    );
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={className}
      style={{
        ...baseStyle,
        ...getVariantStyles(),
        ...style
      }}
      // Focus-visible management (simple simulation with active pseudo-class via CSS usually, handled here via standard browser behavior)
      onMouseDown={(e) => {
        // Haptic feedback logic for supported hardware
        if (navigator.vibrate) navigator.vibrate(tokens.primitive.spacing['4']); // Very subtle vibration token equivalent
        if (props.onMouseDown) props.onMouseDown(e);
      }}
      {...props}
    >
      {renderContent()}
    </button>
  );
});

PrimitiveButton.displayName = 'PrimitiveButton';

PrimitiveButton.metadata = createComponentMetadata({
  component: "PrimitiveButton",
  touchTarget: 56,
  supportsKeyboard: true,
  supportsScanner: false
});
