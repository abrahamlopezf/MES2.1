import { useQuery } from '@tanstack/react-query';
import { MaterialService } from '../services/material.service';

export const useMaterialListQuery = () => {
  return useQuery({
    queryKey: ['materials'],
    queryFn: () => MaterialService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
