import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Warning } from '@/core/qr-workspace/types/qr-workspace.types';
import { cn } from '@/lib/utils';

interface WarningPanelProps {
  warnings: Warning[];
}

export function WarningPanel({ warnings }: WarningPanelProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {warnings.map((warning) => (
        <div 
          key={warning.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg border shadow-sm",
            warning.severity === 'high' ? "bg-danger/10 border-danger/30" :
            warning.severity === 'medium' ? "bg-warning/10 border-warning/30" :
            "bg-muted/10 border-muted/30"
          )}
        >
          <AlertTriangle 
            size={24} 
            className={cn(
              "mt-0.5 shrink-0",
              warning.severity === 'high' ? "text-danger" :
              warning.severity === 'medium' ? "text-warning" :
              "text-muted"
            )} 
          />
          <div className="flex flex-col">
            <span className={cn(
              "font-black text-sm uppercase tracking-wider",
              warning.severity === 'high' ? "text-danger" :
              warning.severity === 'medium' ? "text-warning" :
              "text-text"
            )}>
              {warning.code}
            </span>
            <span className="text-text font-semibold text-sm mt-0.5 leading-relaxed">
              {warning.message}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
