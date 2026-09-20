import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      'No pudimos conectar con el servidor. Intenta nuevamente.';

    // Solo redirigir si no estamos intentando iniciar sesión
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // Si el mensaje es específico de otra sesión, enviar parámetro por URL
      if (message.includes('otro dispositivo')) {
        window.location.href = '/login?reason=multidevice';
      } else if (message.includes('12 horas')) {
        window.location.href = '/login?reason=timeout';
      } else {
        window.location.href = '/login?reason=expired';
      }
    }

    return Promise.reject({
      ...error,
      friendlyMessage: message,
    });
  }
);

export default axiosClient;