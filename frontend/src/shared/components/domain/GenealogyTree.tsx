import React from 'react';
import { GitMerge, ArrowDownRight, QrCode } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ErpStatus } from '@/core/config/statusConfig';

export interface GenealogyNode {
  id: string;
  qrId: string;
  type: string;
  status: ErpStatus;
  quantity: string;
  children?: GenealogyNode[];
}

interface GenealogyTreeProps {
  data: GenealogyNode;
  isChild?: boolean;
}

export function GenealogyTree({ data, isChild = false }: GenealogyTreeProps) {
  return (
    <div className={`flex flex-col ${isChild ? 'pl-6 mt-3 relative' : ''}`}>
      {isChild && (
        <div className="absolute left-2 top-0 bottom-6 w-px bg-border" />
      )}
      
      <div className="flex items-center gap-3 relative z-10">
        {isChild && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-muted">
            <ArrowDownRight size={16} />
          </div>
        )}
        
        <div className="flex items-center gap-3 p-2.5 bg-background border border-border rounded-lg shadow-sm w-full md:w-auto hover:border-primary/40 transition-colors">
          <div className="p-1.5 bg-card border border-border rounded-md">
            {isChild ? <GitMerge size={16} className="text-muted" /> : <QrCode size={16} className="text-primary" />}
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">{data.type}</span>
            <span className="text-sm font-mono font-bold text-foreground">{data.qrId}</span>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{data.quantity}</span>
            <StatusBadge status={data.status} showIcon={false} />
          </div>
        </div>
      </div>

      {data.children && data.children.length > 0 && (
        <div className="flex flex-col gap-1">
          {data.children.map(child => (
            <GenealogyTree key={child.id} data={child} isChild />
          ))}
        </div>
      )}
    </div>
  );
}
