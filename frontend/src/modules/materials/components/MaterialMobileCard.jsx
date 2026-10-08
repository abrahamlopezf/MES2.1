import { Boxes, Edit3, Layers3, Ruler, ShieldAlert } from 'lucide-react';

import { Button, Badge, Card, CardContent } from '../../../design-system';
import { getMaterialUnitLabel } from '../constants/materialsUi';
import MaterialTypeBadge from './MaterialTypeBadge';

const MaterialMobileCard = ({
  material,
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
}) => {
  return (
    <Card className="md:hidden">
      <CardContent className="grid gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Boxes className="size-6 shrink-0" />
              <strong className="break-words text-lg font-bold">
                {material.name}
              </strong>
            </div>

            <div className="flex flex-wrap gap-2">
              <MaterialTypeBadge type={material.material_type} />

              <Badge variant={material.is_active ? 'success' : 'destructive'} className="font-bold">
                {material.is_active ? 'Activo' : 'Inactivo'}
              </Badge>

              {material.tags && material.tags.length > 0 && material.tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/60 bg-secondary/30 text-[11px] font-bold text-muted-foreground whitespace-nowrap shadow-sm"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#e2e8f0' }} />
                  {tag.name}
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-sm font-bold">{material.code}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/20 p-4">
          <div className="flex items-start gap-3">
            <Layers3 className="mt-0.5 size-5 shrink-0 text-primary" />

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Categoría
              </span>
              <strong className="font-bold text-foreground">
                {material.category?.name || 'Sin categoría'}
              </strong>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Ruler className="mt-0.5 size-5 shrink-0 text-primary" />

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Unidad
              </span>
              <strong className="font-bold text-foreground">
                {getMaterialUnitLabel(material.default_unit)}
              </strong>
            </div>
          </div>
        </div>

        {(canUpdate || canDelete) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canUpdate && (
              <Button
                variant="outline"
                className="w-full font-bold shadow-sm"
                onClick={() => onEdit?.(material)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}

            {canDelete && material.is_active && (
              <Button
                variant="destructive"
                className="w-full font-bold shadow-sm"
                onClick={() => onDeactivate?.(material)}
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Desactivar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaterialMobileCard;