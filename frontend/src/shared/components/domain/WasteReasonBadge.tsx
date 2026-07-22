import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, FileWarning } from 'lucide-react';

interface WasteReasonBadgeProps {
  type: 'SCRAP' | 'MERMA';
  reason: string;
}

export function WasteReasonBadge({ type, reason }: WasteReasonBadgeProps) {
  const isScrap = type === 'SCRAP';
  
  return (
    <div className={cn(
      "inline-flex flex-col border rounded-md overflow-hidden",
      isScrap ? "border-danger/30" : "border-warning/30"
    )}>
      <div className={cn(
        "px-2 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1",
        isScrap ? "bg-danger text-danger-foreground" : "bg-warning text-warning-foreground"
      )}>
        {isScrap ? <AlertCircle className="w-3 h-3" /> : <FileWarning className="w-3 h-3" />}
        {type}
      </div>
      <div className={cn(
        "px-2 py-1.5 text-xs font-bold text-center",
        isScrap ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning-foreground"
      )}>
        {reason}
      </div>
    </div>
  );
}
