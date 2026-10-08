import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Factory } from 'lucide-react';
import { 
  useMaterialFamiliesQuery, 
  useCreateMaterialFamilyMutation, 
  useUpdateMaterialFamilyMutation,
  useDeactivateMaterialFamilyMutation 
} from '../hooks/useMaterialsQueries';

const FamiliesPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'active'
  });

  const query = useMaterialFamiliesQuery(filters);
  const createMut = useCreateMaterialFamilyMutation();
  const updateMut = useUpdateMaterialFamilyMutation();
  const deleteMut = useDeactivateMaterialFamilyMutation();

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
      entityName="familias"
      title="Familias de Materiales"
      description="Agrupa los materiales por su rama o linaje principal."
      icon={Factory}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      deleteMutation={deleteMut}
      labels={{
        codeLabel: 'Código de Familia',
        codePlaceholder: 'Ej. POL',
        nameLabel: 'Nombre de la Familia',
        namePlaceholder: 'Ej. Polímeros',
        descriptionLabel: 'Descripción Extendida'
      }}
    />
  );
};

export default FamiliesPage;
