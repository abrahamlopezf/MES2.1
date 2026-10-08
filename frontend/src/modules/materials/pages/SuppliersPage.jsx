import { useState } from 'react';
import SubcatalogPageTemplate from './SubcatalogPageTemplate';
import { Truck } from 'lucide-react';
import { 
  useSuppliersQuery, 
  useCreateSupplierMutation, 
  useUpdateSupplierMutation,
  useDeactivateSupplierMutation 
} from '../hooks/useMaterialsQueries';
import SupplierCatalogForm from '../components/SupplierCatalogForm';

const SuppliersPage = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'active'
  });

  const query = useSuppliersQuery(filters);
  const createMut = useCreateSupplierMutation();
  const updateMut = useUpdateSupplierMutation();
  const deleteMut = useDeactivateSupplierMutation();

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
      entityName="proveedores"
      title="Proveedores"
      description="Administra el catálogo de proveedores para las recepciones de material."
      icon={Truck}
      dataQuery={query}
      createMutation={createMut}
      updateMutation={updateMut}
      deleteMutation={deleteMut}
      CustomForm={SupplierCatalogForm}
      labels={{
        codeLabel: 'RFC / Código',
        codePlaceholder: 'Ej. PROV-001',
        nameLabel: 'Razón Social / Nombre',
        namePlaceholder: 'Ej. Proveedor S.A. de C.V.',
        descriptionLabel: 'Información Adicional (Contacto, Dirección)'
      }}
    />
  );
};

export default SuppliersPage;
