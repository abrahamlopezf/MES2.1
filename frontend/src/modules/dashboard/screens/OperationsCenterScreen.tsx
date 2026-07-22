import React from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { LayoutDashboard, WifiOff } from 'lucide-react';
import { useOperationsDashboard } from '../api/useOperationsDashboard';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';
import { ProductionKPI } from '../components/ProductionKPI';
import { ProcessRunStatusCard } from '../components/ProcessRunStatusCard';
import { AlertFeed } from '../components/AlertFeed';
import { Button } from '@/components/ui/button';

export default function OperationsCenterScreen() {
  const { data, isLoading, isError, refetch, error } = useOperationsDashboard();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <SectionHeader 
          title="Centro de Control Operativo" 
          description="Monitoreo de planta en tiempo real."
          icon={LayoutDashboard}
        />
        {data && (
          <div className="text-right bg-card px-4 py-2 rounded-lg border border-border">
            <span className="block text-xs font-bold text-muted-foreground uppercase">Última actualización</span>
            <span className="block text-sm font-black text-foreground">
              {new Date(data.last_update).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {isLoading && <LoadingState message="Sincronizando estado de planta..." />}
      
      {isError && (
        <div className="flex flex-col items-center justify-center p-12 bg-card border-2 border-dashed border-danger/30 rounded-xl">
          <WifiOff size={48} className="text-danger mb-4" />
          <h3 className="text-xl font-black text-foreground mb-2">Sin conexión al servidor</h3>
          <p className="text-muted-foreground font-medium text-center mb-6 max-w-md">
            No fue posible consultar las operaciones actuales. Verifique la red o contacte a TI.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Reintentar Conexión
          </Button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          
          {/* Nivel 1: KPIs Rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProductionKPI kpi={data.kpis.production} />
            <ProductionKPI kpi={data.kpis.yield} />
            <ProductionKPI kpi={data.kpis.scrap} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Máquinas/Corridas */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Corridas Activas
              </h3>
              
              {data.active_runs.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground font-bold">
                  No existen corridas activas en este momento
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.active_runs.map(run => (
                    <ProcessRunStatusCard key={run.id} run={run} />
                  ))}
                </div>
              )}
            </div>

            {/* Columna Derecha: Alertas */}
            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center justify-between">
                Alertas Operativas
                {data.alerts.length > 0 && (
                  <span className="bg-danger text-danger-foreground text-xs px-2 py-0.5 rounded-full">
                    {data.alerts.length}
                  </span>
                )}
              </h3>
              <AlertFeed alerts={data.alerts} />
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
