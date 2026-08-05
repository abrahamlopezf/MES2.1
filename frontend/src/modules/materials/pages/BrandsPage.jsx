import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Award } from 'lucide-react';
import { 
  useMaterialBrandsQuery, 
  useCreateMaterialBrandMutation, 
  useUpdateMaterialBrandMutation 
} from '../hooks/useMaterialsQueries';

const BrandsPage = () => {
  const query = useMaterialBrandsQuery();
  const createMut = useCreateMaterialBrandMutation();
  const updateMut = useUpdateMaterialBrandMutation();

  return (
    <SubcatalogPageTemplate
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
