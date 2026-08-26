import { Edit3, ShieldAlert } from 'lucide-react';

import { Button } from '../../../design-system';

const MaterialsTable = ({
  materials = [],
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
}) => {
  const renderTextWithBr = (text) => {
    if (!text) return '---';
    if (typeof text !== 'string') return text;
    if (!text.includes('<br>')) return text;
    
    return text.split('<br>').map((line, index) => (
      <span key={index} className="block">{line.trim()}</span>
    ));
  };

  return (
    <div className="w-full pb-2 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 min-w-[800px]">
        <thead>
          <tr>
            <th className="rounded-l-xl bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Familia
            </th>
            <th className="bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Artículo/Consecutivo
            </th>
            <th className="bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Descripción
            </th>
            <th className="bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Tipo
            </th>
            <th className="bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Marca
            </th>
            <th className="bg-secondary/50 px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              Localidad
            </th>
            <th className="rounded-r-xl bg-secondary/50 px-3 py-3 text-right text-xs font-black uppercase tracking-wider text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="group hover:bg-muted/20 transition-colors">
              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {renderTextWithBr(material.family?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <strong className="font-black text-primary">
                  {material.internal_code ? material.internal_code.split('-').slice(1).join('-') : renderTextWithBr(material.code)}
                </strong>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <span className="font-bold text-sm text-foreground max-w-[200px] truncate block">
                  {renderTextWithBr(material.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {renderTextWithBr(material.type?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {renderTextWithBr(material.brand?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <span className="font-bold text-sm text-foreground leading-tight">
                  {renderTextWithBr(material.default_location?.code || material.default_location?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-4 align-middle">
                <div className="flex flex-col lg:flex-row justify-end gap-2">
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(material)}
                      className="whitespace-nowrap font-bold shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}

                  {canDelete && material.is_active && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeactivate?.(material)}
                      className="whitespace-nowrap font-bold shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Desactivar
                    </Button>
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