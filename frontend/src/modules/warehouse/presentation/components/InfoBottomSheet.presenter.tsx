import React from 'react';
import { createPortal } from 'react-dom';
import { X, Info, QrCode } from '@/design-system/components/Icon/googleIconCompat';
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
      className={`fixed inset-0 z-[10000] flex flex-col justify-end transition-opacity duration-300 md:items-center md:justify-center md:p-6 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-details-title"
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
        className={`relative my-0 flex min-h-0 max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card transition-transform duration-300 ease-out transform md:my-auto md:max-h-[calc(100dvh-3rem)] md:rounded-2xl md:border ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle Area */}
        <div 
          className="flex w-full shrink-0 touch-none items-center justify-center bg-card pt-3 pb-2 md:hidden"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pb-4 sm:px-5">
          <div className="flex items-center gap-2 text-foreground">
            <Info size={20} className="text-primary" />
            <h3 id="inventory-details-title" className="font-bold text-lg leading-tight">Detalles del Inventario</h3>
          </div>
          <button 
            onClick={onClose}
            aria-label="Cerrar detalles del inventario"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-5">
          <div className="flex flex-col gap-5">
          {/* Material summary */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Resumen del material">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl">
                  {item.material?.internal_code || 'Sin código'}
                </h4>
                <p className="mt-1 text-base leading-snug text-muted-foreground">
                  {item.material?.name || 'Sin nombre'}
                </p>
              </div>
              {item.material?.ranking?.nomenclature && (
                <Badge variant="outline" className="shrink-0 border-border bg-background px-3 py-1 text-sm font-semibold text-foreground">
                  {item.material.ranking.nomenclature}
                </Badge>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cantidad actual</p>
                <p className="flex items-baseline gap-2 text-2xl font-bold tabular-nums text-primary">
                  {Number(item.amount).toFixed(2)}
                  <span className="text-base font-semibold text-muted-foreground">{item.material?.base_unit?.code || ''}</span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Clasificación</p>
                <p className="text-base font-semibold text-foreground">{item.material?.ranking?.name || 'Sin clasificación'}</p>
              </div>
            </div>
          </section>

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
                      className={`grid min-w-0 gap-3 rounded-xl border p-4 transition-colors sm:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_auto] sm:items-center sm:gap-4
                        ${isDepleted ? 'border-destructive/30 bg-destructive/5 opacity-60' : 'border-border bg-card'}`}
                    >
                      <div className="flex min-w-0 flex-col">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`break-all text-base font-bold ${isDepleted ? 'text-destructive' : 'text-foreground'}`}>
                            Folio: {lote.folio || 'LEGACY-LOT'}
                          </span>
                          {isDepleted && (
                            <Badge variant="destructive" className="h-6 px-2 text-xs">Dado de baja</Badge>
                          )}
                          {isPartial && (
                            <Badge variant="outline" className="whitespace-nowrap border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
                              Baja parcial · {disposed.toFixed(2)} {lote.material?.base_unit?.code || ''}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {new Date(lote.date_received).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex min-w-0 items-center gap-3 border-t border-border/70 pt-3 sm:border-0 sm:pt-0">
                        {lote.qr_code?.uuid && !isDepleted && (
                          <button
                            onClick={() => downloadQrPdf(lote.qr_code.uuid, lote.qr_code.qr_code).catch(() => toast.error('Error al descargar QR'))}
                            aria-label={`Descargar QR del lote ${lote.folio || 'LEGACY-LOT'}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                            title="Descargar Código QR"
                          >
                            <QrCode size={20} />
                          </button>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground sm:flex-none">
                          <span className="truncate">Registró: <span className="font-semibold text-foreground">{lote.user?.first_name} {lote.user?.last_name}</span></span>
                          {lote.location && (
                            <span>Ubicación: <span className="font-semibold text-foreground">{lote.location.code}</span></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-sm font-medium text-muted-foreground sm:hidden">Disponible</span>
                        <div className="sm:text-right">
                          <span className="hidden text-xs font-medium text-muted-foreground sm:block">Disponible</span>
                          <Badge variant="outline" className={`mt-0.5 shrink-0 rounded-lg px-3 py-1.5 text-base font-bold tabular-nums ${isDepleted ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-background text-foreground'}`}>
                            {available.toFixed(2)} <span className="ml-1 text-xs font-semibold">{lote.material?.base_unit?.code || ''}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        </div>
        
        {/* Bottom Actions fixed to bottom */}
        <div className="z-10 flex shrink-0 gap-3 border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 md:pb-4">
           <Button variant="secondary" onClick={onClose} className="min-h-12 flex-1 rounded-xl font-bold">
            Cerrar
          </Button>
          <Button 
            variant="default" 
            onClick={onViewAllLotes}
            className="min-h-12 flex-1 rounded-xl font-bold shadow-md"
          >
            Ver Historial
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
};
