import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScannerContextType {
  lastScannedCode: string | null;
  isScanning: boolean;
  setScannedCode: (code: string) => void;
  startScanning: () => void;
  stopScanning: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const setScannedCode = (code: string) => {
    setLastScannedCode(code);
    setIsScanning(false); // Detener auto-scan si lo configuramos así
  };

  const startScanning = () => setIsScanning(true);
  const stopScanning = () => setIsScanning(false);

  return (
    <ScannerContext.Provider value={{
      lastScannedCode,
      isScanning,
      setScannedCode,
      startScanning,
      stopScanning
    }}>
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
