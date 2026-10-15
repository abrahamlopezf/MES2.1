import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, QrCode, Trash2, Package } from 'lucide-react';
import { Button, Input } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';
import { useBottomSheetAnimation } from '../../../../hooks/useBottomSheetAnimation';

export interface ConsumoBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  // State
  orderNumber: string;
  notes: string;
  items: any[];
  isScanning: boolean;
  selectedMaterialId: string;
  materials: any[];
  isSubmitting: boolean;
  totalQuantity: number;
  // Handlers
  onChangeOrderNumber: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onChangeSelectedMaterialId: (val: string) => void;
  onSetIsScanning: (val: boolean) => void;
  onScan: (code: string) => void;
  onAddMaterial: () => void;
  onUpdateItemQuantity: (index: number, val: number) => void;
  onRemoveItem: (index: number) => void;
  onConsume: () => void;
}

export const ConsumoBottomSheetPresenter: React.FC<ConsumoBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  orderNumber,
  notes,
  items,
  isScanning,
  selectedMaterialId,
  materials,
  isSubmitting,
  totalQuantity,
  onChangeOrderNumber,
  onChangeNotes,
  onChangeSelectedMaterialId,
  onSetIsScanning,
  onScan,
  onAddMaterial,
  onUpdateItemQuantity,
  onRemoveItem,
  onConsume
}) => {
  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(isOpen, 400);

  if (!isRendered) return null;

  if (isScanning) {
    return (
      <CameraScanner 
        title="Escanear Material a Consumir"
        onScan={(code) => {
          onSetIsScanning(false);
          onScan(code);
        }}
        onClose={() => onSetIsScanning(false)}
      />
    );
  }

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[95dvh] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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

        {/* Header */}
        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Consumo de Material (Vale de Almacén)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro para vales físicos o salidas manuales de almacén
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 bg-background">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">
                  Número de Vale / Folio <span className="text-destructive">*</span>
                </label>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Auto-generado
                </span>
              </div>
              <Input 
                placeholder="VAL-MNL-202610-001" 
                value={orderNumber}
                onChange={e => onChangeOrderNumber(e.target.value)}
                className="h-12 rounded-xl bg-card shadow-sm font-mono font-bold text-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Folio manual para control y trazabilidad del vale físico.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-foreground">
                SE REQUIERE PARA <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
              </label>
              <Input 
                placeholder="Indica para qué proceso, máquina o motivo se requiere..." 
                value={notes}
                onChange={e => onChangeNotes(e.target.value)}
                className="h-12 rounded-xl bg-card shadow-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Destino o justificación indicada en el vale de papel.
              </p>
            </div>
          </div>

          <div className="border-t border-border/50 pt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-foreground">Materiales a Consumir</h4>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <SearchSelect 
                    options={materials}
                    value={selectedMaterialId}
                    onChange={onChangeSelectedMaterialId}
                    getLabel={(m: any) => m.label || `${m.internal_code} - ${m.name}`}
                    getDescription={(m: any) => m.description || undefined}
                    getValue={(m: any) => m.id.toString()}
                    placeholder="Buscar material con existencia en almacén..."
                    emptyMessage="No hay materiales con existencia en inventario"
                  />
                </div>
                <Button variant="secondary" onClick={() => onSetIsScanning(true)} className="shrink-0 group rounded-xl px-4" title="Escanear QR">
                  <QrCode size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>
                <Button variant="default" onClick={onAddMaterial} className="shrink-0 rounded-xl" disabled={!selectedMaterialId}>
                  <Plus size={18} className="mr-1.5" />
                  <span className="hidden sm:inline">Agregar</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="bg-secondary/10 border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center mt-2">
                <QrCode size={40} className="text-muted-foreground mb-3 opacity-50" />
                <p className="font-bold text-foreground mb-1">No hay materiales agregados</p>
                <p className="text-sm text-muted-foreground">Selecciona un material con existencia o escanea un código QR.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {items.map((item: any, idx) => (
                  <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-sm relative">
                    <div className="flex justify-between items-start">
                      <div className="pr-8">
                        <p className="font-bold text-foreground text-sm">{item.materialName}</p>
                        {item.materialDescription && (
                          <p className="text-xs text-muted-foreground/85 line-clamp-2 mt-0.5">{item.materialDescription}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {item.internalCode && <span className="font-semibold text-primary">{item.internalCode} •</span>}
                          <span>{item.qrCode ? `QR: ${item.qrCode}` : 'Asignación FIFO'}</span>
                          {item.folio && item.folio !== 'N/A' && <span>• Lote/Fac: {item.folio}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Disp: <span className="font-bold text-foreground">{item.maxQuantity} {item.unitCode}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(idx)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-background p-2 rounded-lg border border-border/50">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Consumir:</span>
                      <div className="flex items-center flex-1 justify-end gap-1.5">
                        <Input 
                          type="number" 
                          min="0.1" 
                          max={item.maxQuantity}
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={e => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0;
                            onUpdateItemQuantity(idx, val);
                          }}
                          className="h-10 text-right font-bold text-foreground max-w-[130px]"
                        />
                        {item.unitCode && (
                          <span className="text-xs font-bold text-muted-foreground uppercase px-2 py-1 rounded bg-muted border border-border/50">
                            {item.unitCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-4 sm:pb-4">
          <div className="flex justify-between items-center px-5 py-3 border-b border-border/50 bg-secondary/10">
             <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Items</span>
              <span className="font-bold text-foreground text-base leading-tight">{items.length}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total a consumir</span>
              <span className="font-bold text-foreground text-xl leading-tight">{totalQuantity.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
              Cancelar
            </Button>
            <Button 
              variant="default" 
              onClick={onConsume} 
              disabled={isSubmitting || items.length === 0 || !orderNumber}
              className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
            >
              {isSubmitting ? <><Plus className="animate-spin mr-2" size={18} /> Procesando...</> : 'Confirmar Consumo'}
            </Button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
