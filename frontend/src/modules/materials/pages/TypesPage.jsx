import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Tag } from 'lucide-react';
import { 
  useMaterialTypesQuery, 
  useCreateMaterialTypeMutation, 
  useUpdateMaterialTypeMutation 
} from '../hooks/useMaterialsQueries';

const TypesPage = () => {
  const query = useMaterialTypesQuery();
  const createMut = useCreateMaterialTypeMutation();
  const updateMut = useUpdateMaterialTypeMutation();

  return (
    <SubcatalogPageTemplate
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
