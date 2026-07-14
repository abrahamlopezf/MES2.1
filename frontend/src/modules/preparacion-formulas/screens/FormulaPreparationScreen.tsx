import React from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { Beaker, Search, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useScanner } from '@/core/scanner/ScannerProvider';
import { useKeyboardScannerAdapter } from '@/core/scanner/KeyboardScannerAdapter';
import { CameraScannerAdapter } from '@/core/scanner/CameraScannerAdapter';
import { ActionButton } from '@/shared/components/domain/ActionButton';

import { useTraceabilityScan } from '@/core/qr-workspace/hooks/useTraceabilityScan';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';

export default function FormulaPreparationScreen() {
  const { lastScannedCode, isScanning, startScanning, stopScanning, setScannedCode } = useScanner();
  useKeyboardScannerAdapter();

  const { data: formulaData, isLoading, isError, refetch } = useTraceabilityScan(lastScannedCode);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
      <SectionHeader 
        title="Preparación de Fórmulas" 
        description="Escanee la Orden de Mezclado para reservar e iniciar."
        icon={Beaker}
      />

      {!lastScannedCode && !isScanning && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border-2 border-dashed border-border rounded-xl mb-8">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <QrCode size={48} className="text-primary" />
          </div>
          <h3 className="text-2xl font-black text-text mb-2">Esperando Fórmula...</h3>
          <Button onClick={startScanning} size="lg" className="px-8 shadow-md">
            Activar Cámara Móvil
          </Button>
        </div>
      )}

      <div className="mb-8">
        <CameraScannerAdapter />
        {isScanning && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={stopScanning}>Cancelar</Button>
          </div>
        )}
      </div>

      {isLoading && <LoadingState message="Recuperando información de la fórmula..." />}
      
      {isError && (
        <ErrorState 
          message={`No se encontró la fórmula: ${lastScannedCode}`} 
          onRetry={() => {
            setScannedCode('');
            refetch();
          }} 
        />
      )}

      {formulaData && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest text-muted">Fórmula: {formulaData.entity.code}</h3>
            <Button variant="outline" size="sm" onClick={() => setScannedCode('')}>
              <Search className="mr-2 h-4 w-4" /> Escanear Otra
            </Button>
          </div>

          <div className="solid-card p-6">
            <h4 className="font-bold text-text mb-4 text-lg border-b border-border pb-2">{formulaData.entity.name}</h4>
            
            <div className="space-y-4 mb-8">
              {/* NOTA: Para una integración perfecta de recetas, backend enviará los requerimientos en un array extendido. */}
              {formulaData.quantity && (
                 <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg border border-border">
                  <div>
                    <span className="font-black text-sm block">Cantidad Solicitada</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg block">{formulaData.quantity.value} {formulaData.quantity.unit}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
              {formulaData.allowed_actions.map(action => (
                <ActionButton 
                  key={action.code} 
                  action={action} 
                  className="flex-1 min-w-[200px]" 
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
