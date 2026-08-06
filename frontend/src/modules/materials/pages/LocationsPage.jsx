import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { MapPin } from 'lucide-react';
import { 
  useOperationalAreasQuery, 
  useOperationalAreaMutation
} from '../hooks/useMaterialsQueries';

const LocationsPage = () => {
  const [page, setPage] = useState(1);
  const query = useOperationalAreasQuery({ page, limit: 20 });
  const mutation = useOperationalAreaMutation();

  return (
    <SubcatalogPageTemplate
      page={page}
      setPage={setPage}
      title="Localidades de Almacén"
      description="Define las localidades físicas del almacén (Rack, Nivel, Posición)."
      icon={MapPin}
      dataQuery={query}
      createMutation={mutation}
      updateMutation={mutation}
      labels={{
        codeLabel: 'Código de Localidad',
        codePlaceholder: 'Ej. A1-01',
        nameLabel: 'Nombre de la Localidad',
        namePlaceholder: 'Ej. Rack A1 Nivel 1',
        descriptionLabel: 'Descripción Extendida'
      }}
    />
  );
};

export default LocationsPage;
