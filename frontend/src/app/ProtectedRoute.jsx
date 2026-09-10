import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = () => {
  const {
    isAuthenticated,
    isInitializing,
    initializeAuth,
    user,
    token,
  } = useAuthStore();
  
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Solo inicializar si venimos de una recarga de página (isInitializing = true por defecto si hay token)
    if (token && isInitializing) {
      initializeAuth();
    }
  }, [token, isInitializing, initializeAuth]);

  useEffect(() => {
    let timer;
    if (isInitializing) {
      // Si la validación toma más de 8 segundos (ej. app suspendida en mobile), mostrar botón de reintento
      timer = setTimeout(() => setShowRetry(true), 8000);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [isInitializing]);

  const handleRetry = () => {
    setShowRetry(false);
    initializeAuth();
  };

  if (isInitializing) {
    return (
      <main className="page-container flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground">
        <section className="flex flex-col items-center justify-center p-8 bg-card rounded-3xl shadow-lg border border-border text-center max-w-sm w-full mx-4">
          <Loader2 size={54} className="animate-spin text-primary mb-6" />
          <h1 className="text-2xl font-black mb-2 tracking-tight">Validando sesión</h1>
          <p className="text-muted-foreground text-sm font-medium mb-6">
            Estamos verificando tus permisos de acceso.
          </p>
          
          {showRetry && (
            <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-3">
              <p className="text-xs text-warning font-semibold">
                La conexión está tardando más de lo esperado.
              </p>
              <button 
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-bold transition-all active:scale-95 border border-border"
              >
                <RefreshCw size={18} />
                Reintentar
              </button>
            </div>
          )}
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