import React, { useEffect, useState } from 'react';
import { SectionHeader } from '@/shared/components/domain/SectionHeader';
import { Button } from '@/components/ui/button';
import { PackageOpen, Search, QrCode } from 'lucide-react';

import { useScanner } from '@/core/scanner/ScannerProvider';
import { useKeyboardScannerAdapter } from '@/core/scanner/KeyboardScannerAdapter';
import { CameraScannerAdapter } from '@/core/scanner/CameraScannerAdapter';

import { QRWorkspace } from '@/core/qr-workspace/QRWorkspace';
import { useTraceabilityScan } from '@/core/qr-workspace/hooks/useTraceabilityScan';
import { LoadingState } from '@/shared/components/domain/states/LoadingState';
import { ErrorState } from '@/shared/components/domain/states/ErrorState';

export default function ReceiveMaterialScreen() {
  const { lastScannedCode, isScanning, startScanning, stopScanning, setScannedCode } = useScanner();
  
  // Habilita el adaptador USB en esta estación
  useKeyboardScannerAdapter();

  // Query que dispara en cuanto tenemos un código escaneado
  const { data: workspaceData, isLoading, isError, refetch } = useTraceabilityScan(lastScannedCode);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32">
      <SectionHeader 
        title="Recepción de Material" 
        description="Escanee la etiqueta del proveedor para dar ingreso a planta."
        icon={PackageOpen}
      />

      {/* ZONA DE ESCANEO */}
      {!lastScannedCode && !isScanning && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border-2 border-dashed border-border rounded-xl mb-8">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <QrCode size={48} className="text-primary" />
          </div>
          <h3 className="text-2xl font-black text-text mb-2">Esperando lectura...</h3>
          <p className="text-muted font-medium text-center max-w-sm mb-6">
            Utilice la pistola USB o active la cámara de su dispositivo para escanear el QR del material.
          </p>
          <Button onClick={startScanning} size="lg" className="px-8 shadow-md">
            Activar Cámara Móvil
          </Button>
        </div>
      )}

      {/* ADAPTADOR DE CÁMARA */}
      <div className="mb-8">
        <CameraScannerAdapter />
        {isScanning && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={stopScanning}>
              Cancelar Escaneo
            </Button>
          </div>
        )}
      </div>

      {/* ESTADOS DEL WORKSPACE */}
      {isLoading && <LoadingState message="Recuperando información del material..." />}
      
      {isError && (
        <ErrorState 
          message={`No se encontró registro para el código: ${lastScannedCode}`} 
          onRetry={() => {
            setScannedCode(''); // Limpiar para re-escanear
            refetch();
          }} 
        />
      )}

      {/* ESPACIO DE TRABAJO (QR WORKSPACE) */}
      {workspaceData && !isLoading && !isError && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-widest text-muted">Estación de Trabajo</h3>
            <Button variant="outline" size="sm" onClick={() => setScannedCode('')}>
              <Search className="mr-2 h-4 w-4" /> Escanear Otro
            </Button>
          </div>
          
          <QRWorkspace 
            data={workspaceData} 
            onActionClick={(actionCode) => alert(`Ejecutando acción: ${actionCode}`)} 
          />
        </div>
      )}

    </div>
  );
}
