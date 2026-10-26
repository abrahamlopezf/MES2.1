import React from 'react';
import {
  Boxes,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Scale,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Archive,
  Plus,
  DollarSign,
  Pencil,
  Search,
  Check,
  TrendingUp,
  BarChart3,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  PtiRack,
  Formula,
  BackflushingResult,
  ExtruderQueue,
  MassBalanceData,
  ExtrusionValuation,
  PtiProduct
} from '../../types/extrusion.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { ExtrusionShiftClosurePanel } from './ExtrusionShiftClosurePanel';
import { ProductionReconciliationPanel } from './ProductionReconciliationPanel';
import { PtiCatalogPanel } from './PtiCatalogPanel';

export interface PtiIngressPresenterProps {
  racks: PtiRack[];
  formulas: Formula[];
  activeQueues: ExtruderQueue[];
  ptiProducts?: PtiProduct[];
  isLoading: boolean;
  onRefresh: () => void;
  // Form inputs
  mixtureQr: string;
  onMixtureQrChange: (val: string) => void;
  rackQr: string;
  onRackQrChange: (val: string) => void;
  selectedPtiMaterialId: number | '';
  onPtiMaterialIdChange: (val: number | '') => void;
  // Modo de Ingreso: Piezas vs Báscula
  ingressMode: 'PIECES' | 'WEIGHT';
  onIngressModeChange: (val: 'PIECES' | 'WEIGHT') => void;
  quantityPieces: string;
  onQuantityPiecesChange: (val: string) => void;
  scaleWeightKg: string;
  onScaleWeightKgChange: (val: string) => void;
  computedPiecesFromScale: number;
  unitPrice: string;
  onUnitPriceChange: (val: string) => void;
  scrapWeightKg: string;
  onScrapWeightKgChange: (val: string) => void;
  scrapReason: string;
  onScrapReasonChange: (val: string) => void;
  scrapColor: string;
  onScrapColorChange: (val: string) => void;
  shiftCode: string;
  onShiftCodeChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  // Computed validations
  selectedRack: PtiRack | null;
  selectedFormula: Formula | null;
  theoreticalWeightPerPiece: number;
  estimatedRawMaterialConsumedKg: number;
  isCapacityExceeded: boolean;
  isPtiMismatched: boolean;
  mismatchErrorMessage: string;
  // Submitting & Results
  onSubmitIngress: () => void;
  isSubmitting: boolean;
  lastBackflushingResult: BackflushingResult | null;
  massBalance: MassBalanceData | null;
  onSelectRackFromGrid: (rack: PtiRack) => void;
  onSelectQueueFromList: (queue: ExtruderQueue) => void;
  onCreateRack?: (data: { rack_code: string; max_capacity?: number; location_name?: string }) => Promise<void>;
  isCreatingRack?: boolean;
  // Valorización y Edición de Precios
  valuation?: ExtrusionValuation | null;
  canViewCosts: boolean;
  extrusionWip?: { total_kg: number; items: any[]; mixtures?: any[]; mixtures_total_kg?: number; mixtures_total_value?: number } | null;
  costIndex: number;
  onCostIndexChange: (val: number) => void;
  onUpdateRackPrice: (rackId: number, payload: { unit_price?: number; unit_weight_kg?: number | null }) => Promise<void>;
  isUpdatingRackPrice: boolean;
}

export const PtiIngressPresenter: React.FC<PtiIngressPresenterProps> = ({
  racks,
  formulas,
  activeQueues,
  ptiProducts = [],
  isLoading,
  onRefresh,
  mixtureQr,
  onMixtureQrChange,
  rackQr,
  onRackQrChange,
  selectedPtiMaterialId,
  onPtiMaterialIdChange,
  ingressMode,
  onIngressModeChange,
  quantityPieces,
  onQuantityPiecesChange,
  scaleWeightKg,
  onScaleWeightKgChange,
  computedPiecesFromScale,
  unitPrice,
  onUnitPriceChange,
  scrapWeightKg,
  onScrapWeightKgChange,
  scrapReason,
  onScrapReasonChange,
  scrapColor,
  onScrapColorChange,
  shiftCode,
  onShiftCodeChange,
  notes,
  onNotesChange,
  selectedRack,
  selectedFormula,
  theoreticalWeightPerPiece,
  estimatedRawMaterialConsumedKg,
  isCapacityExceeded,
  isPtiMismatched,
  mismatchErrorMessage,
  onSubmitIngress,
  isSubmitting,
  lastBackflushingResult,
  massBalance,
  onSelectRackFromGrid,
  onSelectQueueFromList,
  onCreateRack,
  isCreatingRack = false,
  valuation,
  canViewCosts,
  extrusionWip,
  costIndex,
  onCostIndexChange,
  onUpdateRackPrice,
  isUpdatingRackPrice,
}) => {
  // Pestaña Activa: INGRESS (Operador), RACKS (Mapa de piso), BALANCE (Auditoría/Finanzas)
  const [activeTab, setActiveTab] = React.useState<'INGRESS' | 'RACKS' | 'CATALOG' | 'BALANCE'>('INGRESS');
  const selectedPtiProduct = ptiProducts.find((product) => product.id === Number(selectedPtiMaterialId));
  const knownPtiUnitWeight = Number(selectedRack?.unit_weight_kg || selectedPtiProduct?.unit_weight_kg || 0);

  // Filtros de Racks en Pestaña 2
  const [rackFilter, setRackFilter] = React.useState<'ALL' | 'VACIO' | 'DISPONIBLE' | 'LLENO'>('ALL');
  const [rackSearch, setRackSearch] = React.useState('');

  // Modales
  const [isRackModalOpen, setIsRackModalOpen] = React.useState(false);
  const [newRackCode, setNewRackCode] = React.useState('');
  const [newMaxCapacity, setNewMaxCapacity] = React.useState('100');
  const [newLocationName, setNewLocationName] = React.useState('ALMACEN-PTI-01');

  // Acordeón de opciones secundarias (Scrap / Notas)
  const [showSecondaryOptions, setShowSecondaryOptions] = React.useState(
    Boolean(scrapWeightKg && Number(scrapWeightKg) > 0) || Boolean(notes)
  );

  // Escáner de cámara
  const [isRackScannerModalOpen, setIsRackScannerModalOpen] = React.useState(false);
  const [scannedRackInput, setScannedRackInput] = React.useState('');
  const [rackScanError, setRackScanError] = React.useState<string | null>(null);


  // Modal para edición manual de Precio y Peso por Rack
  const [isEditRackModalOpen, setIsEditRackModalOpen] = React.useState(false);
  const [editingRack, setEditingRack] = React.useState<PtiRack | null>(null);
  const [editUnitPrice, setEditUnitPrice] = React.useState('');
  const [editUnitWeightKg, setEditUnitWeightKg] = React.useState('');

  const pieces = ingressMode === 'WEIGHT' ? computedPiecesFromScale : (Number(quantityPieces) || 0);

  // Atajos para sumar piezas rápidamente
  const handleAddPieces = (delta: number) => {
    const current = Number(quantityPieces) || 0;
    onQuantityPiecesChange(Math.max(1, current + delta).toString());
  };

  const handleOpenEditRack = (rack: PtiRack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRack(rack);
    setEditUnitPrice((rack.unit_price || 0).toString());
    setEditUnitWeightKg(rack.unit_weight_kg == null ? '' : String(rack.unit_weight_kg));
    setIsEditRackModalOpen(true);
  };

  const handleSaveEditRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRack) return;
    try {
      await onUpdateRackPrice(editingRack.id, {
        unit_price: Number(editUnitPrice) || 0,
        unit_weight_kg: editUnitWeightKg === '' ? null : Number(editUnitWeightKg)
      });
      setIsEditRackModalOpen(false);
      setEditingRack(null);
    } catch {
      // handled
    }
  };

  const handleSaveRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRackCode.trim() || !onCreateRack) return;
    try {
      await onCreateRack({
        rack_code: newRackCode.trim().toUpperCase(),
        max_capacity: Number(newMaxCapacity) || 100,
        location_name: newLocationName.trim() || undefined
      });
      setNewRackCode('');
      setIsRackModalOpen(false);
    } catch {
      // handled
    }
  };

  // Seleccionar rack desde el mapa y pasar de inmediato a la terminal de ingreso
  const handlePickRackForIngress = (rack: PtiRack) => {
    onSelectRackFromGrid(rack);
    setActiveTab('INGRESS');
  };

  // Filtrado de racks en Pestaña 2
  const filteredRacks = React.useMemo(() => {
    return racks.filter((rack) => {
      // Filtro por estatus
      if (rackFilter === 'VACIO' && rack.status !== 'VACIO') return false;
      if (rackFilter === 'DISPONIBLE' && (rack.status !== 'DISPONIBLE' && rack.status !== 'VACIO')) return false;
      if (rackFilter === 'LLENO' && rack.status !== 'LLENO') return false;

      // Filtro por texto
      if (rackSearch.trim()) {
        const query = rackSearch.trim().toUpperCase();
        const codeMatch = rack.rack_code?.toUpperCase().includes(query);
        const qrMatch = rack.qr_code?.toUpperCase().includes(query);
        const ptiMatch = rack.currentPtiType?.name?.toUpperCase().includes(query);
        if (!codeMatch && !qrMatch && !ptiMatch) return false;
      }
      return true;
    });
  }, [racks, rackFilter, rackSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 pb-32">
      {/* ========================================================= */}
      {/* CABECERA PRINCIPAL: ESTACIÓN DE EMPAQUE INTERMEDIO */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Módulo de Extrusión
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-muted-foreground font-semibold">
                Estación de Empaque
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
              Ingreso de PTI a Racks
            </h1>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              Asociación física de bobinas producidas a racks acondicionados con Backflushing de inventario.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onCreateRack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRackModalOpen(true)}
              className="h-9 px-3 text-xs font-bold border-border gap-1.5"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>Nuevo Rack</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3 text-xs font-bold border-border gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SELECTOR DE PESTAÑAS INDUSTRIALES (GRANDES Y TÁCTILES) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border">
        {/* Tab 1: Terminal de Ingreso */}
        <button
          type="button"
          onClick={() => setActiveTab('INGRESS')}
          className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'INGRESS'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Boxes className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <span className="block leading-tight">1. Registrar Ingreso</span>
            <span className="text-[10px] font-semibold opacity-85 normal-case block">
              Operación de planta (3 pasos)
            </span>
          </div>
        </button>

        {/* Tab 2: Mapa de Racks en Piso */}
        <button
          type="button"
          onClick={() => setActiveTab('RACKS')}
          className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'RACKS'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Archive className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="block leading-tight">2. Racks en Piso</span>
              <Badge
                variant={activeTab === 'RACKS' ? 'secondary' : 'outline'}
                className="text-[10px] font-mono h-4 px-1.5 font-bold"
              >
                {racks.length}
              </Badge>
            </div>
            <span className="text-[10px] font-semibold opacity-85 normal-case block">
              Disponibilidad física
            </span>
          </div>
        </button>

        {/* Catálogo de perfiles técnicos de PTI */}
        <button
          type="button"
          onClick={() => setActiveTab('CATALOG')}
          className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'CATALOG'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Layers className="h-5 w-5 shrink-0" />
          <div className="text-left"><span className="block leading-tight">Catálogo PTI</span><span className="text-[10px] font-semibold opacity-85 normal-case block">Perfiles de cinta y costeo</span></div>
        </button>

        {/* Tab 3: Balance y Finanzas */}
        <button
          type="button"
          onClick={() => setActiveTab('BALANCE')}
          className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'BALANCE'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Scale className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <span className="block leading-tight">3. Balance y Auditoría</span>
            <span className="text-[10px] font-semibold opacity-85 normal-case block">
              Backflushing y finanzas
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: REGISTRO RÁPIDO DE INGRESO (ENFOCADO EN EL OPERADOR) */}
      {/* ========================================================= */}
      {activeTab === 'INGRESS' && (
        <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150">
          {/* Mensaje de Éxito de Backflushing si se acaba de registrar */}
          {lastBackflushingResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <strong className="text-sm font-black uppercase block">
                    ¡Ingreso de {lastBackflushingResult.pieces_entered} bobinas registrado con éxito!
                  </strong>
                  <span className="text-xs font-semibold opacity-90 block">
                    Consumo en Reversa aplicado: Se descontaron {lastBackflushingResult.total_raw_material_consumed_kg} kg de materia prima.
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('BALANCE')}
                className="text-xs font-bold border-emerald-500/40 bg-background/60 hover:bg-emerald-500/20 shrink-0"
              >
                Ver Auditoría →
              </Button>
            </div>
          )}

          {/* Formulario Estructurado en 3 Pasos Grandes */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
            {/* ---------------------------------------------------- */}
            {/* PASO 1: SELECCIONA LA MEZCLA ACTIVA */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-3 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                    ¿Qué mezcla estás empacando?
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Selecciona la extrusora que está corriendo o escanea la etiqueta de la mezcla.
                  </p>
                </div>
              </div>

              {/* Botones Grandes de Extrusoras Activas en Planta */}
              {activeQueues.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {activeQueues.map((q) => {
                    const isSelected = mixtureQr === q.consumption_order_qr_id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => onSelectQueueFromList(q)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                            : 'border-border bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                            Extrusora {q.extruder_id}
                          </span>
                          {isSelected ? (
                            <Badge variant="default" className="text-[10px] font-black uppercase gap-1">
                              <Check className="h-3 w-3" /> Seleccionada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/30">
                              En Proceso
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-sm sm:text-base font-black text-foreground block select-all">
                          {q.consumption_order_qr_id}
                        </span>
                        <div className="text-[11px] text-muted-foreground font-bold truncate">
                          {q.formula?.code || 'Fórmula'} • {q.formula?.name || ''}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">Color PTI: {[...new Set((q.formula?.ptiProducts || []).filter((pti) => pti.is_active && pti.color).map((pti) => pti.color))].join(', ') || 'sin PTI enlazado'}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-500 font-bold bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  No hay mezclas activas detectadas en este momento. Introduce el código QR abajo.
                </p>
              )}

              {/* Input de respaldo para escanear manualmente */}
              <div className="pt-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  O escanear código QR de mezcla:
                </label>
                <div className="flex gap-2">
                  <QrScannerButton title="Escanear QR de mezcla" onScan={(code) => onMixtureQrChange(code.trim().toUpperCase())} />
                  <Input
                    placeholder="Ej. CONT-MIX-20261023-XXXX-C1"
                    value={mixtureQr}
                    onChange={(e) => onMixtureQrChange(e.target.value.toUpperCase())}
                    className="font-mono font-bold text-sm h-10 border bg-background uppercase"
                  />
                </div>
              </div>

              {/* Ficha Resumen de la Fórmula si está identificada */}
              {selectedFormula && (
                <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span>Fórmula: <strong className="text-foreground">{selectedFormula.name}</strong><span className="block text-muted-foreground">Color(es) PTI: {[...new Set((selectedFormula.ptiProducts || []).filter((pti) => pti.is_active && pti.color).map((pti) => pti.color))].join(', ') || 'sin PTI enlazado'}</span></span>
                  </div>
                  <div className="font-mono text-muted-foreground">
                    Peso Teórico: <strong className="text-primary">{theoreticalWeightPerPiece} kg/pza</strong>
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* PASO 2: RACK FÍSICO DESTINO */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-3 pb-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                      ¿En qué Rack lo vas a guardar?
                    </h2>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Selecciona un rack libre o que coincida con el mismo tipo de bobina.
                    </p>
                  </div>
                </div>

              </div>

              {/* Selector Desplegable de Rack con Letras Grandes y Legibles */}
              <div className="flex gap-2 pt-1">
                <QrScannerButton
                  title="Escanear QR del rack de destino"
                  onScan={(code) => {
                    const clean = code.trim().toUpperCase();
                    const found = racks.find((rack) => rack.qr_code?.toUpperCase() === clean || rack.rack_code?.toUpperCase() === clean);
                    if (found) onSelectRackFromGrid(found);
                    else onRackQrChange(clean);
                  }}
                />
                <select
                  value={rackQr}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = racks.find((r) => r.qr_code === val || r.rack_code === val);
                    if (found) {
                      onSelectRackFromGrid(found);
                    } else {
                      onRackQrChange(val);
                    }
                  }}
                  className="w-full h-12 px-3.5 bg-background border border-border rounded-xl text-sm sm:text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">-- Toca aquí para seleccionar el Rack Físico --</option>
                  {racks.map((rack) => {
                    const isCond = rack.status !== 'VACIO' && rack.current_pti_type_id;
                    const condName = rack.currentPtiType?.name || (isCond ? `PTI #${rack.current_pti_type_id}` : 'Libre');
                    const isFull = rack.status === 'LLENO';
                    return (
                      <option key={rack.id} value={rack.qr_code} disabled={isFull}>
                        {rack.rack_code} • {isFull ? '[LLENO]' : rack.status === 'VACIO' ? '[LIBRE]' : '[EN USO]'} ({rack.current_quantity}/{rack.max_capacity} pzas) — {isCond ? condName : 'Vacío'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Semáforos y Alertas Visuales Grandes de Validación de Rack */}
              {isPtiMismatched && (
                <div className="p-4 bg-destructive/15 border-2 border-destructive/40 rounded-xl space-y-1.5 text-destructive animate-in fade-in">
                  <div className="flex items-center gap-2 font-black text-sm uppercase">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <span>¡Incompatibilidad de Rack Bloqueada!</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed">
                    {mismatchErrorMessage}
                  </p>
                  <p className="text-[11px] opacity-90 font-semibold">
                    Regla de Calidad: No se permite mezclar diferentes tipos de producto en el mismo rack. Selecciona un rack libre.
                  </p>
                </div>
              )}

              {isCapacityExceeded && selectedRack && (
                <div className="p-4 bg-amber-500/15 border-2 border-amber-500/40 rounded-xl space-y-1.5 text-amber-900 dark:text-amber-300 animate-in fade-in">
                  <div className="flex items-center gap-2 font-black text-sm uppercase">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>¡Capacidad Máxima Excedida!</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed">
                    El Rack {selectedRack.rack_code} tiene capacidad para {selectedRack.max_capacity} piezas y actualmente posee {selectedRack.current_quantity} pzas.
                  </p>
                </div>
              )}

              {selectedRack && !isPtiMismatched && !isCapacityExceeded && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Rack <strong>{selectedRack.rack_code}</strong> compatible y listo para recibir material.
                    </span>
                  </div>
                  <span className="font-mono">
                    Quedan {Math.max(0, (selectedRack.max_capacity || 100) - (selectedRack.current_quantity || 0))} pzas de espacio
                  </span>
                </div>
              )}

              {/* Selector de Tipo de Producto PTI */}
              <div className="pt-2">
                <label className="text-xs font-black uppercase text-foreground block mb-1">
                  Tipo de Producto PTI *
                </label>
                {selectedRack && selectedRack.status !== 'VACIO' && selectedRack.currentPtiType ? (
                  <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between text-xs font-bold">
                    <span className="text-foreground">
                      {selectedRack.currentPtiProduct?.name || selectedRack.currentPtiType.name} · Color {selectedRack.currentPtiProduct?.color || 'por identificar'} (Fijado por el rack)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Bloqueado por Condicionamiento
                    </Badge>
                  </div>
                ) : (
                  <select
                    value={selectedPtiMaterialId}
                    onChange={(e) => onPtiMaterialIdChange(Number(e.target.value) || '')}
                    className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Seleccionar Producto PTI --</option>
                    {ptiProducts.length > 0 ? (
                      ptiProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name} · Color: {p.color || 'sin definir'} ({p.unit_weight_kg == null ? 'peso pendiente' : `${Number(p.unit_weight_kg).toFixed(2)} kg`}, índice ×{Number(p.transformed_cost_index || 1).toFixed(2)})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>La fórmula activa no tiene un PTI enlazado. Completa el enlace en el catálogo de fórmulas.</option>
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* PASO 3: CANTIDAD Y BÁSCULA */}
            {/* ---------------------------------------------------- */}
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                    Cantidad de Bobinas / Peso en Báscula
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Elige si ingresas por conteo de piezas o por peso en báscula industrial.
                  </p>
                </div>
              </div>

              {/* Botones Grandes de Toggle Modo */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onIngressModeChange('PIECES')}
                  className={`py-3 px-4 rounded-xl border-2 font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    ingressMode === 'PIECES'
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Boxes className="h-4 w-4" />
                  <span>Por Bobinas / Piezas</span>
                </button>

                <button
                  type="button"
                  onClick={() => onIngressModeChange('WEIGHT')}
                  className={`py-3 px-4 rounded-xl border-2 font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    ingressMode === 'WEIGHT'
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Scale className="h-4 w-4" />
                  <span>Por Báscula (Peso Kg)</span>
                </button>
              </div>

              {/* Input Modo 1: Piezas */}
              {ingressMode === 'PIECES' ? (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                    <span>Cantidad de Piezas a Ingresar *</span>
                    <span className="font-mono text-xs text-muted-foreground font-bold">CONTEO DIRECTO</span>
                  </label>

                  <div className="flex items-stretch rounded-xl border-2 border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all">
                    <button
                      type="button"
                      onClick={() => handleAddPieces(-1)}
                      disabled={Number(quantityPieces) <= 1}
                      className="w-14 h-14 bg-muted/30 hover:bg-muted/60 text-foreground font-black text-2xl flex items-center justify-center border-r border-border disabled:opacity-40 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={quantityPieces}
                      onChange={(e) => onQuantityPiecesChange(e.target.value)}
                      className="w-full h-14 text-center font-mono font-black text-2xl text-foreground outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddPieces(1)}
                      className="w-14 h-14 bg-muted/30 hover:bg-muted/60 text-foreground font-black text-2xl flex items-center justify-center border-l border-border cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Atajos Rápidos de Suma Táctil */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Sumar rápido:</span>
                    {[5, 10, 25, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleAddPieces(num)}
                        className="px-3 py-1 bg-muted/50 hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>

                  {/* Estimación de Peso Total */}
                  <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs font-bold text-muted-foreground flex justify-between items-center">
                    <span>Peso total estimado en báscula:</span>
                    <strong className="font-mono text-foreground text-sm">
                      {knownPtiUnitWeight > 0 ? `${((Number(quantityPieces) || 0) * knownPtiUnitWeight).toFixed(2)} KG` : 'Peso unitario pendiente'}
                    </strong>
                  </div>
                  {knownPtiUnitWeight <= 0 && <p className="text-xs text-amber-700 dark:text-amber-300">El documento del cliente no especifica el peso de bobina. Usa báscula y captura peso total y piezas para calibrar el rack.</p>}
                </div>
              ) : (
                /* Input Modo 2: Peso en Báscula */
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                    <span>Peso Total Registrado en Báscula *</span>
                    <span className="font-mono text-xs text-primary font-bold">BÁSCULA INDUSTRIAL</span>
                  </label>

                  <div className="flex items-stretch rounded-xl border-2 border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="0.0"
                      value={scaleWeightKg}
                      onChange={(e) => onScaleWeightKgChange(e.target.value)}
                      className="w-full h-14 px-4 text-right font-mono font-black text-2xl text-foreground outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center justify-center px-4 bg-muted/40 border-l border-border text-sm font-black text-muted-foreground uppercase select-none shrink-0">
                      KG
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between text-xs font-bold text-foreground">
                    <span>
                      Peso unitario: <strong>{knownPtiUnitWeight > 0 ? `${knownPtiUnitWeight} kg/pza` : 'Pendiente; captura también las piezas'}</strong>
                    </span>
                    {knownPtiUnitWeight > 0 && <span className="text-primary font-mono font-black text-sm">
                      → Equivale a: {computedPiecesFromScale} bobinas
                    </span>}
                  </div>
                  {knownPtiUnitWeight <= 0 && (
                    <label className="block space-y-1 text-xs font-bold">BOBINAS CONTADAS
                      <Input type="number" min="1" step="1" value={quantityPieces} onChange={(event) => onQuantityPiecesChange(event.target.value)} placeholder="Número de bobinas" />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* OPCIONES ADICIONALES (ACORDEÓN DISCRETO / SCRAP Y NOTAS) */}
            {/* ---------------------------------------------------- */}
            <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
              <button
                type="button"
                onClick={() => setShowSecondaryOptions(!showSecondaryOptions)}
                className="w-full p-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Opciones Adicionales de Turno (Merma / Scrap y Observaciones)</span>
                  {Number(scrapWeightKg) > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/40">
                      {scrapWeightKg} kg scrap
                    </Badge>
                  )}
                </div>
                {showSecondaryOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showSecondaryOptions && (
                <div className="p-4 border-t border-border space-y-3 bg-card animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">
                        Merma / Scrap Operativo Estimado (Kg)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.00"
                        value={scrapWeightKg}
                        onChange={(e) => onScrapWeightKgChange(e.target.value)}
                        className="font-mono font-bold text-sm h-10 border"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">
                        Motivo de Merma
                      </label>
                      <select
                        value={scrapReason}
                        onChange={(e) => onScrapReasonChange(e.target.value)}
                        className="w-full h-10 px-2.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground"
                      >
                        <option value="ARRANQUE_EXTRUSORA">Arranque de Extrusora</option>
                        <option value="CORTE_ORILLAS">Corte de Orillas (Trimming)</option>
                        <option value="ROTURA_CINTA">Rotura de Cinta</option>
                        <option value="DESPERDICIO_OPERATIVO">Desperdicio Operativo</option>
                        <option value="PURGA_TRANSICION">Purga de Transición</option>
                        <option value="MERMA_CALIDAD">Merma por Calidad</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">Color del scrap para clasificación</label>
                    <Input value={scrapColor} onChange={(e) => onScrapColorChange(e.target.value)} placeholder="Ej. natural, azul, negro" className="text-xs h-10 border" />
                  </div>
                  <label className="block space-y-1 text-[11px] font-bold uppercase text-muted-foreground">Turno<select value={shiftCode} onChange={(event) => onShiftCodeChange(event.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-foreground"><option>TURNO_1</option><option>TURNO_2</option><option>TURNO_3</option></select></label>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Notas del Operador / Turno
                    </label>
                    <Input
                      placeholder="Observaciones de empaque, lote o turno..."
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      className="text-xs h-10 border"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* BOTÓN GRANDE DE ACCIÓN FINAL */}
            {/* ---------------------------------------------------- */}
            <Button
              size="lg"
              onClick={onSubmitIngress}
              disabled={
                isSubmitting ||
                !rackQr ||
                !selectedPtiMaterialId ||
                pieces <= 0 ||
                isPtiMismatched ||
                isCapacityExceeded
              }
              className={`w-full h-14 text-base sm:text-lg font-black uppercase tracking-wider shadow-md transition-all gap-2 ${
                isSubmitting || !rackQr || !selectedPtiMaterialId || pieces <= 0 || isPtiMismatched || isCapacityExceeded
                  ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Registrando y Calculando Backflushing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  <span>Confirmar y Registrar Ingreso en Rack</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: INVENTARIO VISUAL DE RACKS EN PISO */}
      {/* ========================================================= */}
      {activeTab === 'RACKS' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={rackFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('ALL')}
                className="h-8 text-xs font-bold"
              >
                Todos ({racks.length})
              </Button>
              <Button
                variant={rackFilter === 'VACIO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('VACIO')}
                className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                Libres ({racks.filter((r) => r.status === 'VACIO').length})
              </Button>
              <Button
                variant={rackFilter === 'DISPONIBLE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('DISPONIBLE')}
                className="h-8 text-xs font-bold text-sky-600 dark:text-sky-400"
              >
                En Uso ({racks.filter((r) => r.status === 'DISPONIBLE').length})
              </Button>
              <Button
                variant={rackFilter === 'LLENO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('LLENO')}
                className="h-8 text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                Llenos ({racks.filter((r) => r.status === 'LLENO').length})
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar rack o producto..."
                value={rackSearch}
                onChange={(e) => setRackSearch(e.target.value)}
                className="pl-9 h-9 text-xs border"
              />
            </div>
          </div>

          {/* Grid de Racks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRacks.map((rack) => {
              const percent = Math.min(
                100,
                Math.round(((rack.current_quantity || 0) / (rack.max_capacity || 100)) * 100)
              );
              const isSelected = selectedRack?.id === rack.id || rackQr === rack.qr_code;
              const isVacio = rack.status === 'VACIO';
              const isLleno = rack.status === 'LLENO';

              return (
                <div
                  key={rack.id}
                  className={`bg-card border-2 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-foreground">{rack.rack_code}</span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {rack.qr_code}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold block mt-0.5">
                          Ubicación: {rack.location_name || 'Almacén Piso'}
                        </span>
                      </div>

                      <Badge
                        variant={isLleno ? 'destructive' : isVacio ? 'secondary' : 'default'}
                        className="text-[10px] font-black uppercase"
                      >
                        {isLleno ? 'Lleno' : isVacio ? 'Libre' : 'Disponible'}
                      </Badge>
                    </div>

                    {/* Barra de Capacidad */}
                    <div className="space-y-1">
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percent >= 100
                              ? 'bg-destructive'
                              : percent >= 75
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-mono font-bold text-muted-foreground">
                        <span>
                          {rack.current_quantity} / {rack.max_capacity} pzas ({percent}%)
                        </span>
                        <span className="text-foreground">
                          Disp: {Math.max(0, rack.max_capacity - rack.current_quantity)}
                        </span>
                      </div>
                    </div>

                    {/* Condicionamiento */}
                    <div className="p-2.5 bg-muted/20 border border-border rounded-xl text-xs space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                        Condicionado a:
                      </span>
                      <strong className="text-foreground block truncate">
                        {rack.currentPtiType?.name || (isVacio ? 'Libre (Sin Condicionar)' : 'Sin Asignar')}
                      </strong>
                    </div>

                    {/* Datos Financieros */}
                    <div className={`grid ${canViewCosts ? 'grid-cols-3' : 'grid-cols-1'} gap-2 text-xs font-bold pt-1`}>
                      {canViewCosts && <div>
                        <span className="text-muted-foreground text-[10px] block">Precio / Pza:</span>
                        <span className="font-mono text-foreground">${rack.unit_price || 0} MXN</span>
                      </div>}
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Peso / Pza:</span>
                        <span className="font-mono text-foreground">{rack.unit_weight_kg == null ? 'Pendiente' : `${rack.unit_weight_kg} kg`}</span>
                      </div>
                      {canViewCosts && <div><span className="text-muted-foreground text-[10px] block">Costo transformado:</span><span className="font-mono text-foreground">{rack.unit_cost_per_kg == null ? 'Pendiente' : `$${Number(rack.unit_cost_per_kg).toFixed(4)}/kg`}</span></div>}
                    </div>
                  </div>

                  {/* Acciones al Pie */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePickRackForIngress(rack)}
                      disabled={isLleno}
                      className="flex-1 h-9 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      <span>{isLleno ? 'Rack Lleno' : 'Usar este Rack'}</span>
                    </Button>

                    {canViewCosts && <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleOpenEditRack(rack, e)}
                      className="h-9 px-2.5 text-xs font-bold border-border"
                      title="Editar precio histórico y peso por bobina"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'CATALOG' && <PtiCatalogPanel />}

      {/* ========================================================= */}
      {/* VISTA 3: BALANCE DE MASA Y AUDITORÍA FINANCIERA (SUPERVISOR) */}
      {/* ========================================================= */}
      {activeTab === 'BALANCE' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <ExtrusionShiftClosurePanel />
          {/* Sección 1: Valorización Financiera en Extrusión (WIP) */}
          {canViewCosts && valuation && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-foreground">
                      Valorización en Extrusión (WIP Total)
                    </h2>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Control contable de materias primas activas en tolvas y racks intermedios.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Índice Costo:</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1.0"
                    value={costIndex}
                    onChange={(e) => onCostIndexChange(Number(e.target.value) || 1.15)}
                    className="w-20 h-8 font-mono font-black text-xs border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                    Mezclas en Espera ({valuation.queued_items_count || 0})
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-foreground">
                    ${Number(valuation.queued_mixes_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                    Mezclas Activas ({valuation.active_items_count || 0})
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">
                    ${Number(valuation.active_mixes_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                    PTI en Racks ({valuation.racks_count || 0} racks)
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                    ${Number(valuation.pti_racks_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 block mb-1">
                    Total Extrusión (WIP)
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                    ${Number(valuation.total_extrusion_wip_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {extrusionWip && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-black uppercase text-foreground">WIP disponible en Extrusión</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Material recibido de almacén y mezcla preparada aún disponible.</p>
                </div>
                <Badge variant="outline" className="font-mono font-black">{Number(extrusionWip.total_kg || 0).toFixed(2)} kg materia prima</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-muted-foreground">Mezclas</h3>
                  {(extrusionWip.mixtures || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">No hay mezcla preparada pendiente de consumo.</p>
                  ) : (extrusionWip.mixtures || []).map((mix: any) => (
                    <div key={mix.id} className="flex items-center justify-between gap-3 p-3 bg-muted/20 border border-border rounded-lg text-xs">
                      <div><strong className="font-mono">{mix.folio}</strong><div className="text-muted-foreground">{mix.formula || 'Fórmula'} · {mix.status}</div></div>
                      <div className="text-right font-mono font-bold">{Number(mix.remaining_kg).toFixed(2)} kg{canViewCosts && mix.remaining_value != null && <div className="text-muted-foreground">${Number(mix.remaining_value).toFixed(2)}</div>}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-muted-foreground">Materiales por lote</h3>
                  {(extrusionWip.items || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">No hay material en WIP.</p>
                  ) : (extrusionWip.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-muted/20 border border-border rounded-lg text-xs">
                      <div><strong>{item.material?.name || 'Material'}</strong><div className="text-muted-foreground">Lote {item.lote?.folio || 'sin lote'} · {item.qr_code || 'sin QR'}</div></div>
                      <div className="text-right font-mono font-bold">{Number(item.amount_kg).toFixed(2)} kg{canViewCosts && item.value != null && <div className="text-muted-foreground">${Number(item.value).toFixed(2)}</div>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sección 2: Balance de Masa (Golden Rules #2 y #6) */}
          {massBalance && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Scale className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase text-foreground">
                      Balance de Masa en Extrusión (Control 500 Kg)
                    </h2>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Lote: <span className="font-mono text-foreground font-bold">{massBalance.mixture_qr}</span>
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`font-black text-xs px-3 py-1 border-2 ${
                    massBalance.scrap_status === 'OPTIMO'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : massBalance.scrap_status === 'NORMAL'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                      : massBalance.scrap_status === 'ELEVADO'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  ESTATUS: {massBalance.scrap_status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 text-xs">
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Batch Entrante</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {Number(massBalance.batch_size_kg).toFixed(2)} kg
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Merma de mezcla</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                    {Number(massBalance.total_scrap_kg).toFixed(2)} kg
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground block">
                    ({Number(massBalance.scrap_percentage).toFixed(2)}% del lote)
                  </span>
                </div>
                {Number(massBalance.purge_material_scrap_kg || 0) > 0 && <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Merma de material de purga</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">{Number(massBalance.purge_material_scrap_kg).toFixed(3)} kg</span>
                  {canViewCosts && <span className="text-[10px] font-bold text-muted-foreground block">Costo de lote: ${Number(massBalance.purge_material_scrap_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                </div>}
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Bobinas esperadas / registradas</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {massBalance.expected_output_pieces == null ? `${Number(massBalance.estimated_useful_kg).toFixed(2)} kg útiles` : `${massBalance.expected_output_pieces} / ${Number(massBalance.good_output_pieces || 0)} pzas`}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground block">Producto registrado: {Number(massBalance.good_output_kg || 0).toFixed(2)} kg</span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Rendimiento (Yield)</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {Number(massBalance.estimated_yield_percentage).toFixed(2)}%
                  </span>
                </div>
                {canViewCosts && <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Valor de PTI producido</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {massBalance.pti_output_cost == null ? 'Pendiente de costo' : `$${Number(massBalance.pti_output_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground block">Costo transformado × índice del PTI</span>
                </div>}
              </div>

              {massBalance.scrap_details?.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="text-xs font-black uppercase text-muted-foreground block">
                    Desglose de Desperdicios del Lote ({massBalance.scrap_records_count} registros):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {massBalance.scrap_details.map((scrap: any) => (
                      <span
                        key={scrap.id}
                        className="px-2.5 py-1 bg-muted/60 rounded-lg border border-border text-xs font-mono font-bold"
                      >
                        {scrap.category || scrap.reason} · {scrap.color || 'sin color'}: <strong>{Number(scrap.actual_weight_kg ?? scrap.estimated_weight_kg ?? scrap.scrap_weight_kg).toFixed(3)} kg</strong>{scrap.actual_weight_method === 'PESAJE_AGREGADO_PROPORCIONAL' ? ' (asignación proporcional)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {massBalance && <ProductionReconciliationPanel mixtureQr={massBalance.mixture_qr} entries={massBalance.production_entries || []} />}

          {/* Sección 3: Último Resultado de Backflushing */}
          {lastBackflushingResult && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase">
                    Consumo en Reversa (Backflushing) del Último Ingreso
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Desglose automático de materias primas deducidas de la orden de consumo.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
                <div className="p-3 bg-muted/20 rounded-xl border border-border">
                  <span className="text-muted-foreground text-[10px] block">Piezas Ingresadas</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    +{lastBackflushingResult.pieces_entered} pzas
                  </span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border">
                  <span className="text-muted-foreground text-[10px] block">Peso Teórico / Pza</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    {lastBackflushingResult.theoretical_piece_weight_kg} kg
                  </span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border">
                  <span className="text-muted-foreground text-[10px] block">Merma Transición</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    {lastBackflushingResult.transition_scrap_kg} kg
                  </span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border">
                  <span className="text-muted-foreground text-[10px] block">Materia Prima Total</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    {lastBackflushingResult.total_raw_material_consumed_kg} kg
                  </span>
                </div>
              </div>

              {lastBackflushingResult.ingredients_breakdown?.length > 0 && (
                <div className="pt-2 border-t border-border text-xs">
                  <span className="font-black text-muted-foreground uppercase text-[11px] block mb-1.5">
                    Deducción de Materias Primas por Componente:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {lastBackflushingResult.ingredients_breakdown.map((ing) => (
                      <span
                        key={ing.material_id}
                        className="bg-muted/40 px-3 py-1 rounded-lg border border-border text-xs font-mono font-bold text-foreground"
                      >
                        {ing.material_name}: <strong className="text-rose-500">-{ing.consumed_kg} kg</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDITAR PRECIO Y PESO POR RACK (SUPERVISIÓN) */}
      {/* ========================================================= */}
      <Dialog open={isEditRackModalOpen} onOpenChange={setIsEditRackModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-2 border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Editar Precio y Peso — {editingRack?.rack_code}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Ajusta el precio unitario ($ MXN) y peso por bobina (kg) para el cálculo de valorización y báscula.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditRack} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-foreground">
                Precio Unitario PTI ($ MXN / pza) *
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={editUnitPrice}
                onChange={(e) => setEditUnitPrice(e.target.value)}
                required
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-foreground">
                Peso Unitario por Pieza / Bobina (Kg) *
              </label>
              <Input
                type="number"
                step="0.05"
                min="0.1"
                value={editUnitWeightKg}
                onChange={(e) => setEditUnitWeightKg(e.target.value)}
                required
                className="font-mono font-bold"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditRackModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingRackPrice}
                className="font-bold bg-primary text-primary-foreground"
              >
                {isUpdatingRackPrice ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: REGISTRAR NUEVO RACK */}
      {/* ========================================================= */}
      <Dialog open={isRackModalOpen} onOpenChange={setIsRackModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-2 border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              Registrar Nuevo Rack PTI
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Define la etiqueta QR, capacidad máxima en bobinas y ubicación inicial para el transporte de cinta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRack} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-foreground">
                Código de Rack / QR *
              </label>
              <Input
                value={newRackCode}
                onChange={(e) => setNewRackCode(e.target.value)}
                placeholder="Ej. RACK-PTI-NEW-01"
                required
                className="font-mono uppercase font-bold"
                data-testid="new-rack-code-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Capacidad Máxima *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={newMaxCapacity}
                  onChange={(e) => setNewMaxCapacity(e.target.value)}
                  required
                  className="font-mono font-bold"
                  data-testid="new-rack-capacity-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Ubicación Inicial
                </label>
                <Input
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Ej. EXT-PTI-BAY-1"
                  className="font-semibold"
                  data-testid="new-rack-location-input"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRackModalOpen(false)}
                className="font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingRack || !newRackCode.trim()}
                className="font-bold bg-primary text-primary-foreground"
                data-testid="submit-create-rack-btn"
              >
                {isCreatingRack ? 'Registrando...' : 'Registrar Rack'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: ESCÁNER MANUAL DE RACK */}
      {/* ========================================================= */}
      <Dialog open={isRackScannerModalOpen} onOpenChange={setIsRackScannerModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-2 border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Escanear QR de Rack Físico
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Apunte el lector láser hacia la etiqueta QR del Rack o introduzca el código manualmente.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = scannedRackInput.trim().toUpperCase();
              if (!clean) return;
              const matched = racks.find(
                (r) => r.qr_code.toUpperCase() === clean || r.rack_code.toUpperCase() === clean
              );
              if (matched) {
                onSelectRackFromGrid(matched);
              } else {
                onRackQrChange(clean);
              }
              setIsRackScannerModalOpen(false);
              setScannedRackInput('');
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-foreground">
                Código QR o Identificador del Rack *
              </label>
              <Input
                autoFocus
                placeholder="Ej. QR-RACK-001 o RACK-PTI-01"
                value={scannedRackInput}
                onChange={(e) => setScannedRackInput(e.target.value.toUpperCase())}
                className="font-mono font-black text-sm h-11 border-2 pl-3 uppercase"
              />
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRackScannerModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!scannedRackInput.trim()}
                className="font-bold bg-primary text-primary-foreground"
              >
                Asignar Rack
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default PtiIngressPresenter;
