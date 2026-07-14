import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { QRScanResponse, EntityType } from '../types/qr-workspace.types';

function mapBackendScanToWorkspace(backendData: any): QRScanResponse {
  const payload = backendData.message || backendData;
  const item = payload.traceable_item;
  const context = payload.mobile_context || {};

  return {
    entity: {
      id: item?.id || payload.qr?.id || 'unknown',
      code: payload.scanned_code,
      type: (item?.item_type || 'Desconocido') as EntityType,
      name: item?.material?.name || item?.product_name || 'Sin nombre',
    },
    status: item?.status || payload.qr?.status || 'UNKNOWN',
    quantity: item ? { value: item.quantity_current, unit: item.unit || 'uds' } : undefined,
    location: item?.current_area ? { rack: item.location || 'N/A', area: item.current_area.name } : undefined,
    traceability: {
      parents: payload.traceability_links?.parents || [],
      children: payload.traceability_links?.children || []
    },
    movements: (payload.movements || []).map((m: any) => ({
      id: m.id.toString(),
      type: m.movement_type,
      title: m.movement_type,
      description: m.notes || `Transferencia a ${m.to_area?.name || 'Desconocida'}`,
      date: m.performed_at,
      user: m.performed_by?.username || 'Sistema',
    })),
    allowed_actions: (context.allowed_actions || []).map((a: any) => ({
      code: a.key,
      label: a.label,
      description: a.description,
      icon: 'Settings', // Por defecto, idealmente mapearlo por key
      severity: a.priority === 'primary' ? 'primary' : 'default',
      requires_confirmation: false
    })),
    warnings: context.warning ? [{ id: '1', code: 'WARN', message: context.warning, severity: 'medium' }] : []
  };
}

export function useTraceabilityScan(code: string | null) {
  return useQuery({
    queryKey: ['traceability', code],
    queryFn: async (): Promise<QRScanResponse> => {
      const response = await apiClient.get(ENDPOINTS.TRACEABILITY.SCAN(code!));
      return mapBackendScanToWorkspace(response.data);
    },
    enabled: !!code,
    staleTime: 0, // La trazabilidad en planta debe ser lo más fresca posible
  });
}
