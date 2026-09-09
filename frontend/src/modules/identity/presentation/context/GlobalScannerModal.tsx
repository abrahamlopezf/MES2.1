import React, { useState, useEffect } from 'react';
import { useSmartScanner } from './useSmartScanner';
import { QrCode, X, Camera } from 'lucide-react';
import { useAuth } from './AuthContext';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';
import { useBottomSheetAnimation } from '../../../../hooks/useBottomSheetAnimation';

export const GlobalScannerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const { handleScan } = useSmartScanner();
  const { user } = useAuth();
  
  const { isRendered, animateIn, sheetRef, currentY, handlers } = useBottomSheetAnimation(isOpen);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setShowCamera(true);
    };
    window.addEventListener('open-scanner', handleOpen);
    return () => window.removeEventListener('open-scanner', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setShowCamera(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      const success = await handleScan(qrCode.trim());
      if (success) {
        handleClose();
        setQrCode('');
      }
    }
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

  if (showCamera) {
    return (
      <CameraScanner 
        title="Apunta al código QR"
        onScan={handleCameraScan} 
        onClose={handleClose} 
      />
    );
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle Area */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(handleClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <QrCode size={24} className="text-primary" /> Escáner Manual
          </h2>
          <button 
            onClick={handleClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 bg-background flex flex-col items-center">
          <div className="py-8 w-full max-w-sm">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary/20">
              <Camera size={40} />
            </div>
            <p className="text-center text-muted-foreground mb-8 max-w-xs mx-auto font-medium">
              La cámara está desactivada. Puedes ingresar el código manualmente o reactivar la cámara.
            </p>
            <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
              <input
                autoFocus
                type="text"
                value={qrCode}
                onChange={e => setQrCode(e.target.value)}
                placeholder="ID del Token (ej. QR-10001)"
                className="w-full text-center text-xl p-4 border-2 border-input bg-card rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none mb-2 uppercase font-mono shadow-inner text-foreground placeholder:text-muted-foreground/60"
              />
              <div className="flex gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-xl font-bold hover:bg-secondary/80 transition-colors flex justify-center items-center gap-2 shadow-sm border border-border"
                >
                  <Camera size={20} /> Cámara
                </button>
                <button 
                  type="submit"
                  disabled={!qrCode.trim()}
                  className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-md disabled:shadow-none"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
