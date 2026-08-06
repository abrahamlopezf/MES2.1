import { useState } from 'react';
import { Plus, Edit3, Archive, Layers } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { TFAlert, TFButton, TFCard, TFBadge } from '../../../components/tf-ui';
import LoadingState from '../../../components/feedback/LoadingState';
import ErrorState from '../../../components/feedback/ErrorState';
import MaterialActionSheet from '../components/MaterialActionSheet';
import GenericCatalogForm from '../components/GenericCatalogForm';

const SubcatalogPageTemplate = ({
  title,
  description,
  icon: Icon,
  dataQuery,
  createMutation,
  updateMutation,
  labels,
  ...props
}) => {
  const { hasPermission } = useAuthStore();
  const { user } = useAuthStore();
  const canManageCatalogs = user?.role?.name === 'SUPERADMIN' || user?.role?.name === 'ADMIN' || hasPermission('masterdata.manage');

  const [operationMessage, setOperationMessage] = useState(null);
  const [operationError, setOperationError] = useState(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const items = Array.isArray(dataQuery.data?.items) ? dataQuery.data.items : (Array.isArray(dataQuery.data) ? dataQuery.data : []);
  const meta = dataQuery.data?.meta;

  const page = props.page || 1;
  const setPage = props.setPage || (() => {});
  const totalPages = meta ? Math.ceil(meta.total / (meta.pageSize || 20)) : 1;

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

  if (dataQuery.isLoading && !items.length) {
    return <LoadingState title={`Cargando ${title}`} message="Obteniendo información del servidor." />;
  }

  if (dataQuery.error && !items.length) {
    return <ErrorState title="Error de conexión" message={getApiErrorMessage(dataQuery.error)} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {operationMessage && (
        <TFAlert variant="success" title="Éxito" message={operationMessage} />
      )}
      {operationError && (
        <TFAlert variant="danger" title="Error" message={operationError} />
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            {Icon ? <Icon className="size-6" /> : <Layers className="size-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground m-0">{title}</h2>
            <p className="text-sm text-muted-foreground m-0">{description}</p>
          </div>
        </div>
        {canManageCatalogs && (
          <TFButton variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Nuevo registro
          </TFButton>
        )}
      </div>

      {/* Data Grid / Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-secondary/20">
          <Layers className="size-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Aún no hay registros</h3>
          <p className="text-muted-foreground text-sm">Crea el primer registro para {title.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TFCard key={item.id} className="p-5 flex flex-col gap-4 border-border shadow-sm hover:border-primary/50 transition-colors bg-card text-card-foreground">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-foreground">{item.name}</span>
                  <span className="text-sm font-bold text-muted-foreground font-mono">{item.code}</span>
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
                  <TFButton size="sm" variant="secondary" icon={Edit3} onClick={() => handleOpenEdit(item)}>
                    Editar
                  </TFButton>
                </div>
              )}
            </TFCard>
          ))}
        </div>
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
        <GenericCatalogForm
          initialData={selectedItem}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={handleCloseSheet}
          labels={labels}
        />
      </MaterialActionSheet>
    </div>
  );
};

export default SubcatalogPageTemplate;
