import React from 'react';
import { useScanner } from './ScannerProvider';
import { CameraScanner } from '@/design-system/components/scanner-overlay/CameraScanner';

interface CameraScannerAdapterProps {
  onScanSuccess?: (code: string) => void;
  onScanFailure?: (error: any) => void;
}

export function CameraScannerAdapter({ onScanSuccess, onScanFailure }: CameraScannerAdapterProps) {
  const { setScannedCode, isScanning, stopScanning } = useScanner();

  if (!isScanning) return null;

  return (
    <div className="mx-auto h-[min(70dvh,34rem)] min-h-[22rem] w-full max-w-sm overflow-hidden rounded-xl border border-border shadow-lg">
      <CameraScanner
        title="Preparación de fórmulas"
        inline
        allowManualInput={false}
        allowImageInput
        onScanFailure={onScanFailure}
        onScan={(code) => {
          setScannedCode(code);
          onScanSuccess?.(code);
        }}
        onClose={stopScanning}
      />
    </div>
  );
}
