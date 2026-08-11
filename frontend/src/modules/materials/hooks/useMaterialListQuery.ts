import { useQuery } from '@tanstack/react-query';
import { MaterialService } from '../services/material.service';

export const useMaterialListQuery = () => {
  return useQuery({
    queryKey: ['materials', 'all', 'v5'],
    queryFn: () => MaterialService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
