import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Tag } from 'lucide-react';
import { 
  useMaterialTypesQuery, 
  useCreateMaterialTypeMutation, 
  useUpdateMaterialTypeMutation,
  useDeactivateMaterialTypeMutation 
} from '../hooks/useMaterialsQueries';

const TypesPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'active'
  });

  const query = useMaterialTypesQuery(filters);
  const createMut = useCreateMaterialTypeMutation();
  const updateMut = useUpdateMaterialTypeMutation();
  const deleteMut = useDeactivateMaterialTypeMutation();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  };

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: 20, search: '', status: 'active' });
  };

  return (
    <SubcatalogPageTemplate
      page={filters.page}
      setPage={(page) => handleFilterChange('page', page)}
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      entityName="tipos"
      title="Tipos de Material"
      description="Clasifica el estado o forma física del material."
      icon={Tag}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      deleteMutation={deleteMut}
      labels={{
        codeLabel: 'Código Corto',
        codePlaceholder: 'Ej. LIQ',
        nameLabel: 'Nombre del Tipo',
        namePlaceholder: 'Ej. Líquido',
        descriptionLabel: 'Descripción Extendida'
      }}
    />
  );
};

export default TypesPage;
