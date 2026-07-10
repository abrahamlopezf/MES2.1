import { create } from 'zustand';
import { getMeRequest, loginRequest, logoutRequest } from '../modules/auth/services/authApi';

const storedToken = localStorage.getItem('auth_token');
const storedUser = localStorage.getItem('auth_user');

export const useAuthStore = create((set, get) => ({
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: Boolean(storedToken),
  isInitializing: false,
  isLoading: false,
  error: null,

  login: async ({ identifier, password }) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const response = await loginRequest({
        identifier,
        password,
      });

      const token = response.data.token;
      const user = response.data.user;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error) {
      const message = error.friendlyMessage || 'No pudimos iniciar sesión.';

      set({
        isLoading: false,
        error: message,
      });

      throw error;
    }
  },

  initializeAuth: async () => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
      });

      return;
    }

    set({
      isInitializing: true,
      error: null,
    });

    try {
      const response = await getMeRequest();
      const user = response.data;

      localStorage.setItem('auth_user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },

  logout: async () => {
    try {
      if (get().token) {
        await logoutRequest();
      }
    } catch (error) {
      console.warn('No se pudo cerrar sesión en servidor:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  hasPermission: (permissionCode) => {
    const user = get().user;
    return user?.permissions?.includes(permissionCode) || false;
  },

  hasAnyPermission: (permissionCodes = []) => {
    const user = get().user;
    return permissionCodes.some((permissionCode) =>
      user?.permissions?.includes(permissionCode)
    );
  },
}));