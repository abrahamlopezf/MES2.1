import { fireEvent, render, screen } from '@testing-library/react';
import { useMutation } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtrusionShiftSessionPanel } from './ExtrusionShiftSessionPanel';
import { extrusionApi } from '../../services/extrusionApi';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: { mutationFn: (...args: any[]) => unknown }) => ({
    mutate: vi.fn((...args: any[]) => options.mutationFn(...args)),
    isPending: false,
  })),
  useQuery: vi.fn(() => ({
    data: {
      session: {
        id: 82,
        status: 'ABIERTO',
        supervisor_id: 7,
        shift_code: 'TURNO_2',
        shift_date: '2026-11-26',
        summary: {
          active_mixes_to_transfer: [
            { queue_id: 10, queue_status: 'ACTIVA', extruder_name: 'Extrusora 2', formula_code: 'F-EXT-5-BLANCA', mixture_qr: 'MIX-2', expected_remaining_kg: 20 },
            { queue_id: 11, queue_status: 'ACTIVA', extruder_name: 'Extrusora 4', formula_code: 'F-EXT-ROJO', mixture_qr: 'MIX-4', expected_remaining_kg: 30 },
          ],
          pending_extruder_closures: [],
        },
        schedule: { shifts: [{ code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00', duration_hours: 8 }] },
      },
      schedule: { shifts: [{ code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00', duration_hours: 8 }] },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
  })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { id: 7, role: 'SUPERVISOR_EXTRUSION' },
  }),
}));
vi.mock('../../hooks/useExtrusionFloorQueries', () => ({ useExtruderQueuesQuery: () => ({ data: [] }) }));
vi.mock('../../services/extrusionApi', () => ({
  extrusionApi: {
    getActiveShiftSession: vi.fn(),
    closeShiftSession: vi.fn(),
    openShiftSession: vi.fn(),
  },
}));

describe('ExtrusionShiftSessionPanel handoff confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an in-page confirmation and closes only after explicit confirmation', () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    render(<ExtrusionShiftSessionPanel />);

    fireEvent.click(screen.getByRole('button', { name: /dejar turno listo para entrega/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Confirmar entrega del turno');
    expect(dialog).toHaveTextContent('Extrusora 2 (F-EXT-5-BLANCA), Extrusora 4 (F-EXT-ROJO)');
    expect(dialog).toHaveTextContent('con el saldo digital, sin pesaje ni interrupción');
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(extrusionApi.closeShiftSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(extrusionApi.closeShiftSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /dejar turno listo para entrega/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Dejar turno listo para entrega' }));

    expect(extrusionApi.closeShiftSession).toHaveBeenCalledWith({ id: 82 });
  });
});
