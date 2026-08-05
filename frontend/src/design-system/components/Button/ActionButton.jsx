import React, { forwardRef } from 'react';
import { PrimitiveButton } from './PrimitiveButton';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';

/**
 * ActionButton (Envoltorio semántico)
 * Sabe de métricas, telemetría y escáneres físicos (Zebra/Honeywell).
 */
export const ActionButton = forwardRef(({
  hardwareHint, // e.g. "F1" or "SCAN_TRIGGER"
  onClick,
  ...props
}, ref) => {
  
  const handleClick = (e) => {
    // 1. Emitir telemetría de UI
    EventBus.emit(MES_EVENTS.BUTTON_CLICKED, { 
      hardwareHint, 
      action: props['data-mes-action'] || 'UNKNOWN_ACTION',
      timestamp: Date.now()
    });

    // 2. Ejecutar acción de negocio
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <PrimitiveButton
      ref={ref}
      onClick={handleClick}
      data-mes-hardware-hint={hardwareHint}
      {...props}
    />
  );
});

ActionButton.displayName = 'ActionButton';

ActionButton.metadata = createComponentMetadata({
  component: "ActionButton",
  touchTarget: 56,
  supportsKeyboard: true,
  supportsScanner: true // Soporta navegación programática
});
