import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  useLoomsQuery,
  useBomsQuery,
  useStartRunMutation,
  useFinishRollMutation,
  useFinishRunMutation,
  useViajeroRollsQuery,
  useTejidoOperatorsQuery,
  useLoadCreelMutation,
  usePtiTransferModeQuery,
  useTelaresPtiRacksQuery,
  useTelaresWipSummaryQuery,
} from '../../hooks/useTelaresQueries';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ViajeroRoll, Loom, TejidoOperator } from '../../types/telares.types';
import { ViajeroLabelModal } from '../components/ViajeroLabelModal';
import { CreateConsumptionOrderModal } from '../../../warehouse/presentation/components/CreateConsumptionOrderModal';
import { getCdmxShift } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { Button, Input, Badge } from '@/design-system';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Factory,
  Play,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Package,
  Gauge,
  UserCheck,
  ShieldCheck,
  PackagePlus,
  ClipboardList,
  Sparkles,
  ArrowRight,
  Info,
  Trash2,
  Compass,
  Printer,
  Square,
  ChevronDown,
  X,
} from '@/design-system/components/Icon/googleIconCompat';

const isBandaLoom = (loom?: Partial<Loom> | null): boolean =>
  Boolean(
    loom &&
      (loom.subarea?.nomenclature === 'TB' ||
        /banda/i.test(loom.subarea?.name || '') ||
        loom.type === 'BANDA' ||
        loom.subarea_id === 7 ||
        /banda/i.test(loom.name || ''))
  );

const routeToValue = (route: unknown): string[] => Array.isArray(route)
  ? route.map((stage) => String(stage).trim().toUpperCase()).filter(Boolean)
  : String(route || '').split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean);

const hasSupportedProductionRoute = (bom: any): boolean => {
  const routes = Array.isArray(bom.allowed_routes) && bom.allowed_routes.length
    ? bom.allowed_routes
    : bom.default_route ? [bom.default_route] : [];
  const isBanda = ['BANDA', 'CINTA'].includes(String(bom.product_kind || '').toUpperCase());
  const validTails = isBanda
    ? [['CORTE'], ['ALMACEN'], ['VENTA']]
    : [['CORTE'], ['CORTE', 'CONFECCION'], ['LAMINADO'], ['LAMINADO', 'CORTE'], ['LONAS'], ['ALMACEN'], ['VENTA']];
  return routes.some((value: unknown) => {
    const route = routeToValue(value);
    return route[0] === 'TELARES'
      && validTails.some((tail) => tail.length === route.length - 1 && tail.every((stage, index) => stage === route[index + 1]));
  });
};

const destinationForRoute = (route: unknown): 'LAMINADO' | 'CORTE' | 'LONAS' | 'ALMACEN' | 'VENTA' | null => {
  const stages = routeToValue(route);
  if (stages.includes('LAMINADO')) return 'LAMINADO';
  if (stages.includes('LONAS')) return 'LONAS';
  if (stages.includes('ALMACEN')) return 'ALMACEN';
  if (stages.includes('VENTA')) return 'VENTA';
  if (stages.includes('CORTE')) return 'CORTE';
  return null;
};

const DESTINATION_PRESENTATION = {
  LAMINADO: { label: 'Laminado → Corte', hint: 'Recubrimiento PEBD', icon: '🛡️', color: 'indigo' },
  CORTE: { label: 'Directo a Corte', hint: 'Proceso de corte', icon: '✂️', color: 'amber' },
  LONAS: { label: 'Lonas', hint: 'Confección de lonas', icon: '⛺', color: 'emerald' },
  ALMACEN: { label: 'Almacén', hint: 'Resguardo PT / WIP', icon: '🏭', color: 'cyan' },
  VENTA: { label: 'Venta', hint: 'Embarque / cliente', icon: '📦', color: 'purple' },
} as const;

type OperatorSegmentInput = {
  operator_id: number | '';
  shift_number: number;
  meters_start: string;
  meters_end: string;
  weight_start_kg: string;
  weight_end_kg: string;
};

export const TelaresTerminalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scannedRackQr = searchParams.get('ptiRackQr') || '';

  // Queries
  const { data: looms = [], isLoading: isLoomsLoading, refetch: refetchLooms } = useLoomsQuery();
  const { data: boms = [], isLoading: isBomsLoading } = useBomsQuery();
  const { data: ptiRacks = [] } = useTelaresPtiRacksQuery();
  const { data: wipSummary, isLoading: isWipSummaryLoading, isError: isWipSummaryError, refetch: refetchWipSummary } = useTelaresWipSummaryQuery();
  const { data: operators = [] } = useTejidoOperatorsQuery(false);

  // Mutations
  const startRunMutation = useStartRunMutation();
  const finishRollMutation = useFinishRollMutation();
  const finishRunMutation = useFinishRunMutation();
  const loadCreelMutation = useLoadCreelMutation();
  const { data: transferModeData, isError: isTransferModeError } = usePtiTransferModeQuery();
  const transferModeReady = Boolean(transferModeData) && !isTransferModeError;
  const transferMode = transferModeData?.transfer_mode || 'RACK_PARTIAL';
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);

  // Filtro de Telares: Todos (21), Circulares (1-17), Banda (18-21)
  const [loomFilter, setLoomFilter] = useState<'ALL' | 'CIRCULARES' | 'BANDA'>('ALL');
  const [loomSearch, setLoomSearch] = useState('');
  const [selectedLoomId, setSelectedLoomId] = useState<number | null>(null);
  const [isLoomSelectorOpen, setIsLoomSelectorOpen] = useState(false);
  const [terminalStage, setTerminalStage] = useState<'PREPARE' | 'RUN' | 'OUTPUT' | 'HISTORY'>('PREPARE');

  // El catálogo y el servidor restringen las opciones según el tipo de PTI (Diagramas 1 y 2).
  const [destinationChoice, setDestinationChoice] = useState('');

  // Estados locales para reporte de rollo
  const [metersInput, setMetersInput] = useState<string>('500');
  const [weightInput, setWeightInput] = useState<string>('35.0');
  const [notesInput, setNotesInput] = useState<string>('');
  const [outputVirginQr, setOutputVirginQr] = useState('');
  const [ptiCatalogQrInput, setPtiCatalogQrInput] = useState('');

  // Selector de Turno y Operador de Tejido (con número de nómina)
  const [shiftSelection, setShiftSelection] = useState<number>(() => getCdmxShift().shiftNumber);
  const [selectedOperatorNomina, setSelectedOperatorNomina] = useState<string>('');
  const [shiftSupervisorId, setShiftSupervisorId] = useState<number | ''>('');
  const [operatorSegments, setOperatorSegments] = useState<OperatorSegmentInput[]>([{
    operator_id: '', shift_number: getCdmxShift().shiftNumber, meters_start: '0', meters_end: '500', weight_start_kg: '0', weight_end_kg: '35.0',
  }]);

  // Modal para iniciar corrida
  const [isStartRunModalOpen, setIsStartRunModalOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState<number | ''>('');
  const [plannedMetersInput, setPlannedMetersInput] = useState<string>('1500');
  const [plannedWeightInput, setPlannedWeightInput] = useState<string>('');
  const [plannedInputMode, setPlannedInputMode] = useState<'METROS' | 'PESO'>('METROS');
  const [runShiftSelection, setRunShiftSelection] = useState<string>(() => getCdmxShift().shiftCode);

  // Modal para Cargar Fileta Creel (1,800 bobinas WIP)
  const [isCreelModalOpen, setIsCreelModalOpen] = useState(false);
  const [isCreelConfirmationOpen, setIsCreelConfirmationOpen] = useState(false);
  const [creelSpoolsToLoad, setCreelSpoolsToLoad] = useState<number>(0);
  const [creelRackId, setCreelRackId] = useState<number | ''>('');
  const [creelScannedQr, setCreelScannedQr] = useState('');
  const [creelTargetLoomId, setCreelTargetLoomId] = useState<number | ''>('');

  // Modal de Etiqueta QR Viajero
  const [activeViajeroRoll, setActiveViajeroRoll] = useState<ViajeroRoll | null>(null);
  const finishRequestRef = useRef<{ signature: string; key: string } | null>(null);

  // Modal para Crear ODC de Telares
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);

  // Filtrado de los 21 telares
  const filteredLooms = useMemo(() => {
    const query = loomSearch.trim().toLocaleLowerCase();
    if (loomFilter === 'BANDA') {
      return looms.filter((l) => isBandaLoom(l) && (!query || `${l.name} ${l.code} ${l.loom_number || l.id}`.toLocaleLowerCase().includes(query)));
    }
    if (loomFilter === 'CIRCULARES') {
      return looms.filter((l) => !isBandaLoom(l) && (!query || `${l.name} ${l.code} ${l.loom_number || l.id}`.toLocaleLowerCase().includes(query)));
    }
    return looms.filter((l) => !query || `${l.name} ${l.code} ${l.loom_number || l.id}`.toLocaleLowerCase().includes(query));
  }, [looms, loomFilter, loomSearch]);

  // Telar Activo Seleccionado
  const activeLoom: Loom | null = useMemo(() => {
    if (!looms.length) return null;
    if (selectedLoomId) {
      return looms.find((l) => l.id === selectedLoomId) || looms[0];
    }
    return looms[0];
  }, [looms, selectedLoomId]);
  const selectableLooms = useMemo(() => {
    if (activeLoom && !filteredLooms.some((loom) => loom.id === activeLoom.id)) return [activeLoom, ...filteredLooms];
    return filteredLooms;
  }, [activeLoom, filteredLooms]);
  const changeLoomFilter = (filter: 'ALL' | 'CIRCULARES' | 'BANDA') => {
    const candidates = filter === 'BANDA' ? looms.filter(isBandaLoom) : filter === 'CIRCULARES' ? looms.filter((loom) => !isBandaLoom(loom)) : looms;
    setLoomFilter(filter);
    setLoomSearch('');
    if (!candidates.some((loom) => loom.id === activeLoom?.id)) {
      setSelectedLoomId(candidates[0]?.id ?? null);
      setTerminalStage('PREPARE');
    }
  };
  const { data: recentLoomRolls = [], isLoading: isRecentLoomRollsLoading } = useViajeroRollsQuery(
    activeLoom?.id ? { loom_id: activeLoom.id, limit: 8 } : { limit: 8 }
  );
  const creelTargetLoom = useMemo(
    () => looms.find((loom) => loom.id === Number(creelTargetLoomId)) || null,
    [looms, creelTargetLoomId],
  );
  const creelTargetCapacity = Number(creelTargetLoom?.creel_capacity_spools || 1800);
  const creelTargetCurrent = Number(creelTargetLoom?.current_spools_count || 0);
  const selectedTransferRack = ptiRacks.find((rack: any) => rack.id === Number(creelRackId));
  const transferRackQuantity = Number(selectedTransferRack?.current_quantity || 0);
  const transferCapacityAvailable = Math.max(0, creelTargetCapacity - creelTargetCurrent);
  const transferWeightKg = selectedTransferRack && Number(selectedTransferRack.unit_weight_kg || selectedTransferRack.currentPtiProduct?.unit_weight_kg || 0) > 0
    ? Number((Number(creelSpoolsToLoad || 0) * Number(selectedTransferRack.unit_weight_kg || selectedTransferRack.currentPtiProduct?.unit_weight_kg)).toFixed(2))
    : null;

  // Corrida activa en el telar
  const activeRun = useMemo(() => {
    return activeLoom?.runs?.find((r) => r.status === 'EN_PROCESO') || null;
  }, [activeLoom]);

  const selectedBom = useMemo(() => boms.find((bom) => bom.id === Number(selectedBomId)) || null, [boms, selectedBomId]);
  const selectedBomEstimatedKgPerMeter = useMemo(() => {
    if (!selectedBom) return 0;
    const width = Number(selectedBom.weight_conversion_width_m || 0);
    const ounces = Number(selectedBom.ounces_yd2 || 0);
    const factor = Number(selectedBom.weight_conversion_factor || 0);
    if (width > 0 && ounces > 0 && factor > 0) return width * ounces * factor * 33.9 / 1000;
    const outputKg = Number(selectedBom.output_weight_kg || 0);
    const outputMeters = Number(selectedBom.standard_output_meters || 0);
    if (outputKg > 0 && outputMeters > 0) return outputKg / outputMeters;
    return Number(selectedBom.target_weight_g_per_m || 0) / 1000;
  }, [selectedBom]);
  const outputProductKind = String(
    activeRun?.bom?.product_kind ||
      selectedBom?.product_kind ||
      (isBandaLoom(activeLoom) ? 'BANDA' : 'ROLLO_TELA')
  ).toUpperCase();
  const isFabricRoll = outputProductKind === 'ROLLO_TELA';
  const outputBom = activeRun?.bom || selectedBom;
  const allowedRoutes: string[][] = useMemo(() => {
    const configured = Array.isArray(outputBom?.allowed_routes) && outputBom.allowed_routes.length
      ? outputBom.allowed_routes
      : outputBom?.default_route ? [outputBom.default_route] : [];
    const isBanda = ['BANDA', 'CINTA'].includes(outputProductKind);
    const validTails = isBanda
      ? [['CORTE'], ['ALMACEN'], ['VENTA']]
      : [['CORTE'], ['CORTE', 'CONFECCION'], ['LAMINADO'], ['LAMINADO', 'CORTE'], ['LONAS'], ['ALMACEN'], ['VENTA']];
    return configured.map(routeToValue).filter((route) => (
      route[0] === 'TELARES'
      && validTails.some((tail) => tail.length === route.length - 1 && tail.every((stage, index) => stage === route[index + 1]))
    ));
  }, [outputBom?.id, outputBom?.allowed_routes, outputBom?.default_route, outputProductKind]);
  const allowedDestinationOptions = useMemo(() => {
    const optionMap = new Map<string, { route: string[] }>();
    for (const route of allowedRoutes) {
      const key = route.join(',');
      if (!optionMap.has(key)) optionMap.set(key, { route });
    }
    return [...optionMap.values()];
  }, [allowedRoutes]);
  const corteManagedRoute = useMemo(() => (
    isFabricRoll
      ? allowedDestinationOptions.find(({ route }) => route.includes('LAMINADO') && route.includes('CORTE'))?.route
        || allowedDestinationOptions.find(({ route }) => route.includes('LAMINADO'))?.route
      : undefined
  ), [allowedDestinationOptions, isFabricRoll]);
  const usesCorteLaminationGate = Boolean(corteManagedRoute);
  const allowedRouteSignature = JSON.stringify(allowedRoutes);

  useEffect(() => {
    if (corteManagedRoute?.length) {
      setDestinationChoice(corteManagedRoute.join(','));
      return;
    }
    const preferredRoute = routeToValue(outputBom?.default_route);
    const preferredKey = preferredRoute.join(',');
    if (preferredRoute.length && allowedDestinationOptions.some((option) => option.route.join(',') === preferredKey)) {
      setDestinationChoice(preferredKey);
    } else if (allowedDestinationOptions.length) {
      setDestinationChoice(allowedDestinationOptions[0].route.join(','));
    }
  }, [outputBom?.id, allowedRouteSignature, corteManagedRoute?.join(',')]);

  const getSelectedRoute = (): string[] => {
    if (corteManagedRoute?.length) return corteManagedRoute;
    return allowedDestinationOptions.find((option) => option.route.join(',') === destinationChoice)?.route || [];
  };

  const creelCompatibleRacks = useMemo(() => {
    const targetLoom = creelTargetLoom;
    const supportedTypes = (targetLoom?.supported_pti_types || []).map(Number);
    const targetIsBanda = isBandaLoom(targetLoom);
    return ptiRacks.filter((r: any) => {
      if (Number(r.current_quantity) <= 0) return false;
      if (!r.currentPtiProduct) return false;
      const expectedContainer = transferMode === 'CART_FULL' ? 'CARRITO' : 'RACK';
      if (transferModeReady && String(r.container_type || 'RACK').trim().toUpperCase() !== expectedContainer) return false;
      const ptiId = Number(r.current_pti_product_id || r.currentPtiProduct.id || 0);
      if (supportedTypes.length && ptiId > 0 && !supportedTypes.includes(ptiId)) return false;
      const configuredSubarea = String(r.currentPtiProduct?.telares_subarea_code || '').trim().toUpperCase();
      const extMachine = Number(r.currentPtiProduct?.extrusion_machine_number || 0);
      const expectedRoute = configuredSubarea === 'TELARES_BANDA' || configuredSubarea === 'TELARES_ROLLO'
        ? configuredSubarea
        : extMachine === 1 ? 'TELARES_BANDA' : [2, 4, 5].includes(extMachine) ? 'TELARES_ROLLO' : null;
      if (!expectedRoute) return false;
      if (r.destination_route && r.destination_route !== expectedRoute) return false;
      if (configuredSubarea === 'NO_APLICA') return false;
      if (targetLoom && (expectedRoute === 'TELARES_BANDA') !== targetIsBanda) return false;
      if (targetLoom && r.destination_subarea_id != null && Number(r.destination_subarea_id) !== Number(targetLoom.subarea_id)) return false;
      return true;
    });
  }, [ptiRacks, creelTargetLoom, transferMode, transferModeReady]);

  const selectedRackCompatible = Boolean(
    selectedTransferRack && creelCompatibleRacks.some((rack: any) => rack.id === selectedTransferRack.id),
  );

  useEffect(() => {
    if (!scannedRackQr || !ptiRacks.length || !looms.length || !transferModeReady) return;
    const clean = scannedRackQr.trim();
    const rack = ptiRacks.find((item: any) => String(item.qr_code || '').trim() === clean);
    const expectedContainer = transferMode === 'CART_FULL' ? 'CARRITO' : 'RACK';
    if (!rack || Number(rack.current_quantity) <= 0) {
      toast.error('El QR escaneado no corresponde a un rack o carrito con saldo disponible.');
    } else if (String(rack.container_type || 'RACK').trim().toUpperCase() !== expectedContainer) {
      toast.error(`El modo activo requiere escanear el QR de un ${expectedContainer === 'CARRITO' ? 'carrito' : 'rack'}.`);
    } else {
      setCreelRackId(rack.id);
      setCreelScannedQr(String(rack.qr_code));
      setCreelSpoolsToLoad(Number(rack.current_quantity));
      setCreelTargetLoomId('');
      setIsCreelConfirmationOpen(false);
      setIsCreelModalOpen(true);
      toast.success(`${expectedContainer === 'CARRITO' ? 'Carrito' : 'Rack'} ${rack.rack_code} identificado. Selecciona el telar receptor.`);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('ptiRackQr');
    setSearchParams(next, { replace: true });
  }, [scannedRackQr, ptiRacks, looms.length, transferModeReady, transferMode, searchParams, setSearchParams]);

  const compatibleBoms = useMemo(() => {
    const supportedBoms = (activeLoom?.supported_bom_ids || []).map(Number);
    const activeIsBanda = isBandaLoom(activeLoom);
    return boms.filter((bom) => {
      if (!bom.is_active || bom.is_provisional) return false;
      if (!hasSupportedProductionRoute(bom)) return false;
      if (supportedBoms.length && !supportedBoms.includes(Number(bom.id))) return false;
      if (activeLoom?.subarea_id && bom.subarea_id) {
        return Number(bom.subarea_id) === Number(activeLoom.subarea_id);
      }
      const bomIsBanda = ['BANDA', 'CINTA'].includes(String(bom.product_kind || '').toUpperCase());
      return bomIsBanda === activeIsBanda;
    });
  }, [boms, activeLoom]);
  useEffect(() => {
    if (selectedBomId && !compatibleBoms.some((bom) => Number(bom.id) === Number(selectedBomId))) {
      setSelectedBomId('');
    }
  }, [compatibleBoms, selectedBomId]);
  const plannedMeters = useMemo(() => {
    if (plannedInputMode === 'METROS') return Number(plannedMetersInput) || 0;
    return selectedBomEstimatedKgPerMeter > 0 ? (Number(plannedWeightInput) || 0) / selectedBomEstimatedKgPerMeter : 0;
  }, [plannedInputMode, plannedMetersInput, plannedWeightInput, selectedBomEstimatedKgPerMeter]);
  const demandPreview = useMemo(() => {
    if (!selectedBom?.items?.length || plannedMeters <= 0) return [];
    const baselineMeters = Number(selectedBom.standard_output_meters || 0);
    const expectedOutput = Number(selectedBom.expected_output_quantity || 1);
    const outputUnit = String(selectedBom.expected_output_unit || 'ROLLO').toUpperCase();
    const plannedWeightKg = plannedInputMode === 'PESO' ? Number(plannedWeightInput) || 0 : 0;
    const standardWeightKg = Number(selectedBom.output_weight_kg || 0);
    const estimatedOutputWeightKg = plannedWeightKg > 0
      ? plannedWeightKg
      : standardWeightKg > 0 && baselineMeters > 0
        ? standardWeightKg * (plannedMeters / baselineMeters)
        : selectedBomEstimatedKgPerMeter > 0 ? selectedBomEstimatedKgPerMeter * plannedMeters : 0;
    const quantityMultiplier = outputUnit === 'KG'
      ? (estimatedOutputWeightKg > 0 && expectedOutput > 0 ? estimatedOutputWeightKg / expectedOutput : null)
      : outputUnit === 'METRO'
        ? (expectedOutput > 0 ? plannedMeters / expectedOutput : null)
        : (baselineMeters > 0 ? (plannedMeters / baselineMeters) * expectedOutput : null);
    const loomWip = wipSummary?.looms?.find((loom: any) => Number(loom.id) === Number(activeLoom?.id));
    const components = selectedBom.items.filter((item) => item.pti_product_id).map((item) => {
      const unit = String(item.required_unit || 'KG').toUpperCase();
      const configured = Number(item.required_quantity || 0);
      const perMeter = Number(item.consumption_per_meter || 0);
      const perMeterUnit = String(item.consumption_per_meter_unit || 'KG').toUpperCase();
      const legacyKgPerMeter = Number(item.consumption_g_per_m || 0) / 1000 || Number(selectedBom.target_weight_g_per_m || 0) * Number(item.ratio_percentage || 0) / 100000;
      const requiredKg = perMeter > 0
        ? (perMeterUnit === 'KG' ? perMeter * plannedMeters : null)
        : quantityMultiplier && configured > 0 && unit === 'KG' ? configured * quantityMultiplier : (legacyKgPerMeter > 0 ? legacyKgPerMeter * plannedMeters : null);
      const requiredSpools = perMeter > 0
        ? (perMeterUnit === 'PIEZAS' ? perMeter * plannedMeters : null)
        : quantityMultiplier && configured > 0 && unit === 'PIEZAS' ? configured * quantityMultiplier : null;
      return { item, requiredKg, requiredSpools };
    });
    const products = new Map<number, any>();
    for (const component of components) {
      const productId = Number(component.item.pti_product_id);
      const group = products.get(productId) || { ptiProduct: component.item.ptiProduct, components: [], requiredKg: 0, requiredSpools: 0, hasKg: false, hasSpools: false };
      group.components.push(component);
      if (component.requiredKg != null) { group.requiredKg += component.requiredKg; group.hasKg = true; }
      if (component.requiredSpools != null) { group.requiredSpools += component.requiredSpools; group.hasSpools = true; }
      products.set(productId, group);
    }
    return [...products.entries()].map(([productId, group]) => {
      const wip = (loomWip?.pti_inventory || []).filter((entry: any) => Number(entry.pti_product_id) === productId);
      const wipKg = wip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_kg || 0), 0);
      const wipSpools = wip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_spools || 0), 0);
      const knownWip = wip.filter((entry: any) => Number(entry.quantity_spools) > 0 && Number(entry.quantity_kg) > 0);
      const knownRacks = ptiRacks.filter((rack: any) => Number(rack.current_pti_product_id) === productId && Number(rack.current_quantity) > 0 && Number(rack.unit_weight_kg || rack.currentPtiProduct?.unit_weight_kg || 0) > 0);
      const knownSpools = knownWip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_spools), 0) + knownRacks.reduce((sum: number, rack: any) => sum + Number(rack.current_quantity), 0);
      const knownWeightKg = knownWip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_kg), 0) + knownRacks.reduce((sum: number, rack: any) => sum + Number(rack.current_quantity) * Number(rack.unit_weight_kg || rack.currentPtiProduct?.unit_weight_kg || 0), 0);
      const averageSpoolKg = knownSpools > 0 ? knownWeightKg / knownSpools : null;
      const requiredKg = group.hasKg || (group.hasSpools && averageSpoolKg)
        ? group.requiredKg + (averageSpoolKg ? group.requiredSpools * averageSpoolKg : 0)
        : null;
      const requiredSpools = group.hasSpools || (group.hasKg && averageSpoolKg)
        ? group.requiredSpools + (averageSpoolKg ? group.requiredKg / averageSpoolKg : 0)
        : null;
      const deficitKg = requiredKg == null ? null : Math.max(0, requiredKg - wipKg);
      const deficitSpools = requiredSpools == null ? null : Math.max(0, requiredSpools - wipSpools);
      return { ptiProduct: group.ptiProduct, ptiProductId: productId, components: group.components, requiredKg, requiredSpools, wipKg, wipSpools, deficitKg, deficitSpools, roles: [...new Set(group.components.map(({ item }: any) => String(item.role || '').toUpperCase()))] };
    });
  }, [selectedBom, plannedMeters, wipSummary, activeLoom, ptiRacks]);
  const hasMaterialShortage = demandPreview.some((row: any) => (row.deficitKg != null && row.deficitKg > 0) || (row.deficitSpools != null && row.deficitSpools > 0));
  const hasUnconfiguredConsumption = Boolean(selectedBom && (!selectedBom.items?.length || selectedBom.items.some((item: any) => !item.pti_product_id || (!Number(item.consumption_per_meter) && !Number(item.consumption_g_per_m) && !Number(item.required_quantity)))));
  const hasUnknownAvailability = demandPreview.some((row: any) => row.deficitKg == null && row.deficitSpools == null);
  const canStartSelectedRun = Boolean(activeLoom && selectedBom && plannedMeters > 0 && demandPreview.length > 0 && !isWipSummaryLoading && !isWipSummaryError && !hasUnconfiguredConsumption && !hasMaterialShortage && !hasUnknownAvailability);

  // Operador seleccionado actualmente
  const availableOperators = useMemo(() => operators.filter((op) => op.is_active && !String(op.role_name || '').toLowerCase().includes('supervisor')), [operators]);
  const availableSupervisors = useMemo(() => operators.filter((op) => op.is_active && String(op.role_name || '').toLowerCase().includes('supervisor')), [operators]);
  const activeOperator = useMemo(() => {
    return availableOperators.find((op) => op.numero_nomina === selectedOperatorNomina) || availableOperators[0] || null;
  }, [availableOperators, selectedOperatorNomina]);

  useEffect(() => {
    if (activeOperator && selectedOperatorNomina !== activeOperator.numero_nomina) setSelectedOperatorNomina(activeOperator.numero_nomina);
    setOperatorSegments((segments) => segments.map((segment, index) => index === 0 && !segment.operator_id && activeOperator
      ? { ...segment, operator_id: activeOperator.id }
      : segment));
  }, [activeOperator, selectedOperatorNomina]);

  useEffect(() => {
    setOperatorSegments((segments) => segments.length === 1
      ? segments.map((segment) => ({ ...segment, meters_end: metersInput, weight_end_kg: weightInput }))
      : segments);
  }, [metersInput, weightInput]);

  // Número consecutivo de rollo estimado para este telar
  const nextRollSequence = useMemo(() => {
    return (activeLoom?.total_rolls_produced || 0) + 1;
  }, [activeLoom]);

  // Código de Rollo proyectado en tiempo real según PDF Pág 2: [TELAR]-[TURNO]-[NUM_ROLLO]-[NOMINA]
  const previewRollCode = useMemo(() => {
    const loomNum = activeLoom?.loom_number || activeLoom?.id || 10;
    return `${loomNum}-${shiftSelection}-${nextRollSequence}-${activeOperator?.numero_nomina || selectedOperatorNomina || 'NOMINA_PENDIENTE'}`;
  }, [activeLoom, shiftSelection, nextRollSequence, selectedOperatorNomina, activeOperator]);

  const updateOperatorSegment = (index: number, changes: Partial<OperatorSegmentInput>) => {
    setOperatorSegments((segments) => segments.map((segment, current) => current === index ? { ...segment, ...changes } : segment));
  };

  // Monitor Creel Fileta del Telar Activo
  const creelMax = activeLoom?.creel_capacity_spools || 1800;
  const creelCurrent = Number(activeLoom?.current_spools_count || 0);
  const creelPercent = Math.min(100, Math.round((creelCurrent / creelMax) * 100));

  // Manejador: Cargar Fileta Creel (WIP del Telar)
  const handleLoadCreel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModeReady) {
      toast.error('No se pudo confirmar el modo de transferencia. Actualiza e inténtalo de nuevo.');
      return;
    }
    if (!creelTargetLoom) {
      toast.error('Selecciona el telar que recibirá la custodia del PTI.');
      return;
    }
    if (!creelRackId || !creelScannedQr) {
      toast.error('Escanea el QR original del rack o carrito de origen.');
      return;
    }
    if (!selectedRackCompatible) {
      toast.error('El Rack seleccionado no está autorizado para el telar destino. Verifica el área y el PTI.');
      return;
    }
    if (!Number.isInteger(Number(creelSpoolsToLoad))) {
      toast.error('La transferencia debe expresarse en bobinas completas.');
      return;
    }
    if (transferMode === 'CART_FULL' && Number(creelSpoolsToLoad) !== transferRackQuantity) {
      toast.error('El modo Carrito completo requiere transferir todo el saldo disponible.');
      return;
    }
    if (!isCreelConfirmationOpen) {
      setIsCreelConfirmationOpen(true);
      return;
    }

    try {
      const res = await loadCreelMutation.mutateAsync({
        loom_id: creelTargetLoom.id,
        rack_id: Number(creelRackId),
        spools_to_load: Number(creelSpoolsToLoad),
        scanned_qr: creelScannedQr,
      });
      toast.success(res.message || 'Bobinas cargadas a la fileta');
      setIsCreelModalOpen(false);
      setIsCreelConfirmationOpen(false);
      setCreelRackId('');
      setCreelScannedQr('');
      setCreelSpoolsToLoad(0);
      setCreelTargetLoomId('');
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al cargar fileta');
    }
  };

  const closeCreelTransfer = () => {
    setIsCreelModalOpen(false);
    setIsCreelConfirmationOpen(false);
    setCreelRackId('');
    setCreelScannedQr('');
    setCreelSpoolsToLoad(0);
    setCreelTargetLoomId('');
  };

  // Manejador: Iniciar Corrida
  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoom) return;
    if (!selectedBomId) {
      toast.error('Selecciona una receta / BOM para tejer');
      return;
    }
    if (!Number.isFinite(plannedMeters) || plannedMeters <= 0) {
      toast.error('Define una meta de producción mayor a cero para calcular los insumos.');
      return;
    }
    if (hasUnconfiguredConsumption || !demandPreview.length) {
      toast.error('La ficha no tiene sus consumos de PTI completos. Corrige la ficha antes de iniciar.');
      return;
    }
    if (isWipSummaryLoading || isWipSummaryError || hasUnknownAvailability) {
      toast.error('Aún no se puede confirmar el WIP de este telar. Actualiza la información e inténtalo de nuevo.');
      return;
    }
    if (hasMaterialShortage) {
      toast.error('El WIP del telar no cubre la meta. Transfiere las bobinas faltantes antes de iniciar.');
      return;
    }

    try {
      await startRunMutation.mutateAsync({
        loom_id: activeLoom.id,
        bom_id: Number(selectedBomId),
        shift: runShiftSelection,
        meters_planned: plannedMeters,
        ...(plannedInputMode === 'PESO' ? { weight_planned_kg: Number(plannedWeightInput) } : {}),
        notes: notesInput || undefined,
      });
      toast.success(`Corrida de tejeduría iniciada en ${activeLoom.name}`);
      setIsStartRunModalOpen(false);
      refetchLooms();
    } catch (err: any) {
      await refetchWipSummary();
      const shortage = err.response?.data?.details?.shortages;
      if (Array.isArray(shortage) && shortage.length) {
        const first = shortage.find((row: any) => row.deficit_kg > 0 || row.deficit_spools > 0) || shortage[0];
        const qr = (first.fifo_racks || []).map((rack: any) => rack.qr_code).filter(Boolean).join(', ');
        toast.error(`${first.code}: faltan ${first.deficit_kg == null ? 'cantidades por definir' : `${first.deficit_kg} kg`}${first.deficit_spools == null ? '' : ` (${first.deficit_spools} bobinas)`}.${qr ? ` FIFO: ${qr}` : ''}`);
      } else {
        toast.error(err.response?.data?.message || err.friendlyMessage || err.message || 'Error al iniciar corrida');
      }
    }
  };

  // Manejador: Registrar Rollo y Backflushing
  const handleFinishRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRun) {
      toast.error('No hay una corrida activa en este telar');
      return;
    }

    const numMeters = Number(metersInput);
    const numWeight = Number(weightInput);
    if (!numMeters || numMeters <= 0) {
      toast.error('Ingresa los metros producidos (> 0)');
      return;
    }
    if (!numWeight || numWeight <= 0) {
      toast.error('Ingresa el peso neto registrado (> 0 kg)');
      return;
    }
    if (!shiftSupervisorId || !availableSupervisors.some((candidate) => candidate.id === Number(shiftSupervisorId))) {
      toast.error('Selecciona al supervisor responsable del turno.');
      return;
    }
    if (!activeOperator?.numero_nomina) {
      toast.error('El operador principal no tiene número de nómina registrado. Actualiza su perfil antes de registrar el rollo.');
      return;
    }
    const segmentsPayload = operatorSegments.map((segment) => ({
      operator_id: Number(segment.operator_id),
      shift_number: Number(segment.shift_number),
      meters_start: Number(segment.meters_start),
      meters_end: Number(segment.meters_end),
      weight_start_kg: segment.weight_start_kg === '' ? undefined : Number(segment.weight_start_kg),
      weight_end_kg: segment.weight_end_kg === '' ? undefined : Number(segment.weight_end_kg),
    }));
    if (!outputVirginQr.trim()) {
      toast.error('Escanea un QR virgen asignado a Telares por Almacén para registrar la salida.');
      return;
    }
    if (!segmentsPayload.length || segmentsPayload.some((segment) =>
      !segment.operator_id || !availableOperators.some((candidate) => candidate.id === segment.operator_id)
      || ![1, 2, 3].includes(segment.shift_number)
      || !Number.isFinite(segment.meters_start) || !Number.isFinite(segment.meters_end)
      || segment.meters_start < 0 || segment.meters_end <= segment.meters_start || segment.meters_end > numMeters
      || ((segment.weight_start_kg === undefined) !== (segment.weight_end_kg === undefined))
      || (segment.weight_start_kg !== undefined && (segment.weight_start_kg < 0 || segment.weight_end_kg! <= segment.weight_start_kg || segment.weight_end_kg! > numWeight)))) {
      toast.error('Revisa cada tramo: operador, turno y rango dentro de los metros/peso reportados.');
      return;
    }

    try {
      const rollPayload = {
        run_id: activeRun.id,
        meters: numMeters,
        weight_kg: numWeight,
        notes: notesInput || undefined,
        shift_number: shiftSelection,
        operator_nomina: activeOperator?.numero_nomina || selectedOperatorNomina,
        shift_supervisor_id: Number(shiftSupervisorId),
        operator_segments: segmentsPayload,
        custom_route: getSelectedRoute(),
        virgin_qr_code: outputVirginQr.trim(),
      };
      const signature = JSON.stringify(rollPayload);
      if (!finishRequestRef.current || finishRequestRef.current.signature !== signature) {
        const randomKey = globalThis.crypto?.randomUUID?.()
          || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        finishRequestRef.current = { signature, key: randomKey };
      }
      const res = await finishRollMutation.mutateAsync({
        ...rollPayload,
        idempotency_key: finishRequestRef.current.key,
      });

      const roll = res.roll;
      const consumedSpools = res.backflush?.reduce((acc: number, item: any) => acc + Number(item.spools_consumed), 0) || 0;

      toast.success(
        `Rollo ${roll.roll_code} creado exitosamente. Consumo: ${consumedSpools.toFixed(1)} bobinas.`
      );

      setActiveViajeroRoll(roll);
      setNotesInput('');
      setOutputVirginQr('');
      finishRequestRef.current = null;
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al registrar rollo');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 pb-32 sm:p-6 sm:pb-32 lg:pb-8 space-y-5 sm:space-y-6">
      {/* 1. Barra de Estado Superior Industrial */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-3 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 sm:h-14 sm:w-14">
            <Factory className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl min-[360px]:text-2xl sm:text-3xl font-black tracking-tight text-white">
                Terminal de Telares
              </h1>
              <Badge className="hidden bg-emerald-600/90 text-white font-bold text-xs min-[420px]:inline-flex">EN LÍNEA</Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed font-medium text-slate-300">
              Control de producción, materiales y salida de rollos.
            </p>
            <Badge className="mt-2 bg-emerald-600/90 text-white font-bold text-xs min-[420px]:hidden">EN LÍNEA</Badge>
          </div>
        </div>

        {/* Indicadores Clave Rápidos */}
        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
          <Button
            onClick={() => navigate('/telares/catalogos')}
            variant="outline"
            className="col-span-2 h-11 w-full px-3 border-slate-700 bg-slate-900 text-slate-100 font-semibold text-sm rounded-xl md:col-span-1 md:w-auto"
          >
            <Factory className="h-4 w-4 mr-1.5" />
            Catálogos y Fichas PDF
          </Button>
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-2 py-2 text-center md:px-4">
            <span className="block text-xs font-semibold text-slate-300">Turno seleccionado</span>
            <span className="text-base font-bold text-amber-300">Turno {shiftSelection}°</span>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-2 py-2 text-center md:px-4">
            <span className="block text-xs font-semibold text-slate-300">Telares operando</span>
            <span className="text-base font-black text-emerald-400">
              {looms.filter((l) => l.status === 'EN_PRODUCCION').length} / {looms.length}
            </span>
          </div>

          {/* ODC Telares */}
          <div className="col-span-2 grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-2 md:flex md:w-auto">
            <Button
              onClick={() => setIsOdcModalOpen(true)}
              className="min-h-12 w-full px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 md:w-auto"
            >
              <PackagePlus className="h-4 w-4" />
              Solicitar ODC
            </Button>
            <Button
              onClick={() => navigate('/warehouse/orders?area_id=3&area_name=Telares')}
              variant="outline"
              className="min-h-12 w-full px-3 border-slate-700 bg-slate-900 text-slate-100 font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800 md:w-auto"
            >
              <ClipboardList className="h-4 w-4 text-blue-400" />
              Ver ODCs
            </Button>
          </div>
        </div>
      </div>

      {activeLoom && (
        <nav aria-label="Etapas de la operación" className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 shadow-lg sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">Flujo de trabajo</h2>
              <p className="text-sm text-slate-300">{terminalStage === 'PREPARE' ? 'Paso 1 de 3 · Preparar telar' : terminalStage === 'RUN' ? 'Paso 2 de 3 · Corrida' : terminalStage === 'OUTPUT' ? 'Paso 3 de 3 · Registrar rollo' : 'Consulta de salidas'}</p>
            </div>
            <button id="stage-tab-HISTORY" type="button" aria-pressed={terminalStage === 'HISTORY'} onClick={() => setTerminalStage('HISTORY')}
              className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${terminalStage === 'HISTORY' ? 'border-slate-300 bg-slate-700 text-white' : 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>
              <ClipboardList className="h-4 w-4" />Historial
            </button>
          </div>
          <div role="tablist" aria-label="Etapas de producción" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([
              { id: 'PREPARE', number: '1', label: 'Preparar telar', icon: Package, hint: creelCurrent > 0 ? 'Fileta con bobinas' : 'Revisar fileta' },
              { id: 'RUN', number: '2', label: 'Corrida', icon: Play, hint: activeRun ? 'En producción' : 'Iniciar producción' },
              { id: 'OUTPUT', number: '3', label: 'Registrar rollo', icon: CheckCircle2, hint: activeRun ? 'Disponible' : 'Requiere corrida' },
            ] as const).map(({ id, number, label, icon: StageIcon, hint }) => {
              const isCurrent = terminalStage === id;
              const isDisabled = id === 'OUTPUT' && !activeRun;
              return (
                <button key={id} id={`stage-tab-${id}`} type="button" role="tab" aria-selected={isCurrent} aria-controls="terminal-stage-panel" title={isDisabled ? 'Inicia una corrida para registrar un rollo' : undefined} disabled={isDisabled} onClick={() => setTerminalStage(id)}
                  className={`flex min-h-14 min-w-0 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[68px] sm:px-3 ${isCurrent ? 'border-blue-400 bg-blue-700 text-white' : 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-700'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isCurrent ? 'bg-white text-blue-800' : 'bg-slate-700 text-white'}`}>{number}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-bold leading-tight"><StageIcon className="h-4 w-4 shrink-0 sm:hidden" />{label}</span>
                    <span className={`mt-1 hidden text-xs sm:block ${isCurrent ? 'text-blue-100' : 'text-slate-300'}`}>{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Contenido por etapa: preparación, corrida, registro o historial */}
      {activeLoom && (
        <div id="terminal-stage-panel" role="tabpanel" aria-labelledby={terminalStage === 'HISTORY' ? 'stage-tab-HISTORY' : `stage-tab-${terminalStage}`} className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Resumen de materiales, racks y corrida */}
          <div id="loom-materials" className={`${terminalStage === 'PREPARE' ? 'grid grid-cols-1 gap-4 xl:grid-cols-2 lg:col-span-12' : terminalStage === 'RUN' ? 'lg:col-span-12' : 'hidden'}`}>
{/* Selecciona aquí el telar que corresponde a esta fileta */}


                        {/* Card: Monitor Creel Fileta del Telar (WIP Interno hasta 1,800 Bobinas) */}
            <div className={`${terminalStage === 'PREPARE' ? 'rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4' : 'hidden'}`}>
              <section aria-labelledby="loom-selector-title" className="mb-4 min-w-0 border-b border-slate-700 pb-4">
                      <button type="button" id="loom-selector-title" aria-expanded={isLoomSelectorOpen} aria-controls="loom-selector-content" onClick={() => setIsLoomSelectorOpen((open) => !open)} className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        <span className="min-w-0">
                          <span className="block text-base font-bold text-white">Telar de esta fileta</span>
                          <span className="block truncate text-sm font-medium text-slate-300">{activeLoom ? `#${activeLoom.loom_number || activeLoom.id} · ${activeLoom.name}` : isLoomsLoading ? 'Cargando máquinas…' : 'Selecciona una máquina'}</span>
                          {activeLoom && <span className="block text-xs font-medium text-slate-300">{activeLoom.status === 'EN_PRODUCCION' ? 'En producción' : 'Disponible'} · {Number(activeLoom.current_spools_count || 0)} bobinas en fileta</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="hidden text-sm font-semibold text-blue-200 min-[360px]:inline">{isLoomSelectorOpen ? 'Cerrar selector' : 'Cambiar telar'}</span>
                          <ChevronDown className={`h-5 w-5 text-slate-200 transition-transform ${isLoomSelectorOpen ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {isLoomSelectorOpen && <div id="loom-selector-content" className="mt-3 min-w-0 border-t border-slate-700 pt-3">
                      <div className="grid min-w-0 gap-4">
                        <div className="min-w-0">
                          <span className="mb-2 block text-sm font-semibold text-slate-200">Filtrar por tipo de telar</span>
                          <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Filtrar telares por tipo">
                            {([
                              ['ALL', 'Todos', looms.length],
                              ['CIRCULARES', 'Circulares', looms.filter((loom) => !isBandaLoom(loom)).length],
                              ['BANDA', 'Banda', looms.filter((loom) => isBandaLoom(loom)).length],
                            ] as const).map(([filter, label, count]) => (
                              <button key={filter} type="button" onClick={() => changeLoomFilter(filter)} aria-pressed={loomFilter === filter}
                                className={`flex min-h-11 min-w-[6.25rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition-colors ${loomFilter === filter ? (filter === 'BANDA' ? 'border-purple-400 bg-purple-700 text-white' : 'border-blue-400 bg-blue-700 text-white') : 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>
                                <span>{label}</span><span className="rounded-full bg-black/20 px-1.5 py-0.5 text-xs">{count}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200">
                            Buscar máquina
                            <Input value={loomSearch} onChange={(event) => setLoomSearch(event.target.value)} placeholder="Número o nombre" className="h-12 min-w-0 border-slate-600 bg-slate-900 text-base text-white placeholder:text-slate-400" />
                          </label>
                          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200">
                            Telar para operar
                            <select value={activeLoom?.id ?? ''} onChange={(event) => { setSelectedLoomId(Number(event.target.value)); setTerminalStage('PREPARE'); setIsLoomSelectorOpen(false); }} className="h-12 w-full min-w-0 rounded-xl border-2 border-slate-600 bg-slate-900 px-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                              {selectableLooms.length === 0 && <option value="">{isLoomsLoading ? 'Cargando máquinas…' : 'No hay máquinas disponibles'}</option>}
                              {selectableLooms.map((loom) => <option key={loom.id} value={loom.id}>#{loom.loom_number || loom.id} · {loom.name}</option>)}
                            </select>
                          </label>
                          {filteredLooms.length === 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-sm text-amber-200">
                              <span>No hay coincidencias para la búsqueda.</span>
                              <Button type="button" variant="outline" onClick={() => setLoomSearch('')} className="min-h-11 border-amber-400/50 px-3 text-sm text-amber-100">Limpiar búsqueda</Button>
                            </div>
                          )}
                        </div>
                      </div>
                      </div>}
                    </section>

              <div className="flex flex-col gap-3 border-b border-slate-700 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <Gauge className="h-6 w-6 text-amber-400" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Fileta del telar (WIP)</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">Recibe bobinas desde un carrito o rack.</p>
                    <p className="mt-1 text-sm font-medium text-slate-300">
                      Telar #{activeLoom.loom_number || activeLoom.id} — {activeLoom.name}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setCreelTargetLoomId(activeLoom.id);
                    setIsCreelModalOpen(true);
                  }}
                  className="min-h-12 w-full px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 sm:w-auto"
                >
                  <Package className="h-4 w-4" />
                  Cargar Fileta
                </Button>
              </div>

              {/* Barra de Progreso del Creel */}
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 uppercase">Ocupación de Fileta:</span>
                  <span className={creelPercent > 20 ? 'text-emerald-400 font-mono font-black text-sm' : 'text-amber-400 font-mono font-black text-sm'}>
                    {creelCurrent.toFixed(0)} / {creelMax} bobinas ({creelPercent}%)
                  </span>
                </div>

                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      creelPercent > 50 ? 'bg-emerald-500' : creelPercent > 20 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${creelPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                    <span className="text-slate-300 block text-xs font-semibold">Hilo montado (kg)</span>
                    <strong className="text-white text-base">{Number(activeLoom.current_wip_kg || 0).toFixed(1)} kg</strong>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                    <span className="text-slate-300 block text-xs font-semibold">Rollos fabricados</span>
                    <strong className="text-blue-400 text-base">{activeLoom.total_rolls_produced || 0}</strong>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-200 font-medium">
                  {creelCurrent > 0
                    ? '✔ Fileta con bobinas montadas: la producción consumirá por FIFO desde este WIP interno.'
                    : '⚠ Fileta sin bobinas en custodia: presiona "Cargar Fileta" para recibir bobinas desde un Carrito / Rack de Extrusión antes de producir.'}
                </p>
              </div>
            </div>

            {/* Material requerido por ficha: las posiciones y consumos vienen del catálogo, el material disponible del WIP local */}
            <section className={`${terminalStage === 'PREPARE' ? 'min-w-0 rounded-2xl border-2 border-slate-700 bg-slate-800 p-5 shadow-xl' : 'hidden'}`} aria-labelledby="loom-bom-requirements-title">
              <div className="flex items-start gap-3 border-b border-slate-700 pb-4">
                <Package className="mt-0.5 h-6 w-6 shrink-0 text-blue-400" />
                <div className="min-w-0">
                  <h2 id="loom-bom-requirements-title" className="text-lg font-bold text-white">Materiales de la ficha</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">La ficha indica qué PTI va en cada posición. La terminal revisa el WIP de este telar y consume por FIFO; no necesitas volver a seleccionar el rack ya recibido.</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block space-y-1.5 text-sm font-semibold text-slate-200">
                  Rollo o banda a producir
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <Input value={ptiCatalogQrInput} onChange={(event) => setPtiCatalogQrInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const code = ptiCatalogQrInput.trim().toUpperCase().replace(/^TELARES-PTI:/, ''); const match = compatibleBoms.find((bom) => String(bom.code).toUpperCase() === code); if (match) { setSelectedBomId(Number(match.id)); setPtiCatalogQrInput(''); toast.success(`Ficha ${match.code} seleccionada.`); } else toast.error('El QR no corresponde a una ficha activa compatible con este telar.'); } }} placeholder="Escanea o escribe QR de la ficha" className="h-11 bg-slate-950 text-white" />
                    <QrScannerButton title="Escanear QR de ficha PTI" onScan={(value) => { const code = value.trim().toUpperCase().replace(/^TELARES-PTI:/, ''); const match = compatibleBoms.find((bom) => String(bom.code).toUpperCase() === code); if (match) { setSelectedBomId(Number(match.id)); setPtiCatalogQrInput(''); toast.success(`Ficha ${match.code} seleccionada.`); } else { setPtiCatalogQrInput(value); toast.error('El QR no corresponde a una ficha activa compatible con este telar.'); } }} />
                  </div>
                  <select
                    value={selectedBomId}
                    onChange={(event) => setSelectedBomId(Number(event.target.value) || '')}
                    className="h-12 w-full rounded-xl border-2 border-slate-600 bg-slate-900 px-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <option value="">Selecciona una ficha compatible</option>
                    {compatibleBoms.map((bom) => <option key={bom.id} value={bom.id}>{bom.code} · {bom.output_product_name || bom.name}</option>)}
                  </select>
                  {!isBomsLoading && compatibleBoms.length === 0 && <span className="block text-xs text-amber-200">No hay fichas activas y confirmadas compatibles con este telar.</span>}
                </label>

                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">Meta planeada</p>
                    <div className="flex gap-2" role="group" aria-label="Unidad de planeación">
                      <Button type="button" variant={plannedInputMode === 'METROS' ? 'default' : 'outline'} onClick={() => setPlannedInputMode('METROS')} className="min-h-10 px-3">Metros</Button>
                      <Button type="button" variant={plannedInputMode === 'PESO' ? 'default' : 'outline'} onClick={() => setPlannedInputMode('PESO')} className="min-h-10 px-3">Peso (kg)</Button>
                    </div>
                  </div>
                  {plannedInputMode === 'METROS' ? (
                    <label className="mt-3 block space-y-1 text-xs font-semibold text-slate-300">
                      Metros planeados
                      <Input type="number" min="0.01" step="0.01" value={plannedMetersInput} onChange={(event) => setPlannedMetersInput(event.target.value)} placeholder="Ej. 1,000" className="h-12 bg-slate-950 text-base text-white" />
                    </label>
                  ) : (
                    <label className="mt-3 block space-y-1 text-xs font-semibold text-slate-300">
                      Peso planeado (kg)
                      <Input type="number" min="0.01" step="0.01" value={plannedWeightInput} onChange={(event) => setPlannedWeightInput(event.target.value)} placeholder="Ej. 250" className="h-12 bg-slate-950 text-base text-white" />
                    </label>
                  )}
                  {plannedInputMode === 'PESO' && selectedBom && !selectedBomEstimatedKgPerMeter && <p className="mt-2 text-xs text-amber-200">Faltan parámetros de conversión de la ficha (ancho de manga, onzas y factor, o gramaje de referencia); no se pueden convertir kg a metros.</p>}
                  {selectedBom && selectedBomEstimatedKgPerMeter > 0 && <p className="mt-2 text-xs text-slate-300">Peso estimado por conversión de ficha: <strong className="text-cyan-200">{(selectedBomEstimatedKgPerMeter * 1000).toFixed(2)} g/m</strong>. El peso real se captura en báscula al registrar la salida.</p>}
                  {plannedMeters > 0 && <p className="mt-2 text-xs text-slate-300">Meta equivalente: <strong className="text-white">{plannedMeters.toLocaleString('es-MX', { maximumFractionDigits: 2 })} m</strong>{plannedInputMode === 'PESO' ? ` · ${Number(plannedWeightInput).toLocaleString('es-MX')} kg` : ''}</p>}
                </div>

                {selectedBom && plannedMeters > 0 && (
                  <div className="space-y-3" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">Requerimientos por posición</h3>
                      <span className="text-xs text-slate-300">WIP del telar #{activeLoom.loom_number || activeLoom.id}</span>
                    </div>
                    {isWipSummaryError && <div role="alert" className="flex flex-col gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"><span>No se pudo consultar el WIP del telar. No se iniciará producción con una disponibilidad desconocida.</span><Button type="button" variant="outline" onClick={() => refetchWipSummary()} className="min-h-10 border-rose-300/50 text-rose-100">Reintentar consulta</Button></div>}
                    {demandPreview.length ? demandPreview.map((demand: any) => (
                      <article key={demand.ptiProductId} className="rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-white">{demand.ptiProduct?.code || `PTI ${demand.ptiProductId}`} · {demand.ptiProduct?.name || 'Producto sin nombre'}</p>
                            <p className="mt-0.5 text-xs text-slate-300">Color: {demand.ptiProduct?.color || 'Sin color registrado'}{demand.ptiProduct?.denier ? ` · ${demand.ptiProduct.denier} D` : ''}</p>
                          </div>
                          <Badge className={demand.deficitKg == null && demand.deficitSpools == null ? 'bg-slate-700 text-slate-200' : demand.deficitKg > 0 || demand.deficitSpools > 0 ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}>
                            {demand.deficitKg == null && demand.deficitSpools == null ? 'Revisar consumo' : demand.deficitKg > 0 || demand.deficitSpools > 0 ? 'Falta material' : 'WIP suficiente'}
                          </Badge>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {demand.components.map(({ item, requiredKg, requiredSpools }: any) => {
                            const roleLabels: Record<string, string> = { URDIMBRE: 'Urdimbre', TRAMA: 'Trama', AMBOS: 'Urdimbre y trama', REFUERZO: 'Cinta / refuerzo' };
                            return <p key={item.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded-lg bg-slate-950/70 px-3 py-2 text-xs">
                              <span className="font-semibold text-blue-200">{roleLabels[String(item.role).toUpperCase()] || item.role}</span>
                              <span className="text-slate-200">Requiere {requiredKg == null ? '—' : `${requiredKg.toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg`}{requiredSpools == null ? '' : ` · ${requiredSpools.toLocaleString('es-MX', { maximumFractionDigits: 2 })} bobinas`}</span>
                            </p>;
                          })}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                          <div className="rounded-lg bg-slate-950 p-2.5"><span className="block text-slate-400">Disponible en este telar</span><strong className="mt-1 block text-white">{demand.wipKg.toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg · {demand.wipSpools.toLocaleString('es-MX', { maximumFractionDigits: 2 })} bobinas</strong></div>
                          <div className="rounded-lg bg-slate-950 p-2.5"><span className="block text-slate-400">Total para la meta</span><strong className="mt-1 block text-cyan-200">{demand.requiredKg == null ? 'Peso por confirmar' : `${demand.requiredKg.toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg`}{demand.requiredSpools == null ? '' : ` · ${demand.requiredSpools.toLocaleString('es-MX', { maximumFractionDigits: 2 })} bobinas`}</strong></div>
                          <div className="rounded-lg bg-slate-950 p-2.5"><span className="block text-slate-400">Pendiente de transferir</span><strong className={demand.deficitKg == null && demand.deficitSpools == null ? 'mt-1 block text-slate-200' : demand.deficitKg > 0 || demand.deficitSpools > 0 ? 'mt-1 block text-amber-200' : 'mt-1 block text-emerald-200'}>{demand.deficitKg == null ? (demand.deficitSpools == null ? 'Revisar peso unitario' : `${demand.deficitSpools.toLocaleString('es-MX', { maximumFractionDigits: 2 })} bobinas`) : `${demand.deficitKg.toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg${demand.deficitSpools == null ? '' : ` · ${demand.deficitSpools.toLocaleString('es-MX', { maximumFractionDigits: 2 })} bobinas`}`}</strong></div>
                        </div>
                      </article>
                    )) : <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100">Esta ficha no tiene PTI ni consumos configurados. Completa su ficha técnica antes de producir.</p>}
                    {hasUnconfiguredConsumption && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100">Falta configurar el consumo de uno o más PTI en la ficha. No se podrá iniciar la corrida hasta completarlo.</p>}
                    {hasUnknownAvailability && <p role="alert" className="rounded-lg border border-slate-600 bg-slate-950/60 p-3 text-sm text-slate-200">No es posible calcular la cobertura en piezas: falta un peso unitario para uno de los PTI. Completa el peso en el catálogo de Extrusión.</p>}
                    {hasMaterialShortage && <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-amber-100">Transfiere al WIP de este telar solo los PTI que aparecen como faltantes. El sistema conserva lote, QR de origen y consumo FIFO.</p><Button type="button" onClick={() => { setCreelTargetLoomId(activeLoom.id); setIsCreelModalOpen(true); }} className="min-h-11 bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700">Transferir bobinas al telar</Button></div>}
                  </div>
                )}
              </div>
            </section>

            {terminalStage === 'PREPARE' && (
              <div className="flex justify-end xl:col-span-2">
                <Button type="button" onClick={() => setTerminalStage('RUN')} className="min-h-12 w-full px-5 text-base font-bold sm:w-auto">
                  Continuar a corrida <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Card: Corrida Activa */}
            <div id="loom-production" className={`${terminalStage === 'RUN' ? 'mx-auto w-full max-w-5xl rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4 lg:col-span-12' : 'hidden'}`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Factory className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Corrida activa</h2>
                </div>
                {activeRun ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1">EN PROCESO</Badge>
                ) : (
                  <Badge className="bg-slate-700 text-slate-300 font-bold text-xs">DISPONIBLE</Badge>
                )}
              </div>

              {activeRun ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                    <span className="text-xs font-bold uppercase text-slate-400">Receta / BOM en Máquina:</span>
                    <p className="text-lg font-black text-blue-400 mt-0.5">{activeRun.bom?.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                      <span className="bg-slate-800 px-2 py-1 rounded">
                        Onzas: {activeRun.bom?.ounces_yd2 ? `${Number(activeRun.bom.ounces_yd2).toFixed(1)} oz` : 'Estándar'}
                      </span>
                      <span className="bg-slate-800 px-2 py-1 rounded">Ancho: {activeRun.bom?.target_width_cm} cm</span>
                      {allowCosts && (
                        <span className="bg-slate-800 px-2 py-1 rounded">
                          Índice Costo: x{Number(activeRun.bom?.cost_transformation_index || 1).toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <span className="text-xs font-semibold text-slate-300 block">Rollos creados</span>
                      <span className="text-2xl font-black text-white">{activeRun.rolls_produced_count}</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <span className="text-xs font-semibold text-slate-300 block">Metros producidos</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {Number(activeRun.meters_produced).toFixed(0)} m
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={finishRunMutation.isPending}
                      onClick={() => {
                        if (!window.confirm(`¿Finalizar la corrida activa ${activeRun.folio} en ${activeLoom.name}? El telar quedará DISPONIBLE conservando su WIP en fileta.`)) {
                          return;
                        }
                        finishRunMutation.mutate(
                          { run_id: activeRun.id },
                          {
                            onSuccess: (res) => {
                              toast.success(res.message || 'Corrida finalizada.');
                              refetchLooms();
                            },
                            onError: (err: any) => {
                              toast.error(err?.response?.data?.message || err?.message || 'No se pudo finalizar la corrida.');
                            },
                          }
                        );
                      }}
                      className="min-h-12 w-full border-2 border-amber-400/70 bg-amber-950/40 px-4 text-base font-semibold text-amber-100 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-900/50"
                    >
                      <Square className="h-5 w-5 shrink-0" />
                      {finishRunMutation.isPending ? 'Cerrando corrida…' : 'Finalizar corrida'}
                    </Button>
                    <p className="text-sm leading-relaxed text-slate-300">Finalízala para cambiar de receta. El telar conservará su WIP.</p>
                  </div>
                  <Button type="button" onClick={() => setTerminalStage('OUTPUT')} className="h-12 w-full bg-blue-600 hover:bg-blue-700 text-base font-bold text-white">
                    Continuar a registrar rollo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <p className="text-sm font-semibold text-slate-300">
                    Este telar no tiene ninguna corrida activa en producción.
                  </p>
                  <Button
                    onClick={() => setIsStartRunModalOpen(true)}
                    disabled={!canStartSelectedRun}
                    className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Iniciar Corrida de Producción
                  </Button>
                  {!canStartSelectedRun && <p className="mx-auto max-w-xl text-sm leading-relaxed text-amber-200">Vuelve a Preparar telar, elige una ficha y una meta. El WIP debe cubrir el consumo calculado antes de iniciar.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Registro de salida con espacio suficiente para los campos y la validación */}
          <div id="loom-roll-report" className={`${terminalStage === 'OUTPUT' || terminalStage === 'HISTORY' ? 'lg:col-span-12' : 'hidden'}`}>
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 sm:p-6 shadow-xl space-y-6">
              {terminalStage === 'OUTPUT' && <>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                <Sparkles className="h-6 w-6 text-amber-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Registrar rollo y QR Viajero
                  </h2>
                  <p className="text-sm text-slate-300">
                    Captura la salida para generar la etiqueta con el código oficial.
                  </p>
                </div>
              </div>

              {activeRun ? (
                <form onSubmit={handleFinishRoll} className="space-y-6">
                  <section className="space-y-3 rounded-2xl border-2 border-cyan-500/40 bg-cyan-950/20 p-4">
                    <div><h3 className="text-sm font-black uppercase text-cyan-100">QR virgen del producto terminado *</h3><p className="mt-1 text-sm text-slate-300">Solicita etiquetas de salida para Telares a Almacén. El QR solo se asigna al rollo cuando se confirma el registro; si se cancela o falla, permanece virgen.</p></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                      <QrScannerButton title="Escanear QR virgen del rollo terminado" onScan={(value) => { setOutputVirginQr(value.trim()); toast.success('QR leído. Se asignará al confirmar el registro del rollo.'); }} />
                      <label className="space-y-1 text-xs font-bold uppercase text-slate-300">Código leído / captura manual
                        <Input value={outputVirginQr} onChange={(event) => setOutputVirginQr(event.target.value)} placeholder="Escanea o captura el QR virgen de Telares" className="h-11 bg-slate-950 font-mono text-sm normal-case text-white" />
                      </label>
                    </div>
                    {outputVirginQr && <p className="break-all rounded-lg bg-slate-950 p-2 font-mono text-xs text-emerald-200" aria-live="polite">QR listo: {outputVirginQr}</p>}
                  </section>
                  {/* BANNER INDUSTRIAL: PREVISUALIZACIÓN DEL CÓDIGO OFICIAL */}
                  <div className="rounded-2xl border-4 border-blue-500 bg-slate-950 p-5 shadow-2xl space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      CÓDIGO OFICIAL DEL ROLLO DE SALIDA (ESTRUCTURA DEL QR):
                    </span>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-wider">
                      {previewRollCode}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-300 pt-1 border-t border-slate-800">
                      <span>Telar: <strong className="text-blue-400 font-mono">#{activeLoom.loom_number || activeLoom.id}</strong></span>
                      <span>Turno: <strong className="text-amber-400 font-mono">{shiftSelection}°</strong></span>
                      <span>Rollo Consecutivo: <strong className="text-emerald-400 font-mono">#{nextRollSequence}</strong></span>
                      <span>Nómina: <strong className="text-purple-400 font-mono">{activeOperator?.numero_nomina || 'Pendiente'}</strong></span>
                    </div>
                  </div>

                  {/* Selectores de Turno y Operador de Tejido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selector de Turno de Trabajo */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                        Turno de Trabajo:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((shiftNum) => (
                          <button
                            key={shiftNum}
                            type="button"
                            onClick={() => {
                              setShiftSelection(shiftNum);
                              setOperatorSegments((segments) => segments.map((segment, index) => index === 0 ? { ...segment, shift_number: shiftNum } : segment));
                            }}
                            className={`h-12 rounded-xl text-sm font-black uppercase border-2 transition-all ${
                              shiftSelection === shiftNum
                                ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-md'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-750'
                            }`}
                          >
                            {shiftNum}° Turno
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Operador con Nómina */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                        <span>Operador de Tejido:</span>
                        <span className="text-blue-400 font-mono text-[11px]">Nómina: {activeOperator?.numero_nomina || 'Pendiente'}</span>
                      </label>
                      <select
                        value={selectedOperatorNomina}
                        onChange={(e) => {
                          setSelectedOperatorNomina(e.target.value);
                          const selected = availableOperators.find((op) => op.numero_nomina === e.target.value);
                          if (selected) updateOperatorSegment(0, { operator_id: selected.id });
                        }}
                        className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-600 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                      >
                        {availableOperators.map((op) => (
                          <option key={op.id} value={op.numero_nomina}>
                            {op.first_name} {op.last_name} (Nómina: {op.numero_nomina})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                      <div className="space-y-2">
                        <label htmlFor="shift-supervisor" className="block text-xs font-black uppercase tracking-wider text-slate-300">
                          Supervisor responsable del turno
                        </label>
                        <select
                          id="shift-supervisor"
                          required
                          value={shiftSupervisorId}
                          onChange={(event) => setShiftSupervisorId(event.target.value ? Number(event.target.value) : '')}
                          className="h-12 w-full rounded-xl border-2 border-slate-600 bg-slate-950 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Selecciona supervisor de Telares</option>
                          {availableSupervisors.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.full_name || `${candidate.first_name} ${candidate.last_name}`} · Nómina {candidate.numero_nomina}</option>
                          ))}
                        </select>
                        {availableSupervisors.length === 0 && <p className="text-xs text-amber-300">No hay supervisores activos de Telares en el catálogo.</p>}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">
                        El supervisor y los tramos de intervención se guardarán en el historial consultable por el QR del rollo.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-black text-white">Operadores y tramos de intervención</h3>
                        <p className="text-xs text-slate-400">El primer operador cubre inicialmente el rollo completo; agrega tramos y ajusta los rangos si hubo relevos.</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setOperatorSegments((segments) => [...segments, {
                          operator_id: activeOperator?.id || '', shift_number: shiftSelection,
                          meters_start: '', meters_end: '', weight_start_kg: '', weight_end_kg: '',
                        }])}
                        disabled={availableOperators.length === 0}
                        className="h-10 shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        <PlusCircle className="mr-1.5 h-4 w-4" /> Agregar operador
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {operatorSegments.map((segment, index) => (
                        <div key={`operator-segment-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3 sm:grid-cols-2 xl:grid-cols-6">
                          <div className="space-y-1 xl:col-span-2">
                            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Operador {index + 1}</label>
                            <select
                              required
                              value={segment.operator_id}
                              onChange={(event) => updateOperatorSegment(index, { operator_id: event.target.value ? Number(event.target.value) : '' })}
                              className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">Selecciona operador</option>
                              {availableOperators.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name || `${candidate.first_name} ${candidate.last_name}`} · {candidate.numero_nomina}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Turno</label>
                            <select
                              value={segment.shift_number}
                              onChange={(event) => updateOperatorSegment(index, { shift_number: Number(event.target.value) })}
                              className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none"
                            >
                              {[1, 2, 3].map((shift) => <option key={shift} value={shift}>{shift}° turno</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2 xl:col-span-2">
                            <label className="space-y-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Desde (m)
                              <input type="number" min="0" step="0.01" required value={segment.meters_start} onChange={(event) => updateOperatorSegment(index, { meters_start: event.target.value })} className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none" />
                            </label>
                            <label className="space-y-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Hasta (m)
                              <input type="number" min="0" max={metersInput || undefined} step="0.01" required value={segment.meters_end} onChange={(event) => updateOperatorSegment(index, { meters_end: event.target.value })} className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none" />
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2 xl:col-span-2">
                            <label className="space-y-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Desde (kg, opcional)
                              <input type="number" min="0" step="0.001" value={segment.weight_start_kg} onChange={(event) => updateOperatorSegment(index, { weight_start_kg: event.target.value })} className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none" />
                            </label>
                            <label className="space-y-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Hasta (kg)
                              <input type="number" min="0" max={weightInput || undefined} step="0.001" value={segment.weight_end_kg} onChange={(event) => updateOperatorSegment(index, { weight_end_kg: event.target.value })} className="h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none" />
                            </label>
                          </div>
                          <div className="flex items-end justify-end">
                            <Button type="button" variant="outline" aria-label={`Quitar operador ${index + 1}`} title="Quitar operador" disabled={operatorSegments.length === 1} onClick={() => setOperatorSegments((segments) => segments.filter((_, current) => current !== index))} className="h-10 w-full rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-300 disabled:opacity-40 sm:w-12">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campos Metros y Peso */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-black uppercase tracking-wider text-slate-300">
                        Metros Producidos (m):
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={metersInput}
                        onChange={(e) => setMetersInput(e.target.value)}
                        required
                        className="w-full h-14 rounded-xl bg-slate-900 border-2 border-slate-600 px-4 text-2xl font-black text-white focus:border-blue-500 focus:outline-none font-mono"
                        placeholder="Ej. 500"
                      />
                      <p className="text-xs text-slate-400 font-medium">Contador lineal de tejeduría</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-black uppercase tracking-wider text-slate-300">
                        Peso Neto en Báscula (kg):
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        required
                        className="w-full h-14 rounded-xl bg-slate-900 border-2 border-slate-600 px-4 text-2xl font-black text-emerald-400 focus:border-blue-500 focus:outline-none font-mono"
                        placeholder="Ej. 35.0"
                      />
                      <p className="text-xs text-slate-400 font-medium">Peso físico verificado en báscula</p>
                    </div>
                  </div>

                  {/* Notas operativas */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                      Notas Operativas / Incidencias (Opcional):
                    </label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="w-full h-11 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                      placeholder="Ej. Bobina cambiada sin paros, tela inspeccionada..."
                    />
                  </div>

                  {/* Selector Industrial de Destino del Rollo PTI */}
                  <div className="space-y-3 rounded-2xl bg-slate-900 border-2 border-slate-700 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-amber-400" />
                        Destino y Encaminamiento del Rollo PTI:
                      </p>
                      <span className="text-[11px] font-bold text-slate-400">
                        Condiciona el WIP y la preparación en el área asignada
                      </span>
                    </div>

                    {usesCorteLaminationGate ? (
                      <div className="rounded-xl border border-indigo-400/30 bg-indigo-950/30 p-4 text-sm text-slate-200">
                        <p className="font-bold text-indigo-200">Este rollo queda disponible para una solicitud de Corte a Laminado.</p>
                        <p className="mt-1">Telares registra la ruta de la ficha. Corte decidirá si requiere el rollo; Laminado deberá escanearlo y confirmar la recogida física en Telares antes de recibirlo.</p>
                      </div>
                    ) : <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }}>
                      {allowedDestinationOptions.map(({ route }) => {
                        const choice = route.join(',');
                        const destination = destinationForRoute(route) || 'CORTE';
                        const presentation = DESTINATION_PRESENTATION[destination];
                        const isSelected = destinationChoice === choice;
                        const activeColors: Record<string, string> = {
                          indigo: 'border-indigo-400 bg-indigo-950/70 ring-indigo-400/40',
                          amber: 'border-amber-400 bg-amber-950/70 ring-amber-400/40',
                          emerald: 'border-emerald-400 bg-emerald-950/70 ring-emerald-400/40',
                          cyan: 'border-cyan-400 bg-cyan-950/70 ring-cyan-400/40',
                          purple: 'border-purple-400 bg-purple-950/70 ring-purple-400/40',
                        };
                        const hintColors: Record<string, string> = {
                          indigo: 'text-indigo-300', amber: 'text-amber-300', emerald: 'text-emerald-300',
                          cyan: 'text-cyan-300', purple: 'text-purple-300',
                        };
                        const routeLabels: Record<string, string> = {
                          LAMINADO: 'Laminado', CORTE: 'Corte', CONFECCION: 'Confección', LONAS: 'Lonas',
                          ALMACEN: 'Almacén', VENTA: 'Venta',
                        };
                        const label = route.length === 2 && route[1] === 'CORTE' && !isFabricRoll
                          ? outputProductKind === 'CINTA' ? 'Corte de Cinta' : 'Corte de Banda'
                          : route.slice(1).map((stage) => routeLabels[stage] || stage).join(' → ');
                        return (
                          <button
                            key={choice}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setDestinationChoice(choice)}
                            className={`min-h-[92px] p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                              isSelected
                                ? `${activeColors[presentation.color]} text-white shadow-lg ring-2`
                                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="text-2xl" aria-hidden="true">{presentation.icon}</span>
                            <span className="text-xs font-black uppercase tracking-wide">{label}</span>
                            <span className={`text-[10px] font-bold ${hintColors[presentation.color]}`}>{presentation.hint}</span>
                          </button>
                        );
                      })}
                    </div>}
                    {allowedDestinationOptions.length === 0 ? (
                      <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm font-bold text-rose-200">
                        Esta ficha no tiene rutas autorizadas configuradas. Pide al administrador que la actualice en Catálogo Telares / PTI.
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-slate-300">Solo aparecen rutas autorizadas en la ficha técnica de {outputBom?.name || 'este PTI'}.</p>
                    )}

                    {/* Resumen dinámico del Ruteo que se estampará en el QR Viajero */}
                    <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-blue-400" />
                        Ruta Oficial que se estampará en el QR Viajero:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getSelectedRoute().map((st, i, arr) => (
                          <React.Fragment key={st}>
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${
                                st === 'TELARES'
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : st === 'GLOBO'
                                  ? 'bg-cyan-600 text-white border-cyan-500'
                                  : st === 'LAMINADO'
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-amber-600 text-white border-amber-500'
                              }`}
                            >
                              {st}
                            </span>
                            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botón Principal de Salida */}
                  <Button
                    type="submit"
                    disabled={finishRollMutation.isPending || getSelectedRoute().length < 2 || !outputVirginQr.trim()}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
                  >
                    <CheckCircle2 className="h-7 w-7" />
                    {finishRollMutation.isPending
                      ? 'Procesando y Generando QR Viajero...'
                      : `REGISTRAR ROLLO ${previewRollCode}`}
                  </Button>
                </form>
              ) : (
                <div className="rounded-xl bg-slate-900 border border-dashed border-slate-700 p-8 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
                  <p className="text-base font-bold text-white">No hay una corrida activa.</p>
                  <p className="text-sm text-slate-300 max-w-sm mx-auto">
                    Vuelve a Corrida para iniciar una producción antes de registrar un rollo.
                  </p>
                  <Button type="button" onClick={() => setTerminalStage('RUN')} className="min-h-12 px-5 text-sm font-semibold">Volver a Corrida</Button>
                </div>
              )}
              </>}

              {/* Historial Reciente de Salidas / Rollos de este Telar */}
              <div id="loom-roll-history" className={`${terminalStage === 'HISTORY' ? 'pt-1' : 'hidden'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 text-blue-400" />
                      Salidas / Rollos Recientes — {activeLoom.name}
                    </h3>
                    <p className="text-sm text-slate-300">
                      Reimprime etiquetas QR Viajeras o consulta la genealogía completa con un clic
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/telares/trazabilidad')}
                    className="min-h-11 border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-slate-100 rounded-xl"
                  >
                    Ver Todo el Historial
                  </Button>
                </div>

                {isRecentLoomRollsLoading ? (
                  <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-4 text-center text-sm text-slate-300 font-semibold" role="status">Cargando historial de este telar…</div>
                ) : recentLoomRolls.length === 0 ? (
                  <div className="rounded-xl bg-slate-900/70 border border-slate-700 p-4 text-center text-sm text-slate-300 font-semibold">
                    Aún no hay salidas registradas en este telar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {recentLoomRolls.map((roll) => (
                      <div
                        key={roll.id}
                        className="rounded-xl bg-slate-900 border border-slate-700 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-black text-sm text-amber-300 truncate">
                            {roll.roll_code}
                          </div>
                          <div className="text-sm font-semibold text-slate-200 truncate">
                            {roll.output_product_name || roll.bom?.name || 'Rollo de Telares'}
                          </div>
                          <div className="text-xs text-slate-300 font-mono">
                            {Number(roll.meters).toFixed(0)} m · {Number(roll.weight_kg).toFixed(1)} kg · Ruta: {(roll.route || []).join(' ➔ ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setActiveViajeroRoll(roll)}
                            className="min-h-11 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg flex items-center gap-2"
                            title="Reimprimir etiqueta QR Viajero"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Reimprimir QR
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: transferir bobinas al WIP del telar */}
      <Dialog open={isCreelModalOpen} onOpenChange={(open) => { if (!open) closeCreelTransfer(); }}>
        <DialogPortal>
          <DialogOverlay className="z-[9998] bg-black/75" />
          <DialogPrimitive.Content
            onInteractOutside={(event) => event.preventDefault()}
            className="fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-slate-600 bg-slate-800 p-4 text-slate-100 shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6"
          >
            <DialogHeader className="sticky top-[-1rem] z-20 -mx-4 -mt-4 flex flex-row items-start justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 pb-4 pt-4 text-left sm:top-[-1.5rem] sm:-mx-6 sm:-mt-6 sm:px-6 sm:pb-5 sm:pt-6">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-3 text-lg font-extrabold uppercase leading-tight text-white sm:text-xl">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Package className="h-5 w-5" />
                  </span>
                  Transferir PTI a la fileta
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-prose text-sm leading-relaxed text-slate-300">
                  Escanea el QR del contenedor, selecciona el telar destino y confirma la cantidad antes de mover la custodia.
                </DialogDescription>
              </div>
              <DialogClose aria-label="Cerrar transferencia" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <X aria-hidden="true" className="h-7 w-7" strokeWidth={2.5} />
              </DialogClose>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm sm:grid-cols-2 sm:p-4">
              <p className="sm:col-span-2">Telar receptor: <strong className="text-amber-400">{creelTargetLoom?.name || 'Seleccionar telar'}</strong></p>
              {creelTargetLoom && <>
                <p>Capacidad: <strong className="text-amber-400">{creelTargetCapacity} bobinas</strong></p>
                <p>Ocupación: <strong className="text-emerald-400">{creelTargetCurrent} bobinas</strong></p>
                <p className="sm:col-span-2">Espacio libre: <strong className="text-white">{Math.max(0, creelTargetCapacity - creelTargetCurrent)} bobinas</strong></p>
              </>}
            </div>

            <form onSubmit={handleLoadCreel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Telar receptor:</label>
                <select
                  required
                  value={creelTargetLoomId}
                  onChange={(event) => { setCreelTargetLoomId(Number(event.target.value) || ''); setIsCreelConfirmationOpen(false); }}
                  className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                  disabled={isCreelConfirmationOpen}
                >
                  <option value="">-- Seleccionar telar destino --</option>
                  {looms.map((loom) => <option key={loom.id} value={loom.id}>{loom.name} · {loom.subarea?.name || loom.type}</option>)}
                </select>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <strong className="block text-amber-300">{transferMode === 'CART_FULL' ? 'Modo: carrito completo' : 'Modo: rack con transferencia parcial'}</strong>
                <span>{transferMode === 'CART_FULL' ? 'Escanea el QR del carrito. Se transferirá todo su saldo, sin permitir una cantidad parcial.' : 'Escanea el QR del rack. Después indica cuántas bobinas físicas tomar; el resto seguirá en Extrusión.'}</span>
              </div>
              {!transferModeReady && (
                <p role="alert" className="text-xs text-rose-300">
                  {isTransferModeError ? 'No se pudo leer el modo vigente. Reintenta antes de transferir.' : 'Consultando el modo de transferencia...'}
                </p>
              )}

              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3 sm:p-4">
                <label className="block text-sm font-bold text-slate-200">Escanea el QR del {transferMode === 'CART_FULL' ? 'carrito' : 'rack'} de Extrusión</label>
                <QrScannerButton
                  title={`Escanear QR del ${transferMode === 'CART_FULL' ? 'carrito' : 'rack'} de PTI`}
                  onScan={(code) => {
                    if (!transferModeReady) {
                      toast.error('Espera a que se confirme el modo de transferencia.');
                      return;
                    }
                    const clean = code.trim();
                    const found = ptiRacks.find((rack: any) => String(rack.qr_code || '').trim() === clean);
                    if (!found || Number(found.current_quantity) <= 0) {
                      toast.error('El QR no corresponde a un contenedor con bobinas disponibles.');
                      return;
                    }
                    const expectedContainer = transferMode === 'CART_FULL' ? 'CARRITO' : 'RACK';
                    if (String(found.container_type || 'RACK').trim().toUpperCase() !== expectedContainer) {
                      toast.error(`El modo activo requiere el QR de un ${expectedContainer === 'CARRITO' ? 'carrito' : 'rack'}.`);
                      return;
                    }
                    if (!creelCompatibleRacks.some((rack: any) => rack.id === found.id)) {
                      toast.error('El PTI o la ruta del contenedor no son compatibles con el telar seleccionado.');
                      return;
                    }
                    setCreelRackId(found.id);
                    setCreelScannedQr(String(found.qr_code));
                    setCreelSpoolsToLoad(Number(found.current_quantity));
                    setIsCreelConfirmationOpen(false);
                    toast.success(`${expectedContainer === 'CARRITO' ? 'Carrito' : 'Rack'} ${found.rack_code} leído. Cantidad disponible precargada.`);
                  }}
                />
                {selectedTransferRack && creelScannedQr && (
                  <div className="space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm" aria-live="polite">
                    <p className="font-bold text-emerald-200">QR leído · {selectedTransferRack.rack_code}</p>
                    <p className="break-all font-mono text-xs text-slate-300">{creelScannedQr}</p>
                    <p className="text-slate-100">{selectedTransferRack.currentPtiProduct?.code || 'PTI'} · {selectedTransferRack.currentPtiProduct?.name || 'Producto sin nombre'}{selectedTransferRack.currentPtiProduct?.color ? ` · ${selectedTransferRack.currentPtiProduct.color}` : ''}</p>
                    <p className="font-semibold text-emerald-300">Disponible en origen: {transferRackQuantity.toLocaleString('es-MX')} bobinas</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label htmlFor="creel-spools-to-load" className="text-xs font-bold uppercase text-slate-300">
                      {transferMode === 'CART_FULL' ? 'Bobinas del carrito (completo)' : 'Bobinas a tomar del rack'}
                    </label>
                    {selectedTransferRack && <span className="text-xs font-bold text-emerald-300">{transferRackQuantity.toLocaleString('es-MX')} disponibles</span>}
                  </div>
                  <Input
                    id="creel-spools-to-load"
                    type="number"
                    min={1}
                    max={Math.min(transferRackQuantity, transferCapacityAvailable)}
                    step="1"
                    readOnly={transferMode === 'CART_FULL' || isCreelConfirmationOpen}
                    disabled={!selectedTransferRack}
                    value={creelSpoolsToLoad || ''}
                    placeholder={selectedTransferRack ? 'Cantidad de bobinas' : 'Escanea primero el QR'}
                    onChange={(event) => { setCreelSpoolsToLoad(Number(event.target.value) || 0); setIsCreelConfirmationOpen(false); }}
                    className={`h-12 bg-slate-950 border-slate-700 text-emerald-300 font-mono font-bold text-lg ${transferMode === 'CART_FULL' || isCreelConfirmationOpen ? 'cursor-not-allowed' : ''}`}
                  />
                  {transferMode === 'RACK_PARTIAL' && selectedTransferRack && <p className="text-xs text-slate-300">Indica piezas enteras, hasta {transferRackQuantity.toLocaleString('es-MX')} disponibles y {transferCapacityAvailable.toLocaleString('es-MX')} espacios libres en la fileta.</p>}
                </div>
                <div className="flex flex-col justify-center rounded-xl border border-slate-700 bg-slate-900 p-3">
                  <span className="text-xs font-bold uppercase text-slate-300">Peso calculado</span>
                  <strong className="mt-1 font-mono text-xl text-cyan-300">{transferWeightKg == null ? 'Pendiente de peso unitario' : `${transferWeightKg.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg`}</strong>
                  <span className="mt-1 text-xs text-slate-300">Piezas transferidas × peso unitario registrado</span>
                </div>
              </div>

              {creelTargetLoom && selectedTransferRack && !selectedRackCompatible && (
                <p role="alert" className="text-sm font-semibold text-rose-300">Este contenedor no corresponde al destino del telar. Verifica subárea, ruta y PTI.</p>
              )}

              {isCreelConfirmationOpen ? (
                <div className="space-y-3 rounded-xl border-2 border-blue-400/50 bg-blue-950/40 p-4" role="alert" aria-live="assertive">
                  <div>
                    <h4 className="text-base font-black text-white">Confirma la transferencia</h4>
                    <p className="mt-1 text-sm text-slate-200">Se moverá la custodia de {Number(creelSpoolsToLoad).toLocaleString('es-MX')} bobinas{transferWeightKg == null ? '' : ` (${transferWeightKg.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg)`} desde {selectedTransferRack?.rack_code} hacia {creelTargetLoom?.name}.</p>
                    {transferMode === 'RACK_PARTIAL' && <p className="mt-1 text-xs text-slate-300">Saldo que permanecerá en el rack: {Math.max(0, transferRackQuantity - Number(creelSpoolsToLoad)).toLocaleString('es-MX')} bobinas.</p>}
                  </div>
                  <div className="sticky bottom-[-1rem] -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-slate-700 bg-slate-800 p-4 sm:bottom-[-1.5rem] sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreelConfirmationOpen(false)} className="min-h-11 border-slate-600 text-slate-100">Volver y revisar</Button>
                    <Button type="submit" disabled={!transferModeReady || loadCreelMutation.isPending} className="min-h-11 bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700">
                      {loadCreelMutation.isPending ? 'Transfiriendo…' : 'Confirmar y transferir'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="sticky bottom-[-1rem] -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-slate-700 bg-slate-800 p-4 sm:bottom-[-1.5rem] sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
                  <Button type="button" variant="outline" onClick={closeCreelTransfer} className="min-h-12 border-slate-600 text-slate-100 sm:w-auto">Cancelar</Button>
                  <Button
                    type="submit"
                    disabled={!transferModeReady || loadCreelMutation.isPending || !creelTargetLoom || !creelRackId || !creelScannedQr || !selectedRackCompatible || !Number.isInteger(Number(creelSpoolsToLoad)) || creelSpoolsToLoad <= 0 || creelSpoolsToLoad > transferRackQuantity || creelSpoolsToLoad > transferCapacityAvailable || transferWeightKg == null || (transferMode === 'CART_FULL' && creelSpoolsToLoad !== transferRackQuantity)}
                    className="min-h-12 flex-1 bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    Revisar transferencia
                  </Button>
                </div>
              )}
            </form>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Modal: confirmar inicio de corrida */}
      {isStartRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-slate-600 bg-slate-800 p-5 text-slate-100 shadow-2xl sm:p-6">
            <div className="mb-4 border-b border-slate-700 pb-4">
              <h3 className="text-xl font-black text-white">Confirmar inicio de corrida</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">Verifica ficha, meta y cobertura del WIP de este telar.</p>
            </div>
            <form onSubmit={handleStartRun} className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Telar</p>
                <p className="mt-1 font-bold text-white">#{activeLoom?.loom_number || activeLoom?.id} · {activeLoom?.name}</p>
                <p className="mt-3 text-xs font-bold uppercase text-slate-400">Ficha de producción</p>
                <p className="mt-1 font-bold text-cyan-200">{selectedBom?.code} · {selectedBom?.output_product_name || selectedBom?.name}</p>
                <p className="mt-2 text-sm text-slate-200">Meta: <strong>{plannedMeters.toLocaleString('es-MX', { maximumFractionDigits: 2 })} m</strong>{plannedInputMode === 'PESO' ? ` · ${Number(plannedWeightInput).toLocaleString('es-MX')} kg` : ''}</p>
                <p className="mt-1 text-xs text-slate-300">{demandPreview.length} PTI en la ficha · {canStartSelectedRun ? 'WIP suficiente en la última consulta' : 'La cobertura se volverá a validar al guardar'}.</p>
              </div>
              <label className="block space-y-1.5 text-sm font-semibold text-slate-200">
                Turno
                <select value={runShiftSelection} onChange={(event) => setRunShiftSelection(event.target.value)} className="h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-white">
                  <option value="TURNO_1">Turno 1</option>
                  <option value="TURNO_2">Turno 2</option>
                  <option value="TURNO_3">Turno 3</option>
                </select>
              </label>
              {hasMaterialShortage && <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">El WIP dejó de cubrir la meta. Regresa a Preparar telar y transfiere lo faltante.</p>}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsStartRunModalOpen(false)} className="min-h-11 border-slate-600 text-slate-200">Volver</Button>
                <Button
                  type="submit"
                  disabled={!canStartSelectedRun || startRunMutation.isPending}
                  className="min-h-11 flex-1 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {startRunMutation.isPending ? 'Iniciando…' : 'Confirmar e iniciar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Etiqueta de Enrutamiento (QR Viajero) */}
      <ViajeroLabelModal roll={activeViajeroRoll} onClose={() => setActiveViajeroRoll(null)} />

      {/* MODAL 5: Crear Orden de Consumo (ODC Telares) */}
      <CreateConsumptionOrderModal
        isOpen={isOdcModalOpen}
        initialAreaId={3}
        onClose={() => setIsOdcModalOpen(false)}
      />
    </div>
  );
};

export default TelaresTerminalPage;
