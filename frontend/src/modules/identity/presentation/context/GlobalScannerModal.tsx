import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSmartScanner } from './useSmartScanner';
import { QrCode, X, Camera, Keyboard } from 'lucide-react';
import { useAuth } from './AuthContext';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export const GlobalScannerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [showCamera, setShowCamera] = useState(true);
  const { handleScan } = useSmartScanner();
  const { user } = useAuth();
  
  const [isRendered, setIsRendered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsRendered(true);
      setShowCamera(true);
      setQrCode('');
      // Pequeño delay para la animación de entrada
      setTimeout(() => setAnimateIn(true), 50);
    };
    window.addEventListener('open-scanner', handleOpen);
    return () => window.removeEventListener('open-scanner', handleOpen);
  }, []);

  const handleClose = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsRendered(false);
      setShowCamera(false);
    }, 300); // match exit transition
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      const success = await handleScan(qrCode.trim());
      if (success) {
        handleClose();
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

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-card z-10">
          <h2 className="text-xl font-black text-primary flex items-center gap-2 tracking-tight">
            <QrCode size={24} className="text-primary" /> Escáner Global
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 bg-background flex flex-col items-center">
          
          {/* Cámara Box */}
          <div className="w-full aspect-square bg-card border-4 border-dashed border-border rounded-xl overflow-hidden relative shadow-inner mb-6">
            {showCamera ? (
              <CameraScanner 
                inline={true} 
                onScan={handleCameraScan} 
                onClose={handleClose} 
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <Camera size={48} className="opacity-20 mb-4" />
                <p className="font-medium text-sm">Cámara desactivada.</p>
                <button 
                  onClick={() => setShowCamera(true)}
                  className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors text-sm"
                >
                  Reactivar Cámara
                </button>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Ingreso Manual / Pistola USB</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Keyboard size={16} className="text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={qrCode}
                  onChange={e => {
                    setQrCode(e.target.value);
                    if (showCamera && e.target.value.length > 0) setShowCamera(false);
                  }}
                  placeholder="Ej. ALM-000000151"
                  className="w-full pl-10 pr-4 py-3 bg-card border-2 border-border rounded-xl font-mono text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground font-bold uppercase shadow-sm"
                />
              </div>
              <button 
                type="submit"
                disabled={!qrCode.trim()}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity shadow-md disabled:shadow-none"
              >
                Buscar
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>,
    document.body
  );
};
