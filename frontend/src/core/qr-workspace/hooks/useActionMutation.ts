import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

interface ActionPayload {
  actionCode: string;
  qrCode: string;
  data?: any; // Payload extra para la acción (ej. cantidad a consumir)
}

export function useActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ActionPayload) => {
      const response = await apiClient.post(ENDPOINTS.ACTIONS.EXECUTE(payload.actionCode), payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidamos el query específico del QR que acabamos de operar
      // para forzar al Workspace a pedir la versión más fresca y actualizar 
      // su status, cantidad, actions y trazabilidad
      queryClient.invalidateQueries({
        queryKey: ['traceability', variables.qrCode]
      });
    },
  });
}
