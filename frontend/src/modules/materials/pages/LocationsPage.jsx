import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { MapPin } from 'lucide-react';
import { 
  useOperationalAreasQuery, 
  useOperationalAreaMutation
} from '../hooks/useMaterialsQueries';
import LocationForm from '../components/LocationForm';

const LocationsPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });

  const query = useOperationalAreasQuery(filters);
  const mutation = useOperationalAreaMutation();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: 20, search: '', status: 'all' });
  };

  return (
    <SubcatalogPageTemplate
      page={filters.page}
      setPage={(page) => handleFilterChange('page', page)}
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      entityName="localidades"
      title="Localidades de Almacén"
      description="Define las localidades físicas del almacén (Rack, Nivel, Posición)."
      icon={MapPin}
      dataQuery={query}
      createMutation={mutation}
      updateMutation={mutation}
      labels={{
        codeLabel: 'Código de Localidad',
        codePlaceholder: 'Ej. A1-01',
        nameLabel: 'Nombre de la Localidad',
        namePlaceholder: 'Ej. Rack A1 Nivel 1',
        descriptionLabel: 'Descripción Extendida'
      }}
      CustomForm={LocationForm}
    />
  );
};

export default LocationsPage;
