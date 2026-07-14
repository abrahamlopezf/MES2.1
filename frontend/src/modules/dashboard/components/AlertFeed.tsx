import React from 'react';
import { DashboardAlert } from '../types/dashboard.types';
import { AlertTriangle, Bell, Info, CheckCircle2 } from 'lucide-react';

interface AlertFeedProps {
  alerts: DashboardAlert[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border text-muted-foreground">
        <CheckCircle2 size={40} className="mb-4 text-success opacity-50" />
        <p className="font-bold text-center">Sin alertas activas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'CRITICAL';
        const isWarning = alert.severity === 'WARNING';
        
        return (
          <div 
            key={alert.id}
            className={`p-4 rounded-lg border-l-4 flex gap-4 items-start ${
              isCritical ? 'border-danger bg-danger/5' :
              isWarning ? 'border-warning bg-warning/5' :
              'border-info bg-info/5'
            }`}
          >
            <div className="mt-0.5">
              {isCritical ? <AlertTriangle size={20} className="text-danger" /> :
               isWarning ? <AlertTriangle size={20} className="text-warning" /> :
               <Info size={20} className="text-info" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground mb-1">{alert.message}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
