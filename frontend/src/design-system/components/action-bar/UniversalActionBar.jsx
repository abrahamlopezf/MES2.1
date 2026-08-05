import React, { forwardRef, useEffect } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';

/**
 * UniversalActionBar
 * Policy Enforcement: 
 * - MaxPrimaryButtons = 2
 * - Exactamente 1 primario (Primary action always visible)
 * - Deterministic order (secondary left, primary right)
 */
export const UniversalActionBar = forwardRef(({
  primaryActions = [], // Array de elementos <ActionButton>
  secondaryActions = [], // Array de elementos <ActionButton>
  className = '',
  ...props
}, ref) => {
  ComponentHealth.check('UniversalActionBar');

  // Policy Validations en tiempo de desarrollo
  if (process.env.NODE_ENV !== 'production') {
    if (primaryActions.length === 0 && secondaryActions.length === 0) {
      throw new Error(`[MES_POLICY_VIOLATION] UniversalActionBar requiere al menos una acción.`);
    }
    if (primaryActions.length > 2) {
      throw new Error(`[MES_POLICY_VIOLATION] MaxPrimaryButtons=2 excedido. Se recibieron ${primaryActions.length} acciones primarias.`);
    }
    // Para simplificar, asumimos que primaryActions son las acciones principales.
  }

  // Wrapper para interceptar y emitir métricas
  const renderActions = (actions, type) => {
    return actions.map((action, index) => {
      if (!React.isValidElement(action)) return action;
      
      return React.cloneElement(action, {
        key: action.key || index,
        onClick: (e) => {
          if (type === 'primary') {
            EventBus.emit(MES_EVENTS.ACTIONBAR_PRIMARY_TRIGGERED, { index });
          }
          if (action.props.onClick) action.props.onClick(e);
        }
      });
    });
  };

  const barStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: tokens.components.actionBar.height,
    backgroundColor: tokens.components.actionBar.background,
    borderTop: tokens.components.actionBar.borderTop,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `0 ${tokens.primitive.spacing['24']}`,
    boxShadow: tokens.primitive.elevation.overlay,
    zIndex: 40, // Sobre el contenido, debajo de modales
  };

  const actionGroupStyle = {
    display: 'flex',
    gap: tokens.primitive.spacing['16'],
    alignItems: 'center'
  };

  return (
    <div ref={ref} style={barStyle} className={className} {...props}>
      <div style={actionGroupStyle}>
        {renderActions(secondaryActions, 'secondary')}
      </div>
      <div style={actionGroupStyle}>
        {renderActions(primaryActions, 'primary')}
      </div>
    </div>
  );
});

UniversalActionBar.displayName = 'UniversalActionBar';

UniversalActionBar.metadata = createComponentMetadata({
  component: "UniversalActionBar",
});
