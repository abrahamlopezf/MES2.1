import { Boxes, FilterX, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
  TFCardHeader,
  TFCardTitleGroup,
} from '../../../components/tf-ui';

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
    <TFCard>
      <TFCardHeader>
        <TFCardTitleGroup
          eyebrow="Listado"
          title="Materiales registrados"
          description="Consulta el catálogo controlado de materiales disponibles para operación."
        />

        <TFBadge variant="primary">
          {materials.length} registros
        </TFBadge>
      </TFCardHeader>

      <TFCardContent>
        {materials.length === 0 ? (
          <div className="flex flex-col min-h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
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

              <div className="grid gap-3 sm:grid-cols-2">
                {hasActiveFilters && (
                  <TFButton
                    variant="secondary"
                    icon={FilterX}
                    fullWidth
                    onClick={onClearFilters}
                  >
                    Limpiar filtros
                  </TFButton>
                )}

                {!hasActiveFilters && canCreate && (
                  <TFButton icon={Plus} fullWidth onClick={onCreate}>
                    Nuevo material
                  </TFButton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
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
              <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
                <div className="hidden sm:block">
                  <p className="text-sm text-muted-foreground">
                    Mostrando del <span className="font-medium text-foreground">{((page - 1) * pageSize) + 1}</span> al{' '}
                    <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> de{' '}
                    <span className="font-medium text-foreground">{total}</span> resultados
                  </p>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end gap-2">
                  <TFButton
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </TFButton>
                  <div className="flex items-center px-2 text-sm font-bold sm:hidden">
                    {page} / {totalPages}
                  </div>
                  <TFButton
                    variant="secondary"
                    size="sm"
                    iconRight={ChevronRight}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </TFButton>
                </div>
              </div>
            )}
          </>
        )}
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialsListSection;