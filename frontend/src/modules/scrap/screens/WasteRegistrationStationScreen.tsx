import React, { useState } from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { Trash2, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useScanner } from '@/core/scanner/ScannerProvider';
import { useKeyboardScannerAdapter } from '@/core/scanner/KeyboardScannerAdapter';
import { WasteCard } from '@/shared/components/domain/WasteCard';
import { ActionButton } from '@/shared/components/domain/ActionButton';

import { useTraceabilityScan } from '@/core/qr-workspace/hooks/useTraceabilityScan';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';

export default function WasteRegistrationStationScreen() {
  const { lastScannedCode, setScannedCode } = useScanner();
  useKeyboardScannerAdapter();

  const [wasteGenerated, setWasteGenerated] = useState(false);
  const { data: runData, isLoading, isError, refetch } = useTraceabilityScan(lastScannedCode);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32 space-y-8">
      <SectionHeader 
        title="Estación de Desperdicios (Scrap / Merma)" 
        description="Escanee la corrida origen para registrar generación de desperdicio."
        icon={Trash2}
      />

      {!lastScannedCode && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border-2 border-dashed border-border rounded-xl">
          <Trash2 size={48} className="text-muted mb-4" />
          <h3 className="text-xl font-black text-text mb-2">Escanee el QR de la Máquina/Corrida</h3>
        </div>
      )}

      {isLoading && <LoadingState message="Buscando contexto operativo..." />}
      
      {isError && (
        <ErrorState 
          message={`Código inválido: ${lastScannedCode}`} 
          onRetry={() => {
            setScannedCode('');
            setWasteGenerated(false);
            refetch();
          }} 
        />
      )}

      {runData && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-muted">Registro para: {runData.entity.code}</h3>
            <Button variant="outline" size="sm" onClick={() => { setScannedCode(''); setWasteGenerated(false); }}>
              <Search className="mr-2 h-4 w-4" /> Buscar otra
            </Button>
          </div>

          {!wasteGenerated ? (
            <div className="solid-card p-6 flex flex-col gap-6">
              <h4 className="font-bold text-lg border-b border-border pb-2">Formulario de Registro</h4>
              <p className="text-sm text-text font-medium text-muted">
                [Aquí iría el formulario RHF para capturar Peso, Tipo (Scrap/Merma) y Motivo]
              </p>
              <Button onClick={() => setWasteGenerated(true)} className="w-full md:w-auto h-12 text-lg self-start">
                Generar Ticket de Scrap
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase text-success flex items-center gap-2">
                ¡Ticket Generado Exitosamente!
              </h4>
              <WasteCard 
                code={`SCR-${runData.entity.code}`}
                type="SCRAP"
                quantity={{ value: 0, unit: runData.quantity?.unit || 'kg' }}
                origin={runData.location?.area || 'Origen Desconocido'}
                destination="SCRAP_BUFFER_01"
                reason="Declarado por Operador"
                actions={runData.allowed_actions} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
