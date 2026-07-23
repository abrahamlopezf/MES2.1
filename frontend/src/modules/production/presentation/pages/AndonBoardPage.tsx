import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogFacade } from '../../../catalog/infrastructure/di/CatalogModuleDI';
import { productionFacade } from '../../infrastructure/di/ProductionModuleDI';
import { Factory, AlertTriangle, CheckCircle, Wrench, Settings } from 'lucide-react';

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
      case 'RUNNING': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IDLE': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'RESERVED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getMachineHealthColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-emerald-500';
      case 'OFFLINE': return 'text-slate-400';
      case 'FAULT': return 'text-red-500';
      case 'MAINTENANCE': return 'text-orange-500';
      default: return 'text-slate-400';
    }
  };

  const getMachineIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return <CheckCircle size={16} />;
      case 'FAULT': return <AlertTriangle size={16} />;
      case 'MAINTENANCE': return <Wrench size={16} />;
      default: return <Settings size={16} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
          <Factory size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Andon Board</h1>
          <p className="text-slate-600 mt-1">Monitoreo en tiempo real de Estaciones y Máquinas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations?.map(station => {
          const execution = stationExecutions?.find(e => e.stationId === station.id);
          const machines = station.machines;
          const isExpanded = expandedStationId === station.id;

          const executionStatus = execution?.status || 'OFFLINE';

          return (
            <div 
              key={station.id} 
              className={`border-2 rounded-xl transition-all shadow-sm bg-white overflow-hidden ${getStatusColor(executionStatus)}`}
            >
              <div 
                className="p-5 cursor-pointer flex flex-col h-full"
                onClick={() => setExpandedStationId(isExpanded ? null : station.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold">{station.name}</h2>
                  <span className="text-xs font-bold px-2 py-1 bg-white/50 rounded-full uppercase tracking-widest">
                    {executionStatus}
                  </span>
                </div>
                
                <p className="text-sm opacity-80 mb-4 font-mono">{station.id} • {station.areaId}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {station.capabilities?.map(cap => (
                    <span key={cap} className="text-xs font-semibold bg-white/60 px-2 py-1 rounded-md border border-black/10">
                      {cap}
                    </span>
                  ))}
                </div>

                {executionStatus === 'RUNNING' && execution?.currentTransformationId && (
                  <div className="mt-auto bg-white/60 p-3 rounded-lg border border-black/10">
                    <p className="text-xs uppercase font-bold opacity-70 mb-1">Ejecutando</p>
                    <p className="text-sm font-mono font-bold truncate" title={execution.currentTransformationId}>
                      {execution.currentTransformationId}
                    </p>
                    <p className="text-xs mt-1">Operador: {execution.operatorId}</p>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="bg-white p-4 border-t-2 border-inherit">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Salud de Equipos</h4>
                  {machines.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No hay máquinas registradas en esta estación.</p>
                  ) : (
                    <ul className="space-y-3">
                      {machines.map(machine => {
                        const health = machineHealths?.find(h => h.machineId === machine.id);
                        const healthStatus = health?.status || 'OFFLINE';
                        
                        return (
                          <li key={machine.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{machine.name}</p>
                              <p className="text-xs text-slate-500 font-mono">{machine.id}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 font-bold text-xs ${getMachineHealthColor(healthStatus)}`}>
                              {getMachineIcon(healthStatus)}
                              {healthStatus}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
