import React, { forwardRef, useEffect, useState } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';
import { PrimitiveButton } from '../button/PrimitiveButton';

/**
 * ScannerOverlay
 * UI oscura estricta, animación de flash, modo simulación
 */
export const ScannerOverlay = forwardRef(({
  mode = 'CAMERA', // CAMERA | USB_SCANNER | BLUETOOTH_SCANNER | MANUAL_INPUT | SIMULATION
  onClose,
  onManualInput,
  ...props
}, ref) => {
  ComponentHealth.check('ScannerOverlay');
  
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    EventBus.emit(MES_EVENTS.SCANNER_OPENED, { mode });
    return () => {
      EventBus.emit(MES_EVENTS.SCANNER_CLOSED, { mode });
    };
  }, [mode]);

  // Simulación de escaneo para QA/Dev
  useEffect(() => {
    if (mode === 'SIMULATION') {
      const timer = setTimeout(() => {
        setFlash(true);
        setTimeout(() => {
          EventBus.emit(MES_EVENTS.QR_SCANNED, { code: 'SIM-QR-123', hardware: 'SIMULATION' });
          if (onClose) onClose();
        }, parseInt(tokens.components.scannerOverlay.flashDuration, 10)); // 100ms
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [mode, onClose]);

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: tokens.components.scannerOverlay.background, // 72% opacity approx or 85% based on tokens
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const frameStyle = {
    width: '280px',
    height: '280px',
    position: 'relative',
    marginBottom: tokens.primitive.spacing['24']
  };

  const cornerStyle = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderColor: tokens.semantic.color.primary,
    borderStyle: 'solid',
  };

  const flashStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'white',
    opacity: flash ? 0.8 : 0,
    transition: `opacity ${tokens.components.scannerOverlay.flashDuration} ease-out`,
    pointerEvents: 'none'
  };

  return (
    <div ref={ref} style={overlayStyle} {...props}>
      {/* Cierre */}
      <div style={{ position: 'absolute', top: tokens.primitive.spacing['24'], right: tokens.primitive.spacing['24'] }}>
        <PrimitiveButton variant="ghost" onClick={onClose} style={{ minWidth: tokens.primitive.spacing['48'], minHeight: tokens.primitive.spacing['48'] }}>
          ✕
        </PrimitiveButton>
      </div>

      {/* Flash overlay */}
      <div style={flashStyle} />

      {/* Frame de escaneo */}
      <div style={frameStyle}>
        {/* Top Left */}
        <div style={{ ...cornerStyle, top: 0, left: 0, borderWidth: '4px 0 0 4px' }} />
        {/* Top Right */}
        <div style={{ ...cornerStyle, top: 0, right: 0, borderWidth: '4px 4px 0 0' }} />
        {/* Bottom Left */}
        <div style={{ ...cornerStyle, bottom: 0, left: 0, borderWidth: '0 0 4px 4px' }} />
        {/* Bottom Right */}
        <div style={{ ...cornerStyle, bottom: 0, right: 0, borderWidth: '0 4px 4px 0' }} />
        
        {/* Indicador de SIMULATION */}
        {mode === 'SIMULATION' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.semantic.color.warning }}>
            SIMULANDO...
          </div>
        )}
      </div>

      <p style={{ color: tokens.semantic.color.textHighEmphasis, fontSize: tokens.primitive.typography.sizes.lg, marginBottom: tokens.primitive.spacing['32'] }}>
        Alinea el QR dentro del marco
      </p>

      {onManualInput && (
        <PrimitiveButton variant="secondary" onClick={onManualInput}>
          Entrada manual
        </PrimitiveButton>
      )}
    </div>
  );
});

ScannerOverlay.displayName = 'ScannerOverlay';

ScannerOverlay.metadata = createComponentMetadata({
  component: "ScannerOverlay",
  supportsScanner: true
});
