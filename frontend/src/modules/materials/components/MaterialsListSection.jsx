import { Boxes, FilterX, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../design-system';
import MaterialMobileCard from './MaterialMobileCard';
import MaterialsTable from './MaterialsTable';

const MaterialsListSection = ({
  materials = [],
  canCreate,
  canUpdate,
  canDelete,
  hasActiveFilters,
  onCreate,
  onEdit,
  onDeactivate,
  onClearFilters,
  page = 1,
  total = 0,
  pageSize = 20,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="font-bold text-foreground text-lg tracking-tight">Materiales registrados</h3>
          <p className="text-sm text-muted-foreground font-semibold">Consulta el catálogo controlado de materiales disponibles para operación.</p>
        </div>
        <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border text-sm font-bold text-foreground">
          {materials.length} registros
        </div>
      </div>

      <div className="p-0">
        {materials.length === 0 ? (
          <div className="flex flex-col min-h-64 items-center justify-center bg-secondary/10 p-8 text-center m-5 rounded-2xl border border-dashed border-border">
            <div className="flex flex-col max-w-md items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Boxes className="size-10" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-xl font-bold text-foreground">
                  {hasActiveFilters
                    ? 'No hay materiales con estos filtros'
                    : 'Aún no hay materiales'}
                </h3>

                <p className="m-0 font-medium leading-relaxed text-muted-foreground">
                  {hasActiveFilters
                    ? 'Prueba limpiando los filtros para consultar todos los materiales disponibles.'
                    : 'Registra el primer material para comenzar a controlar el almacén.'}
                </p>
              </div>

              <div className="flex gap-3">
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={onClearFilters} className="font-bold shadow-sm">
                    <FilterX className="w-5 h-5 mr-2" />
                    Limpiar filtros
                  </Button>
                )}

                {!hasActiveFilters && canCreate && (
                  <Button onClick={onCreate} className="font-bold shadow-sm">
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo material
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden p-5">
              {materials.map((material) => (
                <MaterialMobileCard
                  key={material.id}
                  material={material}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDeactivate={onDeactivate}
                />
              ))}
            </div>

            <div className="hidden md:block">
              <MaterialsTable
                materials={materials}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
              />
            </div>

            {total > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-5 py-4 gap-4 bg-secondary/20">
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Mostrando del <span className="font-bold text-foreground">{((page - 1) * pageSize) + 1}</span> al{' '}
                    <span className="font-bold text-foreground">{Math.min(page * pageSize, total)}</span> de{' '}
                    <span className="font-bold text-foreground">{total}</span> resultados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="font-bold shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                  <div className="flex items-center px-3 text-sm font-bold text-foreground sm:hidden">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="font-bold shadow-sm"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default MaterialsListSection;