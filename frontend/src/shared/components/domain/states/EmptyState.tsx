import React from 'react';
import { Icon } from '@/design-system';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({ title = 'Sin información', message = 'No hay datos disponibles para este registro.' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
      <Icon name="inbox" size={48} className="text-muted-foreground/40 mb-4" />
      <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm font-medium text-muted max-w-sm">{message}</p>
    </div>
  );
}
