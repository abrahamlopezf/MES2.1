import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Tag } from 'lucide-react';
import { 
  useTagsQuery, 
  useCreateTagMutation, 
  useUpdateTagMutation,
  useDeactivateTagMutation 
} from '../hooks/useMaterialsQueries';

const TagsPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'active'
  });

  const query = useTagsQuery(filters);
  const createMut = useCreateTagMutation();
  const updateMut = useUpdateTagMutation();
  const deleteMut = useDeactivateTagMutation();

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
      entityName="etiquetas"
      title="Etiquetas de Material"
      description="Define etiquetas para clasificar materiales (ej. Cortesía, Inflamable)."
      icon={Tag}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      deleteMutation={deleteMut}
      labels={{
        codeLabel: 'Color',
        codePlaceholder: 'Ej. #ff0000',
        nameLabel: 'Nombre de la Etiqueta',
        namePlaceholder: 'Ej. Cortesía',
        descriptionLabel: 'Descripción (Opcional)'
      }}
      isCodeOptional={true}
      useColorForCode={true}
    />
  );
};

export default TagsPage;
