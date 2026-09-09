import React, { useRef, useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { TFButton, TFTextarea } from '../../../components/tf-ui';

const QrCancelDialog = ({
  open,
  qr,
  isLoading,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [isRendered, setIsRendered] = useState(open);
  const sheetRef = useRef(null);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (!open) {
      setReason('');
      const timer = setTimeout(() => setIsRendered(false), 400); 
      return () => clearTimeout(timer);
    } else {
      setIsRendered(true);
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm?.({
      reason: reason.trim() || 'Cancelación manual desde administración QR.',
    });
  };

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const deltaY = y - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    }
    setStartY(null);
    setCurrentY(0);
  };

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${open && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle Area */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Cancelar código QR
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-background">
          <p className="text-muted-foreground text-sm font-medium">
            Esta acción marcará el código QR como cancelado y no podrá usarse en operación.
          </p>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
            <div className="flex items-start gap-4 text-destructive">
              <AlertTriangle className="mt-0.5 w-8 h-8 shrink-0" />

              <div className="grid gap-1">
                <strong className="text-lg font-black text-destructive">
                  Revisa antes de continuar
                </strong>

                <p className="m-0 text-sm font-bold leading-relaxed text-destructive/90">
                  Código seleccionado:{' '}
                  <span className="font-black text-foreground break-all">
                    {qr?.qr_code || qr?.code || 'Sin código'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <TFTextarea
            label="Motivo de cancelación"
            name="cancel_reason"
            placeholder="Ej. Código dañado, impreso incorrectamente o cancelado por control interno."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            helperText="Este motivo quedará registrado como parte del historial operativo."
          />
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <TFButton
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-bold py-6 rounded-xl shadow-sm text-base h-14"
          >
            Regresar
          </TFButton>

          <TFButton
            variant="danger"
            icon={AlertTriangle}
            onClick={handleConfirm}
            isLoading={isLoading}
            className="flex-[1.5] font-bold py-6 rounded-xl shadow-md text-base h-14"
          >
            Cancelar QR
          </TFButton>
        </div>
      </div>
    </div>
  );
};

export default QrCancelDialog;