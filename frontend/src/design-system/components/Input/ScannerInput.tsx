import React, { useEffect, useRef } from 'react';
import { QrCode, ScanLine } from 'lucide-react';
import { Input } from './Input';
import { cn } from '../../utils';

interface ScannerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onScan: (value: string) => void;
  isScanning?: boolean;
}

export const ScannerInput = React.forwardRef<HTMLInputElement, ScannerInputProps>(
  ({ className, onScan, isScanning = false, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLInputElement>(null);
    const ref = (forwardedRef as any) || localRef;

    // Auto-focus para hardware scanners en plantas industriales
    useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return; // Ya está escribiendo en otro lado
        }
        
        // Asumiendo que el escáner envía Enter al final
        if (e.key === 'Enter' && ref.current?.value) {
          onScan(ref.current.value);
          ref.current.value = '';
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          ref.current?.focus();
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [onScan, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = e.currentTarget.value.trim();
        if (value) {
          onScan(value);
          e.currentTarget.value = '';
        }
      }
    };

    return (
      <div className="relative flex items-center w-full">
        <div className="absolute left-4 flex items-center justify-center text-muted-foreground">
          {isScanning ? (
            <ScanLine className="h-6 w-6 animate-pulse text-primary" />
          ) : (
            <QrCode className="h-6 w-6" />
          )}
        </div>
        <Input
          {...props}
          ref={ref}
          className={cn("pl-12 text-lg font-medium", className)}
          placeholder={props.placeholder || "Escanea un código QR..."}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }
);

ScannerInput.displayName = 'ScannerInput';
