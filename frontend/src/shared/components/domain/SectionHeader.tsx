import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, icon: Icon, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border mb-6", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-card border border-border rounded-lg shadow-sm">
            <Icon size={24} className="text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm font-semibold text-muted mt-1">{description}</p>
          )}
        </div>
      </div>
      
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
