import React from 'react';
import { STATUS_MAP, ErpStatus } from '@/core/config/statusConfig';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ErpStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  
  if (!config) {
    return <span className="text-muted font-bold text-xs">Unknown Status</span>;
  }

  const Icon = config.icon;

  const variantStyles = {
    success: 'bg-success/15 text-success border-success/30',
    primary: 'bg-primary/15 text-primary border-primary/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    info: 'bg-info/15 text-info border-info/30',
    quality: 'bg-quality/15 text-quality border-quality/30',
    secondary: 'bg-muted/15 text-muted-foreground border-border',
    outline: 'bg-transparent border-border text-foreground'
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border",
        variantStyles[config.variant as keyof typeof variantStyles],
        className
      )}
      title={config.description}
    >
      {showIcon && <Icon size={14} strokeWidth={3} />}
      {config.label}
    </span>
  );
}
