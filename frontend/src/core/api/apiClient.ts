import axios, { AxiosInstance } from 'axios';
import { authInterceptor } from './interceptors/auth.interceptor';
// import { idempotencyInterceptor } from './interceptors/idempotency.interceptor';
// import { retryInterceptor } from './interceptors/retry.interceptor';
// import { errorInterceptor } from './interceptors/error.interceptor';

/**
 * Cliente HTTP puro. Agrega la configuración base sin lógica de dominio.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Registrar interceptores
httpClient.interceptors.request.use(authInterceptor);
// httpClient.interceptors.request.use(idempotencyInterceptor);
// httpClient.interceptors.response.use((res) => res, errorInterceptor);
// httpClient.interceptors.response.use((res) => res, retryInterceptor);

/**
 * Capa de abstracción superior (ApiClient) que expone métodos limpios (get, post, etc)
 * para que la capa de Infraestructura de cada módulo nunca importe Axios directamente.
 */
export const apiClient = {
  get: async <T>(url: string, config?: any): Promise<T> => {
    const response = await httpClient.get<T>(url, config);
    return response.data;
  },
  post: async <T>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await httpClient.post<T>(url, data, config);
    return response.data;
  },
  put: async <T>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await httpClient.put<T>(url, data, config);
    return response.data;
  },
  delete: async <T>(url: string, config?: any): Promise<T> => {
    const response = await httpClient.delete<T>(url, config);
    return response.data;
  },
};
