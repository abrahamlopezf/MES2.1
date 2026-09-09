import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { TFButton } from '../../../components/tf-ui';
import { useBottomSheetAnimation } from '../../../hooks/useBottomSheetAnimation';

const CategoryDeactivateDialog = ({
  open,
  category,
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
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle Area */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Desactivar categoría
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
            Esta acción ocultará la categoría para nuevos registros. Si tiene
            materiales activos relacionados, el backend puede bloquear la operación.
          </p>

          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
            <div className="flex items-start gap-4 text-warning">
              <AlertTriangle className="mt-0.5 w-8 h-8 shrink-0" />

              <div className="grid gap-1">
                <strong className="text-lg font-black text-warning">
                  Categoría seleccionada
                </strong>

                <p className="m-0 text-sm font-bold leading-relaxed text-warning/90">
                  <span className="font-black">
                    {category?.code} — {category?.name}
                  </span>
                </p>

                <p className="m-0 mt-2 text-xs font-semibold leading-relaxed text-warning/70">
                  Recomendación: desactiva primero los materiales activos asociados,
                  o conserva la categoría activa si seguirá siendo usada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <TFButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-bold py-6 rounded-xl shadow-sm text-base h-14"
          >
            Regresar
          </TFButton>
          <TFButton
            type="button"
            variant="danger"
            icon={AlertTriangle}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex-[1.5] font-bold py-6 rounded-xl shadow-md text-base h-14"
          >
            Desactivar
          </TFButton>
        </div>
      </div>
    </div>
  );
};

export default CategoryDeactivateDialog;