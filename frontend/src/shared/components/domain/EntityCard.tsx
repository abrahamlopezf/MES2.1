import React from 'react';
import { QrCode, MapPin, Layers } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ErpStatus } from '@/core/config/statusConfig';
import { cn } from '@/lib/utils';

interface EntityCardProps {
  entityType: string; // ej. "Materia Prima", "Producto Intermedio"
  qrId: string;
  status: ErpStatus;
  quantity: string; // ej. "520 kg"
  area: string;
  rack?: string;
  accentColor?: string; // Color hexadecimal para el borde/acento (Almacén, Extrusión)
  children?: React.ReactNode; // Acciones principales
}

export function EntityCard({ 
  entityType, qrId, status, quantity, area, rack, accentColor = 'var(--color-primary)', children 
}: EntityCardProps) {
  return (
    <div className="solid-card overflow-hidden">
      {/* Accent Header */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      
      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
        
        {/* Entity Info */}
        <div className="flex gap-4">
          <div className="p-3 bg-background border border-border rounded-lg h-fit">
            <QrCode size={32} className="text-muted" />
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-muted">{entityType}</span>
            <h3 className="text-2xl font-black text-foreground font-mono">{qrId}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusBadge status={status} />
              
              <div className="flex items-center gap-1.5 text-sm font-bold text-foreground bg-background px-2.5 py-1 rounded-md border border-border">
                <Layers size={14} className="text-primary" /> {quantity}
              </div>

              <div className="flex items-center gap-1.5 text-sm font-bold text-foreground bg-background px-2.5 py-1 rounded-md border border-border">
                <MapPin size={14} className="text-warning" /> {area} {rack ? `/ ${rack}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Context */}
        {children && (
          <div className="flex flex-col gap-3 min-w-[200px]">
            {children}
          </div>
        )}
        
      </div>
    </div>
  );
}
