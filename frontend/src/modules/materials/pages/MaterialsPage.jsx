import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Layers3, PackageCheck, RefreshCw, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';

import { 
  TFAlert, 
  TFButton,
  TFDialog,
  TFDialogContent,
  TFDialogHeader,
  TFDialogFooter,
  TFDialogTitle,
  TFDialogDescription
} from '../../../components/tf-ui';
import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';

import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useAuthStore } from '../../../store/authStore';

import MaterialActionSheet from '../components/MaterialActionSheet';
import MaterialFiltersPanel from '../components/MaterialFiltersPanel';
import MaterialForm from '../components/MaterialForm';
import MaterialModuleHeader from '../components/MaterialModuleHeader';
import MaterialsListSection from '../components/MaterialsListSection';
import MasterDataActionDialog from '../../../components/shared/MasterDataActionDialog';

import {
  useActiveTagsQuery,
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
  const { hasPermission, user } = useAuthStore();

  const canCreate = hasPermission('materials.create');
  const canUpdate = hasPermission('materials.update');
  const canDelete = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN_ALM'].includes(user?.role?.code) || hasPermission('materials.delete');
  const canViewInactive = canUpdate || canDelete;
  
  // Asumimos que SUPERADMIN y ADMIN tienen permisos especiales o roles
  const canManageCatalogs = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'].includes(user?.role?.code) || hasPermission('masterdata.manage');

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialToDeactivate, setMaterialToDeactivate] = useState(null);
  const [catalogReminder, setCatalogReminder] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    family_uuid: '',
    material_type: '',
    default_unit: '',
    status: 'active',
    tag: '',
    page: 1,
  });

  const [viewMode, setViewMode] = useState('list');

  const debouncedFilters = useDebouncedValue(filters, 300);

  const materialsQuery = useMaterialsQuery(debouncedFilters);

  const familiesQuery = useMaterialFamiliesQuery({
    include_inactive: canViewInactive ? 'true' : undefined,
  });

  const tagsQuery = useActiveTagsQuery();

  const createMaterialMutation = useCreateMaterialMutation();
  const updateMaterialMutation = useUpdateMaterialMutation();
  const deactivateMaterialMutation = useDeactivateMaterialMutation();

  const materials = Array.isArray(materialsQuery.data?.items)
    ? materialsQuery.data.items
    : [];

  const total = Number(materialsQuery.data?.meta?.total) || materials.length;

  const families = Array.isArray(familiesQuery.data?.items)
    ? familiesQuery.data.items
    : [];

  const isInitialLoading =
    (materialsQuery.isLoading || familiesQuery.isLoading || tagsQuery.isLoading) &&
    !materialsQuery.data &&
    !familiesQuery.data &&
    !tagsQuery.data;

  const loadError = materialsQuery.error || familiesQuery.error;

  const isRefreshing =
    materialsQuery.isFetching && !materialsQuery.isLoading;

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.family_uuid ||
    filters.material_type ||
    filters.default_unit ||
    filters.tag ||
    filters.status === 'all'
  );

  const activeCount = useMemo(() => {
    if (filters.status === 'active') return total;
    if (filters.status === 'inactive') return 0;
    return materials.filter((material) => material.is_active).length;
  }, [materials, filters.status, total]);

  const inactiveCount = useMemo(() => {
    if (filters.status === 'inactive') return total;
    if (filters.status === 'active') return 0;
    return materials.filter((material) => !material.is_active).length;
  }, [materials, filters.status, total]);

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
      tag: '',
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
          id: selectedMaterial.uuid || selectedMaterial.id,
          payload,
        });

        setOperationMessage('Material actualizado correctamente.');
      } else {
        const response = await createMaterialMutation.mutateAsync(payload);
        const createdCatalogs = 
          response?.data?.meta?.created_catalogs || 
          response?.data?.data?.created_catalogs || 
          response?.meta?.created_catalogs || 
          response?.created_catalogs || [];

        if (createdCatalogs.length > 0) {
          setCatalogReminder({
            materialName: payload.name,
            materialCode: response?.data?.data?.internal_code || response?.data?.internal_code,
            catalogs: createdCatalogs,
          });
        } else {
          setOperationMessage('Material creado correctamente.');
        }
      }

      closeMaterialSheet();
    } catch (error) {
      setOperationError(getApiErrorMessage(error));
    }
  };



  const handleDeactivateMaterial = async (payload) => {
    if (!payload?.id) return;

    setOperationMessage(null);
    setOperationError(null);

    try {
      await deactivateMaterialMutation.mutateAsync({
        id: payload.uuid || payload.id,
        action: payload.action,
        reason: payload.reason,
      });

      await materialsQuery.refetch();
      await familiesQuery.refetch();

      setOperationMessage(
        payload.action === 'delete' 
          ? `Material eliminado correctamente.`
          : `Material desactivado correctamente.`
      );
      closeMaterialSheet();
    } catch (error) {
      setOperationError(
        getApiErrorMessage(error) ||
        `No se pudo completar la acción en el material.`
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
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 pb-32 sm:pb-12 overflow-x-hidden w-full min-w-0">
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
        tags={tagsQuery.data || []}
        canViewInactive={canViewInactive}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
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
        viewMode={viewMode}
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
            createMaterialMutation.isPending || updateMaterialMutation.isPending || deactivateMaterialMutation.isPending
          }
          onSubmit={handleSubmitMaterial}
          onCancel={closeMaterialSheet}
          onDeactivate={canDelete ? handleDeactivateMaterial : undefined}
        />
      </MaterialActionSheet>

      {materialToDeactivate && (
        <MasterDataActionDialog
          open={Boolean(materialToDeactivate)}
          title="Gestionar Estado de Material"
          item={materialToDeactivate}
          isLoading={deactivateMaterialMutation.isPending}
          onConfirm={({ action, reason }) => {
            handleDeactivateMaterial({
              id: materialToDeactivate.uuid || materialToDeactivate.id,
              action,
              reason,
            });
            setMaterialToDeactivate(null);
          }}
          onClose={() => setMaterialToDeactivate(null)}
        />
      )}

      {/* DIÁLOGO RECORDATORIO DE SUBCATÁLOGOS GENERADOS ASINCRÓNICAMENTE */}
      {catalogReminder && (
        <TFDialog open={Boolean(catalogReminder)} onOpenChange={() => setCatalogReminder(null)}>
          <TFDialogContent className="max-w-lg p-6 bg-card border-border rounded-2xl shadow-2xl">
            <TFDialogHeader className="pr-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                <Sparkles size={24} />
              </div>
              <TFDialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                ¡Material Registrado con Éxito!
              </TFDialogTitle>
              <TFDialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Se detectaron y crearon nuevos registros en catálogos maestros asociados a este material.
              </TFDialogDescription>
            </TFDialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Material Creado</span>
                  <span className="text-sm font-bold text-foreground">{catalogReminder.materialName}</span>
                </div>
                {catalogReminder.materialCode && (
                  <span className="font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                    {catalogReminder.materialCode}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Nuevos subcatálogos generados:
                </span>
                <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {catalogReminder.catalogs.map((cat, idx) => (
                    <div 
                      key={idx}
                      className="bg-background border border-border rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                          {cat.catalog || cat.entity || 'Subcatálogo'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-foreground truncate">{cat.name}</span>
                          {cat.code && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                              {cat.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={cat.path}
                        onClick={() => setCatalogReminder(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <span>Completar</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>Recordatorio Operativo:</strong> Por favor ingresa al subcatálogo correspondiente para completar la información técnica restante (descripciones detalladas, equivalencias y clasificaciones) para asegurar la integridad de la base de datos.
                </p>
              </div>
            </div>

            <TFDialogFooter className="mt-2">
              <TFButton
                variant="primary"
                onClick={() => setCatalogReminder(null)}
                className="w-full sm:w-auto h-10 text-sm font-bold"
              >
                Entendido, continuar
              </TFButton>
            </TFDialogFooter>
          </TFDialogContent>
        </TFDialog>
      )}
    </div>
  );
};

export default MaterialsPage;