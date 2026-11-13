import React from 'react';
import CollapsibleFilterPanel from '@/components/shared/CollapsibleFilterPanel';
import {
  Boxes,
  QrCode,
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
  ChevronUp,
  Download,
  Printer
} from '@/design-system/components/Icon/googleIconCompat';
import {
  PtiRack,
  Formula,
  BackflushingResult,
  ExtruderQueue,
  MassBalanceData,
  ExtrusionValuation,
  PtiProduct,
  ScanRackPtiResponse,
  PTI_DESTINATION_LABELS
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
import { ProductionReconciliationPanel } from './ProductionReconciliationPanel';
import { RackQrLabelsDialog } from '../components/RackQrLabelsDialog';
import { QRCodeSVG } from 'qrcode.react';

export interface PtiIngressPresenterProps {
  racks: PtiRack[];
  formulas: Formula[];
  activeQueues: ExtruderQueue[];
  ptiProducts?: PtiProduct[];
  isLoading: boolean;
  onRefresh: () => void;
  // Form inputs
  mixtureQr: string;
  selectedExtruderId: number | null;
  rackQr: string;
  onRackQrChange: (val: string) => void;
  selectedPtiMaterialId: number | '';
  // Modo de Ingreso: Piezas vs Báscula
  ingressMode: 'FULL_RACK' | 'PIECES' | 'WEIGHT';
  onIngressModeChange: (val: 'FULL_RACK' | 'PIECES' | 'WEIGHT') => void;
  quantityPieces: string;
  onQuantityPiecesChange: (val: string) => void;
  scaleWeightKg: string;
  onScaleWeightKgChange: (val: string) => void;
  computedPiecesFromScale: number;
  fullRackTarget: { rackCode: string | null; pieces: number } | null;
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
  // Submitting & Results
  onSubmitIngress: () => Promise<ScanRackPtiResponse | undefined>;
  isSubmitting: boolean;
  lastBackflushingResult: BackflushingResult | null;
  massBalance: MassBalanceData | null;
  onSelectRackFromGrid: (rack: PtiRack) => void;
  onSelectQueueFromList: (queue: ExtruderQueue) => void;
  onCreateRack?: (data: { virgin_qr_code: string; max_capacity?: number }) => Promise<PtiRack>;
  defaultRackLocation: string;
  isCreatingRack?: boolean;
  // Valorización y Edición de Precios
  valuation?: ExtrusionValuation | null;
  canViewCosts: boolean;
  extrusionWip?: { total_kg: number; items: any[]; mixtures?: any[]; mixtures_total_kg?: number; mixtures_total_value?: number } | null;
  costIndex: number;
  onCostIndexChange: (val: number) => void;
  onUpdateRackPrice: (rackId: number, payload: { unit_price?: number; unit_weight_kg?: number | null }) => Promise<void>;
  isUpdatingRackPrice: boolean;
  onDispatchToWarehouse: (rackId: number, payload: { quantity_pieces?: number; weight_kg?: number; notes?: string }) => Promise<any>;
  isDispatchingToWarehouse: boolean;
  canRegisterSale: boolean;
  onRegisterSaleExit: (rackId: number, payload: { rack_qr: string }) => Promise<any>;
  isRegisteringSaleExit: boolean;
}

export const PtiIngressPresenter: React.FC<PtiIngressPresenterProps> = ({
  racks,
  formulas,
  activeQueues,
  ptiProducts = [],
  isLoading,
  onRefresh,
  mixtureQr,
  selectedExtruderId,
  rackQr,
  onRackQrChange,
  selectedPtiMaterialId,
  ingressMode,
  onIngressModeChange,
  quantityPieces,
  onQuantityPiecesChange,
  scaleWeightKg,
  onScaleWeightKgChange,
  computedPiecesFromScale,
  fullRackTarget,
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
  onSubmitIngress,
  isSubmitting,
  lastBackflushingResult,
  massBalance,
  onSelectRackFromGrid,
  onSelectQueueFromList,
  onCreateRack,
  defaultRackLocation,
  isCreatingRack = false,
  valuation,
  canViewCosts,
  extrusionWip,
  costIndex,
  onCostIndexChange,
  onUpdateRackPrice,
  isUpdatingRackPrice,
  onDispatchToWarehouse,
  isDispatchingToWarehouse,
  canRegisterSale,
  onRegisterSaleExit,
  isRegisteringSaleExit,
}) => {
  const selectedQueue = activeQueues.find((queue) => Number(queue.extruder_id) === Number(selectedExtruderId));
  const [showActiveQueues, setShowActiveQueues] = React.useState(!selectedQueue);
  React.useEffect(() => {
    if (selectedQueue) setShowActiveQueues(false);
  }, [selectedQueue?.consumption_order_qr_id]);

  // Pestaña Activa: INGRESS (Operador), RACKS (Mapa de piso), BALANCE (Auditoría/Finanzas)
  const [activeTab, setActiveTab] = React.useState<'INGRESS' | 'RACKS' | 'BALANCE'>('INGRESS');
  const selectedPtiProduct = ptiProducts.find((product) => product.id === Number(selectedPtiMaterialId));
  const knownPtiUnitWeight = Number(selectedPtiProduct?.unit_weight_kg || 0);

  // Filtros de Racks en Pestaña 2
  const [rackFilter, setRackFilter] = React.useState<'ALL' | 'VACIO' | 'DISPONIBLE' | 'LLENO'>('ALL');
  const [rackSearch, setRackSearch] = React.useState('');
  const [selectedRackIds, setSelectedRackIds] = React.useState<number[]>([]);
  const [rackQrLabels, setRackQrLabels] = React.useState<PtiRack[]>([]);

  // Modales
  const [isRackModalOpen, setIsRackModalOpen] = React.useState(false);
  const [newRackCode, setNewRackCode] = React.useState('');
  const [newMaxCapacity, setNewMaxCapacity] = React.useState('100');

  // Acordeón de opciones secundarias (Scrap / Notas)
  const [showSecondaryOptions, setShowSecondaryOptions] = React.useState(
    Boolean(scrapWeightKg && Number(scrapWeightKg) > 0) || Boolean(notes)
  );

  // Escáner de cámara
  const [isRackScannerModalOpen, setIsRackScannerModalOpen] = React.useState(false);
  const [scannedRackInput, setScannedRackInput] = React.useState('');
  const [rackScanError, setRackScanError] = React.useState<string | null>(null);
  const [verifiedRackQr, setVerifiedRackQr] = React.useState('');
  const [dispatchRack, setDispatchRack] = React.useState<PtiRack | null>(null);
  const [dispatchMode, setDispatchMode] = React.useState<'PIECES' | 'WEIGHT'>('PIECES');
  const [dispatchQuantity, setDispatchQuantity] = React.useState('');
  const [dispatchNotes, setDispatchNotes] = React.useState('');
  const [dispatchQr, setDispatchQr] = React.useState('');
  const [dispatchError, setDispatchError] = React.useState('');
  const [saleExitRack, setSaleExitRack] = React.useState<PtiRack | null>(null);
  const [saleExitError, setSaleExitError] = React.useState('');
  const [saleExitScannedQr, setSaleExitScannedQr] = React.useState('');


  // Modal para edición manual de Precio y Peso por Rack
  const [isEditRackModalOpen, setIsEditRackModalOpen] = React.useState(false);
  const [editingRack, setEditingRack] = React.useState<PtiRack | null>(null);
  const [editUnitPrice, setEditUnitPrice] = React.useState('');
  const [editUnitWeightKg, setEditUnitWeightKg] = React.useState('');

  // Sin peso unitario definido, el modo báscula pide capturar las bobinas
  // contadas manualmente; ese valor también debe habilitar el botón de ingreso.
  const pieces = ingressMode === 'FULL_RACK'
    ? (fullRackTarget?.pieces || 0)
    : ingressMode === 'WEIGHT'
      ? (knownPtiUnitWeight > 0 ? computedPiecesFromScale : (Number(quantityPieces) || 0))
      : (Number(quantityPieces) || 0);
  const expectedRoute = selectedPtiProduct
    ? (selectedPtiProduct.telares_subarea_code === 'TELARES_BANDA' || (!selectedPtiProduct.telares_subarea_code && Number(selectedQueue?.extruder_id) === 1)
      ? 'TELARES_BANDA'
      : selectedPtiProduct.telares_subarea_code === 'TELARES_ROLLO' || (!selectedPtiProduct.telares_subarea_code && [2, 4, 5].includes(Number(selectedQueue?.extruder_id)))
        ? 'TELARES_ROLLO'
        : null)
    : null;
  const rackAssignmentPreview = React.useMemo(() => {
    if (!selectedPtiProduct || !pieces || !expectedRoute) return { allocations: [] as Array<{ rack: PtiRack; pieces: number }>, remaining: pieces };
    const eligible = racks.filter((rack) => {
      if (rack.locked_until_shift_close || rack.available_for_active_shift === false
        || (rack.custody_shift_session_id != null && rack.available_for_active_shift !== true)) return false;
      const occupied = Number(rack.current_quantity || 0);
      if (occupied <= 0) return true;
      return Number(rack.current_pti_product_id) === Number(selectedPtiProduct.id)
        && rack.destination_route === expectedRoute
        && rack.destination_subarea_id == null;
    });
    const firstChoice = [...eligible]
      .sort((a, b) => Number(b.current_quantity || 0) - Number(a.current_quantity || 0) || Number(a.id) - Number(b.id))
      .find((rack) => Number(rack.current_quantity || 0) < Number(rack.max_capacity || 100));
    const allocationOrder = firstChoice
      ? [firstChoice, ...eligible.filter((rack) => rack.id !== firstChoice.id).sort((a, b) => Number(a.id) - Number(b.id))]
      : [];
    let remaining = pieces;
    const allocations: Array<{ rack: PtiRack; pieces: number }> = [];
    for (const rack of allocationOrder) {
      const available = Math.max(0, Number(rack.max_capacity || 100) - Number(rack.current_quantity || 0));
      const assigned = Math.min(remaining, available);
      if (assigned > 0) allocations.push({ rack, pieces: assigned });
      remaining -= assigned;
      if (remaining <= 0) break;
    }
    return { allocations, remaining: Math.max(0, remaining) };
  }, [racks, selectedPtiProduct, pieces, expectedRoute]);
  const isIngressSubmitDisabled = isSubmitting || !selectedPtiMaterialId || pieces <= 0 || !expectedRoute || rackAssignmentPreview.remaining > 0;
  const ingressSubmitHint = !selectedPtiMaterialId
    ? 'Selecciona el PTI'
    : pieces <= 0
      ? 'Captura cantidad'
      : !expectedRoute
        ? 'Configura el destino del PTI'
        : rackAssignmentPreview.remaining > 0
          ? 'Completa la asignación de racks'
          : 'Confirmar ingreso a rack';

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

  const confirmScannedRack = (value: string) => {
    const clean = value.trim().toUpperCase();
    setVerifiedRackQr('');
    const matched = racks.find((rack) => String(rack.qr_code || '').trim().toUpperCase() === clean);
    if (!matched) {
      onRackQrChange('');
      setRackScanError('El código leído no corresponde al QR de un rack registrado. Escanea la etiqueta del rack e inténtalo de nuevo.');
      return false;
    }
    setRackScanError(null);
    setVerifiedRackQr(String(matched.qr_code).trim().toUpperCase());
    onSelectRackFromGrid(matched);
    return true;
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

  const handleDispatchRack = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dispatchRack) return;
    setDispatchError('');
    try {
      const result = await onDispatchToWarehouse(dispatchRack.id, dispatchMode === 'PIECES'
        ? { quantity_pieces: Number(dispatchQuantity), notes: dispatchNotes }
        : { weight_kg: Number(dispatchQuantity), notes: dispatchNotes });
      setDispatchQr(String(result.qr_code || result.transfer_code));
      setDispatchQuantity('');
      setDispatchNotes('');
      setDispatchRack(null);
    } catch (error: any) {
      setDispatchError(error?.friendlyMessage || error?.response?.data?.message || error?.message || 'No se pudo generar la transferencia.');
    }
  };

  const handleSaleExit = async () => {
    if (!saleExitRack) return;
    setSaleExitError('');
    try {
      await onRegisterSaleExit(saleExitRack.id, { rack_qr: saleExitScannedQr.trim() });
      setSaleExitRack(null);
      setSaleExitScannedQr('');
    } catch (error: any) {
      setSaleExitError(error?.friendlyMessage || error?.response?.data?.message || error?.message || 'No se pudo registrar la salida a Venta.');
    }
  };

  const downloadDispatchQr = () => {
    const svg = document.getElementById('pti-warehouse-transfer-qr');
    if (!svg || !dispatchQr) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${dispatchQr}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRackCode.trim() || !onCreateRack) return;
    try {
      const createdRack = await onCreateRack({
        virgin_qr_code: newRackCode.trim().toUpperCase(),
        max_capacity: Number(newMaxCapacity) || 100
      });
      setNewRackCode('');
      setIsRackModalOpen(false);
      onSelectRackFromGrid(createdRack);
      setVerifiedRackQr(String(createdRack.qr_code || '').trim().toUpperCase());
      setActiveTab('INGRESS');
      setRackQrLabels([createdRack]);
    } catch {
      // handled
    }
  };

  const toggleRackSelection = (rackId: number) => {
    setSelectedRackIds((current) => current.includes(rackId)
      ? current.filter((id) => id !== rackId)
      : [...current, rackId]);
  };

  const handleSelectVisibleRacks = () => {
    const visibleIds = filteredRacks.map((rack) => rack.id);
    const allVisibleSelected = visibleIds.every((id) => selectedRackIds.includes(id));
    setSelectedRackIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const handleDownloadSelectedRackQrs = () => {
    const selected = racks.filter((rack) => selectedRackIds.includes(rack.id));
    if (selected.length) setRackQrLabels(selected);
  };

  // Seleccionar rack desde el mapa y pasar de inmediato a la terminal de ingreso
  const handlePickRackForIngress = (rack: PtiRack) => {
    setVerifiedRackQr('');
    onSelectRackFromGrid(rack);
    setActiveTab('INGRESS');
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabOrder: Array<'INGRESS' | 'RACKS' | 'BALANCE'> = ['INGRESS', 'RACKS', 'BALANCE'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : event.key === 'Home' ? -currentIndex
      : event.key === 'End' ? tabOrder.length - 1 - currentIndex
      : 0;

    if (direction === 0) return;
    event.preventDefault();
    const nextTab = tabOrder[(currentIndex + direction + tabOrder.length) % tabOrder.length];
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`pti-tab-${nextTab.toLowerCase()}`)?.focus());
  };

  // Filtrado de racks en Pestaña 2
  const filteredRacks = React.useMemo(() => {
    return racks.filter((rack) => {
      // Filtro por estatus
      if (rackFilter === 'VACIO' && (rack.status !== 'VACIO' || rack.available_for_active_shift === false)) return false;
      if (rackFilter === 'DISPONIBLE' && ((rack.status !== 'DISPONIBLE' && rack.status !== 'VACIO') || rack.available_for_active_shift === false)) return false;
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
    <div className="extrusion-workspace p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 pb-32">
      {/* ========================================================= */}
      {/* CABECERA PRINCIPAL: ESTACIÓN DE EMPAQUE INTERMEDIO */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              Ingreso de PTI a Racks
            </h1>
            <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              Registra las bobinas en el rack y descuenta automáticamente el material consumido.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:w-auto sm:items-center sm:gap-2.5">
          {onCreateRack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRackModalOpen(true)}
              className="min-h-11 w-full justify-center px-2 sm:w-auto sm:px-3 text-sm font-bold border-border gap-1.5"
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
            className={`min-h-11 w-full justify-center px-2 sm:w-auto sm:px-3 text-sm font-bold border-border gap-1.5 ${!onCreateRack ? 'min-[360px]:col-span-2' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SELECTOR DE PESTAÑAS INDUSTRIALES (GRANDES Y TÁCTILES) */}
      {/* ========================================================= */}
      <div role="tablist" aria-label="Secciones de ingreso de PTI" className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-muted/40 p-1.5 sm:gap-2">
        {/* Tab 1: Terminal de Ingreso */}
        <button
          type="button"
          id="pti-tab-ingress"
          role="tab"
          aria-label="1. Registrar ingreso · Ingreso de planta, 3 pasos"
          aria-selected={activeTab === 'INGRESS'}
          aria-controls="pti-panel-ingress"
          tabIndex={activeTab === 'INGRESS' ? 0 : -1}
          onClick={() => setActiveTab('INGRESS')}
          onKeyDown={handleTabKeyDown}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-black leading-tight transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-sm sm:text-left sm:uppercase sm:tracking-wide xl:text-base ${
            activeTab === 'INGRESS'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Boxes className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <div className="min-w-0 sm:text-left">
            <span className="block sm:hidden">Ingreso</span>
            <span className="hidden leading-tight sm:block">1. Registrar Ingreso</span>
            <span className="hidden text-sm font-semibold normal-case opacity-85 xl:block">
              Ingreso de planta · 3 pasos
            </span>
          </div>
        </button>

        {/* Tab 2: Mapa de Racks en Piso */}
        <button
          type="button"
          id="pti-tab-racks"
          role="tab"
          aria-label={`2. Racks en piso · ${racks.length} racks · Disponibilidad física`}
          aria-selected={activeTab === 'RACKS'}
          aria-controls="pti-panel-racks"
          tabIndex={activeTab === 'RACKS' ? 0 : -1}
          onClick={() => setActiveTab('RACKS')}
          onKeyDown={handleTabKeyDown}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-black leading-tight transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-sm sm:text-left sm:uppercase sm:tracking-wide xl:text-base ${
            activeTab === 'RACKS'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Archive className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <div className="min-w-0 sm:text-left">
            <span className="inline-flex items-center gap-1 sm:hidden">Racks <Badge variant={activeTab === 'RACKS' ? 'secondary' : 'outline'} className="min-h-5 px-1.5 text-[10px] font-mono font-bold">{racks.length}</Badge></span>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="block leading-tight">2. Racks en Piso</span>
              <Badge
                variant={activeTab === 'RACKS' ? 'secondary' : 'outline'}
                className="min-h-6 px-2 text-xs font-mono font-bold"
              >
                {racks.length}
              </Badge>
            </div>
            <span className="hidden text-sm font-semibold normal-case opacity-85 xl:block">
              Disponibilidad física
            </span>
          </div>
        </button>

        {/* Tab 3: Balance y Finanzas */}
        <button
          type="button"
          id="pti-tab-balance"
          role="tab"
          aria-label="3. Balance y auditoría · Existencias, consumo y costos"
          aria-selected={activeTab === 'BALANCE'}
          aria-controls="pti-panel-balance"
          tabIndex={activeTab === 'BALANCE' ? 0 : -1}
          onClick={() => setActiveTab('BALANCE')}
          onKeyDown={handleTabKeyDown}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-black leading-tight transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16 sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-sm sm:text-left sm:uppercase sm:tracking-wide xl:text-base ${
            activeTab === 'BALANCE'
              ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Scale className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <div className="min-w-0 sm:text-left">
            <span className="block sm:hidden">Balance</span>
            <span className="hidden leading-tight sm:block">3. Balance y Auditoría</span>
            <span className="hidden text-sm font-semibold normal-case opacity-85 xl:block">
              Existencias, consumo y costos
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: REGISTRO RÁPIDO DE INGRESO (ENFOCADO EN EL OPERADOR) */}
      {/* ========================================================= */}
      {activeTab === 'INGRESS' && (
        <div id="pti-panel-ingress" role="tabpanel" aria-labelledby="pti-tab-ingress" tabIndex={0} className="w-full max-w-[1400px] mx-auto space-y-5 animate-in fade-in duration-150 focus-visible:outline-none lg:pr-16">
          {racks.length === 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-black text-foreground">Aún no hay racks registrados</strong>
                <p className="mt-1 text-xs text-muted-foreground">Registra el rack; el sistema generará su QR para imprimir y colocarlo en el equipo.</p>
              </div>
              {onCreateRack && (
                <Button type="button" onClick={() => setIsRackModalOpen(true)} className="min-h-11 shrink-0 gap-2 font-bold">
                  <Boxes className="h-4 w-4" /> Registrar rack y generar QR
                </Button>
              )}
            </div>
          )}

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
          <div className="extrusion-ingress-flow bg-card border border-border rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
            {/* ---------------------------------------------------- */}
            {/* PASO 1: SELECCIONA LA MEZCLA ACTIVA */}
            {/* ---------------------------------------------------- */}
            <div className="extrusion-ingress-step space-y-3 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                    ¿En qué extrusora se produjo el PTI?
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Selecciona la extrusora; el sistema identificará su contenedor activo.
                  </p>
                </div>
              </div>

              {/* Selector plegable de mezclas activas en planta */}
              {activeQueues.length > 0 ? (
                <section className="rounded-xl border border-border bg-background/50 overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={showActiveQueues}
                    aria-controls="active-extrusion-queues"
                    onClick={() => setShowActiveQueues((isOpen) => !isOpen)}
                    className="w-full min-h-14 px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        {selectedQueue ? `Extrusora ${selectedQueue.extruder_id} · mezcla activa` : 'Selecciona una extrusora activa'}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground mt-0.5">
                        {selectedQueue
                          ? `${selectedQueue.formula?.name || selectedQueue.formula?.code || 'Fórmula'} · contenedor identificado automáticamente`
                          : `${activeQueues.length} ${activeQueues.length === 1 ? 'extrusora activa' : 'extrusoras activas'}`}
                      </span>
                    </span>
                    <span className="shrink-0 flex items-center gap-2 text-xs font-bold text-primary">
                      {showActiveQueues ? 'Ocultar opciones' : 'Cambiar mezcla'}
                      {showActiveQueues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  <div id="active-extrusion-queues" hidden={!showActiveQueues} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 pt-1">
                  {activeQueues.map((q) => {
                    const isSelected = mixtureQr === q.consumption_order_qr_id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          onSelectQueueFromList(q);
                          setShowActiveQueues(false);
                        }}
                    className={`min-w-0 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                            : 'border-border bg-background hover:border-primary/40'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-xs uppercase px-2 py-0.5 rounded bg-muted text-foreground">
                            Extrusora {q.extruder_id}
                          </span>
                          {isSelected ? (
                            <Badge variant="default" className="max-w-full shrink-0 whitespace-nowrap text-[10px] font-black uppercase gap-1">
                              <Check className="h-3 w-3" /> Seleccionada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/30">
                              En Proceso
                            </Badge>
                          )}
                        </div>
                        <span className="block break-all font-mono text-sm sm:text-base font-black leading-snug text-foreground select-all">
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
                </section>
              ) : (
                <p className="text-xs text-amber-500 font-bold bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                  No hay extrusoras con una mezcla activa. Registra la producción cuando una mezcla esté activa.
                </p>
              )}

              {/* Ficha Resumen de la Fórmula si está identificada */}
              {selectedFormula && (
                <div className="p-3 bg-muted/30 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="min-w-0 break-words">Fórmula: <strong className="text-foreground">{selectedFormula.name}</strong><span className="block text-muted-foreground">Color(es) PTI: {[...new Set((selectedFormula.ptiProducts || []).filter((pti) => pti.is_active && pti.color).map((pti) => pti.color))].join(', ') || 'sin PTI enlazado'}</span></span>
                  </div>
                  <div className="shrink-0 font-mono text-muted-foreground sm:text-right">
                    Peso Teórico: <strong className="text-primary">{theoreticalWeightPerPiece} kg/pza</strong>
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* PASO 2: ASIGNACIÓN AUTOMÁTICA A RACKS */}
            {/* ---------------------------------------------------- */}
            <div className="extrusion-ingress-step space-y-3 pb-6 border-b border-border">
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4 items-start">
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">2</div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-foreground">Racks compatibles</h2>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">El sistema asigna las bobinas automáticamente.</p>
                  <details className="mt-1.5 text-xs text-muted-foreground">
                    <summary className="min-h-11 inline-flex cursor-pointer items-center font-bold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                      ¿Qué hago si falta espacio?
                    </summary>
                    <p className="mt-1 leading-snug">Registra un rack vacío con QR virgen. No necesitas escanear racks existentes.</p>
                  </details>
                </div>
              </div>

              {/* PTI determinado por la mezcla; no se puede sustituir manualmente */}
              <div className="min-w-0">
                <label className="text-xs font-black uppercase text-foreground block mb-1">
                  PTI de salida · definido por la fórmula
                </label>
                {selectedPtiProduct ? (
                  <div className="min-h-14 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      <strong className="block break-words text-sm text-foreground">{selectedPtiProduct.code} · {selectedPtiProduct.name}</strong>
                      <span className="text-xs text-muted-foreground">Color: {selectedPtiProduct.color || 'sin definir'} · {selectedPtiProduct.unit_weight_kg == null ? 'peso unitario pendiente' : `${Number(selectedPtiProduct.unit_weight_kg).toFixed(3)} kg/pza`}</span>
                    </span>
                    <Badge variant="outline" className="min-h-7 shrink-0 border-primary/40 text-primary">Automático · no editable</Badge>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {selectedQueue && ptiProducts.length > 1
                      ? 'La mezcla no identifica cuál de los PTI enlazados debe producirse. Corrige el enlace de salida en el catálogo antes de registrar.'
                      : 'La mezcla no tiene un PTI de salida enlazado. Corrige el catálogo o la asignación de la mezcla antes de registrar.'}
                  </div>
                )}
              </div>
              </div>

              {selectedPtiProduct && (
                <p className="text-xs leading-snug text-muted-foreground">
                  <strong className="text-foreground">Destino:</strong>{' '}
                  {selectedPtiProduct.telares_subarea_code === 'NO_APLICA'
                    ? 'Fuera de Telares'
                    : expectedRoute ? PTI_DESTINATION_LABELS[expectedRoute] : 'Por definir'}
                  {' · '}La ruta final se define en Telares.
                </p>
              )}

              <section className="rounded-xl border border-border bg-background/50 p-3 sm:p-4 space-y-2" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-black text-foreground">Asignación prevista de racks</strong>
                  <span className="text-xs font-bold text-muted-foreground">
                    {selectedPtiProduct?.telares_subarea_code === 'NO_APLICA'
                      ? 'Fuera de Telares'
                      : expectedRoute ? PTI_DESTINATION_LABELS[expectedRoute] : 'Destino pendiente'}
                  </span>
                </div>
                {rackAssignmentPreview.allocations.length > 0 ? (
                  <ul className="space-y-1.5">
                    {rackAssignmentPreview.allocations.map(({ rack, pieces: assigned }) => (
                      <li key={rack.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-bold text-foreground">{rack.rack_code}<span className="ml-2 text-xs font-medium text-muted-foreground">{Number(rack.current_quantity || 0)} / {Number(rack.max_capacity || 100)} piezas</span></span>
                        <span className="font-mono font-black text-primary">+{assigned} piezas</span>
                      </li>
                    ))}
                  </ul>
                ) : pieces > 0 && selectedPtiProduct ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <p className="text-sm text-amber-700 dark:text-amber-300">No hay racks con espacio disponible.</p>
                    <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => setIsRackModalOpen(true)}>Crear rack con QR</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Captura la cantidad para ver los racks sugeridos.</p>
                )}
                {rackAssignmentPreview.remaining > 0 && rackAssignmentPreview.allocations.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Faltan racks para {rackAssignmentPreview.remaining} piezas.</p>
                    {onCreateRack && <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => setIsRackModalOpen(true)}>Crear rack con QR</Button>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Se valida nuevamente al confirmar.</p>
              </section>
            </div>

            {/* ---------------------------------------------------- */}
            {/* PASO 3: CANTIDAD Y BÁSCULA */}
            {/* ---------------------------------------------------- */}
            <div className="extrusion-ingress-step extrusion-ingress-step--count space-y-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                    Cantidad de Bobinas / Peso en Báscula
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Completa un rack o registra una cantidad por piezas o peso parcial.
                  </p>
                </div>
              </div>

              {/* Botones Grandes de Toggle Modo */}
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onIngressModeChange('FULL_RACK')}
                  disabled={!fullRackTarget?.pieces || knownPtiUnitWeight <= 0}
                  className={`min-h-14 rounded-xl border-2 px-3 py-3 font-black text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    ingressMode === 'FULL_RACK'
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Boxes className="h-4 w-4 shrink-0" />
                  <span>Completar rack</span>
                </button>
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
                  <span>Peso parcial (kg)</span>
                </button>
              </div>

              {ingressMode === 'FULL_RACK' ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
                  <p className="text-sm font-black text-foreground">Ingreso para completar un rack</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fullRackTarget?.rackCode
                      ? <>Se asignará a <strong className="text-foreground">{fullRackTarget.rackCode}</strong>.</>
                      : 'Se asignará a un rack nuevo compatible; si hace falta, el sistema solicitará un QR virgen.'}
                  </p>
                  <div className="mt-3 grid gap-2 rounded-lg bg-background/70 p-3 text-sm sm:grid-cols-2">
                    <span>Piezas para completar</span><strong className="font-mono tabular-nums">{fullRackTarget?.pieces || 0} pzas</strong>
                    <span>Peso estándar estimado</span><strong className="font-mono tabular-nums">{((fullRackTarget?.pieces || 0) * knownPtiUnitWeight).toFixed(3)} kg</strong>
                  </div>
                  {knownPtiUnitWeight <= 0 && <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">Registra primero el peso estándar por bobina en el Catálogo de PTI.</p>}
                </div>
              ) : ingressMode === 'PIECES' ? (
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
                  <div className="pt-1">
                    <span className="mb-2 block text-xs font-bold text-muted-foreground sm:mb-1 sm:inline-block sm:mr-2">Sumar rápido:</span>
                    <div className="grid grid-cols-4 gap-2 sm:inline-grid">
                      {[5, 10, 25, 50].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleAddPieces(num)}
                          className="min-h-11 min-w-0 rounded-lg border border-border bg-muted/50 px-2 py-2 text-sm font-mono font-bold transition-all cursor-pointer hover:bg-primary hover:text-primary-foreground sm:px-3"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimación de Peso Total */}
                  <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs font-bold text-muted-foreground flex justify-between items-center">
                    <span>Peso total estimado en báscula:</span>
                    <strong className="font-mono text-foreground text-sm">
                      {knownPtiUnitWeight > 0 ? `${((Number(quantityPieces) || 0) * knownPtiUnitWeight).toFixed(2)} KG` : 'Peso unitario pendiente'}
                    </strong>
                  </div>
                  {knownPtiUnitWeight <= 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Registra el peso estándar de este PTI en su catálogo para calcular el peso estimado.</p>}
                </div>
              ) : (
                /* Input Modo 2: Peso en Báscula */
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                    <span>Peso parcial medido en báscula *</span>
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
                  <p className="text-sm text-muted-foreground">Conversión con peso estándar del catálogo: <strong className="font-mono text-foreground">{knownPtiUnitWeight > 0 ? `${computedPiecesFromScale} pzas · ${(computedPiecesFromScale * knownPtiUnitWeight).toFixed(3)} kg estándar` : 'falta configurar el peso estándar del PTI'}</strong></p>
                  <p className="text-xs text-muted-foreground">El peso de báscula se conserva como peso neto medido; el número de piezas se estima redondeando con el estándar del PTI.</p>

                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between text-xs font-bold text-foreground">
                    <span>
                      Peso estándar por bobina: <strong>{knownPtiUnitWeight > 0 ? `${knownPtiUnitWeight.toFixed(3)} kg/pza` : 'Pendiente en Catálogo de PTI'}</strong>
                    </span>
                    {knownPtiUnitWeight > 0 && <span className="text-primary font-mono font-black text-sm">
                      → Equivale a: {computedPiecesFromScale} bobinas
                    </span>}
                  </div>
                  {knownPtiUnitWeight <= 0 && <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">No se puede convertir peso a piezas sin el peso estándar del PTI. Completa ese dato en el catálogo.</p>}
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
                  <label className="block space-y-1 text-[11px] font-bold uppercase text-muted-foreground">Turno<select value={shiftCode} onChange={(event) => onShiftCodeChange(event.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-foreground"><option>TURNO_1</option><option>TURNO_2</option></select></label>

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
              onClick={async () => {
                const result = await onSubmitIngress();
                if (result?.created_racks?.length) setRackQrLabels(result.created_racks);
              }}
              disabled={isIngressSubmitDisabled}
              className={`mt-2 mb-1 w-full h-auto min-h-14 whitespace-normal break-words px-3 py-3 text-sm sm:text-lg font-black uppercase tracking-normal sm:tracking-wider leading-tight text-center shadow-md transition-all gap-2 disabled:opacity-100 ${
                isIngressSubmitDisabled
                  ? 'bg-muted text-foreground cursor-not-allowed border border-border'
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
                  {!isIngressSubmitDisabled && <CheckCircle2 className="h-6 w-6" />}
                  <span className="whitespace-normal leading-tight">{ingressSubmitHint}</span>
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
        <div id="pti-panel-racks" role="tabpanel" aria-labelledby="pti-tab-racks" tabIndex={0} className="space-y-5 animate-in fade-in duration-150 focus-visible:outline-none lg:pr-16">
          {/* Barra de Filtros y Búsqueda */}
          <CollapsibleFilterPanel title="Buscar y filtrar racks" summary={`${filteredRacks.length} racks · ${rackFilter === 'ALL' ? 'Todos' : rackFilter === 'VACIO' ? 'Libres' : rackFilter === 'DISPONIBLE' ? 'En uso' : 'Llenos'}${rackSearch ? ` · ${rackSearch}` : ''}`}>
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                variant={rackFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('ALL')}
                className="h-11 px-3 text-sm font-bold"
              >
                Todos ({racks.length})
              </Button>
              <Button
                variant={rackFilter === 'VACIO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('VACIO')}
                className="h-11 px-3 text-sm font-bold text-emerald-600 dark:text-emerald-400"
              >
                Libres ({racks.filter((r) => r.status === 'VACIO' && r.available_for_active_shift !== false).length})
              </Button>
              <Button
                variant={rackFilter === 'DISPONIBLE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('DISPONIBLE')}
                className="h-11 px-3 text-sm font-bold text-sky-600 dark:text-sky-400"
              >
                En Uso ({racks.filter((r) => r.status === 'DISPONIBLE' && r.available_for_active_shift !== false).length})
              </Button>
              <Button
                variant={rackFilter === 'LLENO' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRackFilter('LLENO')}
                className="h-11 px-3 text-sm font-bold text-rose-600 dark:text-rose-400"
              >
                Llenos ({racks.filter((r) => r.status === 'LLENO').length})
              </Button>
            </div>

            <div className="relative w-full 2xl:max-w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, QR o producto"
                value={rackSearch}
                onChange={(e) => setRackSearch(e.target.value)}
                className="pl-10 min-h-11 text-base border"
              />
            </div>
            <div className="flex w-full flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:justify-end 2xl:w-auto 2xl:border-0 2xl:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectVisibleRacks}
                disabled={filteredRacks.length === 0}
                className="min-h-11 gap-1.5 px-3 text-sm font-bold"
              >
                {filteredRacks.length > 0 && filteredRacks.every((rack) => selectedRackIds.includes(rack.id)) ? 'Quitar selección visible' : 'Seleccionar visibles'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDownloadSelectedRackQrs}
                disabled={selectedRackIds.length === 0}
                className="min-h-11 gap-1.5 px-3 text-sm font-bold"
              >
                <Download className="h-3.5 w-3.5" /> Descargar QRs ({selectedRackIds.length})
              </Button>
            </div>
            </div>
          </CollapsibleFilterPanel>

          {/* Grid de Racks */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredRacks.map((rack) => {
              const percent = Math.min(
                100,
                Math.round(((rack.current_quantity || 0) / (rack.max_capacity || 100)) * 100)
              );
              const isSelected = selectedRack?.id === rack.id || rackQr === rack.qr_code;
              const isLockedForAnotherShift = rack.locked_until_shift_close === true || rack.available_for_active_shift === false;
              const isVacio = Number(rack.current_quantity || 0) <= 0;
              const isLleno = rack.status === 'LLENO' || Number(rack.current_quantity || 0) >= Number(rack.max_capacity || 100);
              const hasUnidentifiedPti = !isVacio && !rack.current_pti_product_id;
              const rackPtiLabel = rack.currentPtiProduct
                ? `${rack.currentPtiProduct.name} · Color ${rack.currentPtiProduct.color || 'sin definir'}`
                : rack.currentPtiType?.name || (hasUnidentifiedPti ? 'PTI sin identificar · bloqueado' : 'Libre (Sin Condicionar)');

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
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="block break-words font-black text-lg leading-tight text-foreground">{rack.rack_code}</span>
                        <div>
                          <span className="inline-block max-w-full break-all font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {rack.qr_code}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground font-semibold block">
                          Ubicación: {rack.location_name || 'Almacén Piso'}
                        </span>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-muted/50" title={`Seleccionar ${rack.rack_code} para descargar su QR`}>
                          <span className="sr-only">Seleccionar rack {rack.rack_code} para descargar su QR</span>
                        <input
                          type="checkbox"
                          checked={selectedRackIds.includes(rack.id)}
                          onChange={() => toggleRackSelection(rack.id)}
                          aria-label={`Seleccionar rack ${rack.rack_code} para descargar su QR`}
                          className="h-6 w-6 cursor-pointer accent-primary"
                        />
                        </label>
                        <Badge
                          variant={isLockedForAnotherShift || isLleno || hasUnidentifiedPti ? 'destructive' : isVacio ? 'secondary' : 'default'}
                          className="min-h-7 px-2 text-xs font-black uppercase"
                        >
                          {isLockedForAnotherShift ? 'Custodia · bloqueado' : isLleno ? 'Lleno' : hasUnidentifiedPti ? 'Bloqueado · conciliar' : isVacio ? 'Libre' : 'Condicionado'}
                        </Badge>
                      </div>
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
                      <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-sm font-mono font-bold text-muted-foreground tabular-nums">
                        <span>
                          {rack.current_quantity} / {rack.max_capacity} piezas ({percent}%)
                        </span>
                        <span className="text-foreground">
                          Disponibles: {Math.max(0, rack.max_capacity - rack.current_quantity)}
                        </span>
                      </div>
                      {rack.custody_shift_session_id != null && <p className={`text-xs font-bold ${isLockedForAnotherShift ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>{isLockedForAnotherShift ? 'Bloqueado hasta cerrar el turno que lo produjo.' : 'Bajo custodia del turno activo; solo Extrusión puede seguir llenándolo.'}</p>}
                    </div>

                    {/* Condicionamiento */}
                    <div className={`p-3 border rounded-xl text-sm space-y-1 ${hasUnidentifiedPti ? 'bg-destructive/10 border-destructive/40' : 'bg-muted/20 border-border'}`}>
                      <span className="text-muted-foreground block text-xs font-bold uppercase">
                        Condicionado a:
                      </span>
                      <strong className="text-foreground block break-words">
                        {rackPtiLabel}
                      </strong>
                      {rack.destination_route && <strong className="mt-1 block text-xs font-black uppercase text-primary">Destino: {PTI_DESTINATION_LABELS[rack.destination_route]}</strong>}
                    </div>

                    {/* Datos Financieros */}
                    <div className={`grid ${canViewCosts ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'} gap-3 text-sm font-bold pt-1`}>
                      {canViewCosts && <div>
                        <span className="text-muted-foreground text-xs block">Precio por bobina:</span>
                        <span className="font-mono text-foreground">${rack.unit_price || 0} MXN</span>
                      </div>}
                      <div>
                        <span className="text-muted-foreground text-xs block">Peso por bobina:</span>
                        <span className="font-mono text-foreground">{rack.unit_weight_kg == null ? 'Pendiente' : `${rack.unit_weight_kg} kg`}</span>
                      </div>
                      {canViewCosts && <div><span className="text-muted-foreground text-xs block">Costo por kg:</span><span className="font-mono text-foreground">{rack.unit_cost_per_kg == null ? 'Pendiente' : `$${Number(rack.unit_cost_per_kg).toFixed(4)}/kg`}</span></div>}
                    </div>
                  </div>

                  {/* Acciones al Pie */}
                  <div className="grid grid-cols-1 min-[360px]:grid-cols-2 items-stretch gap-2 pt-2 border-t border-border sm:flex sm:items-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRackQrLabels([rack])}
                      className="min-h-11 h-auto w-full min-w-0 justify-center whitespace-normal px-2 py-2 text-center text-sm leading-tight font-bold border-border sm:w-auto sm:gap-1.5 sm:px-3"
                      title={`Descargar QR de ${rack.rack_code}`}
                      aria-label={`Descargar QR del rack ${rack.rack_code}`}
                    >
                      <QrCode className="h-4 w-4" /> Descargar QR
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePickRackForIngress(rack)}
                      disabled={isLleno || hasUnidentifiedPti}
                      className={`min-h-11 h-auto w-full min-w-0 flex-1 justify-center whitespace-normal px-2 py-2 text-center text-sm leading-tight font-bold sm:gap-1.5 sm:px-3 ${hasUnidentifiedPti ? 'bg-destructive/10 text-destructive border border-destructive/40' : 'bg-primary text-primary-foreground'}`}
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      <span>{isLleno ? 'Rack Lleno' : hasUnidentifiedPti ? 'PTI sin identificar' : 'Usar este Rack'}</span>
                    </Button>

                    {canViewCosts && <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleOpenEditRack(rack, e)}
                      aria-label={`Editar valores del rack ${rack.rack_code}`}
                      className="min-h-11 min-w-11 w-full px-3 text-sm font-bold border-border min-[360px]:col-span-2 sm:col-span-1 sm:w-11"
                      title="Editar precio histórico y peso por bobina"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sm:hidden">Editar rack</span>
                    </Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: BALANCE DE MASA Y AUDITORÍA FINANCIERA (SUPERVISOR) */}
      {/* ========================================================= */}
      {activeTab === 'BALANCE' && (
        <div id="pti-panel-balance" role="tabpanel" aria-labelledby="pti-tab-balance" tabIndex={0} className="space-y-6 animate-in fade-in duration-150 focus-visible:outline-none lg:pr-16">
          {/* Sección 1: Valorización Financiera en Extrusión (WIP) */}
          {canViewCosts && valuation && (
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-foreground">
                      Valorización en Extrusión (WIP Total)
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground">
                      Control contable de materias primas activas en tolvas y racks intermedios.
                    </p>
                  </div>
                </div>

                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3">
                  <span className="text-sm font-bold text-muted-foreground">Índice de costo</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1.0"
                    value={costIndex}
                    onChange={(e) => onCostIndexChange(Number(e.target.value) || 1.15)}
                    aria-label="Índice de costo"
                    className="w-20 h-10 font-mono font-black text-base border"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-sm font-bold text-muted-foreground block mb-1">
                    Mezclas en Espera ({valuation.queued_items_count || 0})
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-foreground tabular-nums">
                    ${Number(valuation.queued_mixes_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-sm font-bold text-muted-foreground block mb-1">
                    Mezclas Activas ({valuation.active_items_count || 0})
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">
                    ${Number(valuation.active_mixes_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-sm font-bold text-muted-foreground block mb-1">
                    PTI en Racks ({valuation.racks_count || 0} racks)
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    ${Number(valuation.pti_racks_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                    Total Extrusión (WIP)
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                    ${Number(valuation.total_extrusion_wip_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {extrusionWip && (
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-foreground">WIP disponible en Extrusión</h2>
                  <p className="text-sm font-medium text-muted-foreground">Material recibido de almacén y mezcla preparada aún disponible.</p>
                </div>
                <Badge variant="outline" aria-label={`${Number(extrusionWip.total_kg || 0).toFixed(2)} kilogramos de WIP`} className="shrink-0 whitespace-nowrap px-2.5 font-mono text-xs font-black sm:text-sm">{Number(extrusionWip.total_kg || 0).toFixed(2)} kg</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <details className="group overflow-hidden rounded-xl border border-border bg-background/30">
                    <summary className="flex min-h-12 list-none cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                      <span>Mezclas preparadas</span>
                      <span className="flex shrink-0 items-center gap-2"><Badge variant="secondary" className="min-h-6 px-2 text-xs font-mono">{(extrusionWip.mixtures || []).length}</Badge><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></span>
                    </summary>
                    <div className="space-y-2 border-t border-border p-3">
                      {(extrusionWip.mixtures || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay mezcla preparada pendiente de consumo.</p>
                      ) : (extrusionWip.mixtures || []).map((mix: any) => (
                        <div key={mix.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                          <div className="min-w-0"><strong className="break-all font-mono">{mix.folio}</strong><div className="text-muted-foreground">{mix.formula || 'Fórmula'} · {mix.status}</div></div>
                          <div className="text-right font-mono font-bold tabular-nums">{Number(mix.remaining_kg).toFixed(2)} kg{canViewCosts && mix.remaining_value != null && <div className="text-muted-foreground">${Number(mix.remaining_value).toFixed(2)}</div>}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="space-y-2">
                  <details className="group overflow-hidden rounded-xl border border-border bg-background/30">
                    <summary className="flex min-h-12 list-none cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                      <span>Materiales por lote</span>
                      <span className="flex shrink-0 items-center gap-2"><Badge variant="secondary" className="min-h-6 px-2 text-xs font-mono">{(extrusionWip.items || []).length}</Badge><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></span>
                    </summary>
                    <div className="space-y-2 border-t border-border p-3">
                      {(extrusionWip.items || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay material en WIP.</p>
                      ) : (extrusionWip.items || []).map((item: any) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                          <div className="min-w-0"><strong className="break-words">{item.material?.name || 'Material'}</strong><div className="break-words text-muted-foreground">Lote {item.lote?.folio || 'sin lote'} · {item.qr_code || 'sin QR'}</div></div>
                          <div className="text-right font-mono font-bold tabular-nums">{Number(item.amount_kg).toFixed(2)} kg{canViewCosts && item.value != null && <div className="text-muted-foreground">${Number(item.value).toFixed(2)}</div>}</div>
                        </div>
                      ))}
                    </div>
                  </details>
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
                    <h2 className="text-base sm:text-lg font-black text-foreground">
                      Balance de masa de Extrusión
                    </h2>
                    <p className="text-sm font-semibold text-muted-foreground">
                      Lote de mezcla: <span className="font-mono text-foreground font-bold break-all">{massBalance.mixture_qr}</span>
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`min-h-9 font-black text-sm px-3 py-1 border-2 ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3 text-sm">
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Peso inicial de mezcla</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {Number(massBalance.batch_size_kg).toFixed(2)} kg
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Merma de mezcla</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                    {Number(massBalance.total_scrap_kg).toFixed(2)} kg
                  </span>
                  <span className="text-sm font-bold text-muted-foreground block">
                    ({Number(massBalance.scrap_percentage).toFixed(2)}% del lote)
                  </span>
                </div>
                {Number(massBalance.purge_material_scrap_kg || 0) > 0 && <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Merma por purga</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">{Number(massBalance.purge_material_scrap_kg).toFixed(3)} kg</span>
                  {canViewCosts && <span className="text-sm font-bold text-muted-foreground block">Costo de merma: ${Number(massBalance.purge_material_scrap_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                </div>}
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Bobinas esperadas / registradas</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {massBalance.expected_output_pieces == null ? `${Number(massBalance.estimated_useful_kg).toFixed(2)} kg útiles` : `${massBalance.expected_output_pieces} / ${Number(massBalance.good_output_pieces || 0)} pzas`}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground block">Peso registrado: {Number(massBalance.good_output_kg || 0).toFixed(2)} kg</span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Rendimiento</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {Number(massBalance.estimated_yield_percentage).toFixed(2)}%
                  </span>
                </div>
                {canViewCosts && <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                  <span className="text-sm font-bold text-muted-foreground block">Valor del PTI producido</span>
                  <span className="font-mono font-black text-foreground text-base">
                    {massBalance.pti_output_cost == null ? 'Pendiente de costo' : `$${Number(massBalance.pti_output_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground block">Costo transformado por índice del PTI</span>
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
        <DialogContent className="min-w-0 sm:max-w-md bg-card border-2 border-border text-foreground">
          <DialogHeader className="min-w-0 pr-12 text-left">
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
      <Dialog open={isRackModalOpen} onOpenChange={(open) => { setIsRackModalOpen(open); if (!open) setNewRackCode(''); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] min-w-0 gap-5 rounded-xl border border-border bg-card p-4 text-foreground sm:max-w-md sm:p-6">
          <DialogHeader className="min-w-0 pr-12 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-extrabold leading-snug sm:text-xl">
              <Boxes className="h-5 w-5 shrink-0 text-primary" />
              <span>Registrar rack PTI</span>
            </DialogTitle>
            <DialogDescription className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              Escanea el QR virgen. La ubicación se asignará automáticamente a tu área.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRack} className="w-full min-w-0 space-y-5">
            <section aria-labelledby="new-rack-qr-label" role="group" className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span id="new-rack-qr-label" className="min-w-0 text-sm font-bold text-foreground">QR virgen del rack <span aria-hidden="true" className="text-destructive">*</span></span>
                <QrScannerButton title="Escanear QR virgen para el rack" onScan={(value) => setNewRackCode(value.trim().toUpperCase())} />
              </div>
              <div className={`min-w-0 rounded-lg border px-3 py-3 text-sm ${newRackCode ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border bg-background'}`} aria-live="polite">
                <span className="block text-xs font-bold text-muted-foreground">{newRackCode ? 'Código leído' : 'Esperando escaneo'}</span>
                <strong className="mt-1 block break-all font-mono text-foreground">{newRackCode || 'Escanea la etiqueta del rack para continuar'}</strong>
              </div>
            </section>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <label htmlFor="new-rack-capacity" className="text-sm font-bold text-foreground">
                  Capacidad Máxima *
                </label>
                <Input
                  id="new-rack-capacity"
                  type="number"
                  min="1"
                  max="1000"
                  value={newMaxCapacity}
                  onChange={(e) => setNewMaxCapacity(e.target.value)}
                  required
                  className="w-full min-w-0 font-mono font-bold"
                  data-testid="new-rack-capacity-input"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-rack-location" className="text-sm font-bold text-foreground">Ubicación asignada</label>
                <Input id="new-rack-location" value={defaultRackLocation} readOnly className="min-h-11 border-border bg-muted/30 text-sm font-semibold text-foreground" />
              </div>
            </div>

            <DialogFooter className="w-full min-w-0 gap-2 border-t border-border pt-4 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRackModalOpen(false)}
                className="min-h-11 w-full font-bold sm:w-auto sm:min-w-28"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingRack || !newRackCode.trim()}
                className="min-h-12 w-full min-w-0 whitespace-normal px-3 text-center leading-tight font-bold bg-primary text-primary-foreground disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border sm:flex-1"
                data-testid="submit-create-rack-btn"
              >
                {isCreatingRack ? 'Registrando...' : 'Vincular QR y registrar Rack'}
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
          <DialogHeader className="min-w-0 pr-12 text-left">
            <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Escanear QR de Rack Físico
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Lee el QR impreso en el rack con el lector o la cámara. El código visible del rack no sustituye al QR.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = scannedRackInput.trim().toUpperCase();
              if (!clean) return;
              if (confirmScannedRack(clean)) {
                setIsRackScannerModalOpen(false);
                setScannedRackInput('');
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-foreground">
                Código QR del Rack *
              </label>
              <Input
                autoFocus
                placeholder="Escanea el QR físico del rack"
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

      <Dialog open={Boolean(dispatchRack)} onOpenChange={(open) => { if (!open && !isDispatchingToWarehouse) setDispatchRack(null); }}>
        <DialogContent className="sm:max-w-xl bg-card border-2 border-border text-foreground">
          <DialogHeader className="min-w-0 pr-12 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><ArrowRight className="h-5 w-5 text-emerald-400" /> Salida de PTI a Almacén</DialogTitle>
            <DialogDescription>El QR generado representa una transferencia pendiente. Almacén debe escanearlo para confirmar la entrada y capitalizar el mismo costo.</DialogDescription>
          </DialogHeader>
          {dispatchRack && <form onSubmit={handleDispatchRack} className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="font-black">{dispatchRack.rack_code}</div>
              <div className="text-sm text-muted-foreground">{dispatchRack.currentPtiProduct?.code || dispatchRack.current_pti_product_id} · Ruta: Almacén</div>
              <div className="mt-2 text-sm">Disponible: <b>{dispatchRack.current_quantity} piezas</b>{dispatchRack.unit_weight_kg ? ` · ${Number(dispatchRack.current_quantity * dispatchRack.unit_weight_kg).toFixed(3)} kg` : ''}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={dispatchMode === 'PIECES' ? 'default' : 'outline'} onClick={() => setDispatchMode('PIECES')}>Por piezas</Button>
              <Button type="button" variant={dispatchMode === 'WEIGHT' ? 'default' : 'outline'} onClick={() => setDispatchMode('WEIGHT')}>Por peso (kg)</Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Cantidad {dispatchMode === 'PIECES' ? '(piezas)' : '(kg)'} *</label>
              <Input type="number" min="0.001" step={dispatchMode === 'PIECES' ? '1' : '0.001'} max={dispatchMode === 'PIECES' ? Number(dispatchRack.current_quantity) : undefined} value={dispatchQuantity} onChange={(event) => setDispatchQuantity(event.target.value)} required placeholder={dispatchMode === 'PIECES' ? `Máximo ${dispatchRack.current_quantity}` : 'Peso de bobinas completas'} />
              {dispatchMode === 'WEIGHT' && <p className="text-xs text-muted-foreground">El peso debe corresponder a bobinas completas según el peso unitario configurado.</p>}
            </div>
            <div className="space-y-1.5"><label className="text-sm font-bold">Observaciones (opcional)</label><Input value={dispatchNotes} onChange={(event) => setDispatchNotes(event.target.value)} maxLength={500} /></div>
            {dispatchError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{dispatchError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isDispatchingToWarehouse} onClick={() => setDispatchRack(null)}>Cancelar</Button>
              <Button type="submit" disabled={isDispatchingToWarehouse || !(Number(dispatchQuantity) > 0)}>{isDispatchingToWarehouse ? 'Generando…' : 'Confirmar salida y generar QR'}</Button>
            </DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(saleExitRack)} onOpenChange={(open) => { if (!open && !isRegisteringSaleExit) setSaleExitRack(null); }}>
        <DialogContent className="sm:max-w-xl bg-card border-2 border-border text-foreground">
          <DialogHeader className="min-w-0 pr-12 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><ShieldAlert className="h-5 w-5 text-amber-400" /> Confirmar salida a Venta</DialogTitle>
            <DialogDescription>Esta operación retira todo el contenido del WIP de Extrusión. El QR quedará marcado como vendido y conservará su historial; no podrá entrar a Telares ni a otro proceso.</DialogDescription>
          </DialogHeader>
          {saleExitRack && <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="font-black">{saleExitRack.rack_code} · {saleExitRack.currentPtiProduct?.code || saleExitRack.current_pti_product_id}</div>
              <div className="mt-1 text-sm text-muted-foreground">Ruta confirmada: Venta</div>
              <div className="mt-2 text-sm">Salida total: <b>{saleExitRack.current_quantity} piezas</b>{saleExitRack.unit_weight_kg ? ` · ${(Number(saleExitRack.current_quantity) * Number(saleExitRack.unit_weight_kg)).toFixed(3)} kg aprox.` : ''}</div>
              <div className="mt-1 text-xs text-muted-foreground">Se registrará un folio de salida vinculado al QR actual del rack. La acción no se puede deshacer desde esta pantalla.</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Escanea el QR físico del rack para confirmar *</label>
              <div className="flex gap-2">
                <Input value={saleExitScannedQr} onChange={(event) => setSaleExitScannedQr(event.target.value.trim())} placeholder="QR del rack" className="font-mono" />
                <QrScannerButton title="Escanear QR del rack para salida a Venta" onScan={(value) => { setSaleExitScannedQr(value.trim()); setSaleExitError(''); }} disabled={isRegisteringSaleExit} />
              </div>
              {saleExitScannedQr && saleExitScannedQr.trim().toUpperCase() !== String(saleExitRack.qr_code || '').trim().toUpperCase() && saleExitScannedQr.trim().toUpperCase() !== saleExitRack.rack_code.toUpperCase() && <p className="text-sm font-semibold text-destructive">El QR leído no corresponde a este rack.</p>}
            </div>
            {saleExitError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{saleExitError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isRegisteringSaleExit} onClick={() => setSaleExitRack(null)}>Cancelar</Button>
              <Button type="button" disabled={isRegisteringSaleExit || !saleExitScannedQr.trim() || (saleExitScannedQr.trim().toUpperCase() !== String(saleExitRack.qr_code || '').trim().toUpperCase() && saleExitScannedQr.trim().toUpperCase() !== saleExitRack.rack_code.toUpperCase())} onClick={handleSaleExit} className="bg-amber-500 text-black hover:bg-amber-400">{isRegisteringSaleExit ? 'Registrando…' : 'Confirmar salida total a Venta'}</Button>
            </DialogFooter>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dispatchQr)} onOpenChange={(open) => { if (!open) setDispatchQr(''); }}>
        <DialogContent className="sm:max-w-sm bg-card border-2 border-border text-foreground">
          <DialogHeader className="min-w-0 pr-12 text-left"><DialogTitle className="font-black">Transferencia lista para Almacén</DialogTitle><DialogDescription>El PTI ya salió del WIP de Extrusión. Entrega este QR al personal de Almacén para confirmar la recepción.</DialogDescription></DialogHeader>
          <div className="mx-auto space-y-3 rounded-xl bg-white p-4 text-center"><QRCodeSVG id="pti-warehouse-transfer-qr" value={dispatchQr} size={220} level="H" includeMargin /><div className="break-all font-mono text-xs text-slate-900">{dispatchQr}</div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={downloadDispatchQr}><Download className="mr-2 h-4 w-4" /> Descargar QR SVG</Button><Button type="button" onClick={() => setDispatchQr('')}>Listo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <RackQrLabelsDialog
        racks={rackQrLabels}
        onOpenChange={(open) => { if (!open) setRackQrLabels([]); }}
      />

    </div>
  );
};

export default PtiIngressPresenter;
