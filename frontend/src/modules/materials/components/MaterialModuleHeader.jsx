import { Plus, RefreshCw, Archive, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../design-system';

const MaterialModuleHeader = ({
  title = "Catálogo de Materiales",
  description = "Control general de materias primas y consumibles.",
  total = 0,
  activeCount = 0,
  inactiveCount = 0,
  canCreate,
  onCreateMaterial,
  createButtonText = "Nuevo Material",
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-0">
      <div className="w-full sm:w-auto">
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-3 w-full">
          <div className="flex justify-center items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-foreground bg-secondary/50 px-1 sm:px-2.5 py-1.5 sm:py-1 rounded-md border border-border">
            <span className="truncate">{total} Total</span>
          </div>
          <div className="flex justify-center items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 sm:px-2.5 py-1.5 sm:py-1 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="size-3 sm:size-3.5 shrink-0" />
            <span className="truncate">{activeCount} Activos</span>
          </div>
          <div className="flex justify-center items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-muted-foreground bg-secondary/50 px-1 sm:px-2.5 py-1.5 sm:py-1 rounded-md border border-border">
            <Archive className="size-3 sm:size-3.5 shrink-0" />
            <span className="truncate">{inactiveCount} Inactivos</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
        <Button 
          variant="secondary"
          size="lg" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className="font-bold shadow-sm w-full sm:w-auto justify-center"
        >
          <RefreshCw className={`w-5 h-5 mr-2 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </Button>
        {canCreate && (
          <Button onClick={onCreateMaterial} size="lg" className="font-bold shadow-sm w-full sm:w-auto justify-center">
            <Plus className="w-5 h-5 mr-2 shrink-0" />
            <span>{createButtonText}</span>
          </Button>
        )}
      </div>
      </div>
    </section>
  );
};

export default MaterialModuleHeader;