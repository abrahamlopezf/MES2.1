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
} from '../services/materialsApi';

export const materialQueryKeys = {
  all: ['materials'],
  lists: () => [...materialQueryKeys.all, 'list'],
  list: (filters) => [...materialQueryKeys.lists(), filters],
  categories: (filters) => [...materialQueryKeys.all, 'categories', filters],
};

const buildMaterialParams = (filters = {}) => {
  const params = {
    limit: 200,
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
  const payload = getPayload(response);

  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
    };
  }

  const items =
    payload?.items ??
    payload?.materials ??
    payload?.rows ??
    [];

  return {
    items: Array.isArray(items) ? items : [],
    total: Number(payload?.total) || items.length || 0,
  };
};

const normalizeCategoriesResponse = (response) => {
  const payload = getPayload(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  const items =
    payload?.items ??
    payload?.categories ??
    payload?.rows ??
    [];

  return Array.isArray(items) ? items : [];
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