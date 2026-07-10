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
          <div className="grid min-h-44 place-items-center rounded-[2rem] border border-dashed border-[rgba(31,58,95,0.16)] bg-slate-50/80 p-6 text-center">
            <div className="grid max-w-md gap-3">
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]">
                <Layers3 className="size-8" />
              </div>

              <h3 className="m-0 text-2xl font-black text-[var(--color-primary)]">
                Aún no hay categorías
              </h3>

              <p className="m-0 font-semibold text-[var(--color-muted)]">
                Crea una categoría antes de registrar materiales.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <article
                key={category.id}
                className="grid gap-4 rounded-[1.6rem] border border-[rgba(31,58,95,0.10)] bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <strong className="text-lg font-black text-[var(--color-primary)]">
                      {category.name}
                    </strong>

                    <span className="text-sm font-black text-[var(--color-muted)]">
                      {category.code}
                    </span>
                  </div>

                  <TFBadge variant={category.is_active ? 'success' : 'danger'}>
                    {category.is_active ? 'Activa' : 'Inactiva'}
                  </TFBadge>
                </div>

                {category.description && (
                  <p className="m-0 text-sm font-semibold leading-relaxed text-[var(--color-muted)]">
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