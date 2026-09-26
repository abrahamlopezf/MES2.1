import React from 'react';
import { createPortal } from 'react-dom';
import { X, PackagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { useBottomSheetAnimation } from '../../../../hooks/useBottomSheetAnimation';
import { Button } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';

export interface ManualEntryBottomSheetPresenterProps {
  isOpen: boolean;
  onClose: () => void;
  // State
  materialId: string;
  locationId: string;
  entries: { folio: string; quantity: string; supplier_id: string; unit_cost: string }[];
  notes: string;
  materials: any[];
  loadingMaterials: boolean;
  locations: any[];
  loadingLocations: boolean;
  suppliers: any[];
  loadingSuppliers: boolean;
  isSubmitting: boolean;
  // Handlers
  onChangeMaterialId: (val: string) => void;
  onChangeLocationId: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onAddEntry: () => void;
  onUpdateEntry: (index: number, field: string, value: string) => void;
  onRemoveEntry: (index: number) => void;
  onConfirmEntry: () => void;
}

export const ManualEntryBottomSheetPresenter: React.FC<ManualEntryBottomSheetPresenterProps> = ({
  isOpen,
  onClose,
  materialId,
  locationId,
  entries,
  notes,
  materials,
  loadingMaterials,
  locations,
  loadingLocations,
  suppliers,
  loadingSuppliers,
  isSubmitting,
  onChangeMaterialId,
  onChangeLocationId,
  onChangeNotes,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onConfirmEntry
}) => {
  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(isOpen, 400);

  if (!isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
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
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <PackagePlus size={20} />
            Ingreso Manual (Lote Virtual)
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 bg-background">
          <div className="flex flex-col gap-5">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground ml-1">Material *</label>
              <SearchSelect
                options={materials}
                value={materialId}
                onChange={onChangeMaterialId}
                getLabel={(mat: any) => `${mat.internal_code} - ${mat.name}`}
                getValue={(mat: any) => mat.id.toString()}
                placeholder="Seleccionar material..."
                loading={loadingMaterials}
                searchable={true}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground ml-1">Localidad *</label>
              <SearchSelect
                options={locations}
                value={locationId}
                onChange={onChangeLocationId}
                getLabel={(loc: any) => `${loc.code} - ${loc.description || loc.name}`}
                getValue={(loc: any) => loc.id.toString()}
                placeholder="Seleccionar localidad..."
                loading={loadingLocations}
                searchable={true}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-border/50 pt-5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Entradas (Folio [Opcional] y Cantidad) *</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={onAddEntry}
                  className="rounded-xl bg-card border-border shadow-sm h-8 px-3"
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {entries.map((entry, index) => (
                  <div key={index} className="flex flex-col gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Folio</label>
                        <input 
                          type="text"
                          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
                          placeholder="Ej. FAC-001 (Opcional)"
                          value={entry.folio}
                          onChange={e => onUpdateEntry(index, 'folio', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cantidad *</label>
                        <input 
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
                          placeholder="Ej. 10.00"
                          value={entry.quantity}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => onUpdateEntry(index, 'quantity', e.target.value)}
                        />
                      </div>
                      {entries.length > 1 && (
                        <button 
                          type="button"
                          className="mt-6 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                          onClick={() => onRemoveEntry(index)}
                          title="Eliminar entrada"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Costo Unitario *</label>
                        <input 
                          type="number"
                          min="0"
                          step="0.0001"
                          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
                          placeholder="Ej. 12.50"
                          value={entry.unit_cost}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => onUpdateEntry(index, 'unit_cost', e.target.value)}
                        />
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Proveedor (Opcional)</label>
                        <div className="h-10">
                          <SearchSelect
                            options={suppliers}
                            value={entry.supplier_id}
                            onChange={(val) => onUpdateEntry(index, 'supplier_id', val)}
                            getLabel={(sup: any) => `${sup.code} - ${sup.name}`}
                            getValue={(sup: any) => sup.id.toString()}
                            placeholder="Buscar proveedor..."
                            loading={loadingSuppliers}
                            searchable={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              <label className="text-sm font-bold text-foreground ml-1">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-card px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-none"
                placeholder="Motivo del ingreso manual..."
                value={notes}
                onChange={e => onChangeNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer actions fixed at bottom */}
        <div className="sticky bottom-0 p-4 border-t border-border bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-3 pb-8">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 font-bold py-6 rounded-xl">
            Cancelar
          </Button>
          <Button 
            variant="default" 
            onClick={onConfirmEntry}
            disabled={isSubmitting || !materialId || !locationId || entries.some(e => !e.quantity || Number(e.quantity) <= 0 || e.unit_cost === '' || Number(e.unit_cost) < 0)}
            className="flex-[1.5] font-bold py-6 rounded-xl shadow-md"
          >
            {isSubmitting ? <><Loader2 className="mr-2 animate-spin" size={18} /> Procesando...</> : 'Confirmar Ingreso'}
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
};
