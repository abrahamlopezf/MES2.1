import { ChevronRight, Home } from '@/design-system/components/Icon/googleIconCompat';
import { Link, useLocation } from 'react-router-dom';

const ROUTE_DICTIONARY = {
  admin: 'Administración',
  areas: 'Áreas',
  almacen: 'Almacén',
  'area-inventory': 'Inventario por área',
  andon: 'Andon',
  batches: 'Lotes',
  board: 'Tablero operativo',
  brands: 'Marcas',
  catalogos: 'Catálogos',
  categories: 'Categorías',
  codes: 'Códigos',
  corte: 'Corte',
  custody: 'Custodia',
  extrusion: 'Extrusión',
  families: 'Familias',
  formulas: 'Fórmulas',
  genealogy: 'Genealogía',
  generate: 'Generar lotes',
  globo: 'Globo',
  identity: 'Identidad',
  inventory: 'Inventario',
  laminado: 'Laminado',
  ledger: 'Libro mayor',
  list: 'Listado',
  locations: 'Ubicaciones',
  machines: 'Máquinas',
  materials: 'Materiales',
  mixing: 'Mezclado',
  'merma-scrap': 'Merma y scrap',
  'scrap-control': 'Control de merma y scrap',
  lotes: 'Lotes',
  new: 'Nuevo',
  orders: 'Órdenes',
  operators: 'Operadores',
  print: 'Impresión',
  production: 'Producción',
  profile: 'Perfil',
  qrcodes: 'Historial de códigos QR',
  rack: 'Rack',
  'rack-ingress': 'Ingreso a racks',
  racks: 'Racks',
  receive: 'Recepción',
  requests: 'Solicitudes',
  runs: 'Corridas',
  silos: 'Silos',
  stations: 'Estaciones',
  suppliers: 'Proveedores',
  tags: 'Etiquetas',
  telares: 'Telares',
  tokens: 'Códigos QR',
  traceability: 'Trazabilidad',
  types: 'Tipos',
  wip: 'WIP',
  units: 'Unidades',
  usuarios: 'Usuarios',
  'viajero-tracker': 'Seguimiento de viajero',
  warehouse: 'Almacén',
};

const isRecordId = (segment) =>
  /^\d+$/.test(segment) || /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(segment);

const getSegmentLabel = (segment, previousSegment) => {
  if (isRecordId(segment)) {
    if (previousSegment === 'materials') return 'Material';
    if (previousSegment === 'lotes') return 'Detalle de lote';
    if (previousSegment === 'areas') return 'Área';
    return 'Detalle';
  }

  return ROUTE_DICTIONARY[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);
};

const getBreadcrumbPath = (segments, index) => {
  if (segments[0] === 'warehouse' && ['materials', 'lotes'].includes(segments[1]) && index === 1) {
    return '/warehouse/inventory';
  }
  if (segments[0] === 'warehouse' && segments[1] === 'materials' && index === 2) {
    return '/warehouse/inventory';
  }

  if (segments[0] === 'identity' && index === 0) return '/identity/generate';
  if (segments[0] === 'production' && index === 0) return '/dashboard';
  if (segments[0] === 'extrusion' && index === 0) {
    return segments[1] === 'dashboard' ? '/dashboard' : '/extrusion/dashboard';
  }
  if (segments[0] === 'production' && segments[1] === 'extrusion' && segments[2] === 'rack' && index === 2) {
    return '/production/extrusion';
  }
  if (segments[0] === 'telares' && index === 0) {
    return segments[1] === 'dashboard' ? '/production/telares' : '/telares/dashboard';
  }
  if (segments[0] === 'globo' && index === 0) {
    return segments[1] === 'catalogos' ? '/globo/wip' : '/production/globo';
  }
  if (segments[0] === 'laminado' && index === 0) {
    return segments[1] === 'catalogos' ? '/laminado/wip' : '/production/laminado';
  }
  return `/${segments.slice(0, index + 1).join('/')}`;
};

export const GlobalBreadcrumbs = () => {
  const { pathname } = useLocation();
  const pathnames = pathname.split('/').filter(Boolean);

  if (pathnames.length === 0 || pathname === '/dashboard') return null;

  return (
    <div className="sticky top-0 z-40 w-full min-w-0 border-b border-border bg-background">
      <div className="flex min-h-12 items-center gap-2 px-3 py-2 pr-16 sm:px-5 sm:pr-20 lg:px-6 lg:pr-6">
        <nav className="min-w-0 flex-1" aria-label="Ruta de navegación">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            <li className="flex shrink-0 items-center">
              <Link
                to="/dashboard"
                aria-label="Inicio"
                title="Inicio"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home size={17} aria-hidden="true" />
              </Link>
            </li>
            {pathnames.map((segment, index) => {
              const isCurrent = index === pathnames.length - 1;
              const path = getBreadcrumbPath(pathnames, index);
              const label = getSegmentLabel(segment, pathnames[index - 1]);
              const showOnMobile = index === 0 || isCurrent;

              return (
                <li
                  key={path}
                  className={`flex min-w-0 items-center gap-1.5 ${showOnMobile ? '' : 'hidden lg:flex'}`}
                >
                  <ChevronRight size={15} className="shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  {isCurrent && pathnames.length > 2 && (
                    <span className="px-1 text-muted-foreground lg:hidden" aria-hidden="true">…</span>
                  )}
                  {isCurrent ? (
                    <span
                      className="min-w-0 truncate px-1 font-semibold text-foreground"
                      aria-current="page"
                      title={label}
                    >
                      {label}
                    </span>
                  ) : (
                    <Link
                      to={path}
                      className="max-w-40 truncate rounded-md px-1 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={label}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};
