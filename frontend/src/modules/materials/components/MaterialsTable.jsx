import { Edit3, ShieldAlert } from 'lucide-react';

import { TFBadge, TFButton } from '../../../components/tf-ui';
import { getMaterialUnitLabel } from '../constants/materialsUi';
import MaterialTypeBadge from './MaterialTypeBadge';

const MaterialsTable = ({
  materials = [],
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="rounded-l-2xl bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Código
            </th>
            <th className="bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Material
            </th>
            <th className="bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Categoría
            </th>
            <th className="bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Tipo
            </th>
            <th className="bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Unidad
            </th>
            <th className="bg-slate-50 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Estado
            </th>
            <th className="rounded-r-2xl bg-slate-50 px-4 py-4 text-right text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="group">
              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <strong className="font-black text-[var(--color-primary)]">
                  {material.code}
                </strong>
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <div className="grid gap-1">
                  <strong className="font-black text-[var(--color-text)]">
                    {material.name}
                  </strong>

                  {material.description && (
                    <span className="line-clamp-2 text-sm font-semibold text-[var(--color-muted)]">
                      {material.description}
                    </span>
                  )}
                </div>
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <span className="font-bold text-[var(--color-text)]">
                  {material.category?.name || 'Sin categoría'}
                </span>
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <MaterialTypeBadge type={material.material_type} />
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <span className="font-bold text-[var(--color-text)]">
                  {getMaterialUnitLabel(material.default_unit)}
                </span>
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <TFBadge variant={material.is_active ? 'success' : 'danger'}>
                  {material.is_active ? 'Activo' : 'Inactivo'}
                </TFBadge>
              </td>

              <td className="border-b border-slate-100 px-4 py-4 align-top">
                <div className="flex justify-end gap-2">
                  {canUpdate && (
                    <TFButton
                      variant="secondary"
                      size="sm"
                      icon={Edit3}
                      onClick={() => onEdit?.(material)}
                    >
                      Editar
                    </TFButton>
                  )}

                  {canDelete && material.is_active && (
                    <TFButton
                      variant="danger"
                      size="sm"
                      icon={ShieldAlert}
                      onClick={() => onDeactivate?.(material)}
                    >
                      Desactivar
                    </TFButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaterialsTable;