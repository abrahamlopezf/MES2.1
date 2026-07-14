import React from 'react';
import { cn } from '@/lib/utils';
import { WasteReasonBadge } from './WasteReasonBadge';
import { ActionButton } from './ActionButton';
import { AllowedAction } from '@/core/qr-workspace/types/qr-workspace.types';
import { PackageX, MapPin, Truck } from 'lucide-react';

interface WasteCardProps {
  code: string;
  type: 'SCRAP' | 'MERMA';
  quantity: { value: number; unit: string };
  origin: string;
  destination: string;
  reason: string;
  actions?: AllowedAction[];
  className?: string;
}

export function WasteCard({ code, type, quantity, origin, destination, reason, actions, className }: WasteCardProps) {
  return (
    <div className={cn("solid-card p-6 flex flex-col gap-4 border-l-4", type === 'SCRAP' ? 'border-l-danger' : 'border-l-warning', className)}>
      <div className="flex justify-between items-start">
        <div>
          <span className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
            <PackageX className="text-muted w-5 h-5" /> {code}
          </span>
          <p className="text-lg font-black text-text mt-1">{quantity.value} {quantity.unit}</p>
        </div>
        <WasteReasonBadge type={type} reason={reason} />
      </div>

      <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 rounded-lg border border-border">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Origen</span>
          <span className="text-sm font-semibold text-text">{origin}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-muted uppercase flex items-center gap-1"><Truck className="w-3 h-3"/> Destino</span>
          <span className="text-sm font-semibold text-text">{destination}</span>
        </div>
      </div>

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
