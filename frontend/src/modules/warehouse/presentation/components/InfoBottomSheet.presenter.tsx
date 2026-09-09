import React, { useRef, useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';

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
  const [isRendered, setIsRendered] = useState(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number>(0);

  // Handle mount/unmount animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Touch handlers for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const deltaY = y - startY;
    
    // Only allow swiping down
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      // Swiped down far enough, close it
      onClose();
    }
    setStartY(null);
    setCurrentY(0);
  };

  if (!isRendered) return null;

  const activeLotes = lotes || [];

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
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
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-300 ease-out transform ${isOpen && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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
                activeLotes.map((lote: any) => (
                  <div 
                    key={lote.id}
                    className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3.5 rounded-xl border border-border bg-card items-start sm:items-center justify-between shadow-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-foreground truncate mb-0.5">
                        Folio: {lote.folio || 'LEGACY-LOT'}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(lote.date_received).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-border/50 sm:border-0">
                      <div className="text-xs text-muted-foreground flex flex-col items-start sm:items-end">
                        <span>Por: <span className="font-semibold text-foreground">{lote.user?.first_name} {lote.user?.last_name}</span></span>
                        {lote.location && (
                          <span className="mt-0.5">Loc: <span className="font-semibold text-foreground">{lote.location.code}</span></span>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary border-primary/20 text-sm py-1">
                        {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)} <span className="text-[10px] ml-1 font-medium">{lote.material?.base_unit?.code || ''}</span>
                      </Badge>
                    </div>
                  </div>
                ))
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
    </div>
  );
};
