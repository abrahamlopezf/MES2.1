import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = () => {
  const {
    isAuthenticated,
    isInitializing,
    initializeAuth,
    user,
    token,
  } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      initializeAuth();
    }
  }, [token, user, initializeAuth]);

  if (isInitializing) {
    return (
      <main className="page-container">
        <section className="status-card">
          <Loader2 size={54} className="spin" />
          <h1>Validando sesión</h1>
          <p>Estamos verificando tus permisos de acceso.</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;