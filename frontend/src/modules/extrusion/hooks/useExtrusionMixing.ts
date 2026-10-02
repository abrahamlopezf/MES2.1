import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';

interface MixInput {
  qr_code: string;
  quantity: number;
}

interface MixPayload {
  formula_id: string;
  preparation_id?: string;
  destination_qr_code: string;
  inputs: MixInput[];
  notes?: string;
}

export const useExtrusionMixing = () => {
  const queryClient = useQueryClient();

  const useFormulas = () => {
    return useQuery({
      queryKey: ['extrusion', 'formulas'],
      queryFn: async () => {
        const res = await apiClient.get<{ success: boolean; data: any[] }>('/extrusion/formulas');
        return res.data;
      },
    });
  };

  const useMixFormula = () => {
    return useMutation({
      mutationFn: async (payload: MixPayload) => {
        const res = await apiClient.post<{ success: boolean; data: any; message: string }>('/extrusion/mix', payload);
        return res;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'formulas'] });
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
        // Invalidate whatever else might need refreshing
      },
    });
  };

  return {
    useFormulas,
    useMixFormula,
  };
};
