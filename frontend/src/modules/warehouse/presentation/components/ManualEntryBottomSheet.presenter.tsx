import React from 'react';
import { createPortal } from 'react-dom';
import { X, PackagePlus, Loader2, Plus, Trash2, Sparkles } from 'lucide-react';
import { useBottomSheetAnimation } from '../../../../hooks/useBottomSheetAnimation';
import { Button } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';
import { TFSelect } from '../../../../components/tf-ui';

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

  const selectedMaterialObj = materials?.find(m => String(m.id) === String(materialId));

  if (!isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end overflow-x-hidden max-w-[100vw] transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full max-w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[95dvh] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
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
        <div className="p-3.5 sm:p-5 pb-12 overflow-y-auto overflow-x-hidden flex-1 flex flex-col gap-6 bg-background w-full max-w-full">
          <div className="flex flex-col gap-5">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground ml-1">Material *</label>
              <SearchSelect
                options={materials}
                value={materialId}
                onChange={onChangeMaterialId}
                getLabel={(mat: any) => {
                  const loc = mat.default_location?.code || mat.default_location?.name || '';
                  return loc ? `${mat.internal_code || mat.code} - ${mat.name} [Loc: ${loc}]` : `${mat.internal_code || mat.code} - ${mat.name}`;
                }}
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
                  <div key={index} className="flex flex-col gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border shadow-sm w-full min-w-0 max-w-full overflow-hidden">
                    {/* Header del lote / entrada */}
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Renglón #{index + 1}
                      </span>
                      {entries.length > 1 && (
                        <button 
                          type="button"
                          className="p-1 -mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          onClick={() => onRemoveEntry(index)}
                          title="Eliminar entrada"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Fila 1: Folio y Cantidad */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">Folio</label>
                        <input 
                          type="text"
                          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner min-w-0"
                          placeholder="Ej. FAC-001"
                          value={entry.folio}
                          onChange={e => onUpdateEntry(index, 'folio', e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                          Cantidad {selectedMaterialObj ? `(${selectedMaterialObj.unit_measure || 'U'})` : ''} *
                        </label>
                        <input 
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner min-w-0"
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
                    </div>
                    
                    {/* Fila 2: Costo Unitario */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Costo Unitario *</label>
                        <span className="text-[10px] font-medium text-muted-foreground">Moneda local ($)</span>
                      </div>
                      <input 
                        type="number"
                        min="0"
                        step="0.0001"
                        className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-inner min-w-0"
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

                    {/* Fila 3: Proveedor (Full width para no truncar la Razón Social) */}
                    <div className="flex flex-col gap-1 w-full min-w-0 max-w-full pt-0.5 overflow-hidden">
                      <TFSelect
                        label="Proveedor (Opcional)"
                        hint="Razón Social"
                        name={`supplier_${index}`}
                        placeholder="Ej. DISTRIBUIDORA INDUSTRIAL S.A. DE C.V."
                        searchPlaceholder="Buscar o registrar Razón Social..."
                        value={entry.supplier_id}
                        onChange={(e: any) => onUpdateEntry(index, 'supplier_id', e.target.value)}
                        options={suppliers.map((s: any) => ({
                          value: String(s.id),
                          label: `${s.code} - ${s.name}`
                        }))}
                        allowCreate={true}
                        createLabel="Registrar Razón Social"
                        helperText={!entry.supplier_id?.startsWith('NEW:') ? "Indica la Razón Social según factura" : undefined}
                        containerClassName="w-full min-w-0 max-w-full"
                      />
                      {entry.supplier_id?.startsWith('NEW:') && (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                          <Sparkles size={11} className="text-amber-500 shrink-0" />
                          <span className="truncate">Nueva Razón Social: <strong>{entry.supplier_id.replace('NEW:', '')}</strong></span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AVISO PREVIO SI HAY PROVEEDORES NUEVOS */}
            {entries.some(e => e.supplier_id?.startsWith('NEW:')) && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold block text-foreground">
                    Se creará un nuevo proveedor automáticamente
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                    Al registrar este ingreso, los proveedores marcados como nuevos se crearán en la base de datos. Recuerda ingresar al subcatálogo de Proveedores para completar la información técnica y fiscal.
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              <label className="text-sm font-bold text-foreground ml-1">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-none"
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
