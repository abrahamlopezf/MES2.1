import { useEffect } from 'react';
import { useScanner } from './ScannerProvider';

/**
 * Adaptador para pistolas USB que simulan teclado.
 * Escucha pulsaciones rápidas y las concatena hasta recibir 'Enter'.
 */
export function useKeyboardScannerAdapter() {
  const { setScannedCode, isScanning } = useScanner();

  useEffect(() => {
    let barcode = '';
    let reading = false;
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input formal
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter') {
        if (barcode.length > 3) {
          setScannedCode(barcode);
        }
        barcode = '';
        reading = false;
        return;
      }

      if (!reading) {
        reading = true;
      }

      // Evitar registrar teclas de control
      if (e.key.length === 1) {
        barcode += e.key;
      }

      clearTimeout(timeout);
      // Las pistolas escriben muy rápido, un timeout corto descarta tipeo humano accidental
      timeout = setTimeout(() => {
        barcode = '';
        reading = false;
      }, 100); 
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [setScannedCode]);
}
