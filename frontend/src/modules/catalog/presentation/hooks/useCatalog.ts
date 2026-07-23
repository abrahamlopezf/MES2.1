import { useQuery } from '@tanstack/react-query';
import { catalogFacade } from '../../infrastructure/di/CatalogModuleDI';
import { MaterialDTO, MaterialCategoryDTO } from '../../application/dto/CatalogDTOs';

export function useMaterials() {
  return useQuery<MaterialDTO[]>({
    queryKey: ['catalog', 'materials'],
    queryFn: () => catalogFacade.getAllMaterials()
  });
}

export function useCategories() {
  return useQuery<MaterialCategoryDTO[]>({
    queryKey: ['catalog', 'categories'],
    queryFn: () => catalogFacade.getAllCategories()
  });
}
