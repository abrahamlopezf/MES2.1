import React, { useState, useMemo, useEffect } from 'react';
import {
  useLoomsQuery,
  useBomsQuery,
  useAssignRackMutation,
  useStartRunMutation,
  useFinishRollMutation,
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
import { toast } from 'sonner';
import {
  Factory,
  Layers,
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
} from 'lucide-react';

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
  const { data: wipSummary } = useTelaresWipSummaryQuery();
  const { data: operators = [] } = useTejidoOperatorsQuery(false);

  // Mutations
  const assignRackMutation = useAssignRackMutation();
  const startRunMutation = useStartRunMutation();
  const finishRollMutation = useFinishRollMutation();
  const loadCreelMutation = useLoadCreelMutation();
  const { data: transferModeData, isError: isTransferModeError } = usePtiTransferModeQuery();
  const transferModeReady = Boolean(transferModeData) && !isTransferModeError;
  const transferMode = transferModeData?.transfer_mode || 'RACK_PARTIAL';
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);

  // Filtro de Telares: Todos (21), Circulares (1-17), Banda (18-21)
  const [loomFilter, setLoomFilter] = useState<'ALL' | 'CIRCULARES' | 'BANDA'>('ALL');
  const [selectedLoomId, setSelectedLoomId] = useState<number | null>(null);

  // Selector de destino del rollo: GLOBO, LAMINADO, AMBOS, CORTE
  const [destinationChoice, setDestinationChoice] = useState<'GLOBO' | 'LAMINADO' | 'AMBOS' | 'CORTE'>('LAMINADO');

  const getSelectedRoute = (): string[] => {
    switch (destinationChoice) {
      case 'GLOBO':
        return ['TELARES', 'GLOBO', 'CORTE'];
      case 'LAMINADO':
        return ['TELARES', 'LAMINADO', 'CORTE'];
      case 'AMBOS':
        return ['TELARES', 'GLOBO', 'LAMINADO', 'CORTE'];
      case 'CORTE':
      default:
        return ['TELARES', 'CORTE'];
    }
  };

  // Estados locales para reporte de rollo
  const [metersInput, setMetersInput] = useState<string>('500');
  const [weightInput, setWeightInput] = useState<string>('35.0');
  const [notesInput, setNotesInput] = useState<string>('');

  // Selector de Turno y Operador de Tejido (con número de nómina)
  const [shiftSelection, setShiftSelection] = useState<number>(() => getCdmxShift().shiftNumber);
  const [selectedOperatorNomina, setSelectedOperatorNomina] = useState<string>('1200');
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

  // Modal para montar Rack Maestro
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [selectedRackRole, setSelectedRackRole] = useState<'URDIMBRE' | 'TRAMA' | 'AMBOS'>('AMBOS');
  const [selectedPtiRackId, setSelectedPtiRackId] = useState<number | ''>('');

  // Modal para Cargar Fileta Creel (1,800 bobinas WIP)
  const [isCreelModalOpen, setIsCreelModalOpen] = useState(false);
  const [creelSpoolsToLoad, setCreelSpoolsToLoad] = useState<number>(0);
  const [creelRackId, setCreelRackId] = useState<number | ''>('');
  const [creelTargetLoomId, setCreelTargetLoomId] = useState<number | ''>('');

  // Modal de Etiqueta QR Viajero
  const [activeViajeroRoll, setActiveViajeroRoll] = useState<ViajeroRoll | null>(null);

  // Modal para Crear ODC de Telares
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);

  // Filtrado de los 21 telares
  const filteredLooms = useMemo(() => {
    if (loomFilter === 'BANDA') {
      return looms.filter((l) => l.subarea_id === 7 || l.type === 'BANDA' || (l.name || '').includes('Banda'));
    }
    if (loomFilter === 'CIRCULARES') {
      return looms.filter((l) => l.subarea_id !== 7 && l.type !== 'BANDA');
    }
    return looms;
  }, [looms, loomFilter]);

  // Telar Activo Seleccionado
  const activeLoom: Loom | null = useMemo(() => {
    if (!looms.length) return null;
    if (selectedLoomId) {
      return looms.find((l) => l.id === selectedLoomId) || looms[0];
    }
    return looms[0];
  }, [looms, selectedLoomId]);
  const creelTargetLoom = useMemo(
    () => looms.find((loom) => loom.id === Number(creelTargetLoomId)) || null,
    [looms, creelTargetLoomId],
  );
  const creelTargetCapacity = Number(creelTargetLoom?.creel_capacity_spools || 1800);
  const creelTargetCurrent = Number(creelTargetLoom?.current_spools_count || 0);
  const selectedTransferRack = ptiRacks.find((rack: any) => rack.id === Number(creelRackId));
  const transferRackQuantity = Number(selectedTransferRack?.current_quantity || 0);
  const transferCapacityAvailable = Math.max(0, creelTargetCapacity - creelTargetCurrent);

  // Corrida activa en el telar
  const activeRun = useMemo(() => {
    return activeLoom?.runs?.find((r) => r.status === 'EN_PROCESO') || null;
  }, [activeLoom]);

  const selectedBom = useMemo(() => boms.find((bom) => bom.id === Number(selectedBomId)) || null, [boms, selectedBomId]);

  // Racks disponibles en planta para asignación
  const availableRacks = useMemo(() => {
    const supportedTypes = (activeLoom?.supported_pti_types || []).map(Number);
    return ptiRacks.filter(
      (r) => Number(r.current_quantity) > 0 && (!supportedTypes.length || supportedTypes.includes(Number(r.current_pti_type_id)))
    );
  }, [ptiRacks, activeLoom]);

  useEffect(() => {
    if (!scannedRackQr || !ptiRacks.length || !looms.length) return;
    const clean = scannedRackQr.trim().toUpperCase();
    const rack = ptiRacks.find((item: any) =>
      [item.qr_code, item.rack_code].some((value) => String(value || '').trim().toUpperCase() === clean)
    );
    if (!rack || Number(rack.current_quantity) <= 0) {
      toast.error('El rack escaneado no está disponible para consumo en Telares.');
    } else {
      setCreelRackId(rack.id);
      setCreelSpoolsToLoad(Number(rack.current_quantity));
      setCreelTargetLoomId('');
      setIsCreelModalOpen(true);
      toast.success(`Rack ${rack.rack_code} identificado. Selecciona el telar y confirma la transferencia.`);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('ptiRackQr');
    setSearchParams(next, { replace: true });
  }, [scannedRackQr, ptiRacks, looms.length, searchParams, setSearchParams]);

  const compatibleBoms = useMemo(() => {
    const supportedBoms = (activeLoom?.supported_bom_ids || []).map(Number);
    return boms.filter((bom) => !supportedBoms.length || supportedBoms.includes(Number(bom.id)));
  }, [boms, activeLoom]);
  const plannedMeters = useMemo(() => {
    if (plannedInputMode === 'METROS') return Number(plannedMetersInput) || 0;
    const targetGramsPerMeter = Number(selectedBom?.target_weight_g_per_m || 0);
    return targetGramsPerMeter > 0 ? (Number(plannedWeightInput) * 1000) / targetGramsPerMeter : 0;
  }, [plannedInputMode, plannedMetersInput, plannedWeightInput, selectedBom]);
  const demandPreview = useMemo(() => {
    if (!selectedBom?.items?.length || plannedMeters <= 0) return [];
    const baselineMeters = Number(selectedBom.standard_output_meters || 0);
    const expectedOutput = Number(selectedBom.expected_output_quantity || 1);
    const multiplier = baselineMeters > 0 ? (plannedMeters / baselineMeters) * expectedOutput : null;
    const loomWip = wipSummary?.looms?.find((loom: any) => Number(loom.id) === Number(activeLoom?.id));
    return selectedBom.items.filter((item) => item.pti_product_id).map((item) => {
      const unit = String(item.required_unit || 'KG').toUpperCase();
      const configured = Number(item.required_quantity || 0);
      const gramsPerMeter = Number(item.consumption_g_per_m || 0) || Number(selectedBom.target_weight_g_per_m || 0) * Number(item.ratio_percentage || 0) / 100;
      const requiredKg = multiplier && configured > 0 && unit === 'KG' ? configured * multiplier : (gramsPerMeter > 0 ? gramsPerMeter * plannedMeters / 1000 : null);
      const requiredSpools = multiplier && configured > 0 && unit === 'PIEZAS' ? configured * multiplier : null;
      const wip = (loomWip?.pti_inventory || []).filter((entry: any) => Number(entry.pti_product_id) === Number(item.pti_product_id));
      const wipKg = wip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_kg || 0), 0);
      const knownSpoolKg = wip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_kg || 0), 0) / Math.max(1, wip.reduce((sum: number, entry: any) => sum + Number(entry.quantity_spools || 0), 0));
      const deficitKg = requiredKg == null ? null : Math.max(0, requiredKg - wipKg);
      const deficitSpools = deficitKg != null && knownSpoolKg > 0 ? deficitKg / knownSpoolKg : null;
      const fifo = ptiRacks.filter((rack: any) => Number(rack.current_pti_product_id) === Number(item.pti_product_id) && Number(rack.current_quantity) > 0);
      return { item, requiredKg, requiredSpools, wipKg, deficitKg, deficitSpools, fifo };
    });
  }, [selectedBom, plannedMeters, wipSummary, activeLoom, ptiRacks]);

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
    return `${loomNum}-${shiftSelection}-${nextRollSequence}-${activeOperator?.numero_nomina || selectedOperatorNomina || '1200'}`;
  }, [activeLoom, shiftSelection, nextRollSequence, selectedOperatorNomina, activeOperator]);

  const updateOperatorSegment = (index: number, changes: Partial<OperatorSegmentInput>) => {
    setOperatorSegments((segments) => segments.map((segment, current) => current === index ? { ...segment, ...changes } : segment));
  };

  // Monitor Creel Fileta del Telar Activo
  const creelMax = activeLoom?.creel_capacity_spools || 1800;
  const creelCurrent = Number(activeLoom?.current_spools_count || 0);
  const creelPercent = Math.min(100, Math.round((creelCurrent / creelMax) * 100));

  // Manejador: Asignar Rack Maestro
  const handleAssignRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoom) return;
    if (!selectedPtiRackId) {
      toast.error('Selecciona un Rack de la lista disponible');
      return;
    }

    try {
      const res = await assignRackMutation.mutateAsync({
        loom_id: activeLoom.id,
        rack_id: Number(selectedPtiRackId),
        role: selectedRackRole,
      });
      toast.success(res.message || 'Rack Maestro montado exitosamente');
      setIsRackModalOpen(false);
      setSelectedPtiRackId('');
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al asignar Rack');
    }
  };

  // Manejador: Cargar Fileta Creel (WIP del Telar)
  const handleLoadCreel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creelTargetLoom) {
      toast.error('Selecciona el telar que recibirá la custodia del PTI.');
      return;
    }
    if (!creelRackId) {
      toast.error('Selecciona el Rack de origen con bobinas');
      return;
    }

    try {
      const res = await loadCreelMutation.mutateAsync({
        loom_id: creelTargetLoom.id,
        rack_id: Number(creelRackId),
        spools_to_load: Number(creelSpoolsToLoad),
      });
      toast.success(res.message || 'Bobinas cargadas a la fileta');
      setIsCreelModalOpen(false);
      setCreelRackId('');
      setCreelTargetLoomId('');
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al cargar fileta');
    }
  };

  // Manejador: Iniciar Corrida
  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoom) return;
    if (!selectedBomId) {
      toast.error('Selecciona una receta / BOM para tejer');
      return;
    }

    try {
      const numericMeters = plannedMeters || Number(plannedMetersInput) || 1500;
      await startRunMutation.mutateAsync({
        loom_id: activeLoom.id,
        bom_id: Number(selectedBomId),
        shift: runShiftSelection,
        meters_planned: numericMeters,
        ...(plannedInputMode === 'PESO' ? { weight_planned_kg: Number(plannedWeightInput) } : {}),
        notes: notesInput || undefined,
      });
      toast.success(`Corrida de tejeduría iniciada en ${activeLoom.name}`);
      setIsStartRunModalOpen(false);
      refetchLooms();
    } catch (err: any) {
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
    const segmentsPayload = operatorSegments.map((segment) => ({
      operator_id: Number(segment.operator_id),
      shift_number: Number(segment.shift_number),
      meters_start: Number(segment.meters_start),
      meters_end: Number(segment.meters_end),
      weight_start_kg: segment.weight_start_kg === '' ? undefined : Number(segment.weight_start_kg),
      weight_end_kg: segment.weight_end_kg === '' ? undefined : Number(segment.weight_end_kg),
    }));
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
      const res = await finishRollMutation.mutateAsync({
        run_id: activeRun.id,
        meters: numMeters,
        weight_kg: numWeight,
        notes: notesInput || undefined,
        shift_number: shiftSelection,
        operator_nomina: activeOperator?.numero_nomina || selectedOperatorNomina,
        shift_supervisor_id: Number(shiftSupervisorId),
        operator_segments: segmentsPayload,
        custom_route: getSelectedRoute(),
      });

      const roll = res.roll;
      const consumedSpools = res.backflush?.reduce((acc: number, item: any) => acc + Number(item.spools_consumed), 0) || 0;

      toast.success(
        `Rollo ${roll.roll_code} creado exitosamente. Consumo: ${consumedSpools.toFixed(1)} bobinas.`
      );

      setActiveViajeroRoll(roll);
      setNotesInput('');
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al registrar rollo');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 space-y-6">
      {/* 1. Barra de Estado Superior Industrial */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Factory className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Terminal de Tejido / Telares
              </h1>
              <Badge className="bg-emerald-600/90 text-white font-bold text-xs">EN LÍNEA</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Operación de los 21 Telares, Filetas Creel (1,800 Bobinas WIP) y Salida con Nomenclatura Oficial
            </p>
          </div>
        </div>

        {/* Indicadores Clave Rápidos */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => navigate('/telares/catalogos')}
            variant="outline"
            className="h-11 px-3 border-slate-700 bg-slate-900 text-slate-200 font-bold text-xs rounded-xl"
          >
            <Factory className="h-4 w-4 mr-1.5" />
            Catálogos y Fichas PDF
          </Button>
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-center flex-1 md:flex-initial">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Turno Seleccionado</span>
            <span className="text-base font-black text-amber-400">TURNO {shiftSelection}°</span>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-center flex-1 md:flex-initial">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Telares Operando</span>
            <span className="text-base font-black text-emerald-400">
              {looms.filter((l) => l.status === 'EN_PRODUCCION').length} / {looms.length}
            </span>
          </div>

          {/* ODC Telares */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsOdcModalOpen(true)}
              className="flex-1 sm:flex-initial h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <PackagePlus className="h-4 w-4" />
              Solicitar ODC Telares
            </Button>
            <Button
              onClick={() => navigate('/warehouse/orders?area_id=3&area_name=Telares')}
              variant="outline"
              className="flex-1 sm:flex-initial h-11 px-3 border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800"
            >
              <ClipboardList className="h-4 w-4 text-blue-400" />
              Ver ODCs
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Selector de los 21 Telares con Filtro por Subárea */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            SELECCIONA TELAR PARA OPERAR (21 MÁQUINAS EN PLANTA):
          </p>
          <div className="flex gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setLoomFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                loomFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos (21)
            </button>
            <button
              type="button"
              onClick={() => setLoomFilter('CIRCULARES')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                loomFilter === 'CIRCULARES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Circulares (1-17)
            </button>
            <button
              type="button"
              onClick={() => setLoomFilter('BANDA')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                loomFilter === 'BANDA' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Telares Banda (18-21)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {filteredLooms.map((loom) => {
            const isSelected = activeLoom?.id === loom.id;
            const isRunning = loom.status === 'EN_PRODUCCION';
            const isBanda = loom.subarea_id === 7 || loom.type === 'BANDA' || (loom.name || '').includes('Banda');
            const creelSpools = Number(loom.current_spools_count || 0);

            return (
              <button
                key={loom.id}
                type="button"
                onClick={() => setSelectedLoomId(loom.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-4 text-center transition-all min-h-[92px] ${
                  isSelected
                    ? isBanda
                      ? 'border-purple-500 bg-purple-950/80 shadow-lg shadow-purple-500/30'
                      : 'border-blue-500 bg-blue-950/80 shadow-lg shadow-blue-500/30'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-white font-mono">
                    #{loom.loom_number || loom.id}
                  </span>
                  {isBanda && (
                    <span className="text-[9px] font-black uppercase bg-purple-900/80 text-purple-200 px-1 rounded">
                      Banda
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-300 truncate w-full">{loom.name}</span>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={creelSpools > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {creelSpools.toFixed(0)} bobinas
                  </span>
                </div>
                <span
                  className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                    isRunning ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {loom.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Panel Principal del Telar Activo */}
      {activeLoom && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Información del Telar, Creel WIP y Racks (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card: Monitor Creel Fileta del Telar (WIP Interno hasta 1,800 Bobinas) */}
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Gauge className="h-6 w-6 text-amber-400" />
                  <div>
                    <h2 className="text-lg font-black uppercase text-white">Fileta Creel del Telar (WIP)</h2>
                    <p className="text-xs text-slate-400 font-semibold">
                      Telar #{activeLoom.loom_number || activeLoom.id} — {activeLoom.name}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setCreelTargetLoomId(activeLoom.id);
                    setIsCreelModalOpen(true);
                  }}
                  className="h-10 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
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
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Hilo Montado (kg)</span>
                    <strong className="text-white text-base">{Number(activeLoom.current_wip_kg || 0).toFixed(1)} kg</strong>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2 border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Rollos Fabricados</span>
                    <strong className="text-blue-400 text-base">{activeLoom.total_rolls_produced || 0}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  {creelCurrent > 0
                    ? '✔ La fileta tiene bobinas montadas: este telar consumirá de su WIP interno sin descontar de racks externos.'
                    : '⚠ Fileta vacía: el telar descontará directamente del Rack Maestro de Extrusión.'}
                </p>
              </div>
            </div>

            {/* Card: Racks Maestros Montados */}
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Layers className="h-6 w-6 text-blue-400" />
                  <h2 className="text-lg font-black uppercase text-white">Racks Maestros Montados</h2>
                </div>
                <Button
                  onClick={() => setIsRackModalOpen(true)}
                  className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  Montar / Cambiar Rack
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rack Urdimbre */}
                <div className="rounded-xl bg-slate-900 border-2 border-slate-700 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-400">URDIMBRE</span>
                    <Badge className="bg-slate-800 text-slate-300 font-bold text-[10px]">MAESTRO</Badge>
                  </div>
                  {activeLoom.warpRack ? (
                    <div>
                      <p className="text-xl font-black text-white">{activeLoom.warpRack.rack_code}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {activeLoom.warpRack.currentPtiProduct?.name || 'PTI Extrusión'}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-400">
                          {activeLoom.warpRack.current_quantity}
                        </span>
                        <span className="text-xs font-bold text-slate-400">bobinas disp.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center">
                      <p className="text-xs font-bold text-amber-400">Sin Rack Asignado</p>
                      <p className="text-[11px] text-slate-500">Toca "Montar" para enlazar</p>
                    </div>
                  )}
                </div>

                {/* Rack Trama */}
                <div className="rounded-xl bg-slate-900 border-2 border-slate-700 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-400">TRAMA</span>
                    <Badge className="bg-slate-800 text-slate-300 font-bold text-[10px]">MAESTRO</Badge>
                  </div>
                  {activeLoom.weftRack ? (
                    <div>
                      <p className="text-xl font-black text-white">{activeLoom.weftRack.rack_code}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {activeLoom.weftRack.currentPtiProduct?.name || 'PTI Extrusión'}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-400">
                          {activeLoom.weftRack.current_quantity}
                        </span>
                        <span className="text-xs font-bold text-slate-400">bobinas disp.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center">
                      <p className="text-xs font-bold text-amber-400">Sin Rack Asignado</p>
                      <p className="text-[11px] text-slate-500">Toca "Montar" para enlazar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Corrida Activa */}
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Factory className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-lg font-black uppercase text-white">Corrida en Tejeduría</h2>
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
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Rollos Creados</span>
                      <span className="text-2xl font-black text-white">{activeRun.rolls_produced_count}</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Metros Producidos</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {Number(activeRun.meters_produced).toFixed(0)} m
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <p className="text-sm font-semibold text-slate-300">
                    Este telar no tiene ninguna corrida activa en producción.
                  </p>
                  <Button
                    onClick={() => setIsStartRunModalOpen(true)}
                    className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Iniciar Corrida de Producción
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Reporte de Rollo Terminado con Nomenclatura Estricta (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 sm:p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                <Sparkles className="h-6 w-6 text-amber-400" />
                <div>
                  <h2 className="text-xl font-black uppercase text-white">
                    Reportar Salida de Rollo de Tela (QR Viajero)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Estructura estricta según especificación: [TELAR]-[TURNO]-[NUM_ROLLO]-[NOMINA]
                  </p>
                </div>
              </div>

              {activeRun ? (
                <form onSubmit={handleFinishRoll} className="space-y-6">
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
                      <span>Nómina: <strong className="text-purple-400 font-mono">{selectedOperatorNomina}</strong></span>
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
                        <span className="text-blue-400 font-mono text-[11px]">Nómina: {selectedOperatorNomina}</span>
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

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDestinationChoice('GLOBO')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          destinationChoice === 'GLOBO'
                            ? 'border-cyan-400 bg-cyan-950/70 text-white shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/40'
                            : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl">🎈</span>
                        <span className="text-xs font-black uppercase tracking-wide">Solo Globo</span>
                        <span className="text-[10px] text-cyan-300 font-bold">Inflado / Tubular</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDestinationChoice('LAMINADO')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          destinationChoice === 'LAMINADO'
                            ? 'border-indigo-400 bg-indigo-950/70 text-white shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-400/40'
                            : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl">🛡️</span>
                        <span className="text-xs font-black uppercase tracking-wide">Solo Laminado</span>
                        <span className="text-[10px] text-indigo-300 font-bold">Recubrimiento PEBD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDestinationChoice('AMBOS')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          destinationChoice === 'AMBOS'
                            ? 'border-emerald-400 bg-emerald-950/70 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/40'
                            : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl">⚡</span>
                        <span className="text-xs font-black uppercase tracking-wide">Ambos (Glo ➔ Lam)</span>
                        <span className="text-[10px] text-emerald-300 font-bold">Globo y luego Lam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDestinationChoice('CORTE')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          destinationChoice === 'CORTE'
                            ? 'border-amber-400 bg-amber-950/70 text-white shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/40'
                            : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl">✂️</span>
                        <span className="text-xs font-black uppercase tracking-wide">Directo a Corte</span>
                        <span className="text-[10px] text-amber-300 font-bold">Sin Globo ni Lam</span>
                      </button>
                    </div>

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
                    disabled={finishRollMutation.isPending}
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
                  <p className="text-base font-bold text-white">No puedes reportar rollos en este momento.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Inicia primero una corrida de producción seleccionando la receta correspondiente en la columna izquierda.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Montar Rack Maestro */}
      {isRackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-800 border-2 border-slate-600 p-6 space-y-5 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-white">Montar Rack Maestro al Telar</h3>
            <p className="text-xs text-slate-300">
              Selecciona un Rack con bobinas de PTI producidas por Extrusión. El telar consumirá de este Rack sin escaneos unitarios.
            </p>

            <form onSubmit={handleAssignRack} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Posición en Telar:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['AMBOS', 'URDIMBRE', 'TRAMA'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRackRole(r)}
                      className={`h-11 rounded-xl text-xs font-black uppercase border-2 ${
                        selectedRackRole === r
                          ? 'border-blue-500 bg-blue-900/60 text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Rack Disponible de Extrusión:</label>
                <div className="flex gap-2">
                  <QrScannerButton
                    title="Escanear rack de PTI de Extrusión"
                    onScan={(code) => {
                      const match = availableRacks.find((rack) =>
                        [rack.qr_code, rack.rack_code].some((value) => String(value || '').toUpperCase() === code.toUpperCase())
                      );
                      if (match) setSelectedPtiRackId(match.id);
                      else toast.error('El código escaneado no corresponde a un rack con stock.');
                    }}
                  />
                  <select
                    value={selectedPtiRackId}
                    onChange={(e) => setSelectedPtiRackId(Number(e.target.value) || '')}
                    required
                    className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Rack con Stock --</option>
                    {availableRacks.map((rack) => (
                      <option key={rack.id} value={rack.id}>
                        {rack.rack_code} ({rack.current_quantity} bobinas - {rack.currentPtiProduct?.name || 'PTI'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={assignRackMutation.isPending}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl"
                >
                  {assignRackMutation.isPending ? 'Montando...' : 'Confirmar y Montar Rack'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRackModalOpen(false)}
                  className="h-12 border-slate-600 text-slate-300 rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cargar Fileta Creel (WIP del Telar hasta 1800 Bobinas) */}
      {isCreelModalOpen && looms.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 border-2 border-slate-600 p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-emerald-400" />
              Solicitar PTI para Telares
            </h3>
            <p className="text-xs text-slate-300">
              Elige el telar receptor. Al confirmar, las bobinas seleccionadas dejan la custodia de Extrusión y pasan al WIP de ese telar.
            </p>

            <div className="rounded-xl bg-slate-900 p-3 border border-slate-700 text-xs space-y-1">
              <p>Telar receptor: <strong className="text-amber-400">{creelTargetLoom?.name || 'Seleccionar telar'}</strong></p>
              {creelTargetLoom && <>
                <p>Capacidad de fileta: <strong className="text-amber-400">{creelTargetCapacity} bobinas</strong></p>
                <p>Ocupación actual: <strong className="text-emerald-400">{creelTargetCurrent} bobinas</strong></p>
                <p>Espacio libre: <strong className="text-white">{Math.max(0, creelTargetCapacity - creelTargetCurrent)} bobinas</strong></p>
              </>}
            </div>

            <form onSubmit={handleLoadCreel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Telar receptor:</label>
                <select
                  required
                  value={creelTargetLoomId}
                  onChange={(event) => setCreelTargetLoomId(Number(event.target.value) || '')}
                  className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar telar destino --</option>
                  {looms.map((loom) => <option key={loom.id} value={loom.id}>{loom.name} · {loom.subarea?.name || loom.type}</option>)}
                </select>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <strong>{transferMode === 'CART_FULL' ? 'Carrito completo:' : 'Rack parcial:'}</strong>{' '}
                {transferMode === 'CART_FULL'
                  ? 'se transfiere toda la cantidad disponible del contenedor y pasa a la custodia del telar.'
                  : 'indica cuántas bobinas físicas recibe este telar; el resto permanece bajo custodia de Extrusión.'}
              </div>
              {!transferModeReady && (
                <p role="alert" className="text-xs text-rose-300">
                  {isTransferModeError ? 'No se pudo leer el modo vigente. Reintenta antes de transferir.' : 'Consultando el modo de transferencia...'}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Carrito / Rack de Origen (Extrusión):</label>
                <div className="flex gap-2">
                  <QrScannerButton
                    title="Escanear rack de PTI para solicitarlo a Telares"
                    onScan={(code) => {
                      const clean = code.trim().toUpperCase();
                      const found = ptiRacks.find((rack: any) => [rack.qr_code, rack.rack_code].some((value) => String(value || '').toUpperCase() === clean));
                      if (!found || Number(found.current_quantity) <= 0) {
                        toast.error('El rack escaneado está vacío o no está disponible para Telares.');
                        return;
                      }
                      setCreelRackId(found.id);
                      setCreelSpoolsToLoad(Number(found.current_quantity));
                    }}
                  />
                  <select
                    value={creelRackId}
                    onChange={(e) => {
                      const id = Number(e.target.value) || '';
                      setCreelRackId(id);
                      const found = ptiRacks.find((r: any) => r.id === id);
                      if (found) setCreelSpoolsToLoad(Number(found.current_quantity || 0));
                    }}
                    required
                    className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Rack con Bobinas --</option>
                    {ptiRacks
                      .filter((r: any) => Number(r.current_quantity) > 0)
                      .map((rack: any) => (
                        <option key={rack.id} value={rack.id}>
                          {rack.rack_code} ({rack.current_quantity} bobinas - {rack.currentPtiProduct?.code || 'PTI'} {rack.currentPtiProduct?.color ? `• ${rack.currentPtiProduct.color}` : ''})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-slate-300">
                    {transferMode === 'CART_FULL' ? 'Bobinas a Cargar (contenedor completo):' : 'Bobinas recibidas en este telar:'}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    {transferMode === 'CART_FULL' ? 'Transferencia íntegra' : 'Transferencia parcial'}
                  </span>
                </div>
                <Input
                  type="number"
                  min={transferMode === 'CART_FULL' ? undefined : 1}
                  max={Math.min(transferRackQuantity, transferCapacityAvailable)}
                  step="1"
                  readOnly={transferMode === 'CART_FULL'}
                  value={creelSpoolsToLoad}
                  onChange={(event) => setCreelSpoolsToLoad(Number(event.target.value) || 0)}
                  className={`bg-slate-950 border-slate-700 text-emerald-400 font-mono font-bold text-lg ${transferMode === 'CART_FULL' ? 'cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={!transferModeReady || loadCreelMutation.isPending || !creelTargetLoom || !creelRackId || creelSpoolsToLoad <= 0 || creelSpoolsToLoad > transferRackQuantity || creelSpoolsToLoad > transferCapacityAvailable || (transferMode === 'CART_FULL' && creelSpoolsToLoad !== transferRackQuantity)}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl"
                >
                  {loadCreelMutation.isPending ? 'Transfiriendo PTI...' : transferMode === 'CART_FULL' ? 'Confirmar transferencia completa' : 'Confirmar transferencia parcial'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreelModalOpen(false)}
                  className="h-12 border-slate-600 text-slate-300 rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Iniciar Corrida */}
      {isStartRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 border-2 border-slate-600 p-6 space-y-5 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-white">Iniciar Corrida de Tejeduría</h3>

            <form onSubmit={handleStartRun} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Receta / BOM de Producción:</label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(Number(e.target.value) || '')}
                  required
                  className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Receta (BOM) --</option>
                  {compatibleBoms.map((bom) => (
                    <option key={bom.id} value={bom.id}>
                      {bom.code} - {bom.name} ({bom.target_width_cm}cm)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs font-bold uppercase text-slate-300">Meta de producción y materiales requeridos</p>
                <div className="flex gap-2">
                  <Button type="button" variant={plannedInputMode === 'METROS' ? 'default' : 'outline'} onClick={() => setPlannedInputMode('METROS')}>Metros</Button>
                  <Button type="button" variant={plannedInputMode === 'PESO' ? 'default' : 'outline'} onClick={() => setPlannedInputMode('PESO')}>Peso (kg)</Button>
                </div>
                {plannedInputMode === 'METROS' ? (
                  <Input type="number" min="0.01" value={plannedMetersInput} onChange={(e) => setPlannedMetersInput(e.target.value)} placeholder="Metros a producir" />
                ) : (
                  <Input type="number" min="0.01" value={plannedWeightInput} onChange={(e) => setPlannedWeightInput(e.target.value)} placeholder="Peso deseado en kg" />
                )}
                {plannedInputMode === 'PESO' && selectedBom && !Number(selectedBom.target_weight_g_per_m) && <p className="text-xs text-amber-300">Configura el peso objetivo por metro en esta receta para convertir kg a metros.</p>}
                {plannedMeters > 0 && <p className="text-xs text-slate-400">Modelo: <b className="text-slate-200">{selectedBom?.output_product_name || selectedBom?.name || 'Selecciona una receta'}</b> · Meta estimada: <b className="text-slate-200">{plannedMeters.toFixed(1)} m</b></p>}
                {demandPreview.length > 0 && <div className="space-y-2 pt-1">
                  {demandPreview.map((demand: any) => <div key={demand.item.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs">
                    <div className="flex flex-wrap justify-between gap-2"><b className="text-white">{demand.item.ptiProduct?.code || `PTI ${demand.item.pti_product_id}`} · {demand.item.ptiProduct?.color || 'Color no registrado'}</b><span className={demand.deficitKg > 0 ? 'text-amber-300' : 'text-emerald-300'}>{demand.deficitKg > 0 ? `Faltan ${demand.deficitKg.toFixed(2)} kg${demand.deficitSpools == null ? '' : ` / ${demand.deficitSpools.toFixed(1)} bobinas`}` : 'WIP del telar suficiente'}</span></div>
                    <p className="mt-1 text-slate-400">Necesario: {demand.requiredKg == null ? 'consumo por configurar' : `${demand.requiredKg.toFixed(2)} kg`}{demand.requiredSpools == null ? '' : ` / ${demand.requiredSpools.toFixed(1)} bobinas`} · Disponible en este telar: {demand.wipKg.toFixed(2)} kg</p>
                    {demand.deficitKg > 0 && <p className="mt-1 text-sky-300">FIFO: {(demand.fifo || []).map((rack: any) => rack.qr_code || rack.rack_code).filter(Boolean).join(' → ') || 'Sin racks disponibles'} · La solicitud se notificará al Supervisor de Telares.</p>}
                  </div>)}
                </div>}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={startRunMutation.isPending}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl"
                >
                  {startRunMutation.isPending ? 'Iniciando...' : 'Comenzar Corrida'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStartRunModalOpen(false)}
                  className="h-12 border-slate-600 text-slate-300 rounded-xl"
                >
                  Cancelar
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
