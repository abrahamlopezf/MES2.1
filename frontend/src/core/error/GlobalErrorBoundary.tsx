import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6 text-center">
          <div className="bg-danger/10 border border-danger/30 p-8 rounded-xl max-w-lg shadow-sm">
            <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-6" />
            <h2 className="text-2xl font-black text-text mb-2">Ocurrió un error inesperado</h2>
            <p className="text-muted font-medium mb-6">La interfaz ha encontrado un problema grave (Código: UI-001).</p>
            <div className="bg-background text-danger-foreground text-left p-4 rounded-md overflow-auto mb-6 text-xs font-mono max-h-32">
              {this.state.error?.toString()}
            </div>
            <Button size="lg" onClick={() => window.location.reload()}>
              Recargar Estación
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
