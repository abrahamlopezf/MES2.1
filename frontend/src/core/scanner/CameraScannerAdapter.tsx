import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useScanner } from './ScannerProvider';

interface CameraScannerAdapterProps {
  onScanSuccess?: (code: string) => void;
  onScanFailure?: (error: any) => void;
}

export function CameraScannerAdapter({ onScanSuccess, onScanFailure }: CameraScannerAdapterProps) {
  const { setScannedCode, isScanning } = useScanner();

  useEffect(() => {
    if (!isScanning) return;

    // Configuración industrial para la cámara (más rápida, menor latencia)
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 15, qrbox: { width: 250, height: 250 }, disableFlip: false },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScannedCode(decodedText);
        if (onScanSuccess) onScanSuccess(decodedText);
        
        // Auto-pause tras lectura para evitar múltiples disparos rápidos
        scanner.pause(true);
        setTimeout(() => scanner.resume(), 2000);
      },
      (error) => {
        if (onScanFailure) onScanFailure(error);
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Fallo al limpiar el scanner de cámara", error));
    };
  }, [isScanning, setScannedCode, onScanSuccess, onScanFailure]);

  if (!isScanning) return null;

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-border shadow-lg">
      <div id="qr-reader" />
    </div>
  );
}
