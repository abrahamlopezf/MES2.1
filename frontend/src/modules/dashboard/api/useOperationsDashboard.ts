import { useQuery } from '@tanstack/react-query';
import { DashboardPayload } from '../types/dashboard.types';
import { apiClient } from '@/core/api/client';

const fetchDashboardData = async (): Promise<DashboardPayload> => {
  const response = await apiClient.get('/dashboard/operations');
  return response.data.message;
};

export function useOperationsDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Refrescar cada 30s
  });
}
