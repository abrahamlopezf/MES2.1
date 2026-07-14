import React from 'react';
import { ErpStatus } from '@/core/config/statusConfig';
import { AllowedAction } from '@/core/qr-workspace/types/qr-workspace.types';
import { StatusBadge } from '@/shared/components/domain/StatusBadge';
import { ActionButton } from '@/shared/components/domain/ActionButton';
import { Activity, Clock, PackageCheck, PackageX, ServerCog } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcessRun {
  id: string;
  code: string;
  status: ErpStatus;
  machine: string;
  operator?: string;
  input_material: {
    code: string;
    qty: number;
    unit: string;
  };
  metrics: {
    output: number;
    scrap: number;
    waste: number;
    yield_percent: number;
    time_elapsed: string; // ej. '2h 15m'
  };
  allowed_actions: AllowedAction[];
}

interface ProcessRunCardProps {
  run: ProcessRun;
  onAction?: (action: AllowedAction) => void;
  className?: string;
}

export function ProcessRunCard({ run, onAction, className }: ProcessRunCardProps) {
  return (
    <div className={cn("solid-card p-6 flex flex-col gap-6", className)}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-muted w-5 h-5" />
            <span className="font-black text-xl tracking-tight uppercase">{run.code}</span>
          </div>
          <p className="text-sm text-text font-medium flex gap-4">
            <span className="flex items-center gap-1"><ServerCog className="w-4 h-4 text-muted" /> {run.machine}</span>
            {run.operator && <span>Operador: <strong className="font-bold">{run.operator}</strong></span>}
          </p>
        </div>
        <StatusBadge status={run.status} size="lg" />
      </div>

      {/* BODY: Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/10 p-4 rounded-lg border border-border">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase">Entrada ({run.input_material.code})</span>
          <span className="text-lg font-black text-primary">{run.input_material.qty} {run.input_material.unit}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase">Producción</span>
          <span className="text-lg font-black text-success flex items-center gap-1">
            <PackageCheck className="w-4 h-4" /> {run.metrics.output} {run.input_material.unit}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase">Scrap / Merma</span>
          <span className="text-lg font-black text-danger flex items-center gap-1">
            <PackageX className="w-4 h-4" /> {run.metrics.scrap + run.metrics.waste} {run.input_material.unit}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase">Rendimiento (Yield)</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-black",
              run.metrics.yield_percent >= 90 ? "text-success" : 
              run.metrics.yield_percent >= 80 ? "text-warning" : "text-danger"
            )}>
              {run.metrics.yield_percent}%
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER: Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
        <div className="flex items-center gap-2 text-muted text-sm font-bold">
          <Clock className="w-4 h-4" /> {run.metrics.time_elapsed}
        </div>
        
        {run.allowed_actions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-3 w-full md:w-auto">
            {run.allowed_actions.map(action => (
              <ActionButton 
                key={action.code} 
                action={action} 
                onClick={() => onAction && onAction(action)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
