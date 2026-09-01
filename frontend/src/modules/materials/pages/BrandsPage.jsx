import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Award } from 'lucide-react';
import { 
  useMaterialBrandsQuery, 
  useCreateMaterialBrandMutation, 
  useUpdateMaterialBrandMutation 
} from '../hooks/useMaterialsQueries';

const BrandsPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });

  const query = useMaterialBrandsQuery(filters);
  const createMut = useCreateMaterialBrandMutation();
  const updateMut = useUpdateMaterialBrandMutation();

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
      entityName="marcas"
      title="Marcas de Material"
      description="Define las marcas comerciales aprobadas."
      icon={Award}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      labels={{
        codeLabel: 'Código de Marca',
        codePlaceholder: 'Ej. 3M',
        nameLabel: 'Nombre de la Marca',
        namePlaceholder: 'Ej. 3M Company',
        descriptionLabel: 'Descripción Extendida'
      }}
    />
  );
};

export default BrandsPage;
