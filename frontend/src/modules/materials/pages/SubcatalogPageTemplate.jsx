import { useState, useMemo } from 'react';
import { Plus, Edit3, Archive, Layers, LayoutGrid, List, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';
import { useAuthStore } from '../../../store/authStore';
import { TFAlert, TFButton, TFCard, TFBadge } from '../../../components/tf-ui';
import LoadingState from '../../../components/feedback/LoadingState';
import ErrorState from '../../../components/feedback/ErrorState';
import MaterialActionSheet from '../components/MaterialActionSheet';
import GenericCatalogForm from '../components/GenericCatalogForm';
import MaterialModuleHeader from '../components/MaterialModuleHeader';
import SubcatalogFiltersPanel from '../components/SubcatalogFiltersPanel';
import MasterDataActionDialog from '../../../components/shared/MasterDataActionDialog';

const SubcatalogPageTemplate = ({
  title,
  description,
  icon: Icon,
  dataQuery,
  createMutation,
  updateMutation,
  deleteMutation,
  labels,
  filters,
  onFilterChange,
  onClearFilters,
  entityName = "registros",
  CustomForm,
  ...props
}) => {
  const { hasPermission, user } = useAuthStore();
  const canManageCatalogs = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'].includes(user?.role?.code) || hasPermission('masterdata.manage') || hasPermission('materials.create');
  const canDelete = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN_ALM'].includes(user?.role?.code) || hasPermission('materials.delete');

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDeactivate, setItemToDeactivate] = useState(null);

  const rawItems = Array.isArray(dataQuery.data?.items) ? dataQuery.data.items : (Array.isArray(dataQuery.data) ? dataQuery.data : []);
  
  // Filtrado robusto en el frontend por si el backend no soporta search/status nativamente en los subcatálogos
  const items = rawItems.filter(item => {
    if (filters?.status === 'inactive' && item.is_active !== false) return false;
    if (filters?.status === 'active' && item.is_active === false) return false;
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      const matchName = item.name?.toLowerCase()?.includes(s);
      const matchCode = item.code?.toLowerCase()?.includes(s);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  const meta = dataQuery.data?.meta;

  const page = props.page || 1;
  const setPage = props.setPage || (() => {});
  const total = Number(meta?.total) || items.length;
  const totalPages = meta ? Math.ceil(meta.total / (meta.pageSize || 20)) : 1;

  const activeCount = useMemo(() => {
    if (filters?.status === 'active') return total;
    if (filters?.status === 'inactive') return 0;
    return items.filter((item) => item.is_active !== false).length;
  }, [items, filters?.status, total]);

  const inactiveCount = useMemo(() => {
    if (filters?.status === 'inactive') return total;
    if (filters?.status === 'active') return 0;
    return items.filter((item) => item.is_active === false).length;
  }, [items, filters?.status, total]);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setOperationMessage(null);
    setOperationError(null);
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setOperationMessage(null);
    setOperationError(null);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedItem(null);
  };

  const getApiErrorMessage = (error) => {
    return error?.response?.data?.message || error?.message || 'Ocurrió un error inesperado.';
  };

  const handleSubmit = async (payload) => {
    setOperationMessage(null);
    setOperationError(null);
    try {
      if (selectedItem?.id) {
        // Usa el UUID si está disponible, de lo contrario fallback al ID
        const targetId = selectedItem.uuid || selectedItem.id;
        await updateMutation.mutateAsync({ id: targetId, payload });
        setOperationMessage('Registro actualizado correctamente.');
      } else {
        await createMutation.mutateAsync(payload);
        setOperationMessage('Registro creado exitosamente.');
      }
      handleCloseSheet();
    } catch (error) {
      setOperationError(getApiErrorMessage(error));
    }
  };

  const handleDeactivate = async (payload) => {
    setOperationMessage(null);
    setOperationError(null);
    try {
      if (deleteMutation && payload?.id) {
        const targetId = payload.uuid || payload.id;
        await deleteMutation.mutateAsync({ id: targetId, action: payload.action, reason: payload.reason });
        setOperationMessage(payload.action === 'delete' ? 'Registro eliminado correctamente.' : 'Registro desactivado correctamente.');
      }
      setItemToDeactivate(null);
      handleCloseSheet();
    } catch (error) {
      setOperationError(getApiErrorMessage(error));
    }
  };

  if (dataQuery.isLoading && !items.length) {
    return <LoadingState title={`Cargando ${title}`} message="Obteniendo información del servidor." />;
  }

  if (dataQuery.error && !items.length) {
    return <ErrorState title="Error de conexión" message={getApiErrorMessage(dataQuery.error)} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-12 w-full min-w-0 overflow-x-hidden">
      {operationMessage && (
        <TFAlert variant="success" title="Éxito" message={operationMessage} />
      )}
      {operationError && (
        <TFAlert variant="danger" title="Error" message={operationError} />
      )}

      {/* Header */}
      <MaterialModuleHeader
        title={title}
        description={description}
        total={total}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        canCreate={canManageCatalogs}
        onCreateMaterial={handleOpenCreate}
        createButtonText={`Nueva ${title.replace(/s$/, '')}`.replace('Nueva Articulo', 'Nuevo Artículo').replace('Nueva Artículo', 'Nuevo Artículo').replace('Nueva Tipo', 'Nuevo Tipo').replace('Nueva Proveedore', 'Nuevo Proveedor').replace('Nueva Lote', 'Nuevo Lote').replace('Nueva Materiale', 'Nuevo Material').replace('Nueva Role', 'Nuevo Rol').replace('Nueva Almacene', 'Nuevo Almacén').replace('Nueva Movimiento', 'Nuevo Movimiento').replace('Nueva Unidade', 'Nueva Unidad').replace('Nueva Unidad', 'Nueva Unidad')}
        onRefresh={() => dataQuery.refetch()}
        isRefreshing={dataQuery.isFetching && !dataQuery.isLoading}
      />

      {/* Filters Panel */}
      {filters && onFilterChange && (
        <SubcatalogFiltersPanel
          filters={filters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          entityName={entityName}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {/* Data Grid / Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-secondary/20">
          <Layers className="size-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Aún no hay registros</h3>
          <p className="text-muted-foreground text-sm">Crea el primer registro para {title.toLowerCase()}.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <TFCard key={item.id} className="p-5 flex flex-col gap-4 border-border shadow-sm hover:border-primary/50 transition-colors bg-card text-card-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-foreground">{item.name}</span>
                      {item.code ? (
                        <span className="text-sm font-bold text-muted-foreground font-mono">{item.code}</span>
                      ) : item.color ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-mono text-muted-foreground">{item.color}</span>
                        </div>
                      ) : null}
                    </div>
                    <TFBadge variant={item.is_active !== false ? 'success' : 'danger'}>
                      {item.is_active !== false ? 'Activo' : 'Inactivo'}
                    </TFBadge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 m-0">{item.description}</p>
                  )}
                  {canManageCatalogs && (
                    <div className="mt-auto pt-4 border-t border-border flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                          <span className="sr-only">Abrir menú</span>
                          <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 font-medium">
                          <DropdownMenuItem onClick={() => handleOpenEdit(item)} className="cursor-pointer py-2">
                            <Edit3 className="mr-2 h-4 w-4 text-primary" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          {canDelete && deleteMutation && <DropdownMenuSeparator />}
                          {canDelete && deleteMutation && item.is_active !== false && (
                            <DropdownMenuItem onClick={() => setItemToDeactivate(item)} className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              <span>Eliminar</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </TFCard>
              ))}
            </div>
          ) : (
            <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl overflow-x-auto">
              <table className="w-full text-base text-left">
                <thead className="bg-secondary text-secondary-foreground font-bold tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">{labels?.codeLabel || 'Código'}</th>
                    <th className="px-6 py-4 whitespace-nowrap">{labels?.nameLabel || 'Nombre'}</th>
                    <th className="px-6 py-4 whitespace-nowrap">Descripción</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Estado</th>
                    {canManageCatalogs && <th className="px-6 py-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        {item.code ? item.code : item.color ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded border border-border/80 shadow-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-muted-foreground font-mono">({item.color})</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-foreground">{item.name}</td>
                      <td className="px-6 py-4 text-foreground/90 max-w-[250px] truncate font-medium" title={item.description}>{item.description || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <TFBadge variant={item.is_active !== false ? 'success' : 'danger'} className="font-bold px-3 py-1 text-sm">
                          {item.is_active !== false ? 'Activo' : 'Inactivo'}
                        </TFBadge>
                      </td>
                      {canManageCatalogs && (
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                              <span className="sr-only">Abrir menú</span>
                              <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 font-medium">
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)} className="cursor-pointer py-2">
                                <Edit3 className="mr-2 h-4 w-4 text-primary" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              {canDelete && deleteMutation && <DropdownMenuSeparator />}
                              {canDelete && deleteMutation && item.is_active !== false && (
                                <DropdownMenuItem onClick={() => setItemToDeactivate(item)} className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                                  <ShieldAlert className="mr-2 h-4 w-4" />
                                  <span>Eliminar</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination Controls */}
      {items.length > 0 && meta && totalPages > 1 && (
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

      {/* Generic Catalog Form Action Sheet */}
      <MaterialActionSheet
        open={isSheetOpen}
        onClose={handleCloseSheet}
        title={selectedItem ? `Editar ${title}` : `Nuevo Registro de ${title}`}
        description="Administra los valores del subcatálogo."
      >
        {CustomForm ? (
          <CustomForm
            initialData={selectedItem}
            isSubmitting={createMutation.isPending || updateMutation.isPending || deleteMutation?.isPending}
            onSubmit={handleSubmit}
            onCancel={handleCloseSheet}
            onDeactivate={deleteMutation ? handleDeactivate : undefined}
          />
        ) : (
          <GenericCatalogForm
            initialData={selectedItem}
            isSubmitting={createMutation.isPending || updateMutation.isPending || deleteMutation?.isPending}
            onSubmit={handleSubmit}
            onCancel={handleCloseSheet}
            onDeactivate={deleteMutation ? handleDeactivate : undefined}
            labels={labels}
            isCodeOptional={props.isCodeOptional}
            useColorForCode={props.useColorForCode}
          />
        )}
      </MaterialActionSheet>

      {itemToDeactivate && (
        <MasterDataActionDialog
          open={Boolean(itemToDeactivate)}
          title={`Gestionar Estado de Registro`}
          item={itemToDeactivate}
          isLoading={deleteMutation?.isPending}
          onConfirm={({ action, reason }) => handleDeactivate({ id: itemToDeactivate.uuid || itemToDeactivate.id, action, reason })}
          onClose={() => setItemToDeactivate(null)}
        />
      )}
    </div>
  );
};

export default SubcatalogPageTemplate;
