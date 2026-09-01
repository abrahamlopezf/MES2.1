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

  const stripBr = (text) => {
    if (!text) return '---';
    if (typeof text !== 'string') return text;
    return text.replace(/<br\s*\/?>/gi, ' ');
  };

  return (
    <div className="w-full pb-2 overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[10%] rounded-l-xl bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Familia
            </th>
            <th className="w-[15%] bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Artículo/Cons.
            </th>
            <th className="w-[25%] bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Descripción
            </th>
            <th className="w-[12%] bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Tipo
            </th>
            <th className="w-[12%] bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Marca
            </th>
            <th className="w-[10%] bg-secondary/50 px-3 py-2.5 text-left text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Localidad
            </th>
            <th className="w-[100px] rounded-r-xl bg-secondary/50 px-3 py-2.5 text-right text-xs font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="group hover:bg-muted/20 transition-colors">
              <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                <span className="font-bold text-sm text-foreground">
                  {renderTextWithBr(material.family?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                <strong className="font-black text-primary">
                  {material.internal_code ? material.internal_code.split('-').slice(1).join('-') : renderTextWithBr(material.code)}
                </strong>
              </td>

              <td className="border-b border-border/50 px-3 py-2.5 align-middle truncate">
                <span className="font-bold text-sm text-foreground" title={stripBr(material.name)}>
                  {stripBr(material.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                <span className="text-sm font-semibold text-muted-foreground">
                  {renderTextWithBr(material.type?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                <span className="text-sm font-semibold text-muted-foreground">
                  {renderTextWithBr(material.brand?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                <span className="text-sm font-bold text-foreground">
                  {renderTextWithBr(material.default_location?.code || material.default_location?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-2 align-middle text-right">
                <div className="flex flex-row justify-end gap-1.5">
                  {canUpdate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(material)}
                      className="whitespace-nowrap font-bold shadow-sm h-7 px-2 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Editar
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