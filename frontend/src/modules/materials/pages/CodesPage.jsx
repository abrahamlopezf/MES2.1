import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Hash } from 'lucide-react';
import { 
  useMaterialCodesQuery, 
  useCreateMaterialCodeMutation, 
  useUpdateMaterialCodeMutation 
} from '../hooks/useMaterialsQueries';

const CodesPage = () => {
  const query = useMaterialCodesQuery();
  const createMut = useCreateMaterialCodeMutation();
  const updateMut = useUpdateMaterialCodeMutation();

  return (
    <SubcatalogPageTemplate
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
