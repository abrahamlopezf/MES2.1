import { useEffect, useMemo, useState } from 'react';
import { FilterX, RefreshCw, Search } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/feedback/EmptyState';
import ErrorState from '../../../components/feedback/ErrorState';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/feedback/LoadingState';
import Select from '../../../components/ui/Select';

import { includesNormalized } from '../../../utils/filters';
import { getAreasRequest } from '../services/areasApi';
import AreasTable from '../components/AreasTable';

const getApiErrorMessage = (error) => {
  return (
    error.friendlyMessage ||
    error.response?.data?.message ||
    'Ocurrió un problema al consultar las áreas.'
  );
};

const AreasPage = () => {
  const [areas, setAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredAreas = useMemo(() => {
    return areas
      .filter((area) => {
        const searchableText = [
          area.name,
          area.code,
          area.description,
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch = includesNormalized(searchableText, searchTerm);

        const matchesStatus =
          statusFilter === 'active'
            ? area.is_active
            : statusFilter === 'inactive'
              ? !area.is_active
              : true;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.id - b.id);
  }, [areas, searchTerm, statusFilter]);

  const hasActiveFilters = Boolean(searchTerm || statusFilter);

  const loadAreas = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAreasRequest();
      setAreas(response.data || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Cargando áreas"
        message="Estamos consultando las áreas operativas disponibles."
      />
    );
  }

  if (error && !areas.length) {
    return (
      <ErrorState
        title="No pudimos cargar áreas"
        message={error}
        action={
          <Button icon={RefreshCw} onClick={loadAreas}>
            Intentar nuevamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="module-page">
      <Card
        title="Áreas operativas"
        description="Consulta las áreas disponibles para asignación de usuarios y módulos operativos."
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={loadAreas}
          >
            Actualizar
          </Button>
        }
      >
        <div className="module-stack">
          <Alert
            variant="info"
            title="Solo lectura"
            message="Por seguridad operativa, las áreas se administrarán desde configuración avanzada en una fase posterior."
          />

          {error && (
            <Alert
              variant="danger"
              title="Revisa la consulta"
              message={error}
            />
          )}

          <section className="filter-panel">
            <div className="filter-panel-header">
              <div>
                <h3>Buscar y filtrar áreas</h3>
                <p>
                  Puedes buscar por nombre, código o descripción.
                </p>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  icon={FilterX}
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div className="filter-grid filter-grid-2">
              <Input
                label="Búsqueda"
                name="searchTerm"
                icon={Search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar área..."
              />

              <Select
                label="Estado"
                name="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: 'active', label: 'Activas' },
                  { value: 'inactive', label: 'Inactivas' },
                ]}
                placeholder="Todos los estados"
              />
            </div>

            <div className="filter-summary">
              Mostrando <strong>{filteredAreas.length}</strong> de{' '}
              <strong>{areas.length}</strong> áreas.
            </div>
          </section>

          {!filteredAreas.length ? (
            <EmptyState
              title="No encontramos áreas"
              message={
                hasActiveFilters
                  ? 'No hay áreas que coincidan con los filtros seleccionados.'
                  : 'Cuando existan áreas, aparecerán en esta sección.'
              }
              action={
                hasActiveFilters ? (
                  <Button icon={FilterX} variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : null
              }
            />
          ) : (
            <AreasTable areas={filteredAreas} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AreasPage;