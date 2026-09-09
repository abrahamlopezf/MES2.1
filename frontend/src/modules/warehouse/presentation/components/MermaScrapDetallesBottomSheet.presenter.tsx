import React, { useRef, useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, PackageOpen, FileText } from 'lucide-react';
import { Badge, Button } from '../../../../design-system';

export interface MermaScrapDetallesBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  // State
  details: any[];
  isLoading: boolean;
}

export const MermaScrapDetallesBottomSheetPresenter: React.FC<MermaScrapDetallesBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  details,
  isLoading
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
          <div>
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <PackageOpen size={20} className="text-primary" />
              Historial de Merma y Scrap
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium tracking-wide">Registros de bajas asociados a este material.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 bg-background">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <div className="animate-pulse bg-secondary/50 rounded-xl h-32 w-full border border-border/50" />
              <div className="animate-pulse bg-secondary/50 rounded-xl h-32 w-full border border-border/50" />
            </div>
          ) : details.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-secondary/10 border border-dashed border-border rounded-xl">
              <PackageOpen size={40} className="mb-2 opacity-50" />
              <span className="font-bold text-foreground">Sin registros</span>
              <span className="text-sm">No hay registros detallados disponibles.</span>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/50 space-y-5 my-2">
              {details.map((movement: any) => (
                <div key={movement.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-card shadow-sm ${
                    movement.type === 'MERMA' ? 'bg-warning' : 'bg-destructive'
                  }`} />
                  
                  <div className="bg-card shadow-sm rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-bold ${movement.type === 'MERMA' ? 'text-warning border-warning/30 bg-warning/10' : 'text-destructive border-destructive/30 bg-destructive/10'}`}>
                          {movement.type}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {Math.abs(Number(movement.quantity_change)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded-md">
                        <Calendar size={12} />
                        <span>{new Date(movement.created_at || movement.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-border/50">
                      {(() => {
                        const notes = movement.notes || '';
                        const facturasMatch = notes.match(/Facturas afectadas: (.*?)\. Motivo:/);
                        const motivoMatch = notes.match(/Motivo: (.*?)\. Notas:/);
                        const notasMatch = notes.match(/Notas: (.*)/);

                        if (facturasMatch && motivoMatch) {
                          const facturas = facturasMatch[1].split(',').map((f: string) => f.trim()).filter(Boolean);
                          const userNotes = notasMatch ? notasMatch[1].trim() : '';
                          return (
                            <div className="flex flex-col gap-3">
                              {userNotes && (
                                <div className="flex items-start gap-2 text-sm bg-secondary/10 p-2 rounded-lg">
                                  <FileText size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground italic leading-tight">{userNotes}</span>
                                </div>
                              )}
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Facturas afectadas</span>
                                  <div className="flex flex-wrap gap-2">
                                    {facturas.map((fac: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="font-mono text-xs bg-card border-border px-2 py-0.5 shadow-sm">
                                        {fac}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-start gap-2 text-sm bg-secondary/10 p-2 rounded-lg">
                            <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-muted-foreground italic leading-tight">
                              {notes || 'Sin descripción'}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-2 text-[11px] font-medium mt-1">
                        <User size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          {movement.user ? `${movement.user.first_name} ${movement.user.last_name}` : 'Sistema'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold py-6 rounded-xl">
            Cerrar Detalles
          </Button>
        </div>

      </div>
    </div>
  );
};
