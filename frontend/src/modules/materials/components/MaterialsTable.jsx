import { Edit3, ShieldAlert, Settings } from 'lucide-react';

import { Button } from '../../../design-system';
import { getMaterialKey, getMaterialTagKey } from '../utils/recordKeys';
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

  const MaterialActions = ({ material, mobile = false }) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Acciones para ${stripBr(material.name)}`}
        className={mobile
          ? 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-base font-bold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'inline-flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground border border-border hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
      >
        {mobile ? <><Settings className="size-5" />Acciones</> : <><span className="sr-only">Abrir menú</span><span className="text-xl font-bold leading-none pb-1">⋮</span></>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 font-medium">
        {canUpdate && (
          <DropdownMenuItem onClick={() => onEdit?.(material)} className="cursor-pointer min-h-11 py-2">
            <Edit3 className="mr-2 h-4 w-4 text-primary" />
            <span>Editar</span>
          </DropdownMenuItem>
        )}
        {canUpdate && canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem onClick={() => onDeactivate?.(material)} className="cursor-pointer min-h-11 py-2 text-danger focus:text-danger focus:bg-danger/10">
            <ShieldAlert className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        )}
        {!canUpdate && !canDelete && (
          <DropdownMenuItem disabled className="min-h-11 py-2">
            <span>Sin acciones</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="w-full pb-2">
      <div className="md:hidden flex flex-col gap-3">
        {materials.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-base text-muted-foreground">
            No hay materiales para mostrar.
          </p>
        ) : materials.map((material, index) => (
          <article key={getMaterialKey(material, index)} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-muted-foreground">{renderTextWithBr(material.family?.code)}</p>
                <p className="text-base font-black text-primary break-words">
                  {material.internal_code ? material.internal_code.split('-').slice(1).join('-') : renderTextWithBr(material.code)}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground">
                {renderTextWithBr(material.default_location?.code || material.default_location?.name || material.location?.code || material.location?.name)}
              </span>
            </div>

            <div>
              <h3 className="text-base leading-snug font-bold text-foreground break-words">{stripBr(material.name)}</h3>
              {material.tags && material.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {material.tags.map((tag, index) => (
                    <span key={getMaterialTagKey(tag, index)} className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-sm font-semibold text-foreground">
                      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: tag.color || '#e2e8f0' }} />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="mt-0.5 font-semibold text-foreground break-words">{renderTextWithBr(material.type?.name)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Marca</dt>
                <dd className="mt-0.5 font-semibold text-foreground break-words">{renderTextWithBr(material.brand?.name)}</dd>
              </div>
            </dl>

            <MaterialActions material={material} mobile />
          </article>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
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
          {materials.map((material, index) => (
            <tr key={getMaterialKey(material, index)} className="group hover:bg-secondary/20 transition-colors">
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
                      {material.tags.map((tag, index) => (
                        <div
                          key={getMaterialTagKey(tag, index)}
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
                  {renderTextWithBr(
                    material.default_location?.code || 
                    material.default_location?.name || 
                    material.location?.code || 
                    material.location?.name
                  )}
                </span>
              </td>

              <td className="border-b border-border/50 px-2 py-2 align-middle text-center">
                <MaterialActions material={material} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default MaterialsTable;
