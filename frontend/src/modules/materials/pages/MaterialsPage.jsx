import { useMemo, useState } from 'react';
import { Boxes, Layers3, PackageCheck, RefreshCw } from 'lucide-react';

import { TFAlert, TFButton } from '../../../components/tf-ui';
import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAuthStore } from '../../../store/authStore';

import CategoriesListSection from '../components/CategoriesListSection';
import CategoryDeactivateDialog from '../components/CategoryDeactivateDialog';
import CategoryForm from '../components/CategoryForm';
import MaterialActionSheet from '../components/MaterialActionSheet';
import MaterialDeactivateDialog from '../components/MaterialDeactivateDialog';
import MaterialFiltersPanel from '../components/MaterialFiltersPanel';
import MaterialForm from '../components/MaterialForm';
import MaterialModuleHeader from '../components/MaterialModuleHeader';
import MaterialsListSection from '../components/MaterialsListSection';
import QrSummaryCard from '../../qrcodes/components/QrSummaryCard';

import {
  useCreateMaterialCategoryMutation,
  useCreateMaterialMutation,
  useDeactivateMaterialCategoryMutation,
  useDeactivateMaterialMutation,
  useMaterialCategoriesQuery,
  useMaterialsQuery,
  useUpdateMaterialCategoryMutation,
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

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    material_category_id: '',
    material_type: '',
    default_unit: '',
    status: 'active',
  });

  const debouncedFilters = useDebouncedValue(filters, 300);

  const materialsQuery = useMaterialsQuery(debouncedFilters);

  const categoriesQuery = useMaterialCategoriesQuery({
    include_inactive: canViewInactive ? 'true' : undefined,
  });

  const createMaterialMutation = useCreateMaterialMutation();
  const updateMaterialMutation = useUpdateMaterialMutation();
  const deactivateMaterialMutation = useDeactivateMaterialMutation();

  const createCategoryMutation = useCreateMaterialCategoryMutation();
  const updateCategoryMutation = useUpdateMaterialCategoryMutation();
  const deactivateCategoryMutation = useDeactivateMaterialCategoryMutation();

  const materials = Array.isArray(materialsQuery.data?.items)
    ? materialsQuery.data.items
    : [];

  const total = Number(materialsQuery.data?.total) || materials.length;

  const categories = Array.isArray(categoriesQuery.data)
    ? categoriesQuery.data
    : [];

  const isInitialLoading =
    (materialsQuery.isLoading || categoriesQuery.isLoading) &&
    !materialsQuery.data &&
    !categoriesQuery.data;

  const loadError = materialsQuery.error || categoriesQuery.error;

  const isRefreshing =
    materialsQuery.isFetching && !materialsQuery.isLoading;

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.material_category_id ||
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

  const categoryCount = categories.length;

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      material_category_id: '',
      material_type: '',
      default_unit: '',
      status: 'active',
    });
  };

  const handleRefresh = () => {
    materialsQuery.refetch();
    categoriesQuery.refetch();
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

  const openCreateCategory = () => {
    setSelectedCategory(null);
    setOperationMessage(null);
    setOperationError(null);
    setIsCategorySheetOpen(true);
  };

  const openEditCategory = (category) => {
    setSelectedCategory(category);
    setOperationMessage(null);
    setOperationError(null);
    setIsCategorySheetOpen(true);
  };

  const closeCategorySheet = () => {
    setIsCategorySheetOpen(false);
    setSelectedCategory(null);
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

  const handleSubmitCategory = async (payload) => {
    setOperationMessage(null);
    setOperationError(null);

    try {
      if (selectedCategory?.id) {
        await updateCategoryMutation.mutateAsync({
          id: selectedCategory.id,
          payload,
        });

        setOperationMessage('Categoría actualizada correctamente.');
      } else {
        await createCategoryMutation.mutateAsync(payload);
        setOperationMessage('Categoría creada correctamente.');
      }

      closeCategorySheet();
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
      await categoriesQuery.refetch();

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

  const handleDeactivateCategory = async () => {
    if (!categoryToDeactivate?.id) return;

    const selectedCategory = categoryToDeactivate;

    setOperationMessage(null);
    setOperationError(null);

    try {
      await deactivateCategoryMutation.mutateAsync(selectedCategory.id);

      setCategoryToDeactivate(null);

      await categoriesQuery.refetch();
      await materialsQuery.refetch();

      setOperationMessage(
        `Categoría "${selectedCategory.code} — ${selectedCategory.name}" desactivada correctamente.`
      );
    } catch (error) {
      setCategoryToDeactivate(null);

      setOperationError(
        getApiErrorMessage(error) ||
        `No se pudo desactivar la categoría "${selectedCategory.code}".`
      );
    }
  };

  if (isInitialLoading) {
    return (
      <LoadingState
        title="Cargando catálogo de materiales"
        message="Estamos consultando materiales y categorías disponibles."
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
    <section className="materials-page-shell">
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
        canCreate={canCreate}
        onCreateMaterial={openCreateMaterial}
        onCreateCategory={openCreateCategory}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <QrSummaryCard
          title="Activos"
          value={activeCount}
          description="Disponibles para operación"
          icon={PackageCheck}
          tone="success"
        />

        <QrSummaryCard
          title="Categorías"
          value={categoryCount}
          description="Clasificación del catálogo"
          icon={Layers3}
          tone="primary"
        />

        <QrSummaryCard
          title="Inactivos"
          value={inactiveCount}
          description="Ocultos para operación"
          icon={Boxes}
          tone="warning"
        />
      </div>

      <MaterialFiltersPanel
        filters={filters}
        categories={categories}
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

      <CategoriesListSection
        categories={categories}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onCreate={openCreateCategory}
        onEdit={openEditCategory}
        onDeactivate={setCategoryToDeactivate}
      />

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
          categories={categories}
          initialData={selectedMaterial}
          isSubmitting={
            createMaterialMutation.isPending || updateMaterialMutation.isPending
          }
          onSubmit={handleSubmitMaterial}
          onCancel={closeMaterialSheet}
        />
      </MaterialActionSheet>

      <MaterialActionSheet
        open={isCategorySheetOpen}
        onClose={closeCategorySheet}
        title={selectedCategory ? 'Editar categoría' : 'Nueva categoría'}
        description={
          selectedCategory
            ? 'Actualiza la información de la categoría seleccionada.'
            : 'Registra una categoría para clasificar materiales del catálogo.'
        }
      >
        <CategoryForm
          initialData={selectedCategory}
          isSubmitting={
            createCategoryMutation.isPending || updateCategoryMutation.isPending
          }
          onSubmit={handleSubmitCategory}
          onCancel={closeCategorySheet}
        />
      </MaterialActionSheet>

      <MaterialDeactivateDialog
        open={Boolean(materialToDeactivate)}
        material={materialToDeactivate}
        isLoading={deactivateMaterialMutation.isPending}
        onConfirm={handleDeactivateMaterial}
        onClose={() => setMaterialToDeactivate(null)}
      />

      <CategoryDeactivateDialog
        open={Boolean(categoryToDeactivate)}
        category={categoryToDeactivate}
        isLoading={deactivateCategoryMutation.isPending}
        onConfirm={handleDeactivateCategory}
        onClose={() => setCategoryToDeactivate(null)}
      />
    </section>
  );
};

export default MaterialsPage;