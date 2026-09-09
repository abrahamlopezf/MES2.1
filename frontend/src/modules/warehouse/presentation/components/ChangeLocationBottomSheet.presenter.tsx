import React, { useRef, useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../../../design-system';

export interface ChangeLocationBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  // State
  lotes: any[];
  newLocationId: string;
  locations: any[];
  loadingLocations: boolean;
  isSubmitting: boolean;
  isSameLocationForAll: boolean;
  // Handlers
  onChangeLocationId: (val: string) => void;
  onChangeLocation: () => void;
}

export const ChangeLocationBottomSheetPresenter: React.FC<ChangeLocationBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  lotes,
  newLocationId,
  locations,
  loadingLocations,
  isSubmitting,
  isSameLocationForAll,
  onChangeLocationId,
  onChangeLocation
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 400); 
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
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[90dvh] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isOpen && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            Cambiar Localidad
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 bg-background">
          <div className="flex flex-col gap-4">
            
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lotes Seleccionados</span>
                <span className="font-bold text-primary text-base bg-primary/10 px-2 py-0.5 rounded-md">{lotes.length} lote(s)</span>
              </div>
              
              {lotes.length === 1 && (
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Localidad Actual</span>
                  <span className="font-bold text-foreground">{lotes[0].location ? lotes[0].location.code : 'Sin asignar'}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="text-sm font-bold text-foreground ml-1">Nueva Localidad *</label>
              
              {loadingLocations ? (
                <div className="animate-pulse bg-secondary/50 rounded-xl h-12 w-full border border-border/50" />
              ) : (
                <select
                  className="flex h-12 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  value={newLocationId}
                  onChange={(e) => onChangeLocationId(e.target.value)}
                  disabled={loadingLocations}
                >
                  <option value="" disabled className="bg-background text-foreground">Seleccione localidad...</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id} className="bg-background text-foreground">{loc.name} ({loc.code})</option>
                  ))}
                </select>
              )}
              
              {lotes.length === 1 && isSameLocationForAll && (
                <p className="text-xs text-warning mt-1 ml-1 font-medium">El lote ya se encuentra en esta localidad.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={onChangeLocation} 
            disabled={isSubmitting || !newLocationId || (lotes.length === 1 && isSameLocationForAll)}
            className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
          >
            {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={18} /> Procesando...</> : 'Guardar Cambio'}
          </Button>
        </div>
      </div>
    </div>
  );
};
