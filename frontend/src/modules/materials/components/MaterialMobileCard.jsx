import { Boxes, Edit3, Layers3, Ruler, ShieldAlert } from 'lucide-react';

import { TFButton, TFCard, TFCardContent, TFBadge } from '../../../components/tf-ui';
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
    <TFCard className="md:hidden">
      <TFCardContent className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <Boxes className="size-6 shrink-0" />
              <strong className="break-words text-lg font-black">
                {material.name}
              </strong>
            </div>

            <div className="flex flex-wrap gap-2">
              <MaterialTypeBadge type={material.material_type} />

              <TFBadge variant={material.is_active ? 'success' : 'danger'}>
                {material.is_active ? 'Activo' : 'Inactivo'}
              </TFBadge>
            </div>
          </div>

          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(31,58,95,0.08)] text-[var(--color-primary)]">
            <span className="text-sm font-black">{material.code}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl border border-[rgba(31,58,95,0.08)] bg-slate-50/70 p-4">
          <div className="flex items-start gap-3">
            <Layers3 className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />

            <div className="grid gap-0.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Categoría
              </span>
              <strong className="font-black text-[var(--color-text)]">
                {material.category?.name || 'Sin categoría'}
              </strong>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Ruler className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />

            <div className="grid gap-0.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Unidad
              </span>
              <strong className="font-black text-[var(--color-text)]">
                {getMaterialUnitLabel(material.default_unit)}
              </strong>
            </div>
          </div>
        </div>

        {(canUpdate || canDelete) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canUpdate && (
              <TFButton
                variant="secondary"
                fullWidth
                icon={Edit3}
                onClick={() => onEdit?.(material)}
              >
                Editar
              </TFButton>
            )}

            {canDelete && material.is_active && (
              <TFButton
                variant="danger"
                fullWidth
                icon={ShieldAlert}
                onClick={() => onDeactivate?.(material)}
              >
                Desactivar
              </TFButton>
            )}
          </div>
        )}
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialMobileCard;