import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Icon } from '@/design-system';
import axiosClient from '../../../../api/axiosClient';
import { useAuthStore } from '../../../../store/authStore';
import { downloadConsumptionOrderPdf } from '../../utils/pdfUtils';

export interface PreloadedOdcItem {
  material_id: number;
  req_quantity: number;
  material?: any;
  unit?: any;
  amount?: number;
  isConfirmed?: boolean;
}

export interface CreateConsumptionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: PreloadedOdcItem[];
  initialAreaId?: string | number;
  initialNotes?: string;
  initialOrderMode?: 'SUELTO' | 'FORMULA';
  initialFormulaId?: string | number;
  formulaName?: string;
  onOrderCreated?: (order: any) => void;
}

const getUnitCode = (item: any) => {
  return (
    item.material?.base_unit?.code ||
    item.material?.stock_unit?.code ||
    item.material?.unit?.code ||
    item.material?.unit?.abbreviation ||
    item.unit?.code ||
    item.unit?.abbreviation ||
    ''
  );
};

const sameMaterialId = (left: unknown, right: unknown) =>
  left !== null && left !== undefined && right !== null && right !== undefined && Number(left) === Number(right);

const normalizeMaterialName = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase();

interface DirectMixConsumptionViewProps {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  notes: string;
  setNotes: (val: string) => void;
  inventory: any[];
  formulaName?: string;
  removeItem: (id: number) => void;
  addItem: (inv: any) => void;
  onClose: () => void;
  submitting: boolean;
  totalRequestedKg: number;
}

const DirectMixConsumptionView: React.FC<DirectMixConsumptionViewProps> = ({
  items,
  setItems,
  notes,
  setNotes,
  inventory,
  formulaName,
  removeItem,
  addItem,
  onClose,
  submitting,
  totalRequestedKg
}) => {
  const [showExtraSearch, setShowExtraSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredInventory = inventory.filter(inv => 
    inv.material?.name?.toLowerCase().includes(search.toLowerCase()) || 
    inv.material?.internal_code?.toLowerCase().includes(search.toLowerCase()) ||
    inv.material?.material_code?.toLowerCase().includes(search.toLowerCase()) ||
    inv.material?.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {/* Context banner de fórmula */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Icon name="science" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                Fórmula en Preparación
              </div>
              <div className="text-sm font-black text-foreground truncate">
                {formulaName || 'Fórmula de Extrusión'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-md bg-background border border-border text-foreground/80 font-bold">
              Batch: 500 KG
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-bold">
              Piso WIP Mezcla
            </span>
          </div>
        </div>

        {/* Encabezado de la lista de insumos */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Icon name="inventory_2" size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Insumos a Solicitar ({items.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowExtraSearch(!showExtraSearch)}
            className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
          >
            <Icon name={showExtraSearch ? "close" : "add"} size={15} />
            <span>{showExtraSearch ? 'Cerrar Buscador' : '+ Agregar Insumo Extra'}</span>
          </button>
        </div>

        {/* Buscador opcional para agregar otro insumo */}
        {showExtraSearch && (
          <div className="p-3 rounded-xl border border-border bg-muted/20 relative animate-in fade-in duration-150">
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
              Buscar material en almacén para agregar a la orden
            </label>
            <div className="relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar material por nombre o código..." 
                className="w-full !pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs sm:text-sm text-foreground focus:border-primary outline-none transition-colors"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoFocus
              />
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-[110] p-1 custom-scrollbar">
                {filteredInventory.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No se encontraron materiales en almacén
                  </div>
                ) : (
                  filteredInventory.map(inv => {
                    const isAdded = items.some(i => i.material_id === inv.material_id);
                    const unitCode = getUnitCode(inv);
                    return (
                      <div
                        key={inv.material_id}
                        onClick={() => {
                          if (!isAdded) {
                            addItem(inv);
                            setSearch('');
                            setShowDropdown(false);
                            setShowExtraSearch(false);
                          }
                        }}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isAdded ? 'opacity-50 pointer-events-none bg-muted/20' : 'hover:bg-primary/10'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-foreground truncate">{inv.material?.name}</div>
                          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-primary font-semibold">
                              {inv.material?.internal_code || inv.material?.material_code}
                            </span>
                            <span>•</span>
                            <span>Stock: {Number(inv.amount)} {unitCode}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isAdded}
                          className="px-2 py-1 rounded bg-primary text-primary-foreground font-bold text-[10px]"
                        >
                          {isAdded ? 'Agregado' : 'Seleccionar'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista de insumos en tabla/tarjetas compactas con edición directa */}
        {items.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/10">
            <Icon name="inventory_2" size={32} className="text-muted-foreground/40 mb-2" />
            <span className="text-muted-foreground text-xs sm:text-sm">
              No hay insumos en esta orden.<br />Usa el botón "+ Agregar Insumo Extra" arriba.
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map(item => {
              const unitCode = getUnitCode(item) || 'KG';
              const availableWarehouse = Number(item.amount) || 0;
              const reqQty = Number(item.req_quantity) || 0;
              const hasInsufficientStock = availableWarehouse < reqQty;
              const isZeroStock = availableWarehouse <= 0;
              const itemName = normalizeMaterialName(item.material?.name);
              const sameNameOtherCodes = itemName
                ? inventory.filter((inv: any) =>
                    !sameMaterialId(inv.material_id, item.material_id) &&
                    normalizeMaterialName(inv.material?.name) === itemName
                  )
                : [];

              return (
                <div 
                  key={item.material_id}
                  className="p-3 sm:p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {item.material?.internal_code || item.material?.material_code || `MAT-${item.material_id}`}
                      </span>
                      <span className="font-bold text-foreground text-sm truncate">
                        {item.material?.name}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase px-1.5 py-0.2 rounded bg-muted border border-border/60">
                        {unitCode}
                      </span>
                    </div>

                    {item.material?.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {item.material?.description}
                      </div>
                    )}

                    <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">Almacén Central:</span>
                      <span className={`font-bold px-2 py-0.2 rounded text-[11px] ${
                        isZeroStock 
                          ? 'bg-destructive/15 text-destructive border border-destructive/20 font-black' 
                          : hasInsufficientStock
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {availableWarehouse} {unitCode}
                      </span>
                      {hasInsufficientStock && (
                        <span className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                          <Icon name="warning" size={13} />
                          {isZeroStock ? 'Sin existencias en almacén' : 'Stock en almacén menor a lo requerido'}
                        </span>
                      )}
                    </div>
                    {isZeroStock && sameNameOtherCodes.length > 0 && (
                      <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                        Hay material con el mismo nombre en almacén, pero con otro código ({sameNameOtherCodes
                          .map((inv: any) => inv.material?.internal_code || inv.material?.material_code || `MAT-${inv.material_id}`)
                          .join(', ')}). El sistema no lo considera disponible para esta fórmula porque es otro registro de catálogo. Verifica el material enlazado a la fórmula.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        A Solicitar
                      </span>
                      <div className="flex items-center bg-background border-2 border-border focus-within:border-primary rounded-lg overflow-hidden shadow-xs transition-colors">
                        <input 
                          type="number" 
                          min="0.01" 
                          step="any"
                          value={item.req_quantity === 0 ? '' : item.req_quantity}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val < 0) val = Math.abs(val);
                            setItems(items.map(it => it.material_id === item.material_id ? { ...it, req_quantity: val } : it));
                          }}
                          className="w-24 sm:w-28 px-2.5 py-1.5 bg-transparent text-sm sm:text-base outline-none font-black text-center text-primary"
                        />
                        <span className="px-2.5 py-1.5 bg-muted/40 border-l border-border text-xs text-foreground font-bold select-none pointer-events-none">
                          {unitCode}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="button"
                        onClick={() => removeItem(item.material_id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title="Quitar de la solicitud"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Justificación compacta */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Se Requiere Para (Justificación)
          </label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Especifica el motivo, máquina o justificación del consumo..."
            rows={2}
            className="w-full px-3.5 py-2 bg-muted/10 border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none resize-none leading-relaxed"
          />
        </div>

        {/* FIFO notice */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-info/10 text-info text-xs rounded-lg border border-info/20">
          <Icon name="info" size={16} className="shrink-0" />
          <p className="m-0 font-medium">
            El almacén apartará los lotes por FIFO. Al surtir la orden, los insumos ingresarán automáticamente al piso WIP de Extrusión con su QR Hijo (-SN).
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div>
            Total Solicitado: <strong className="text-foreground text-sm font-black">{totalRequestedKg.toFixed(2)} KG</strong>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div>
            {items.length} {items.length === 1 ? 'material' : 'materiales'}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={onClose}
            className="h-10 px-4 sm:px-5 bg-background border border-border text-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={submitting || items.length === 0 || items.some(i => !i.req_quantity || i.req_quantity <= 0)}
            className="h-10 px-5 sm:px-6 bg-primary text-primary-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
          >
            <Icon name="check_circle" size={17} />
            <span>{submitting ? 'Generando...' : `Generar Orden (${items.length})`}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export const CreateConsumptionOrderModal: React.FC<CreateConsumptionOrderModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  initialAreaId,
  initialNotes,
  initialOrderMode,
  initialFormulaId,
  formulaName,
  onOrderCreated
}) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showExtraSearch, setShowExtraSearch] = useState(false);

  const isDirectMix = Boolean(initialItems && initialItems.length > 0);
  const totalRequestedKg = items.reduce((sum, item) => sum + (Number(item.req_quantity) || 0), 0);

  // Modo de Solicitud: Por Fórmula (500kg) o Materiales Sueltos (Manual)
  const [orderMode, setOrderMode] = useState<'SUELTO' | 'FORMULA'>('SUELTO');
  const [formulas, setFormulas] = useState<any[]>([]);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [loadingFormulas, setLoadingFormulas] = useState(false);
  
  const getUnitCode = (item: any) => {
    return (
      item.material?.base_unit?.code ||
      item.material?.stock_unit?.code ||
      item.material?.unit?.code ||
      item.material?.unit?.abbreviation ||
      item.unit?.code ||
      item.unit?.abbreviation ||
      ''
    );
  };

  const filteredInventory = inventory.filter(inv => 
    inv.material?.name?.toLowerCase().includes(search.toLowerCase()) || 
    inv.material?.internal_code?.toLowerCase().includes(search.toLowerCase()) ||
    inv.material?.material_code?.toLowerCase().includes(search.toLowerCase()) ||
    inv.material?.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  const [submitting, setSubmitting] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const { user } = useAuthStore() as any;
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    initialAreaId ? String(initialAreaId) : (user?.area?.id?.toString() || '')
  );

  // Reglas de acceso: Solo SUPERADMIN, ADMIN_GRAL o usuarios con área Extrusión pueden solicitar Por Fórmula
  const userRole = (
    typeof user?.role === 'string'
      ? user.role
      : (user?.role?.code || user?.role?.name || '')
  ).toUpperCase();

  const isSuperAdmin = userRole === 'SUPERADMIN';
  const isAdminGral = userRole === 'ADMIN_GRAL' || userRole === 'ADMIN_GENERAL';

  const userAreaName = (user?.area?.name || '').toUpperCase();
  const userAreaCode = (user?.area?.code || '').toUpperCase();

  const hasExtrusionAreaAssigned =
    user?.area_id === 2 ||
    user?.area?.id === 2 ||
    userAreaCode === 'EXTRUSION' ||
    userAreaName.includes('EXTRUSI');

  const selectedAreaObj = areas.find((a: any) => a.id.toString() === selectedAreaId);
  const isSelectedAreaExtrusion = Boolean(
    selectedAreaId === '2' ||
    (selectedAreaObj && (
      selectedAreaObj.id === 2 ||
      selectedAreaObj.code?.toUpperCase() === 'EXTRUSION' ||
      selectedAreaObj.name?.toUpperCase().includes('EXTRUSI')
    ))
  );

  const canUseFormulaMode = isSuperAdmin || isAdminGral || hasExtrusionAreaAssigned || isSelectedAreaExtrusion;

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchAreas();

      if (initialAreaId) {
        setSelectedAreaId(String(initialAreaId));
      } else if (user?.area?.id) {
        setSelectedAreaId(user.area.id.toString());
      }

      if (initialNotes !== undefined) {
        setNotes(initialNotes);
      } else {
        setNotes('');
      }

      if (initialOrderMode) {
        setOrderMode(initialOrderMode);
      } else {
        setOrderMode('SUELTO');
      }

      if (initialFormulaId) {
        setSelectedFormulaId(String(initialFormulaId));
      } else {
        setSelectedFormulaId('');
      }

      if (initialItems && initialItems.length > 0) {
        const mapped = initialItems.map(initItem => ({
          material_id: initItem.material_id,
          material: initItem.material || { id: initItem.material_id, name: `Material #${initItem.material_id}` },
          // Never invent availability: this value is replaced by the inventory
          // response when a matching material exists.
          amount: initItem.amount !== undefined ? initItem.amount : 0,
          req_quantity: Number(initItem.req_quantity) || 0,
          isConfirmed: initItem.isConfirmed !== undefined ? initItem.isConfirmed : false,
          unit: initItem.unit || { code: 'KG' }
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } else {
      setItems([]);
      setNotes('');
      setSearch('');
      setShowDropdown(false);
      setSelectedFormulaId('');
    }
  }, [isOpen, initialItems, initialAreaId, initialNotes, initialOrderMode, initialFormulaId]);

  useEffect(() => {
    if (isOpen && canUseFormulaMode) {
      if (formulas.length === 0) {
        fetchFormulas();
      }
    } else if (!canUseFormulaMode) {
      setOrderMode('SUELTO');
      setSelectedFormulaId('');
    }
  }, [isOpen, canUseFormulaMode]);

  const fetchFormulas = async () => {
    try {
      setLoadingFormulas(true);
      const res = await axiosClient.get('/extrusion/floor-formulas');
      const data = res.data.data || res.data || [];
      setFormulas(data);
    } catch (err) {
      console.error('Error fetching extrusion formulas:', err);
    } finally {
      setLoadingFormulas(false);
    }
  };

  const handleSelectFormula = (formulaId: string) => {
    setSelectedFormulaId(formulaId);
    if (!formulaId) return;
    const formula = formulas.find((f: any) => f.id.toString() === formulaId);
    if (!formula || !formula.ingredients) return;

    const newItems = formula.ingredients.map((ing: any) => {
      const invMatch = inventory.find((inv: any) => sameMaterialId(inv.material_id, ing.material_id));
      return {
        material_id: ing.material_id,
        material: ing.material || invMatch?.material || { name: `Material #${ing.material_id}` },
        amount: invMatch ? Number(invMatch.amount) || 0 : 0,
        req_quantity: Number(ing.quantity) || 0,
        isConfirmed: false,
        unit: ing.material?.base_unit || invMatch?.material?.base_unit || { code: 'KG' }
      };
    });

    setItems(newItems);
    setNotes(`Batch 500kg - Fórmula: ${formula.name}${formula.code ? ` (${formula.code})` : ''}`);
    toast.success(`Fórmula "${formula.name}" seleccionada. ${formula.ingredients.length} insumos precargados.`);
  };

  const fetchAreas = async () => {
    try {
      const res = await axiosClient.get('/areas');
      const allAreas = res.data.data || res.data;
      setAreas(allAreas.filter((a: any) => a.is_active !== false));
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/warehouse/inventory');
      const data = res.data.data || res.data;
      const invList = data.items || data || [];
      setInventory(invList);

      // Sincronizar items precargados con datos de almacén si ya existen
      setItems(prevItems => prevItems.map(item => {
        const match = invList.find((inv: any) => sameMaterialId(inv.material_id, item.material_id));
        if (match) {
          return {
            ...item,
            amount: match.amount !== undefined ? match.amount : item.amount,
            material: { ...match.material, ...item.material },
            unit: match.material?.base_unit || item.unit
          };
        }
        return item;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (invItem: any) => {
    if (items.find(i => i.material_id === invItem.material_id)) return;
    setItems([...items, { ...invItem, req_quantity: 1, isConfirmed: false }]);
  };

  const updateItemQty = (material_id: number, qty: number) => {
    setItems(items.map(i => {
      if (i.material_id === material_id) {
        const maxAmount = Number(i.amount) || 0;
        if (maxAmount > 0 && qty > maxAmount) {
          toast.warning(`Stock insuficiente en almacén. Solo hay ${maxAmount} disponibles para ${i.material?.name}.`);
          return { ...i, req_quantity: maxAmount };
        }
        return { ...i, req_quantity: qty };
      }
      return i;
    }));
  };

  const toggleConfirmItem = (material_id: number) => {
    setItems(items.map(i => {
      if (i.material_id === material_id) {
        if (!i.isConfirmed && (!i.req_quantity || i.req_quantity <= 0)) {
          toast.error(`La cantidad debe ser mayor a 0 para ${i.material?.name}`);
          return i;
        }
        return { ...i, isConfirmed: !i.isConfirmed };
      }
      return i;
    }));
  };

  const removeItem = (material_id: number) => {
    setItems(items.filter(i => i.material_id !== material_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (items.length === 0) {
      toast.warning('Debes agregar al menos un material');
      return;
    }
    
    // Validate quantities
    for (const item of items) {
      if (!item.req_quantity || item.req_quantity <= 0) {
        toast.warning(`La cantidad para ${item.material?.name || 'el material'} debe ser mayor a 0`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const areaIdToSubmit = selectedAreaId 
        ? parseInt(selectedAreaId) 
        : (initialAreaId ? parseInt(String(initialAreaId)) : (user?.area?.id || 2));
      
      if (!areaIdToSubmit) {
        setSubmitting(false);
        toast.error('Por favor selecciona un área solicitante');
        return;
      }

      const payload = {
        requesting_area_id: areaIdToSubmit,
        notes,
        items: items.map(i => ({
          material_id: i.material_id,
          quantity: i.req_quantity
        }))
      };

      const res = await axiosClient.post('/warehouse/consumption-orders', payload);
      const orderId = res.data.uuid;
      
      toast.success(`Orden de consumo ${res.data.order_number} creada exitosamente.`);
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
      toast.info('Generando PDF...');

      try {
        // Fetch full order to print
        const orderRes = await axiosClient.get(`/warehouse/consumption-orders/${orderId}`);
        await downloadConsumptionOrderPdf(orderRes.data);
        toast.success('PDF descargado exitosamente.');
      } catch (pdfErr) {
        console.error('Error generating PDF:', pdfErr);
        toast.error('Ocurrió un error al generar el PDF.');
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Error creando orden');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-sm overflow-hidden">
      <div className={`bg-card w-full ${isDirectMix ? 'max-w-4xl max-h-[86vh]' : 'max-w-5xl max-h-[calc(100dvh-2.5rem)]'} rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-border bg-primary/5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {isDirectMix ? 'Orden de Consumo — Mezcla Extrusión' : 'Nueva Orden de Consumo'}
              </h2>
              {isDirectMix && (
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Extrusión (WIP)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isDirectMix 
                ? 'Solicitar insumos al almacén central para preparación de mezcla' 
                : 'Solicitar materiales al almacén'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground flex items-center justify-center cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-background">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
            }} 
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            {isDirectMix ? (
              <DirectMixConsumptionView
                items={items}
                setItems={setItems}
                notes={notes}
                setNotes={setNotes}
                inventory={inventory}
                formulaName={formulaName}
                removeItem={removeItem}
                addItem={addItem}
                onClose={onClose}
                submitting={submitting}
                totalRequestedKg={totalRequestedKg}
              />
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              
              {/* Selector de Área si no tiene una asignada */}
              {!user?.area?.id && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-foreground mb-2">Área Solicitante</label>
                  <select 
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-colors shadow-sm"
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona el área que solicita el material...</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector de Modo: Por Fórmula (500kg) vs Materiales Sueltos - Solo disponible para SUPERADMIN, ADMIN_GRAL o Área Extrusión */}
              {canUseFormulaMode && (
                <div className="mb-6 p-4 rounded-xl border border-border bg-muted/20">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Modalidad de Solicitud de Consumo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderMode('FORMULA');
                        if (formulas.length === 0) fetchFormulas();
                      }}
                      className={`py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                        orderMode === 'FORMULA'
                          ? 'bg-primary text-primary-foreground shadow font-bold ring-2 ring-primary/40'
                          : 'bg-background hover:bg-muted text-foreground border border-border'
                      }`}
                    >
                      <Icon name="science" size={18} />
                      Por Fórmula (Mezcla 500kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderMode('SUELTO')}
                      className={`py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                        orderMode === 'SUELTO'
                          ? 'bg-primary text-primary-foreground shadow font-bold ring-2 ring-primary/40'
                          : 'bg-background hover:bg-muted text-foreground border border-border'
                      }`}
                    >
                      <Icon name="inventory_2" size={18} />
                      Materiales Sueltos (Manual)
                    </button>
                  </div>

                  {orderMode === 'FORMULA' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Seleccionar Fórmula Registrada
                      </label>
                      <select
                        value={selectedFormulaId}
                        onChange={(e) => handleSelectFormula(e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:border-primary outline-none transition-colors shadow-sm"
                      >
                        <option value="">-- Elige una fórmula para precargar materiales (500kg) --</option>
                        {formulas.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name} {f.code ? `(${f.code})` : ''} — Batch: {f.batch_size_kg || 500}kg ({f.ingredients?.length || 0} insumos)
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-2">
                        Al seleccionar la fórmula, se precargan automáticamente los insumos y proporciones exactas para el batch de 500kg en Extrusión.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown Buscador */}
              <div className="mb-6 relative">
                <label className="block text-sm font-semibold text-foreground mb-2">Buscar y agregar material</label>
                <div className="relative">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre o código..." 
                    className="w-full !pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none transition-colors shadow-sm"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {search && (
                    <button 
                      type="button"
                      onClick={() => { setSearch(''); setShowDropdown(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>

                {/* Resultados del dropdown */}
                {showDropdown && (
                  <div className="absolute z-[110] top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Cargando inventario...</div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron materiales.</div>
                    ) : (
                      filteredInventory.map(inv => {
                        const unitCode = getUnitCode(inv);
                        return (
                          <div 
                            key={inv.material_id} 
                            className="p-3 border-b border-border hover:bg-muted/30 cursor-pointer flex justify-between items-center transition-colors"
                            onClick={() => {
                              addItem(inv);
                              setSearch('');
                              setShowDropdown(false);
                            }}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-bold text-foreground text-sm">{inv.material?.name}</div>
                              {inv.material?.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {inv.material?.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-semibold text-primary">{inv.material?.internal_code || inv.material?.material_code}</span>
                                {inv.material?.ranking?.name && (
                                  <>
                                    <span>-</span>
                                    <span>{inv.material?.ranking?.name}</span>
                                  </>
                                )}
                                {unitCode && (
                                  <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-bold text-foreground/80 border border-border/50 uppercase">
                                    {unitCode}
                                  </span>
                                )}
                                <span className="text-[11px] font-medium text-foreground/70">
                                  (Disp: {Number(inv.amount)} {unitCode})
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              {items.some(i => i.material_id === inv.material_id) && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AGREGADO</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                
                {/* Overlay invisible para cerrar el dropdown al hacer click fuera */}
                {showDropdown && (
                  <div className="fixed inset-0 z-[105]" onClick={() => setShowDropdown(false)}></div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Icon name="inventory_2" size={16} className="text-primary"/> Materiales Seleccionados ({items.length})
                </h3>
                {items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setItems(items.map(i => ({ ...i, isConfirmed: true })))}
                      className="text-[11px] text-muted-foreground hover:text-primary font-medium flex items-center gap-1 transition-colors"
                    >
                      <Icon name="done_all" size={14} />
                      Fijar todos
                    </button>
                    <span className="text-muted-foreground/40">|</span>
                    <button
                      type="button"
                      onClick={() => setItems(items.map(i => ({ ...i, isConfirmed: false })))}
                      className="text-[11px] text-muted-foreground hover:text-primary font-medium flex items-center gap-1 transition-colors"
                    >
                      <Icon name="edit" size={14} />
                      Editar todos
                    </button>
                  </div>
                )}
              </div>
              
              {items.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <Icon name="inventory_2" size={40} className="text-muted-foreground/40 mb-3" />
                  <span className="text-muted-foreground text-sm">Busca un material arriba<br/>para agregarlo a la orden.</span>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {items.map(item => {
                    const unitCode = getUnitCode(item);
                    return (
                      <div key={item.material_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/5 relative">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-foreground text-sm truncate">{item.material?.name}</div>
                          {item.material?.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.material?.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            <span>{item.material?.internal_code || item.material?.material_code || 'S/C'}</span>
                            {item.material?.ranking?.name && (
                              <>
                                <span>-</span>
                                <span>{item.material?.ranking?.name}</span>
                              </>
                            )}
                            {unitCode && (
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider border border-primary/20">
                                {unitCode}
                              </span>
                            )}
                          </div>
                          {Number(item.amount) > 0 && (
                            <div className="text-xs text-muted-foreground/80 mt-1">
                              Disponible en Almacén: <strong className="text-foreground">{Number(item.amount)} {unitCode}</strong>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          {!item.isConfirmed ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-background border border-border rounded-lg focus-within:border-primary overflow-hidden shadow-sm transition-colors">
                                <input 
                                  type="number" 
                                  min="0.01" 
                                  max={Number(item.amount) > 0 ? Number(item.amount) : undefined}
                                  step="any"
                                  value={item.req_quantity === 0 ? '' : item.req_quantity}
                                  onChange={(e) => {
                                    let val = parseFloat(e.target.value);
                                    if (isNaN(val)) val = 0;
                                    if (val < 0) val = Math.abs(val);
                                    updateItemQty(item.material_id, val);
                                  }}
                                  className="w-20 sm:w-24 px-2.5 py-1.5 bg-transparent text-sm outline-none font-bold text-center text-primary"
                                />
                                {unitCode && (
                                  <span className="px-2 py-1 bg-muted/40 border-l border-border text-xs text-muted-foreground font-bold uppercase select-none pointer-events-none">
                                    {unitCode}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleConfirmItem(item.material_id)}
                                className="p-1.5 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors shadow-sm flex items-center justify-center"
                                title="Fijar cantidad"
                              >
                                <Icon name="check" size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeItem(item.material_id)}
                                className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm flex items-center justify-center"
                                title="Eliminar material"
                              >
                                <Icon name="delete" size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                              <div className="text-sm font-black text-primary flex items-center gap-1.5">
                                <span>{item.req_quantity}</span>
                                {unitCode && (
                                  <span className="text-xs text-muted-foreground font-bold uppercase px-1.5 py-0.5 rounded bg-muted border border-border/40">
                                    {unitCode}
                                  </span>
                                )}
                              </div>
                              <div className="w-px h-4 bg-border"></div>
                              <button
                                type="button"
                                onClick={() => toggleConfirmItem(item.material_id)}
                                className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                                title="Editar cantidad"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <div className="w-px h-4 bg-border"></div>
                              <button 
                                type="button"
                                onClick={() => removeItem(item.material_id)}
                                className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                                title="Eliminar material"
                              >
                                <Icon name="delete" size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 border-t border-border pt-6">
                <label className="block text-sm font-semibold text-foreground mb-2">SE REQUIERE PARA</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Especifica el motivo, máquina, proceso o justificación del consumo..."
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary outline-none resize-none h-24"
                />
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-muted/5 shrink-0">
              <div className="flex items-center gap-2.5 mb-3 px-3 py-2 bg-info/10 text-info text-xs rounded-lg border border-info/20">
                <Icon name="info" size={16} className="shrink-0" />
                <p className="m-0 font-medium">El sistema apartará automáticamente los lotes utilizando el método FIFO (Primeras Entradas, Primeras Salidas).</p>
              </div>
              <div className="flex gap-2.5 justify-end">
                <button 
                  type="button"
                  onClick={onClose}
                  className="h-10 px-5 bg-background border border-border text-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitting || items.length === 0 || items.some(i => !i.req_quantity || i.req_quantity <= 0)}
                  className="h-10 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? 'Creando...' : 'Generar Orden'}
                </button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>

      </div>
    </div>,
    document.body
  );
};
