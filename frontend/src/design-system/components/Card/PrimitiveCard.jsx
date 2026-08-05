import React, { forwardRef } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';

/**
 * PrimitiveCard
 * Contenedor universal base. Sin sombras agresivas.
 * Variantes: surface, elevated, interactive
 */
export const PrimitiveCard = forwardRef(({
  children,
  variant = 'surface',
  padding = 'md', // sm | md | lg
  status, // Opcional borde semántico
  loading = false,
  onClick,
  className = '',
  style,
  ...props
}, ref) => {
  ComponentHealth.check('PrimitiveCard');

  const getPadding = () => {
    switch (padding) {
      case 'sm': return tokens.primitive.spacing['8'];
      case 'lg': return tokens.primitive.spacing['24'];
      case 'md':
      default: return tokens.primitive.spacing['16'];
    }
  };

  const getVariantStyles = () => {
    const baseBorder = `1px solid ${tokens.semantic.color.borderDefault}`;
    const statusBorder = status ? `1px solid ${tokens.semantic.color[status.toLowerCase()] || tokens.semantic.color.primary}` : baseBorder;

    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: tokens.primitive.colors.zinc800, // Ligeramente más claro que surface
          border: statusBorder,
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)', // Sutil para mantener legibilidad industrial
        };
      case 'interactive':
        return {
          backgroundColor: tokens.semantic.color.surface,
          border: statusBorder,
          cursor: 'pointer',
          transition: 'background-color 150ms ease, transform 150ms ease',
        };
      case 'surface':
      default:
        return {
          backgroundColor: tokens.semantic.color.surface,
          border: statusBorder,
        };
    }
  };

  const baseStyle = {
    display: 'flex',
    flexDirection: 'column',
    padding: getPadding(),
    borderRadius: tokens.primitive.spacing['12'],
    fontFamily: tokens.primitive.typography.sans,
    color: tokens.semantic.color.textHighEmphasis,
    overflow: 'hidden',
    position: 'relative',
    ...getVariantStyles(),
    ...style
  };

  // Skeleton overlay
  if (loading) {
    return (
      <div style={{...baseStyle, opacity: 0.7}}>
        <div style={{
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          animation: 'shimmer 1.5s infinite'
        }} />
        <style>
          {`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}
        </style>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={baseStyle}
      onClick={variant === 'interactive' ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

PrimitiveCard.displayName = 'PrimitiveCard';

PrimitiveCard.metadata = createComponentMetadata({
  component: "PrimitiveCard",
  touchTarget: 0,
});
