import { Plus, RefreshCw, Archive, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../design-system';

const MaterialModuleHeader = ({
  total = 0,
  activeCount = 0,
  inactiveCount = 0,
  canCreate,
  onCreateMaterial,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Catálogo de Materiales</h1>
        <p className="text-muted-foreground font-semibold mt-1">Control general de materias primas y consumibles.</p>
        
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border">
            <span>{total} Total</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="size-3.5" />
            <span>{activeCount} Activos</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border">
            <Archive className="size-3.5" />
            <span>{inactiveCount} Inactivos</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="secondary" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className="font-bold shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        {canCreate && (
          <Button onClick={onCreateMaterial} size="lg" className="font-bold shadow-sm">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Material
          </Button>
        )}
      </div>
    </div>
  );
};

export default MaterialModuleHeader;