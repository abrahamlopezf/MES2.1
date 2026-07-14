import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Calendar, User, FileText } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { AllowedAction } from '@/core/qr-workspace/types/qr-workspace.types';

interface InspectionCardProps {
  id: string;
  targetEntityCode: string;
  inspector: string;
  date: string;
  result: 'APPROVED' | 'REJECTED' | 'PENDING';
  parameters: Array<{ name: string; value: string; passed: boolean }>;
  observations?: string;
  actions?: AllowedAction[];
  className?: string;
}

export function InspectionCard({ id, targetEntityCode, inspector, date, result, parameters, observations, actions, className }: InspectionCardProps) {
  const isApproved = result === 'APPROVED';
  const isPending = result === 'PENDING';
  
  return (
    <div className={cn(
      "solid-card p-6 flex flex-col gap-4 border-l-4",
      isApproved ? 'border-l-success' : isPending ? 'border-l-warning' : 'border-l-danger',
      className
    )}>
      
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border pb-4">
        <div>
          <span className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
            {isApproved ? <ShieldCheck className="text-success w-6 h-6" /> : isPending ? <FileText className="text-warning w-6 h-6" /> : <ShieldAlert className="text-danger w-6 h-6" />}
            Inspección: {id}
          </span>
          <p className="text-sm font-bold text-muted mt-1 uppercase">Lote: <span className="text-text">{targetEntityCode}</span></p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider",
          isApproved ? 'bg-success/10 text-success' : isPending ? 'bg-warning/10 text-warning-foreground' : 'bg-danger/10 text-danger'
        )}>
          {result === 'APPROVED' ? 'APROBADO' : result === 'PENDING' ? 'PENDIENTE' : 'RECHAZADO'}
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex gap-6 text-sm text-text font-medium">
        <span className="flex items-center gap-2"><User className="w-4 h-4 text-muted" /> {inspector}</span>
        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted" /> {date}</span>
      </div>

      {/* Parameters */}
      <div className="bg-muted/10 p-4 rounded-lg border border-border mt-2">
        <h5 className="text-xs font-bold text-muted uppercase mb-3 border-b border-border pb-2">Parámetros Evaluados</h5>
        <div className="space-y-2">
          {parameters.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="font-medium text-text">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{p.value}</span>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  p.passed ? "bg-success" : "bg-danger"
                )}></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observaciones */}
      {observations && (
        <div className="text-sm bg-warning/10 text-warning-foreground p-3 rounded border border-warning/30">
          <span className="font-bold block mb-1">Observaciones:</span>
          {observations}
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {actions.map(action => (
            <ActionButton key={action.code} action={action} />
          ))}
        </div>
      )}

    </div>
  );
}
