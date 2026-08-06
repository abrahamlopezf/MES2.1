import { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { TFAlert } from '../../../components/tf-ui';
import LoadingState from '../../../components/feedback/LoadingState';
import ErrorState from '../../../components/feedback/ErrorState';

import CategoriesListSection from '../components/CategoriesListSection';
import CategoryActionSheet from '../components/MaterialActionSheet'; // Reusing action sheet
import CategoryForm from '../components/CategoryForm';
import CategoryDeactivateDialog from '../components/CategoryDeactivateDialog';

import {
  useMaterialCategoriesQuery,
  useCreateMaterialCategoryMutation,
  useUpdateMaterialCategoryMutation,
  useDeactivateMaterialCategoryMutation,
} from '../hooks/useMaterialsQueries';

const getApiErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Ocurrió un error inesperado.';
};

const CategoriesPage = () => {
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('materials.create');
  const canUpdate = hasPermission('materials.update');
  const canDelete = hasPermission('materials.delete');
  const canViewInactive = canUpdate || canDelete;

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null);

  const [page, setPage] = useState(1);

  const categoriesQuery = useMaterialCategoriesQuery({
    include_inactive: canViewInactive ? 'true' : undefined,
    page,
    limit: 20
  });

  const createCategoryMutation = useCreateMaterialCategoryMutation();
  const updateCategoryMutation = useUpdateMaterialCategoryMutation();
  const deactivateCategoryMutation = useDeactivateMaterialCategoryMutation();

  const categories = Array.isArray(categoriesQuery.data?.items) 
    ? categoriesQuery.data.items 
    : (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []);
    
  const meta = categoriesQuery.data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / (meta.pageSize || 20)) : 1;

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

  const handleDeactivateCategory = async () => {
    if (!categoryToDeactivate?.id) return;
    setOperationMessage(null);
    setOperationError(null);

    try {
      await deactivateCategoryMutation.mutateAsync(categoryToDeactivate.id);
      setOperationMessage(`Categoría "${categoryToDeactivate.code}" desactivada.`);
      setCategoryToDeactivate(null);
      categoriesQuery.refetch();
    } catch (error) {
      setCategoryToDeactivate(null);
      setOperationError(getApiErrorMessage(error) || 'No se pudo desactivar.');
    }
  };

  if (categoriesQuery.isLoading && !categories.length) {
    return <LoadingState title="Cargando categorías" message="Estamos obteniendo las categorías registradas." />;
  }

  if (categoriesQuery.error && !categories.length) {
    return <ErrorState title="Error de conexión" message={getApiErrorMessage(categoriesQuery.error)} />;
  }

  return (
    <div className="grid content-start gap-4 pb-12">
      {operationMessage && (
        <TFAlert variant="success" title="Éxito" message={operationMessage} />
      )}
      {operationError && (
        <TFAlert variant="danger" title="Error" message={operationError} />
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

      {/* Pagination Controls */}
      {categories.length > 0 && meta && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({meta.total} registros)
          </span>
          <div className="flex items-center gap-2">
            <TFButton 
              variant="secondary" 
              size="sm" 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </TFButton>
            <TFButton 
              variant="secondary" 
              size="sm" 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </TFButton>
          </div>
        </div>
      )}

      <CategoryActionSheet
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
          isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          onSubmit={handleSubmitCategory}
          onCancel={closeCategorySheet}
        />
      </CategoryActionSheet>

      <CategoryDeactivateDialog
        open={Boolean(categoryToDeactivate)}
        category={categoryToDeactivate}
        isLoading={deactivateCategoryMutation.isPending}
        onConfirm={handleDeactivateCategory}
        onClose={() => setCategoryToDeactivate(null)}
      />
    </div>
  );
};

export default CategoriesPage;
