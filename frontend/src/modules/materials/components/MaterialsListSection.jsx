import { Boxes, FilterX, Plus } from 'lucide-react';

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
}) => {
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
          </>
        )}
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialsListSection;