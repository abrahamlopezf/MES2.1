import React, { useState, useEffect } from 'react';
import { RuntimeProvider } from '../../../core/runtime/RuntimeProvider/RuntimeProvider';
import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { CapabilityRegistry } from '../../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';
import { ScannerService, MockScannerAdapter } from '../../../core/platform/Scanner/ScannerAdapter';

/**
 * Workspace Harness
 * Un entorno completamente aislado para renderizar y probar Workspaces
 * simulando red, permisos, hardware y telemetría sin acoplarse al backend.
 */
export const WorkspaceHarness = ({
  capabilityId, // e.g., 'RECEPTION'
  workflow,
  permissions = [],
  network = 'online', // 'online' | 'offline'
  scannerType = 'mock', // 'mock' | 'camera'
  user = { id: 1, role: 'OPERATOR' },
  mockData = {},
  telemetry = true,
  children // Componente Workspace a probar
}) => {
  const [harnessReady, setHarnessReady] = useState(false);
  const [networkState, setNetworkState] = useState(network);

  useEffect(() => {
    // 1. Simular Network State
    setNetworkState(network);
    EventBus.emit(network === 'online' ? MES_EVENTS.NETWORK_ONLINE : MES_EVENTS.NETWORK_OFFLINE);

    // 2. Inyectar Mock Scanner
    if (scannerType === 'mock') {
      // Configuramos el Scanner global para usar un Adapter falso
      ScannerService.adapter = new MockScannerAdapter();
    }

    // 3. Registrar la Capacidad
    if (capabilityId && workflow && children) {
      try {
        CapabilityRegistry.register({
          purpose: capabilityId,
          permissions,
          workflow,
          workspace: children.type, // Componente React
        });
        setHarnessReady(true);
        if (telemetry) {
          EventBus.emit(MES_EVENTS.WORKSPACE_OPENED, { purpose: capabilityId, user });
        }
      } catch (err) {
        console.error('[Harness] Error registrando capacidad:', err);
      }
    } else {
      setHarnessReady(true); // Permitir renderizado genérico
    }

    return () => {
      // 4. Limpieza (Cleanup)
      if (telemetry && capabilityId) {
        EventBus.emit(MES_EVENTS.WORKSPACE_CLOSED, { purpose: capabilityId });
      }
      // NOTA: Para tests 100% aislados, en el futuro CapabilityRegistry.unregister(capabilityId)
    };
  }, [capabilityId, network, permissions, scannerType, telemetry, user, workflow, children]);

  if (!harnessReady) {
    return <div data-testid="harness-loading">Inicializando Harness...</div>;
  }

  return (
    <RuntimeProvider>
      <div 
        className="workspace-harness-root"
        data-network={networkState}
        data-role={user.role}
        style={{ width: '100vw', height: '100vh', position: 'relative' }}
      >
        {/* Simulación del "Operations Center" Header o Barra de Estado */}
        {process.env.NODE_ENV !== 'production' && (
          <div style={{ padding: '8px', background: '#333', color: 'yellow', fontSize: '12px' }}>
            HARNESS MODE | Network: {networkState} | Scanner: {scannerType} | Cap: {capabilityId}
          </div>
        )}
        
        {/* Renderiza el Workspace inyectando datos mock */}
        {React.cloneElement(children, { mockData, user })}
      </div>
    </RuntimeProvider>
  );
};
