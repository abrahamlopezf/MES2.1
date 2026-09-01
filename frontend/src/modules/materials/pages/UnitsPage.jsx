import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Scale } from 'lucide-react';
import { 
  useMaterialUnitsQuery, 
  useCreateMaterialUnitMutation, 
  useUpdateMaterialUnitMutation 
} from '../hooks/useMaterialsQueries';

const UnitsPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });

  const query = useMaterialUnitsQuery(filters);
  const createMut = useCreateMaterialUnitMutation();
  const updateMut = useUpdateMaterialUnitMutation();

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
      entityName="unidades"
      title="Unidades de Medida"
      description="Catálogo maestro para las diferentes unidades de inventario."
      icon={Scale}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      labels={{
        codeLabel: 'Abreviación (Código)',
        codePlaceholder: 'Ej. PZA, KG, LTS',
        nameLabel: 'Nombre de la Unidad',
        namePlaceholder: 'Ej. Pieza, Kilogramo, Litros',
        descriptionLabel: 'Descripción Opcional'
      }}
    />
  );
};

export default UnitsPage;
