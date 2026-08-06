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
    const response: any = await apiClient.get('/materials');
    // Asumiendo que el backend retorna { success: true, data: [...] }
    return response.data?.data || response.data || response;
  }
};
