import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Error Inesperado";
  let message = "Ha ocurrido un error en la aplicación.";
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Página no encontrada";
      message = "La ruta a la que intentas acceder no existe o fue movida.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || "Ocurrió un problema de comunicación con la ruta.";
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground p-4">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8 text-lg font-medium">{message}</p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-bold transition-all"
          >
            <ArrowLeft size={18} />
            Regresar
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all shadow-md shadow-primary/20"
          >
            <Home size={18} />
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};
