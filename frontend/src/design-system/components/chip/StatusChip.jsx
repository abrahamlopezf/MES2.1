import React, { forwardRef, useEffect } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';

const STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Disponible',
    color: tokens.semantic.color.success,
    icon: '🟢'
  },
  RESERVED: {
    label: 'Reservado',
    color: tokens.semantic.color.warning, // O un color de reserva si se define
    icon: '🟡'
  },
  BLOCKED: {
    label: 'Bloqueado',
    color: tokens.semantic.color.danger,
    icon: '🔴'
  },
  QUARANTINE: {
    label: 'Cuarentena',
    color: '#9333ea', // Purple
    icon: '🟣'
  }
};

/**
 * StatusChip
 * Solo acepta la prop `status`.
 * Prohíbe inyectar color o texto para mantener consistencia estricta.
 */
export const StatusChip = forwardRef(({
  status,
  variant = 'filled', // filled | outline
  className = '',
  ...props
}, ref) => {
  ComponentHealth.check('StatusChip');

  useEffect(() => {
    EventBus.emit(MES_EVENTS.STATUS_RENDERED, { status });
  }, [status]);

  const config = STATUS_CONFIG[status];
  
  if (!config) {
    throw new Error(`[MES_INVALID_STATUS] StatusChip recibió un status no permitido: ${status}`);
  }

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.primitive.spacing['4'],
    padding: `${tokens.primitive.spacing['4']} ${tokens.primitive.spacing['12']}`,
    borderRadius: tokens.primitive.spacing['72'], // Pill shape
    fontFamily: tokens.primitive.typography.sans,
    fontSize: tokens.primitive.typography.sizes.sm,
    fontWeight: 600,
    minHeight: tokens.components.statusChip.minHeight,
    transition: tokens.primitive.animation.success,
  };

  const variantStyles = variant === 'filled' 
    ? {
        backgroundColor: config.color,
        color: tokens.semantic.color.textHighEmphasis,
      }
    : {
        backgroundColor: 'transparent',
        color: config.color,
        border: `1px solid ${config.color}`
      };

  return (
    <span
      ref={ref}
      className={className}
      style={{ ...baseStyle, ...variantStyles }}
      {...props}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
});

StatusChip.displayName = 'StatusChip';

StatusChip.metadata = createComponentMetadata({
  component: "StatusChip",
});
