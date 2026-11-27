import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdentityRequestsPage } from './IdentityRequestsPage';

const mocks = vi.hoisted(() => ({
  user: null as any,
  requestsQuery: { data: [], isLoading: false, error: null, refetch: vi.fn() },
  availableQuery: { data: [], isLoading: false, error: null, refetch: vi.fn() },
  createMutation: { mutate: vi.fn(), isPending: false, error: null },
  fulfillMutation: { mutate: vi.fn(), isPending: false, error: null },
}));

vi.mock('../../../../store/authStore', () => ({
  useAuthStore: (selector: (state: any) => unknown) => selector({ user: mocks.user }),
}));

vi.mock('../hooks/useIdentityRequests', () => ({
  useIdentityRequestsQuery: () => mocks.requestsQuery,
  useAvailableQrCodesQuery: () => mocks.availableQuery,
  useCreateIdentityRequestMutation: () => mocks.createMutation,
  useFulfillIdentityRequestMutation: () => mocks.fulfillMutation,
}));

describe('IdentityRequestsPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('lets an area operator create a persistent QR request from the form', () => {
    mocks.user = { id: 9, role: { code: 'SUPERVISOR_EXTRUSION' }, area: { code: 'EXTRUSION' } };
    render(<IdentityRequestsPage />);
    fireEvent.change(screen.getByLabelText('Cantidad de QR'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Notas para Almacén'), { target: { value: 'Racks del turno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar para EXTRUSION' }));

    expect(mocks.createMutation.mutate).toHaveBeenCalledWith(
      { requested_quantity: 4, notes: 'Racks del turno' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
  });

  it('lets the Almacén supervisor fulfill with destination-compatible virgin QR only', () => {
    mocks.user = { id: 1, role: { code: 'SUPERVISOR_ALMACEN' }, area: { id: 1, code: 'ALMACEN' } };
    mocks.requestsQuery = {
      data: [{ id: 41, area_id: 2, requested_by: 9, requested_quantity: 1, notes: null, requested_at: '2026-11-27T10:00:00.000Z', delivered_by: null, delivered_at: null, delivered_quantity: 0, status: 'PENDING', area: { id: 2, code: 'EXTRUSION', name: 'Extrusión' }, items: [] }],
      isLoading: false, error: null, refetch: vi.fn(),
    };
    mocks.availableQuery = {
      data: { items: [
        { id: 71, qr_code: '25-ALM-000071', batch_id: 5, status: 'UNASSIGNED', assigned_area_id: 2, batch_assigned_area_id: 2 },
        { id: 72, qr_code: '25-ALM-000072', batch_id: 6, status: 'UNASSIGNED', assigned_area_id: 5, batch_assigned_area_id: 5 },
      ], total: 2, limit: 500, offset: 0 },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    render(<IdentityRequestsPage />);
    expect(screen.getByText('25-ALM-000071')).toBeInTheDocument();
    expect(screen.queryByText('25-ALM-000072')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar 25-ALM-000071' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega de QR' }));

    expect(mocks.fulfillMutation.mutate).toHaveBeenCalledWith(
      { requestId: 41, qrCodeIds: [71] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
