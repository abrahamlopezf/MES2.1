import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { EventBus } from '../../core/platform/EventBus/EventBus';
import { MES_EVENTS } from '../../core/platform/EventBus/DomainEvents';
import { CapabilityRegistry } from '../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { registerReceptionCapability } from '../../modules/reception/index';
import { ReceptionProvider } from '../../modules/reception/ReceptionProvider';

vi.mock('../../design-system/components/scanner-overlay/CameraScanner', async () => {
  const ReactModule = await import('react');
  return {
    CameraScanner: ({ title }) => ReactModule.createElement(
      'div',
      null,
      ReactModule.createElement('h1', null, title),
      ReactModule.createElement('span', null, 'Escaneo con Pistola USB / Teclado'),
    ),
  };
});

// Mock del cliente API para evitar llamadas reales en la suite
vi.mock('../../core/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(async (url) => {
      if (url.includes('QR-REC-001')) {
        return {
          data: {
            data: { qr_code: 'QR-REC-001', material_id: 1, material_name: 'Polipropileno', provider: 'SABIC' }
          }
        };
      }
      if (url.includes('/materials') || url.includes('/locations') || url.includes('/suppliers')) {
        return { data: { data: { items: [] } } };
      }
      throw new Error('QR No Encontrado');
    }),
    post: vi.fn(async () => {
      return { data: { success: true } };
    })
  }
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { role: { code: 'ADMIN_ALM' } } }),
}));

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(async () => ({ data: { data: { items: [] } } })),
    post: vi.fn(async () => ({ data: { success: true } })),
    patch: vi.fn(async () => ({ data: { success: true } })),
    delete: vi.fn(async () => ({ data: { success: true } })),
  },
}));

describe('Reception Workspace QR resolution', () => {
  beforeEach(() => {
    EventBus.listeners.clear();
    CapabilityRegistry.capabilities.clear();
    registerReceptionCapability();
  });

  it('debe resolver un QR escaneado y mostrar el formulario de recepción', async () => {
    // Renderizar el Provider y el formulario inicial del escáner.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MemoryRouter><ReceptionProvider /></MemoryRouter></QueryClientProvider>);
    
    // Debería estar en INITIAL
    expect(screen.getByText('Escaneo con Pistola USB / Teclado')).toBeDefined();

    // 2. Simular Escaneo
    await act(async () => {
      EventBus.emit(MES_EVENTS.QR_SCANNED, { code: 'QR-REC-001', hardware: 'TEST_HARNESS' });
      // Darle un instante para que el Provider procese la promesa mockeada
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 3. Validar que avanzó al formulario con el QR que resolvió el mock
    expect(screen.getByText('Registrar nuevo material')).toBeDefined();
    expect(screen.getByText('QR-REC-001')).toBeDefined();
    
    // El flujo finalizó
  });
});
