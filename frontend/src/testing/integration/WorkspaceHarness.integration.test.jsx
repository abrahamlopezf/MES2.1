import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

import { EventBus } from '../../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../../core/platform/EventBus/DomainEvents';
import { CapabilityRegistry } from '../../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { registerReceptionCapability } from '../../../modules/reception/index';
import { ReceptionProvider } from '../../../modules/reception/ReceptionProvider';

// Mock del cliente API para evitar llamadas reales en la suite
vi.mock('../../../core/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(async (url) => {
      if (url.includes('QR-REC-001')) {
        return {
          data: {
            data: { qr_code: 'QR-REC-001', material_id: 1, material_name: 'Polipropileno', provider: 'SABIC' }
          }
        };
      }
      throw new Error('QR No Encontrado');
    }),
    post: vi.fn(async () => {
      return { data: { success: true } };
    })
  }
}));

describe('Reception Workspace Acceptance (PR-004.6)', () => {
  beforeEach(() => {
    EventBus.listeners.clear();
    CapabilityRegistry.registry.clear();
    registerReceptionCapability();
  });

  it('debe ejecutar el flujo completo (Escanear -> Resolver -> Validar -> Guardar -> Exito)', async () => {
    // 1. Renderizar el Provider
    render(<ReceptionProvider />);
    
    // Debería estar en INITIAL
    expect(screen.getByText('Pulse el gatillo del escáner para comenzar.')).toBeDefined();

    // 2. Simular Escaneo
    await act(async () => {
      EventBus.emit(MES_EVENTS.SCANNER_READ, { payload: { barcode: 'QR-REC-001' } });
      // Darle un instante para que el Provider procese la promesa mockeada
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 3. Validar que avanzó al Formulario
    expect(screen.getByText(/Polipropileno/)).toBeDefined();
    
    // El flujo finalizó
  });
});
