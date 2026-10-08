import { Edit3, ShieldAlert, Settings } from 'lucide-react';

import { Button } from '../../../design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

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
      <table className="w-full min-w-[1050px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[10%] rounded-l-xl bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Familia
            </th>
            <th className="w-[15%] bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Artículo/Cons.
            </th>
            <th className="w-[28%] bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Descripción
            </th>
            <th className="w-[12%] bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Tipo
            </th>
            <th className="w-[12%] bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Marca
            </th>
            <th className="w-[15%] bg-secondary px-3 py-3 text-left text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Localidad
            </th>
            <th className="w-[8%] rounded-r-xl bg-secondary px-3 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody className="mt-2">
          {materials.map((material) => (
            <tr key={material.id} className="group hover:bg-secondary/20 transition-colors">
              <td className="border-b border-border/50 px-3 py-3.5 align-middle">
                <span className="font-bold text-base text-foreground">
                  {renderTextWithBr(material.family?.code)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-3.5 align-middle">
                <strong className="font-black text-base text-primary">
                  {material.internal_code ? material.internal_code.split('-').slice(1).join('-') : renderTextWithBr(material.code)}
                </strong>
              </td>

              <td className="border-b border-border/50 px-3 py-3.5 align-middle truncate max-w-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-base text-foreground/90 whitespace-normal" title={stripBr(material.name)}>
                    {stripBr(material.name)}
                  </span>
                  {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {material.tags.map(tag => (
                        <div
                          key={tag.id}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/60 bg-secondary/30 text-[11px] font-bold text-muted-foreground whitespace-nowrap shadow-sm"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#e2e8f0' }} />
                          {tag.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>

              <td className="border-b border-border/50 px-3 py-3.5 align-middle">
                <span className="text-base font-semibold text-foreground/80">
                  {renderTextWithBr(material.type?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-3.5 align-middle">
                <span className="text-base font-semibold text-foreground/80">
                  {renderTextWithBr(material.brand?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-3 py-3.5 align-middle">
                <span className="text-base font-bold text-foreground">
                  {renderTextWithBr(material.default_location?.code || material.default_location?.name)}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-2 align-middle text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                    <span className="sr-only">Abrir menú</span>
                    <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 font-medium">
                    {canUpdate && (
                      <DropdownMenuItem onClick={() => onEdit?.(material)} className="cursor-pointer py-2">
                        <Edit3 className="mr-2 h-4 w-4 text-primary" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                    )}
                    {canUpdate && canDelete && <DropdownMenuSeparator />}
                    {canDelete && (
                      <DropdownMenuItem onClick={() => onDeactivate?.(material)} className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                      </DropdownMenuItem>
                    )}
                    {!canUpdate && !canDelete && (
                      <DropdownMenuItem disabled className="py-2">
                        <span>Sin acciones</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MaterialsTable;