import React from 'react';
import { Icon } from '@/design-system';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando información...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
      <Icon name="progress_activity" size={40} className="animate-spin text-primary mb-4" />
      <p className="text-lg font-bold text-foreground">{message}</p>
    </div>
  );
}
