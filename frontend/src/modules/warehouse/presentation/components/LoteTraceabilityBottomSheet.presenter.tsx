import React, { useRef, useState, useEffect } from 'react';
import { X, History, User, MapPin, Package, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';

export interface LoteTraceabilityBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  // State
  lote: any;
  consumptions: any[];
  isLoading: boolean;
  isError: boolean;
}

export const LoteTraceabilityBottomSheetPresenter: React.FC<LoteTraceabilityBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  lote,
  consumptions,
  isLoading,
  isError
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
            <History size={20} className="text-primary" />
            Trazabilidad del Lote
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
          {isLoading ? (
            <div className="flex flex-col gap-6">
              <div className="animate-pulse bg-secondary/50 rounded-xl h-24 w-full border border-border/50" />
              <div className="animate-pulse bg-secondary/50 rounded-xl h-40 w-full border border-border/50" />
            </div>
          ) : isError || !lote ? (
            <div className="flex justify-center py-10 border border-dashed border-destructive/50 rounded-xl bg-destructive/5">
              <span className="text-destructive font-bold text-sm">Ocurrió un error al cargar el lote.</span>
            </div>
          ) : (
            <>
              {/* Lote Info Header */}
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-foreground text-lg leading-tight">{lote.material?.name || 'Material Desconocido'}</h4>
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">Folio: <span className="font-semibold text-foreground">{lote.folio}</span></p>
                  </div>
                  <Badge variant={Number(lote.available_amount) > 0 ? 'primary' : 'secondary'} className={`shrink-0 ${Number(lote.available_amount) === 0 ? 'opacity-70' : ''}`}>
                    {Number(lote.available_amount) > 0 ? 'Activo' : 'Consumido'}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 border-t border-border/50 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Package size={12} /> Inicial
                    </span>
                    <span className="font-bold text-foreground text-base mt-0.5">{Number(lote.initial_amount)}</span>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <ArrowDownRight size={12} /> Disponible
                    </span>
                    <span className="font-bold text-primary text-base mt-0.5">{Number(lote.available_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Traceability Tree */}
              <div>
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" /> Historial de Movimientos
                </h4>
                
                <div className="relative border-l-2 border-border/50 ml-3 space-y-6 mb-4">
                  
                  {/* Root Node: Entry */}
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background shadow-sm" />
                    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <ArrowDownRight size={14} className="text-primary" /> 
                          Ingreso {lote.qr_id ? 'vía Escaneo QR' : 'Manual'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(lote.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground bg-secondary/20 p-2 rounded-lg">
                        <div className="flex items-center gap-1.5 truncate">
                          <User size={12} className="text-muted-foreground/70" /> 
                          <span className="truncate">{lote.user?.first_name} {lote.user?.last_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="text-muted-foreground/70" /> 
                          <span className="truncate">{lote.location?.code}</span>
                        </div>
                      </div>
                      <div className="mt-3 text-sm font-medium">
                        Cantidad ingresada: <span className="font-bold text-primary ml-1">+{Number(lote.initial_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Child Nodes: Consumptions */}
                  {consumptions.map((consumption: any, idx: number) => {
                    const item = consumption.items?.[0] || consumption; 
                    const qty = item.quantity;
                    const date = consumption.created_at || consumption.date;
                    const user = consumption.user;
                    
                    return (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-destructive rounded-full -left-[7px] top-1.5 ring-4 ring-background shadow-sm" />
                        <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <ArrowUpRight size={14} className="text-destructive" /> 
                              Consumo de Material
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(date).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground bg-secondary/20 p-2 rounded-lg">
                            <div className="flex items-center gap-1.5 truncate">
                              <User size={12} className="text-muted-foreground/70" /> 
                              <span className="truncate">{user?.first_name} {user?.last_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate" title={`Orden: ${consumption.order_number || 'N/A'}`}>
                              <span className="text-[10px] uppercase font-bold">ORD:</span>
                              <span className="truncate">{consumption.order_number || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-sm font-medium">
                            Cantidad consumida: <span className="font-bold text-destructive ml-1">-{Number(qty)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {consumptions.length === 0 && (
                    <div className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-muted rounded-full -left-[7px] top-1.5 ring-4 ring-background shadow-sm" />
                      <div className="text-sm text-muted-foreground py-1 font-medium">
                        No se han registrado consumos para este lote aún.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold py-6 rounded-xl">
            Cerrar Trazabilidad
          </Button>
        </div>

      </div>
    </div>
  );
};
