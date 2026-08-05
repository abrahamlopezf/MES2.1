import { useMemo, useState } from 'react';
import { Boxes, Layers3, PackageCheck, RefreshCw } from 'lucide-react';

import { TFAlert, TFButton } from '../../../components/tf-ui';
import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAuthStore } from '../../../store/authStore';

import MaterialActionSheet from '../components/MaterialActionSheet';
import MaterialDeactivateDialog from '../components/MaterialDeactivateDialog';
import MaterialFiltersPanel from '../components/MaterialFiltersPanel';
import MaterialForm from '../components/MaterialForm';
import MaterialModuleHeader from '../components/MaterialModuleHeader';
import MaterialsListSection from '../components/MaterialsListSection';

import {
  useCreateMaterialMutation,
  useDeactivateMaterialMutation,
  useMaterialFamiliesQuery,
  useMaterialsQuery,
  useUpdateMaterialMutation,
} from '../hooks/useMaterialsQueries';

const getApiErrorMessage = (error) => {
  const baseMessage =
    error?.friendlyMessage ||
    error?.response?.data?.message ||
    error?.message ||
    'Ocurrió un problema al procesar la solicitud.';

  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const details = validationErrors
      .map((item) => item.message || item.field)
      .filter(Boolean)
      .join(' ');

    return `${baseMessage} ${details}`;
  }

  return typeof baseMessage === 'string'
    ? baseMessage
    : 'Ocurrió un problema al procesar la solicitud.';
};

const MaterialsPage = () => {
  const { hasPermission } = useAuthStore();

  const canCreate = hasPermission('materials.create');
  const canUpdate = hasPermission('materials.update');
  const canDelete = hasPermission('materials.delete');
  const canViewInactive = canUpdate || canDelete;
  
  // Asumimos que SUPERADMIN y ADMIN tienen permisos especiales o roles
  const { user } = useAuthStore();
  const canManageCatalogs = user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'ADMIN' || hasPermission('masterdata.manage');

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    family_uuid: '',
    material_type: '',
    default_unit: '',
    status: 'active',
    page: 1,
  });

  const debouncedFilters = useDebouncedValue(filters, 300);

  const materialsQuery = useMaterialsQuery(debouncedFilters);

  const familiesQuery = useMaterialFamiliesQuery({
    include_inactive: canViewInactive ? 'true' : undefined,
  });

  const createMaterialMutation = useCreateMaterialMutation();
  const updateMaterialMutation = useUpdateMaterialMutation();
  const deactivateMaterialMutation = useDeactivateMaterialMutation();

  const materials = Array.isArray(materialsQuery.data?.items)
    ? materialsQuery.data.items
    : [];

  const total = Number(materialsQuery.data?.total) || materials.length;

  const families = Array.isArray(familiesQuery.data)
    ? familiesQuery.data
    : [];

  const isInitialLoading =
    (materialsQuery.isLoading || familiesQuery.isLoading) &&
    !materialsQuery.data &&
    !familiesQuery.data;

  const loadError = materialsQuery.error || familiesQuery.error;

  const isRefreshing =
    materialsQuery.isFetching && !materialsQuery.isLoading;

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.family_uuid ||
    filters.material_type ||
    filters.default_unit ||
    filters.status === 'all'
  );

  const activeCount = useMemo(() => {
    return materials.filter((material) => material.is_active).length;
  }, [materials]);

  const inactiveCount = useMemo(() => {
    return materials.filter((material) => !material.is_active).length;
  }, [materials]);

  const categoryCount = families.length;

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      family_uuid: '',
      material_type: '',
      default_unit: '',
      status: 'active',
      page: 1,
    });
  };

  const handlePageChange = (newPage) => {
    updateFilter('page', newPage);
  };

  const handleRefresh = () => {
    materialsQuery.refetch();
  };

  const openCreateMaterial = () => {
    setSelectedMaterial(null);
    setOperationMessage(null);
    setOperationError(null);
    setIsMaterialSheetOpen(true);
  };

  const openEditMaterial = (material) => {
    setSelectedMaterial(material);
    setOperationMessage(null);
    setOperationError(null);
    setIsMaterialSheetOpen(true);
  };

  const closeMaterialSheet = () => {
    setIsMaterialSheetOpen(false);
    setSelectedMaterial(null);
  };

  const handleSubmitMaterial = async (payload) => {
    setOperationMessage(null);
    setOperationError(null);

    try {
      if (selectedMaterial?.id) {
        await updateMaterialMutation.mutateAsync({
          id: selectedMaterial.id,
          payload,
        });

        setOperationMessage('Material actualizado correctamente.');
      } else {
        await createMaterialMutation.mutateAsync(payload);
        setOperationMessage('Material creado correctamente.');
      }

      closeMaterialSheet();
    } catch (error) {
      setOperationError(getApiErrorMessage(error));
    }
  };



  const handleDeactivateMaterial = async () => {
    if (!materialToDeactivate?.id) return;

    const selectedMaterial = materialToDeactivate;

    setOperationMessage(null);
    setOperationError(null);

    try {
      await deactivateMaterialMutation.mutateAsync(selectedMaterial.id);

      setMaterialToDeactivate(null);

      await materialsQuery.refetch();
      await familiesQuery.refetch();

      setOperationMessage(
        `Material "${selectedMaterial.code} — ${selectedMaterial.name}" desactivado correctamente.`
      );
    } catch (error) {
      setMaterialToDeactivate(null);

      setOperationError(
        getApiErrorMessage(error) ||
        `No se pudo desactivar el material "${selectedMaterial.code}".`
      );
    }
  };



  if (isInitialLoading) {
    return (
      <LoadingState
        title="Cargando catálogo de materiales"
        message="Estamos consultando materiales y familias disponibles."
      />
    );
  }

  if (loadError && !materials.length) {
    return (
      <ErrorState
        title="No pudimos cargar materiales"
        message={getApiErrorMessage(loadError)}
        action={
          <TFButton icon={RefreshCw} onClick={handleRefresh}>
            Intentar nuevamente
          </TFButton>
        }
      />
    );
  }

  return (
    <div className="grid content-start gap-4 sm:gap-6 lg:gap-8 pb-32 sm:pb-12 overflow-x-hidden">
      {operationMessage && (
        <TFAlert
          variant="success"
          title="Operación correcta"
          message={operationMessage}
        />
      )}

      {operationError && (
        <TFAlert
          variant="danger"
          title="Revisa la operación"
          message={operationError}
        />
      )}

      {loadError && materials.length > 0 && (
        <TFAlert
          variant="warning"
          title="Información parcialmente actualizada"
          message={getApiErrorMessage(loadError)}
        />
      )}

      <MaterialModuleHeader
        total={total || materials.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        categoryCount={categoryCount}
        canCreate={canCreate}
        onCreateMaterial={openCreateMaterial}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <MaterialFiltersPanel
        filters={filters}
        families={families}
        canViewInactive={canViewInactive}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
      />

      {hasActiveFilters && (
        <TFAlert
          variant="info"
          title="Filtros activos"
          message={`Mostrando ${materials.length} de ${total} materiales según los filtros seleccionados.`}
        />
      )}

      {isRefreshing && (
        <TFAlert
          variant="info"
          title="Actualizando información"
          message="Estamos sincronizando el catálogo con el servidor."
        />
      )}

      <MaterialsListSection
        materials={materials}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        hasActiveFilters={hasActiveFilters}
        onCreate={openCreateMaterial}
        onEdit={openEditMaterial}
        onDeactivate={setMaterialToDeactivate}
        onClearFilters={clearFilters}
        page={filters.page}
        total={total}
        pageSize={20}
        onPageChange={handlePageChange}
      />

      <MaterialActionSheet
        open={isMaterialSheetOpen}
        onClose={closeMaterialSheet}
        title={selectedMaterial ? 'Editar material' : 'Nuevo material'}
        description={
          selectedMaterial
            ? 'Actualiza la información del material seleccionado.'
            : 'Registra un material controlado para futuras operaciones de almacén.'
        }
      >
        <MaterialForm
          initialData={selectedMaterial}
          isSubmitting={
            createMaterialMutation.isPending || updateMaterialMutation.isPending
          }
          onSubmit={handleSubmitMaterial}
          onCancel={closeMaterialSheet}
        />
      </MaterialActionSheet>

      <MaterialDeactivateDialog
        open={Boolean(materialToDeactivate)}
        material={materialToDeactivate}
        isLoading={deactivateMaterialMutation.isPending}
        onConfirm={handleDeactivateMaterial}
        onClose={() => setMaterialToDeactivate(null)}
      />
    </div>
  );
};

export default MaterialsPage;