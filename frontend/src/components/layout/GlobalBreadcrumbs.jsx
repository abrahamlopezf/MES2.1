import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_DICTIONARY = {
  portal: 'Portal Admin',
  usuarios: 'Usuarios',
  
  identity: 'Identidad',
  generate: 'Generar Lotes',
  requests: 'Peticiones',
  print: 'Impresión',
  custody: 'Custodia',
  batches: 'Lotes',
  tokens: 'Tokens',
  
  traceability: 'Trazabilidad',
  ledger: 'Libro Mayor',
  genealogy: 'Genealogía',
  
  production: 'Producción',
  mixing: 'Mezclado',
  extrusion: 'Extrusión',
  rack: 'Rack',
  new: 'Nuevo',
  orders: 'Órdenes',
  stations: 'Estaciones',
  runs: 'Corridas',
  machines: 'Andon Board',
  
  warehouse: 'Almacén',
  receive: 'Recepción',
  inventory: 'Inventario',
  'merma-scrap': 'Merma y Scrap',
};

const getTranslatedSegment = (segment) => {
  return ROUTE_DICTIONARY[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);
};

export const GlobalBreadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // No mostrar migas de pan en el dashboard o ruta raíz
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  // Segmentar la ruta ignorando cadenas vacías
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Si no hay segmentos, tampoco mostrar (aunque ya cubrimos '/' arriba)
  if (pathnames.length === 0) return null;

  return (
    <div className="w-full bg-background border-b border-border sticky top-0 z-40">
      <div className="max-w-full px-4 md:px-6 py-2.5 flex items-center overflow-x-auto custom-scrollbar whitespace-nowrap">
        {/* Botón de volver inspirado en Mercado Libre */}
        <button 
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors mr-3 shrink-0"
        >
          Volver al listado
        </button>
        
        <span className="text-border mx-2 shrink-0">|</span>

        <nav className="flex items-center text-sm" aria-label="Breadcrumb">
          {pathnames.map((value, index) => {
            const isLast = index === pathnames.length - 1;
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            const label = getTranslatedSegment(value);

            return (
              <div key={to} className="flex items-center shrink-0">
                {isLast ? (
                  <span className="text-muted-foreground font-medium" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <>
                    <Link to={to} className="text-blue-500 hover:text-blue-600 transition-colors">
                      {label}
                    </Link>
                    <ChevronRight size={14} className="mx-1 text-muted-foreground/60 shrink-0" />
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
