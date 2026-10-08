import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '../../design-system';
import { useBottomSheetAnimation } from '../../hooks/useBottomSheetAnimation';

const MasterDataActionDialog = ({
  open,
  item,
  title = "Gestionar Estado del Registro",
  itemLabel = "Registro seleccionado",
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(open, 400);

  const [action, setAction] = useState('deactivate'); // 'deactivate' or 'delete'
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setAction('deactivate');
      setReason('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm({ action, reason });
  };

  if (!isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full sm:max-w-[32rem] bg-card rounded-t-3xl sm:rounded-2xl border-t sm:border border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full sm:translate-y-4 sm:scale-95'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle Area (Only visible on mobile) */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card sm:hidden"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 sm:pt-5 sm:pb-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {title}
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
          <div className="flex gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setAction('deactivate')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${action === 'deactivate' ? 'bg-slate-600 text-white shadow-sm border border-slate-500' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              Desactivar
            </button>
            <button
              type="button"
              onClick={() => setAction('delete')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${action === 'delete' ? 'bg-red-600 text-white shadow-sm border border-red-500' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              Eliminar
            </button>
          </div>

          <div className={`rounded-2xl border p-5 ${action === 'delete' ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
            <div className={`flex items-start gap-4 ${action === 'delete' ? 'text-red-500' : 'text-amber-500'}`}>
              <AlertTriangle className="mt-0.5 w-8 h-8 shrink-0" />
              <div className="grid gap-1">
                <strong className={`text-lg font-black ${action === 'delete' ? 'text-red-500' : 'text-amber-500'}`}>
                  {action === 'delete' ? 'Eliminar Registro' : 'Desactivar Registro'}
                </strong>

                <p className={`m-0 text-sm font-bold leading-relaxed ${action === 'delete' ? 'text-red-400/90' : 'text-amber-500/90'}`}>
                  {itemLabel}:{' '}
                  <span className="font-black text-foreground">
                    {item?.code || item?.username || item?.id} {item?.name || item?.first_name ? `— ${item?.name || item?.first_name}` : ''}
                  </span>
                </p>

                <p className={`m-0 mt-2 text-xs font-semibold leading-relaxed ${action === 'delete' ? 'text-red-400/80' : 'text-amber-500/70'}`}>
                  {action === 'delete' 
                    ? 'Esta acción eliminará el registro lógicamente, quitándolo visualmente de todo el sistema, y su historial se mantendrá oculto.'
                    : 'Esta acción ocultará el registro para futuras operaciones (ej. creación de inventario), pero seguirá visible en las listas con estado Inactivo.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-foreground">Motivo de la acción <span className="text-destructive">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Escribe una justificación obligatoria..."
              className="min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 font-bold py-6 rounded-xl shadow-sm text-base h-14"
          >
            Regresar
          </Button>

          <Button
            type="button"
            variant={action === 'delete' ? 'destructive' : 'warning'}
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className={`flex-[1.5] font-bold py-6 rounded-xl shadow-md text-base h-14 ${(!reason.trim() || isLoading) ? 'opacity-100 bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed' : ''}`}
          >
            {action === 'delete' ? <Trash2 className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
            {action === 'delete' ? 'Confirmar Eliminación' : 'Confirmar Desactivación'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MasterDataActionDialog;
