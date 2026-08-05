import { Edit3, ShieldAlert } from 'lucide-react';

import { TFBadge, TFButton } from '../../../components/tf-ui';

const MaterialsTable = ({
  materials = [],
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
}) => {
  return (
    <div className="w-full pb-2">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="rounded-l-xl bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Familia
            </th>
            <th className="bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Articulo/Consecutivo
            </th>
            <th className="bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Descripcion
            </th>
            <th className="bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Tipo
            </th>
            <th className="bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Marca
            </th>
            <th className="bg-secondary/50 px-2 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Localidad
            </th>
            <th className="rounded-r-xl bg-secondary/50 px-2 py-3 text-right text-xs font-black uppercase tracking-wider text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="group hover:bg-muted/20 transition-colors">
              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {material.family?.name || '---'}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <strong className="font-black text-primary">
                  {material.internal_code ? material.internal_code.split('-').slice(1).join('-') : (material.code || '---')}
                </strong>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {material.name || '---'}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {material.type?.name || '---'}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {material.brand?.name || '---'}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <span className="font-bold text-sm text-foreground leading-tight">
                  {material.default_location?.code || material.default_location?.name || '---'}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-3 align-middle">
                <div className="flex flex-col lg:flex-row justify-end gap-2">
                  {canUpdate && (
                    <TFButton
                      variant="secondary"
                      size="sm"
                      icon={Edit3}
                      onClick={() => onEdit?.(material)}
                      className="whitespace-nowrap"
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
                      className="whitespace-nowrap"
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