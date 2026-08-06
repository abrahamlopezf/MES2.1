import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Factory } from 'lucide-react';
import { 
  useMaterialFamiliesQuery, 
  useCreateMaterialFamilyMutation, 
  useUpdateMaterialFamilyMutation 
} from '../hooks/useMaterialsQueries';

const FamiliesPage = () => {
  const [page, setPage] = useState(1);
  const query = useMaterialFamiliesQuery({ page, limit: 20 });
  const createMut = useCreateMaterialFamilyMutation();
  const updateMut = useUpdateMaterialFamilyMutation();

  return (
    <SubcatalogPageTemplate
      page={page}
      setPage={setPage}
      title="Familias de Materiales"
      description="Agrupa los materiales por su rama o linaje principal."
      icon={Factory}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
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
