import React, { useState } from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { Search, ShieldHalf } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useScanner } from '@/core/scanner/ScannerProvider';
import { useKeyboardScannerAdapter } from '@/core/scanner/KeyboardScannerAdapter';
import { InspectionCard } from '@/shared/components/domain/InspectionCard';

import { useTraceabilityScan } from '@/core/qr-workspace/hooks/useTraceabilityScan';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';

export default function QualityStationScreen() {
  const { lastScannedCode, setScannedCode } = useScanner();
  useKeyboardScannerAdapter();

  const [inspected, setInspected] = useState(false);
  const { data: qData, isLoading, isError, refetch } = useTraceabilityScan(lastScannedCode);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32 space-y-8">
      <SectionHeader 
        title="Estación de Calidad (QA)" 
        description="Escanee un lote de material o producto terminado para auditoría."
        icon={ShieldHalf}
      />

      {!lastScannedCode && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border-2 border-dashed border-border rounded-xl">
          <ShieldHalf size={48} className="text-muted mb-4" />
          <h3 className="text-xl font-black text-text mb-2">Escanee el QR del Lote</h3>
        </div>
      )}

      {isLoading && <LoadingState message="Buscando historial de calidad del lote..." />}
      
      {isError && (
        <ErrorState 
          message={`Lote no encontrado: ${lastScannedCode}`} 
          onRetry={() => {
            setScannedCode('');
            setInspected(false);
            refetch();
          }} 
        />
      )}

      {qData && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-muted">Auditoría en proceso</h3>
            <Button variant="outline" size="sm" onClick={() => { setScannedCode(''); setInspected(false); }}>
              <Search className="mr-2 h-4 w-4" /> Buscar otro
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="order-2 md:order-1">
              <InspectionCard 
                id={`QA-${qData.entity.id}`}
                targetEntityCode={qData.entity.code}
                inspector="Auditor QA"
                date={new Date().toLocaleDateString()}
                result={inspected ? 'APPROVED' : 'PENDING'}
                parameters={[
                  { name: 'Inspección Visual', value: 'OK', passed: true },
                  { name: 'Peso', value: `${qData.quantity?.value || 0} ${qData.quantity?.unit || 'uds'}`, passed: inspected ? true : false }
                ]}
                observations={inspected ? '' : 'Falta confirmación de operario'}
                actions={inspected ? [] : qData.allowed_actions.map(a => ({
                  ...a,
                  // @ts-ignore
                  onClick: () => {
                    alert(`Acción QA enviada al Backend: ${a.code}. Backend invalida query. Estado cambia.`);
                    setInspected(true);
                  }
                }))}
              />
            </div>
            
            <div className="order-1 md:order-2 solid-card p-6 flex flex-col gap-6">
               <h4 className="font-bold text-lg border-b border-border pb-2">Formulario de Control</h4>
               <p className="text-sm text-muted font-medium">
                 [Aquí iría el formulario RHF dinámico dependiendo del tipo de material, inyectando variables a los parámetros]
               </p>
               {!inspected && (
                 <Button className="w-full text-lg mt-auto" onClick={() => setInspected(true)}>
                   Simular Captura Completa
                 </Button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
