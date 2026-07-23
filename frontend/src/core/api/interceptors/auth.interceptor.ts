import { InternalAxiosRequestConfig } from 'axios';

/**
 * Interceptor para inyectar el token JWT en las peticiones HTTP.
 */
export const authInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // TODO: Leer token del state (ej. Zustand) o de localStorage
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  
  return config;
};
