import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Tag } from 'lucide-react';
import { 
  useMaterialTypesQuery, 
  useCreateMaterialTypeMutation, 
  useUpdateMaterialTypeMutation 
} from '../hooks/useMaterialsQueries';

const TypesPage = () => {
  const [page, setPage] = useState(1);
  const query = useMaterialTypesQuery({ page, limit: 20 });
  const createMut = useCreateMaterialTypeMutation();
  const updateMut = useUpdateMaterialTypeMutation();

  return (
    <SubcatalogPageTemplate
      page={page}
      setPage={setPage}
      title="Tipos de Material"
      description="Clasifica el estado o forma física del material."
      icon={Tag}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
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
