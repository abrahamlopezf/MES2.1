import { apiClient } from '../../../core/api/apiClient';

export interface MaterialDTO {
  id: number;
  uuid: string;
  internal_code: string;
  name: string;
  description: string;
  brand?: { id: number; name: string };
  family?: { id: number; name: string };
  base_unit_id?: number;
  stock_unit_id?: number;
}

export const MaterialService = {
  async getAll(): Promise<MaterialDTO[]> {
    const response: any = await apiClient.get('/materials?pageSize=10000&_t=' + Date.now());
    // Asumiendo que el backend retorna { success: true, data: { items: [...] } }
    return response.items || response.data?.items || response.data?.data?.items || response.data?.data || response.data || response;
  }
};
