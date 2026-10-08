import { Edit3, Layers3, Plus, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';

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
                  <div className="grid gap-2 sm:flex sm:justify-end border-t border-border pt-4 mt-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                        <span className="sr-only">Abrir menú</span>
                        <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 font-medium">
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => onEdit?.(category)} className="cursor-pointer py-2">
                            <Edit3 className="mr-2 h-4 w-4 text-primary" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                        )}
                        {canUpdate && canDelete && <DropdownMenuSeparator />}
                        {canDelete && category.is_active && (
                          <DropdownMenuItem onClick={() => onDeactivate?.(category)} className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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