import React from 'react';
import { createPortal } from 'react-dom';
import { X, Info, QrCode } from 'lucide-react';
import { useBottomSheetAnimation } from '../../../../hooks/useBottomSheetAnimation';
import { Button, Badge } from '../../../../design-system';
import { downloadQrPdf } from '../../../identity/presentation/hooks/useIdentityBatches';
import { toast } from 'sonner';

export interface InfoBottomSheetPresenterProps {
  item: any;
  lotes: any[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onViewAllLotes: () => void;
}

export const InfoBottomSheetPresenter: React.FC<InfoBottomSheetPresenterProps> = ({
  item,
  lotes,
  isLoading,
  isOpen,
  onClose,
  onViewAllLotes
}) => {
  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(isOpen, 300);

  if (!isRendered) return null;

  const activeLotes = lotes || [];

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-300 ease-out transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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
          <div className="flex items-center gap-2 text-foreground">
            <Info size={20} className="text-primary" />
            <h3 className="font-bold text-lg leading-none">Detalles del Inventario</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 bg-background">
          {/* Material Details Card */}
          <div className="bg-secondary/20 border border-border p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-lg text-foreground leading-tight">
                  {item.material?.internal_code || '---'}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.material?.name || '---'}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs py-1">
                {item.material?.ranking?.nomenclature || '---'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-card rounded-lg p-3 border border-border/50 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Cantidad Actual</p>
                <p className="font-bold text-xl text-primary flex items-baseline gap-1">
                  {Number(item.amount).toFixed(2)}
                  <span className="text-sm font-semibold text-muted-foreground">{item.material?.base_unit?.code || ''}</span>
                </p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/50 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Clasificación</p>
                <p className="font-bold text-sm text-foreground mt-1">{item.material?.ranking?.name || '---'}</p>
              </div>
            </div>
          </div>

          {/* Lotes List */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-3">
              Últimas Recepciones (Lotes)
            </h4>
            
            <div className="flex flex-col gap-3">
              {isLoading ? (
                // Skeleton Loaders
                <>
                  <div className="animate-pulse bg-secondary/50 rounded-xl h-20 w-full border border-border/50" />
                  <div className="animate-pulse bg-secondary/50 rounded-xl h-20 w-full border border-border/50" />
                  <div className="animate-pulse bg-secondary/50 rounded-xl h-20 w-full border border-border/50" />
                </>
              ) : activeLotes.length === 0 ? (
                <div className="py-8 flex flex-col items-center text-center px-4 text-sm text-muted-foreground border border-border border-dashed rounded-xl bg-secondary/10">
                  <span className="font-semibold text-foreground mb-1">Sin lotes activos</span>
                  No hay lotes en existencia para este material.
                </div>
              ) : (
                activeLotes.map((lote: any) => {
                  const initial = Number(lote.initial_amount ?? lote.amount) || 0;
                  const available = Number(lote.available_amount ?? lote.amount) || 0;
                  const disposed = initial - available;
                  
                  const isDepleted = lote.is_active === false || available <= 0;
                  const isPartial = !isDepleted && disposed > 0;
                  
                  return (
                    <div 
                      key={lote.id}
                      className={`flex flex-col sm:flex-row gap-2 sm:gap-4 p-3.5 rounded-xl border items-start sm:items-center justify-between shadow-sm transition-all
                        ${isDepleted ? 'border-destructive/30 bg-destructive/5 opacity-50 grayscale-[50%]' : 'border-border bg-card'}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`font-bold text-sm truncate ${isDepleted ? 'text-destructive' : 'text-foreground'}`}>
                            Folio: {lote.folio || 'LEGACY-LOT'}
                          </span>
                          {isDepleted && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">DADO DE BAJA</Badge>
                          )}
                          {isPartial && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10 whitespace-nowrap">
                              BAJA PARCIAL: -{disposed.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {new Date(lote.date_received).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-border/50 sm:border-0">
                        {lote.qr_code?.uuid && !isDepleted && (
                          <button
                            onClick={() => downloadQrPdf(lote.qr_code.uuid, lote.qr_code.qr_code).catch(() => toast.error('Error al descargar QR'))}
                            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20 flex items-center justify-center shrink-0"
                            title="Descargar Código QR"
                          >
                            <QrCode size={16} />
                          </button>
                        )}
                        <div className="text-xs text-muted-foreground flex flex-col items-start sm:items-end">
                          <span>Por: <span className="font-semibold text-foreground">{lote.user?.first_name} {lote.user?.last_name}</span></span>
                          {lote.location && (
                            <span className="mt-0.5">Loc: <span className="font-semibold text-foreground">{lote.location.code}</span></span>
                          )}
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-sm py-1 ${isDepleted ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                          {available.toFixed(2)} <span className="text-[10px] ml-1 font-medium">{lote.material?.base_unit?.code || ''}</span>
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Actions fixed to bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
           <Button variant="secondary" onClick={onClose} className="flex-1 font-bold py-6 rounded-xl">
            Cerrar
          </Button>
          <Button 
            variant="default" 
            onClick={onViewAllLotes}
            className="flex-1 font-bold py-6 rounded-xl shadow-md"
          >
            Ver Historial
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
};
