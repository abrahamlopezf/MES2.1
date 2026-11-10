import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSmartScanner } from './useSmartScanner';
import { useAuthStore } from '@/store/authStore';
import { QrCode, X } from '@/design-system/components/Icon/googleIconCompat';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export const GlobalScannerModal: React.FC = () => {
  const { handleScan } = useSmartScanner();
  const { user } = useAuthStore();
  
  const [isRendered, setIsRendered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsRendered(true);
      setTimeout(() => setAnimateIn(true), 50);
    };
    window.addEventListener('open-scanner', handleOpen);
    return () => window.removeEventListener('open-scanner', handleOpen);
  }, []);

  const handleClose = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setIsRendered(false);
    }, 180);
  };

  const handleCameraScan = async (code: string) => {
    if (code && code.trim()) {
      const success = await handleScan(code.trim());
      if (success) {
        handleClose();
      }
    }
  };

  if (!user || !isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-2 transition-opacity duration-150 sm:p-4 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`relative my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-border bg-card shadow-2xl transition-transform duration-150 sm:max-h-[calc(100dvh-2rem)] ${animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
      >
        {/* Header */}
        <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-black tracking-tight text-primary sm:text-xl">
            <QrCode size={24} className="shrink-0 text-primary" /> <span>Escáner Inteligente QR</span>
          </h2>
          <button 
            onClick={handleClose}
            aria-label="Cerrar escáner"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-3 sm:p-5">
          {/* Cámara Box */}
          <div className="relative min-h-[min(60dvh,18rem)] flex-1 w-full overflow-hidden rounded-xl border border-border bg-black">
            <CameraScanner
              inline={true}
              allowManualInput={false}
              hideScanShade={true}
              onScan={handleCameraScan}
              onClose={handleClose}
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="aspect-square w-[min(64vw,18rem,46dvh)] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.16)]" />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
