import React from 'react';
import { DashboardKPI } from '../types/dashboard.types';
import { TrendingUp, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface ProductionKPIProps {
  kpi: DashboardKPI;
}

export function ProductionKPI({ kpi }: ProductionKPIProps) {
  // Solo aplicamos clases estéticas basadas en el estado entregado por el backend
  const getStatusStyles = () => {
    switch (kpi.status) {
      case 'GOOD':
        return 'text-success bg-success/10 border-success/30';
      case 'WARNING':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'CRITICAL':
        return 'text-danger bg-danger/10 border-danger/30';
      default:
        return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const getStatusIcon = () => {
    switch (kpi.status) {
      case 'GOOD':
        return <TrendingUp size={24} className="text-success" />;
      case 'WARNING':
        return <AlertTriangle size={24} className="text-warning" />;
      case 'CRITICAL':
        return <XCircle size={24} className="text-danger" />;
      default:
        return <Activity size={24} className="text-muted-foreground" />;
    }
  };

  return (
    <div className={`p-6 rounded-xl border ${getStatusStyles()} flex items-center justify-between transition-colors`}>
      <div>
        <h4 className="text-sm font-black uppercase tracking-wider mb-2 opacity-80">{kpi.label}</h4>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black">{kpi.value}</span>
          {kpi.unit && <span className="text-lg font-bold opacity-70">{kpi.unit}</span>}
        </div>
      </div>
      <div className="p-4 bg-background rounded-full shadow-sm">
        {getStatusIcon()}
      </div>
    </div>
  );
}
