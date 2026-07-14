import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando información...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-lg font-bold text-text">{message}</p>
    </div>
  );
}
