import React, { useRef, useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';

export interface BajaBottomSheetPresenterProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  // State
  isResolutionMode: boolean;
  isRequestMode: boolean;
  requestDetails: any;
  loadingRequest: boolean;
  currentMaterial: any;
  activeLotes: any[];
  loadingLotes: boolean;
  tiposBaja: any[];
  selectedLotes: number[];
  tipoBajaId: string;
  notes: string;
  totalSelectedQuantity: number;
  isSubmitting: boolean;
  // Handlers
  onToggleLote: (loteId: number) => void;
  onToggleAll: () => void;
  onChangeTipoBajaId: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onResolveRequest: (status: 'APPROVED' | 'REJECTED') => void;
  onCreateRequest: () => void;
  onDirectDispose: () => void;
}

export const BajaBottomSheetPresenter: React.FC<BajaBottomSheetPresenterProps> = ({
  item,
  isOpen,
  onClose,
  isResolutionMode,
  isRequestMode,
  requestDetails,
  loadingRequest,
  currentMaterial,
  activeLotes,
  loadingLotes,
  tiposBaja,
  selectedLotes,
  tipoBajaId,
  notes,
  totalSelectedQuantity,
  isSubmitting,
  onToggleLote,
  onToggleAll,
  onChangeTipoBajaId,
  onChangeNotes,
  onResolveRequest,
  onCreateRequest,
  onDirectDispose
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 400); // 400ms duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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

  if (isResolutionMode && loadingRequest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[92dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isOpen && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle size={20} className="text-warning" />
            <h3 className="font-bold text-lg leading-none">
              {isResolutionMode ? 'Autorización de Baja' : isRequestMode ? 'Solicitar Baja' : 'Baja de Material'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 bg-background">
          
          {isResolutionMode && requestDetails?.requester && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-3 shadow-sm">
              <Info className="text-primary shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-foreground">
                <span className="font-bold block text-primary">Solicitado por: {requestDetails.requester.first_name} {requestDetails.requester.last_name}</span>
                Este usuario ha solicitado dar de baja estos lotes. Por favor aprueba o rechaza la solicitud.
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Material</p>
                <p className="font-bold text-foreground text-lg leading-tight mt-1">{currentMaterial?.name || '---'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{currentMaterial?.internal_code || '---'}</p>
              </div>
              {!isResolutionMode && (
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Disponible</p>
                  <p className="font-bold text-primary text-xl mt-1">{Number(item?.amount || 0).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lotes List */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-foreground">
                {isResolutionMode ? 'Lotes solicitados para baja' : 'Lotes disponibles'}
              </h4>
              {!isResolutionMode && activeLotes.length > 0 && (
                <button 
                  onClick={onToggleAll}
                  className="text-xs text-primary hover:underline font-bold bg-primary/10 px-2 py-1 rounded-md"
                >
                  {selectedLotes.length === activeLotes.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-2.5">
              {loadingLotes ? (
                <>
                  <div className="animate-pulse bg-secondary/50 rounded-xl h-[72px] w-full border border-border/50" />
                  <div className="animate-pulse bg-secondary/50 rounded-xl h-[72px] w-full border border-border/50" />
                </>
              ) : activeLotes.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl bg-secondary/10">
                  <span className="font-semibold text-foreground block mb-1">Sin lotes</span>
                  No hay lotes {isResolutionMode ? 'en esta solicitud' : 'activos para este material'}.
                </div>
              ) : (
                activeLotes.map((lote: any) => (
                  <label 
                    key={lote.id} 
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors shadow-sm ${
                      isResolutionMode ? 'cursor-default opacity-80' : 'cursor-pointer'
                    } ${
                      selectedLotes.includes(lote.id) 
                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                        : 'bg-card border-border hover:bg-secondary/30'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-muted-foreground/30"
                      checked={selectedLotes.includes(lote.id)}
                      onChange={() => onToggleLote(lote.id)}
                      disabled={isResolutionMode}
                    />
                    <div className="flex-1 flex justify-between items-center ml-1">
                      <div>
                        <p className="text-sm font-bold text-foreground">Folio: {lote.folio || 'LEGACY-LOT'}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{new Date(lote.date_received).toLocaleDateString()}</span>
                          {lote.user?.first_name && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                              <span>{lote.user.first_name}</span>
                            </>
                          )}
                          {lote.location && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                              <span className="font-semibold text-foreground">Loc: {lote.location.code}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className={`font-mono text-sm ${selectedLotes.includes(lote.id) ? 'bg-primary/10 border-primary/20' : 'bg-background'}`}>
                        {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}
                      </Badge>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground ml-1">Tipo de baja *</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                value={tipoBajaId}
                onChange={e => onChangeTipoBajaId(e.target.value)}
                disabled={isResolutionMode}
              >
                <option value="" disabled className="bg-background text-foreground">Seleccionar motivo</option>
                {tiposBaja.map(t => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground ml-1">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-card px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-none"
                placeholder="Detalles adicionales sobre la baja..."
                value={notes}
                onChange={e => onChangeNotes(e.target.value)}
                disabled={isResolutionMode}
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-destructive/5 text-destructive p-4 rounded-xl border border-destructive/20 shadow-sm mb-4">
            <span className="text-sm font-bold">Cantidad total a dar de baja:</span>
            <span className="text-xl font-black">{totalSelectedQuantity.toFixed(2)}</span>
          </div>

        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          
          {isResolutionMode ? (
            <>
              <Button variant="secondary" onClick={() => onResolveRequest('REJECTED')} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
                Rechazar (Reactivar)
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => onResolveRequest('APPROVED')}
                disabled={isSubmitting}
                className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
              >
                {isSubmitting ? <><Loader2 className="mr-2 animate-spin" size={18} /> Procesando...</> : 'Aprobar Baja'}
              </Button>
            </>
          ) : isRequestMode ? (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={onCreateRequest}
                disabled={isSubmitting || selectedLotes.length === 0 || !tipoBajaId}
                className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
              >
                {isSubmitting ? <><Loader2 className="mr-2 animate-spin" size={18} /> Solicitando...</> : 'Solicitar Autorización'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={onDirectDispose}
                disabled={isSubmitting || selectedLotes.length === 0 || !tipoBajaId}
                className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
              >
                {isSubmitting ? <><Loader2 className="mr-2 animate-spin" size={18} /> Confirmando...</> : 'Confirmar Baja'}
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
