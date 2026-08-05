import { Boxes, Layers3, Plus, RefreshCw, Archive, CheckCircle2 } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
} from '../../../components/tf-ui';

const MaterialModuleHeader = ({
  total = 0,
  activeCount = 0,
  inactiveCount = 0,
  categoryCount = 0,
  canCreate,
  onCreateMaterial,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <TFCard className="flex flex-col gap-4 p-5 rounded-xl border border-border shadow-sm mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Boxes className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground m-0 leading-tight">
              Catálogo de Materiales
            </h2>
            <p className="text-sm text-muted-foreground font-medium m-0 mt-0.5">
              Control general de materias primas y consumibles
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRefreshing && (
            <span className="text-sm text-muted-foreground font-medium animate-pulse flex items-center gap-1 mr-2">
              <RefreshCw className="size-4 animate-spin" /> Sincronizando
            </span>
          )}
          
          <TFButton
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={onRefresh}
            isLoading={isRefreshing}
          >
            Actualizar
          </TFButton>

          {canCreate && (
              <TFButton
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={onCreateMaterial}
              >
                Material
              </TFButton>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-secondary/50 px-3 py-1.5 rounded-md border border-border">
          <span className="font-bold">{total}</span> Total
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20">
          <CheckCircle2 className="size-4" />
          <span className="font-bold">{activeCount}</span> Activos
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md border border-border">
          <Archive className="size-4" />
          <span className="font-bold">{inactiveCount}</span> Inactivos
        </div>
      </div>
    </TFCard>
  );
};

export default MaterialModuleHeader;