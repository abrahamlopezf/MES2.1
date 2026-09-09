import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button.tsx';
import { useBottomSheetAnimation } from '../../hooks/useBottomSheetAnimation';

const ConfirmDialog = ({
  open,
  title = 'Confirmar acción',
  message = '¿Seguro que deseas continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const { isRendered, animateIn, sheetRef, currentY, handlers } = useBottomSheetAnimation(open);

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-5 pb-6 pt-2 bg-background flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm border ${variant === 'danger' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
            <AlertTriangle size={40} />
          </div>

          <h2 id="confirm-dialog-title" className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm font-medium mb-8 max-w-sm px-4">
            {message}
          </p>

          <div className="w-full flex gap-3 pb-8">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 font-bold py-6 rounded-xl shadow-sm text-base h-14"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'destructive' : 'primary'}
              onClick={onConfirm}
              isLoading={isLoading}
              className="flex-[1.5] font-bold py-6 rounded-xl shadow-md text-base h-14"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;