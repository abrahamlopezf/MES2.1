import React from 'react';
import { ActiveRun } from '../types/dashboard.types';
import { PlayCircle, PauseCircle, StopCircle, CheckCircle2, ActivitySquare } from 'lucide-react';
import { StatusBadge } from '@/shared/components/domain/StatusBadge';

interface ProcessRunStatusCardProps {
  run: ActiveRun;
}

export function ProcessRunStatusCard({ run }: ProcessRunStatusCardProps) {
  const getStatusIcon = () => {
    switch (run.status) {
      case 'EN_PROCESO':
        return <PlayCircle className="text-primary w-6 h-6" />;
      case 'PAUSADA':
        return <PauseCircle className="text-warning w-6 h-6" />;
      case 'DETENIDA':
        return <StopCircle className="text-danger w-6 h-6" />;
      case 'FINALIZADA':
        return <CheckCircle2 className="text-success w-6 h-6" />;
      default:
        return <ActivitySquare className="text-muted-foreground w-6 h-6" />;
    }
  };

  return (
    <div className="solid-card p-4 hover:border-primary/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-secondary/20 rounded-lg border border-border">
          {getStatusIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-black text-lg text-foreground">{run.code}</h4>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{run.process_name}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 w-full md:w-auto bg-secondary/10 p-3 rounded-lg border border-border">
        <div className="text-right flex-1 md:flex-none">
          <span className="block text-xs font-bold text-muted-foreground uppercase">Producción</span>
          <span className="block text-lg font-black text-foreground">{run.production_current}</span>
        </div>
        <div className="text-right flex-1 md:flex-none">
          <span className="block text-xs font-bold text-muted-foreground uppercase">Alertas</span>
          <span className={`block text-lg font-black ${run.alerts > 0 ? 'text-danger' : 'text-success'}`}>
            {run.alerts}
          </span>
        </div>
      </div>
    </div>
  );
}
