import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({ title = 'Sin información', message = 'No hay datos disponibles para este registro.' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
      <PackageOpen className="h-12 w-12 text-muted mb-4" />
      <h3 className="text-xl font-bold text-text mb-1">{title}</h3>
      <p className="text-sm font-medium text-muted max-w-sm">{message}</p>
    </div>
  );
}
