import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogFacade } from '../../../catalog/infrastructure/di/CatalogModuleDI';
import { productionFacade } from '../../infrastructure/di/ProductionModuleDI';
import { Icon } from '@/design-system';

export const AndonBoardPage: React.FC = () => {
  const { data: stations } = useQuery({
    queryKey: ['catalog', 'stations'],
    queryFn: () => catalogFacade.getAllStations()
  });

  const { data: stationExecutions } = useQuery({
    queryKey: ['production', 'stationExecutions'],
    queryFn: () => productionFacade.getAllStationExecutions(),
    refetchInterval: 5000 // Simulando tiempo real
  });

  const { data: machineHealths } = useQuery({
    queryKey: ['production', 'machineHealths'],
    queryFn: () => productionFacade.getAllMachineHealths(),
    refetchInterval: 5000
  });

  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'border-success/50';
      case 'IDLE': return 'border-border';
      case 'RESERVED': return 'border-info/50';
      case 'PAUSED': return 'border-warning/50';
      default: return 'border-border';
    }
  };

  const getMachineHealthColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-success';
      case 'OFFLINE': return 'text-muted-foreground';
      case 'FAULT': return 'text-danger';
      case 'MAINTENANCE': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => ({
    RUNNING: 'En marcha',
    IDLE: 'En espera',
    RESERVED: 'Reservada',
    PAUSED: 'Pausada',
    OFFLINE: 'Sin conexión',
  }[status] || 'Estado no disponible');

  const getHealthLabel = (status: string) => ({
    ONLINE: 'Conectado',
    OFFLINE: 'Desconectado',
    FAULT: 'Falla',
    MAINTENANCE: 'Mantenimiento',
  }[status] || 'Estado no disponible');

  const getCapabilityLabel = (capability: string) => ({
    MIXING: 'Mezclado',
    EXTRUSION: 'Extrusión',
  }[capability] || capability);

  const getMachineIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return <Icon name="check_circle" size={16} />;
      case 'FAULT': return <Icon name="warning" size={16} />;
      case 'MAINTENANCE': return <Icon name="build" size={16} />;
      default: return <Icon name="settings" size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <div className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20">
          <Icon name="precision_manufacturing" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Tablero Andon</h1>
          <p className="text-muted-foreground mt-1 font-medium">Monitoreo en tiempo real de Estaciones y Máquinas de Planta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations?.map(station => {
          const execution = stationExecutions?.find(e => e.stationId === station.id);
          const machines = station.machines;
          const isExpanded = expandedStationId === station.id;

          const executionStatus = execution?.status || 'OFFLINE';

          return (
            <article
              key={station.id} 
              className={`overflow-hidden rounded-xl border-2 bg-card text-card-foreground shadow-sm ${getStatusColor(executionStatus)}`}
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`andon-equipment-${station.id}`}
                onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
                className="flex min-h-11 w-full flex-col p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-foreground">{station.name}</h2>
                  <span className={`rounded-full border px-3 py-1 text-sm font-bold ${executionStatus === 'RUNNING' ? 'border-success/40 bg-success/10 text-success' : executionStatus === 'RESERVED' ? 'border-info/40 bg-info/10 text-info' : executionStatus === 'PAUSED' ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border bg-muted text-muted-foreground'}`}>
                    {getStatusLabel(executionStatus)}
                  </span>
                </div>
                
                <p className="mb-4 text-sm text-muted-foreground font-mono">{station.id} • {station.areaId}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {station.capabilities?.map(cap => (
                    <span key={cap} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-sm font-semibold text-foreground">
                      {getCapabilityLabel(cap)}
                    </span>
                  ))}
                </div>

                {executionStatus === 'RUNNING' && execution?.currentTransformationId && (
                  <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3">
                    <p className="mb-1 text-sm font-bold text-muted-foreground">Ejecutando</p>
                    <p className="text-sm font-mono font-bold truncate" title={execution.currentTransformationId}>
                      {execution.currentTransformationId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Operador: {execution.operatorId}</p>
                  </div>
                )}
                <span className="mt-3 text-sm font-semibold text-primary">{isExpanded ? 'Ocultar equipos' : 'Ver equipos'}</span>
              </button>

              {isExpanded && (
                <div id={`andon-equipment-${station.id}`} className="border-t border-border bg-muted/20 p-4">
                  <h4 className="mb-3 text-base font-bold text-foreground">Salud de equipos</h4>
                  {machines.length === 0 ? (
                    <p className="text-base italic text-muted-foreground">No hay máquinas registradas en esta estación.</p>
                  ) : (
                    <ul className="space-y-3">
                      {machines.map(machine => {
                        const health = machineHealths?.find(h => h.machineId === machine.id);
                        const healthStatus = health?.status || 'OFFLINE';
                        
                        return (
                          <li key={machine.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{machine.name}</p>
                              <p className="text-sm text-muted-foreground font-mono">{machine.id}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 font-bold text-xs ${getMachineHealthColor(healthStatus)}`}>
                              {getMachineIcon(healthStatus)}
                              <span>{getHealthLabel(healthStatus)}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
