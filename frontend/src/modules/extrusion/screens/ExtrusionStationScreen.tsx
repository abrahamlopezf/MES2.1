import React from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { Activity, Search, ServerCog } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useScanner } from '@/core/scanner/ScannerProvider';
import { useKeyboardScannerAdapter } from '@/core/scanner/KeyboardScannerAdapter';
import { ProcessRunCard, ProcessRun } from '@/shared/components/domain/ProcessRunCard';

import { useTraceabilityScan } from '@/core/qr-workspace/hooks/useTraceabilityScan';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';

export default function ExtrusionStationScreen() {
  const { lastScannedCode, setScannedCode } = useScanner();
  useKeyboardScannerAdapter();

  const { data: runData, isLoading, isError, refetch } = useTraceabilityScan(lastScannedCode);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32 space-y-8">
      <SectionHeader 
        title="Estación de Extrusión" 
        description="Monitor y control de proceso productivo en tiempo real."
        icon={ServerCog}
      />

      {!lastScannedCode && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border-2 border-dashed border-border rounded-xl">
          <Activity size={48} className="text-muted mb-4" />
          <h3 className="text-xl font-black text-text mb-2">Escanee el QR de la Máquina/Corrida</h3>
        </div>
      )}

      {isLoading && <LoadingState message="Recuperando estado de la extrusora..." />}
      
      {isError && (
        <ErrorState 
          message={`No se encontró registro para la corrida: ${lastScannedCode}`} 
          onRetry={() => {
            setScannedCode('');
            refetch();
          }} 
        />
      )}

      {runData && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-muted">Corrida Activa</h3>
            <Button variant="outline" size="sm" onClick={() => setScannedCode('')}>
              <Search className="mr-2 h-4 w-4" /> Buscar otra corrida
            </Button>
          </div>

          <ProcessRunCard 
            run={{
              id: runData.entity.id,
              code: runData.entity.code,
              status: runData.status,
              machine: runData.location?.area || 'Máquina no asignada',
              operator: 'Operador en turno',
              input_material: { 
                code: runData.entity.name, 
                qty: runData.quantity?.value || 0, 
                unit: runData.quantity?.unit || 'kg' 
              },
              metrics: {
                output: 0,
                scrap: 0,
                waste: 0,
                yield_percent: 100, // Metrics would theoretically come from the backend DTO inside payload.metadata or similar
                time_elapsed: 'Calculado por backend'
              },
              allowed_actions: runData.allowed_actions
            }} 
            onAction={(action) => alert(`El backend ejecutará: ${action.label}`)}
          />
        </div>
      )}
    </div>
  );
}
