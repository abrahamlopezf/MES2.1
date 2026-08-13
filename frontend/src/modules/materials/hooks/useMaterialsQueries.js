import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createMaterialCategoryRequest,
  createMaterialRequest,
  deactivateMaterialCategoryRequest,
  deactivateMaterialRequest,
  getMaterialCategoriesRequest,
  getMaterialsRequest,
  updateMaterialCategoryRequest,
  updateMaterialRequest,
  getRankingsRequest,
  getMaterialFamiliesRequest,
  createMaterialFamilyRequest,
  updateMaterialFamilyRequest,
  getMaterialCodesRequest,
  createMaterialCodeRequest,
  updateMaterialCodeRequest,
  getMaterialTypesRequest,
  createMaterialTypeRequest,
  updateMaterialTypeRequest,
  getMaterialBrandsRequest,
  createMaterialBrandRequest,
  updateMaterialBrandRequest,
  getOperationalAreasRequest,
  createOperationalAreaRequest,
  updateOperationalAreaRequest,
} from '../services/materialsApi';

export const materialQueryKeys = {
  all: ['materials'],
  lists: () => [...materialQueryKeys.all, 'list'],
  list: (filters) => [...materialQueryKeys.lists(), filters],
  categories: (filters) => [...materialQueryKeys.all, 'categories', filters],
  rankings: () => [...materialQueryKeys.all, 'rankings'],
  families: (filters) => [...materialQueryKeys.all, 'families', filters],
  codes: (filters) => [...materialQueryKeys.all, 'codes', filters],
  types: (filters) => [...materialQueryKeys.all, 'types', filters],
  brands: (filters) => [...materialQueryKeys.all, 'brands', filters],
  locations: (filters) => [...materialQueryKeys.all, 'locations', filters],
};

const buildMaterialParams = (filters = {}) => {
  const params = {
    pageSize: 20,
    page: filters.page || 1,
  };

  if (filters.search) params.search = filters.search;
  if (filters.material_category_id) {
    params.material_category_id = filters.material_category_id;
  }
  if (filters.material_type) params.material_type = filters.material_type;
  if (filters.default_unit) params.default_unit = filters.default_unit;

  if (filters.status === 'all') {
    params.include_inactive = 'true';
  }

  return params;
};

const getPayload = (response) => {
  const root = response?.data ?? response;

  if (root?.message && typeof root.message === 'object') {
    return root.message;
  }

  if (root?.data && typeof root.data === 'object') {
    return root.data;
  }

  return root;
};

const normalizeMaterialsResponse = (response) => {
  const root = response?.data ?? response;
  const payload = getPayload(response);

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: root?.meta || { total: payload.length },
    };
  }

  const items =
    payload?.items ??
    payload?.materials ??
    payload?.rows ??
    [];

  return {
    items: Array.isArray(items) ? items : [],
    meta: root?.meta || { total: Number(payload?.total) || items.length || 0 },
  };
};

const normalizeCategoriesResponse = (response) => {
  const payload = getPayload(response);

  const root = response?.data ?? response;
  if (Array.isArray(payload)) {
    return { items: payload, meta: root?.meta || { total: payload.length } };
  }

  const items =
    payload?.items ??
    payload?.categories ??
    payload?.rows ??
    [];

  return { 
    items: Array.isArray(items) ? items : [], 
    meta: root?.meta || { total: items.length } 
  };
};

export const useMaterialsQuery = (filters) => {
  return useQuery({
    queryKey: materialQueryKeys.list(filters),
    queryFn: async () => {
      const response = await getMaterialsRequest(buildMaterialParams(filters));
      return normalizeMaterialsResponse(response);
    },
  });
};

export const useMaterialCategoriesQuery = (filters = {}) => {
  return useQuery({
    queryKey: materialQueryKeys.categories(filters),
    queryFn: async () => {
      const response = await getMaterialCategoriesRequest(filters);
      return normalizeCategoriesResponse(response);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useRankingsQuery = () => {
  return useQuery({
    queryKey: materialQueryKeys.rankings(),
    queryFn: async () => {
      const response = await getRankingsRequest();
      return normalizeCategoriesResponse(response); // We can reuse this normalizer
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useCreateMaterialMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMaterialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.lists() });
    },
  });
};

export const useUpdateMaterialMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMaterialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.lists() });
    },
  });
};

export const useDeactivateMaterialMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateMaterialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.lists() });
    },
  });
};

export const useCreateMaterialCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMaterialCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.all });
    },
  });
};

export const useUpdateMaterialCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMaterialCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.all });
    },
  });
};

export const useDeactivateMaterialCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateMaterialCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.all });
    },
  });
};

// --- FAMILIES ---
export const useMaterialFamiliesQuery = (filters = {}) => {
  return useQuery({
    queryKey: materialQueryKeys.families(filters),
    queryFn: async () => {
      const response = await getMaterialFamiliesRequest(filters);
      return normalizeCategoriesResponse(response);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMaterialFamilyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialFamilyRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

export const useUpdateMaterialFamilyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaterialFamilyRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

// --- CODES (ARTICULOS) ---
export const useMaterialCodesQuery = (filters = {}) => {
  return useQuery({
    queryKey: materialQueryKeys.codes(filters),
    queryFn: async () => {
      const response = await getMaterialCodesRequest(filters);
      return normalizeCategoriesResponse(response);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMaterialCodeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialCodeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

export const useUpdateMaterialCodeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaterialCodeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

// --- TYPES ---
export const useMaterialTypesQuery = (filters = {}) => {
  return useQuery({
    queryKey: materialQueryKeys.types(filters),
    queryFn: async () => {
      const response = await getMaterialTypesRequest(filters);
      return normalizeCategoriesResponse(response);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMaterialTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialTypeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

export const useUpdateMaterialTypeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaterialTypeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

// --- BRANDS ---
export const useMaterialBrandsQuery = (filters = {}) => {
  return useQuery({
    queryKey: materialQueryKeys.brands(filters),
    queryFn: async () => {
      const response = await getMaterialBrandsRequest(filters);
      return normalizeCategoriesResponse(response);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMaterialBrandMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialBrandRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

export const useUpdateMaterialBrandMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMaterialBrandRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialQueryKeys.all }),
  });
};

export const useOperationalAreasQuery = (filters = { pageSize: 100 }) => {
  return useQuery({
    queryKey: materialQueryKeys.locations(filters),
    queryFn: () => getOperationalAreasRequest(filters),
    select: normalizeCategoriesResponse,
  });
};

export const useOperationalAreaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) =>
      data.id ? updateOperationalAreaRequest(data) : createOperationalAreaRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialQueryKeys.all });
    },
  });
};