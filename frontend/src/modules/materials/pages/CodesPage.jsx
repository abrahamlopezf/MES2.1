import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Hash } from 'lucide-react';
import { 
  useMaterialCodesQuery, 
  useCreateMaterialCodeMutation, 
  useUpdateMaterialCodeMutation 
} from '../hooks/useMaterialsQueries';

const CodesPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });

  const query = useMaterialCodesQuery(filters);
  const createMut = useCreateMaterialCodeMutation();
  const updateMut = useUpdateMaterialCodeMutation();

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
      entityName="artículos"
      title="Artículos (Códigos)"
      description="Define los consecutivos o artículos base para generar la nomenclatura del material."
      icon={Hash}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      labels={{
        codeLabel: 'Código Corto',
        codePlaceholder: 'Ej. 001',
        nameLabel: 'Nombre del Artículo',
        namePlaceholder: 'Ej. Resina Base',
        descriptionLabel: 'Descripción Extendida'
      }}
    />
  );
};

export default CodesPage;
