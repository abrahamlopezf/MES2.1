import { Edit3, Layers3, Plus, ShieldAlert } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
  TFCardHeader,
  TFCardTitleGroup,
} from '../../../components/tf-ui';

const CategoriesListSection = ({
  categories = [],
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onEdit,
  onDeactivate,
}) => {
  return (
    <TFCard>
      <TFCardHeader>
        <TFCardTitleGroup
          eyebrow="Clasificación"
          title="Categorías de materiales"
          description="Agrupan materiales para mejorar control, filtros y recepción futura de almacén."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <TFBadge variant="primary">
            {categories.length} categorías
          </TFBadge>

          {canCreate && (
            <TFButton size="sm" icon={Plus} onClick={onCreate}>
              Nueva categoría
            </TFButton>
          )}
        </div>
      </TFCardHeader>

      <TFCardContent>
        {categories.length === 0 ? (
          <div className="flex flex-col min-h-44 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-6 text-center">
            <div className="flex flex-col max-w-md items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Layers3 className="size-8" />
              </div>

              <h3 className="m-0 text-xl font-bold text-foreground">
                Aún no hay categorías
              </h3>

              <p className="m-0 font-medium text-muted-foreground">
                Crea una categoría antes de registrar materiales.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <article
                key={category.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <strong className="text-lg font-bold text-foreground">
                      {category.name}
                    </strong>

                    <span className="text-sm font-bold text-muted-foreground">
                      {category.code}
                    </span>
                  </div>

                  <TFBadge variant={category.is_active ? 'success' : 'danger'}>
                    {category.is_active ? 'Activa' : 'Inactiva'}
                  </TFBadge>
                </div>

                {category.description && (
                  <p className="m-0 text-sm font-medium leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                )}

                {(canUpdate || canDelete) && (
                  <div className="grid gap-2 sm:flex sm:justify-end">
                    {canUpdate && (
                      <TFButton
                        size="sm"
                        variant="secondary"
                        icon={Edit3}
                        onClick={() => onEdit?.(category)}
                      >
                        Editar
                      </TFButton>
                    )}

                    {canDelete && category.is_active && (
                      <TFButton
                        size="sm"
                        variant="danger"
                        icon={ShieldAlert}
                        onClick={() => onDeactivate?.(category)}
                      >
                        Desactivar
                      </TFButton>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </TFCardContent>
    </TFCard>
  );
};

export default CategoriesListSection;