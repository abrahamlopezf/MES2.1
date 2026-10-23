import React, { useState, useMemo } from 'react';
import {
  useLoomsQuery,
  useBomsQuery,
  useAssignRackMutation,
  useStartRunMutation,
  useFinishRollMutation,
} from '../../hooks/useTelaresQueries';
import { usePtiRacksQuery } from '../../../extrusion/hooks/useExtrusionFloorQueries';
import { useNavigate } from 'react-router-dom';
import { ViajeroRoll, Loom } from '../../types/telares.types';
import { ViajeroLabelModal } from '../components/ViajeroLabelModal';
import { CreateConsumptionOrderModal } from '../../../warehouse/presentation/components/CreateConsumptionOrderModal';
import { Button, Input, Badge } from '@/design-system';
import { toast } from 'sonner';
import {
  Factory,
  Layers,
  Play,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Printer,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PackagePlus,
  ClipboardList,
} from 'lucide-react';

export const TelaresTerminalPage: React.FC = () => {
  const navigate = useNavigate();
  // Queries
  const { data: looms = [], isLoading: isLoomsLoading, refetch: refetchLooms } = useLoomsQuery();
  const { data: boms = [], isLoading: isBomsLoading } = useBomsQuery();
  const { data: ptiRacks = [] } = usePtiRacksQuery();

  // Mutations
  const assignRackMutation = useAssignRackMutation();
  const startRunMutation = useStartRunMutation();
  const finishRollMutation = useFinishRollMutation();

  // Estados locales
  const [selectedLoomId, setSelectedLoomId] = useState<number | null>(null);
  const [metersInput, setMetersInput] = useState<string>('500');
  const [weightInput, setWeightInput] = useState<string>('35.0');
  const [notesInput, setNotesInput] = useState<string>('');

  // Modal para iniciar corrida
  const [isStartRunModalOpen, setIsStartRunModalOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState<number | ''>('');
  const [plannedMetersInput, setPlannedMetersInput] = useState<string>('1500');
  const [shiftSelection, setShiftSelection] = useState<string>('TURNO_1');

  // Modal para montar Rack Maestro
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [selectedRackRole, setSelectedRackRole] = useState<'URDIMBRE' | 'TRAMA' | 'AMBOS'>('AMBOS');
  const [selectedPtiRackId, setSelectedPtiRackId] = useState<number | ''>('');

  // Modal de Etiqueta QR Viajero
  const [activeViajeroRoll, setActiveViajeroRoll] = useState<ViajeroRoll | null>(null);

  // Modal para Crear ODC de Telares
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);

  // Telar Activo
  const activeLoom: Loom | null = useMemo(() => {
    if (!looms.length) return null;
    if (selectedLoomId) {
      return looms.find((l) => l.id === selectedLoomId) || looms[0];
    }
    return looms[0];
  }, [looms, selectedLoomId]);

  // Corrida activa en el telar
  const activeRun = useMemo(() => {
    return activeLoom?.runs?.find((r) => r.status === 'EN_PROCESO') || null;
  }, [activeLoom]);

  // Racks disponibles en planta para asignación
  const availableRacks = useMemo(() => {
    return ptiRacks.filter((r) => Number(r.current_quantity) > 0);
  }, [ptiRacks]);

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

  // Manejador: Iniciar Corrida
  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoom) return;
    if (!selectedBomId) {
      toast.error('Selecciona una receta / BOM para tejer');
      return;
    }

    try {
      await startRunMutation.mutateAsync({
        loom_id: activeLoom.id,
        bom_id: Number(selectedBomId),
        shift: shiftSelection,
        meters_planned: Number(plannedMetersInput) || 1500,
        notes: notesInput || undefined,
      });
      toast.success(`Corrida de tejeduría iniciada en ${activeLoom.name}`);
      setIsStartRunModalOpen(false);
      refetchLooms();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al iniciar corrida');
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

    try {
      const res = await finishRollMutation.mutateAsync({
        run_id: activeRun.id,
        meters: numMeters,
        weight_kg: numWeight,
        notes: notesInput || undefined,
      });

      const roll = res.roll;
      const consumedSpools = res.backflush?.reduce((acc: number, item: any) => acc + Number(item.spools_consumed), 0) || 0;

      toast.success(
        `Rollo ${roll.roll_code} creado. Backflushing: ${consumedSpools.toFixed(1)} bobinas descontadas del Rack Maestro.`
      );

      // Abrir modal con la etiqueta lista para impresión
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
                Terminal de Telares
              </h1>
              <Badge className="bg-emerald-600/90 text-white font-bold text-xs">EN LÍNEA</Badge>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-300">
              Control de Tejeduría, Consumo por Rack Maestro y Generación de QR Viajero
            </p>
          </div>
        </div>

        {/* Indicadores Clave Rápidos */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-center flex-1 md:flex-initial">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Turno Actual</span>
            <span className="text-base font-black text-amber-400">TURNO 1 (07:00 - 15:00)</span>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-center flex-1 md:flex-initial">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Telares Operando</span>
            <span className="text-base font-black text-emerald-400">
              {looms.filter((l) => l.status === 'EN_PRODUCCION').length} / {looms.length}
            </span>
          </div>

          {/* Acciones Rápidas de ODC Telares */}
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

      {/* 2. Selector Visual de Telares (Grandes Touch Targets) */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          SELECCIONAR TELAR PARA OPERAR (TOCA PARA CAMBIAR):
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {looms.map((loom) => {
            const isSelected = activeLoom?.id === loom.id;
            const isRunning = loom.status === 'EN_PRODUCCION';

            return (
              <button
                key={loom.id}
                type="button"
                onClick={() => setSelectedLoomId(loom.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-4 text-center transition-all min-h-[90px] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/70 shadow-lg shadow-blue-500/20'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-750'
                }`}
              >
                <span className="text-lg font-black text-white">{loom.code}</span>
                <span className="text-xs font-semibold text-slate-300 truncate w-full">{loom.name}</span>
                <span
                  className={`mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
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
          {/* Columna Izquierda: Información del Telar y Racks Maestros (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
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

              <p className="text-[11px] text-slate-400 italic">
                * Con el Rack Maestro activo, no requieres escanear carretes unitarios. El consumo se deduce automáticamente (Backflushing).
              </p>
            </div>

            {/* Card: Corrida Activa o Estado del Telar */}
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Factory className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-lg font-black uppercase text-white">Corrida en Tejeduría</h2>
                </div>
                {activeRun ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1">EN PROCESO</Badge>
                ) : (
                  <Badge className="bg-slate-700 text-slate-300 font-bold text-xs">DETENIDO</Badge>
                )}
              </div>

              {activeRun ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                    <span className="text-xs font-bold uppercase text-slate-400">Receta / BOM en Máquina:</span>
                    <p className="text-lg font-black text-blue-400 mt-0.5">{activeRun.bom?.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
                      <span className="bg-slate-800 px-2 py-1 rounded">Ancho: {activeRun.bom?.target_width_cm} cm</span>
                      <span className="bg-slate-800 px-2 py-1 rounded">Peso Obj: {activeRun.bom?.target_weight_g_per_m} g/m</span>
                    </div>
                  </div>

                  {/* Barra de Progreso de Corrida */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Metros Reportados:</span>
                      <span className="text-white">
                        {activeRun.meters_produced} / {activeRun.meters_planned} m
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(activeRun.meters_produced) / Number(activeRun.meters_planned || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Rollos Creados</span>
                      <span className="text-2xl font-black text-white">{activeRun.rolls_produced_count}</span>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">PTI Deducido</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {Number(activeRun.total_pti_consumed_kg).toFixed(1)} kg
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

          {/* Columna Derecha: Reporte de Rollo Terminado (Formulario de 1-toque grande) (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 sm:p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                <Sparkles className="h-6 w-6 text-amber-400" />
                <h2 className="text-xl font-black uppercase text-white">
                  Reportar Rollo de Tela y Generar QR Viajero
                </h2>
              </div>

              {activeRun ? (
                <form onSubmit={handleFinishRoll} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Campo Metros */}
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
                        className="w-full h-14 rounded-xl bg-slate-900 border-2 border-slate-600 px-4 text-2xl font-black text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Ej. 500"
                      />
                      <p className="text-xs text-slate-400 font-medium">Lectura del contador de tela del telar</p>
                    </div>

                    {/* Campo Peso */}
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
                        className="w-full h-14 rounded-xl bg-slate-900 border-2 border-slate-600 px-4 text-2xl font-black text-emerald-400 focus:border-blue-500 focus:outline-none"
                        placeholder="Ej. 35.0"
                      />
                      <p className="text-xs text-slate-400 font-medium">Peso físico colocado en la báscula</p>
                    </div>
                  </div>

                  {/* Notas operativas */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                      Notas Operativas (Opcional):
                    </label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="w-full h-11 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                      placeholder="Ej. Cambio de turno, bobina con tensión ajustada..."
                    />
                  </div>

                  {/* Resumen del Ruteo que se estampará en el QR Viajero */}
                  <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      Ruta que se asignará al QR Viajero (según receta):
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(activeRun.bom?.default_route || ['TELARES', 'LAMINADO', 'CORTE']).map((st, i, arr) => (
                        <React.Fragment key={st}>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${
                              st === 'TELARES'
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'bg-slate-800 text-slate-300 border-slate-600'
                            }`}
                          >
                            {st}
                          </span>
                          {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Botón Gigante Accesible para Registrar */}
                  <Button
                    type="submit"
                    disabled={finishRollMutation.isPending}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
                  >
                    <CheckCircle2 className="h-7 w-7" />
                    {finishRollMutation.isPending
                      ? 'Procesando y Calculando Backflushing...'
                      : 'REGISTRAR ROLLO Y GENERAR QR VIAJERO'}
                  </Button>
                </form>
              ) : (
                <div className="rounded-xl bg-slate-900 border border-dashed border-slate-700 p-8 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
                  <p className="text-base font-bold text-white">No puedes reportar rollos en este momento.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Inicia primero una corrida de producción seleccionando la receta (BOM) correspondiente en la columna izquierda.
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
          <div className="w-full max-w-md rounded-2xl bg-slate-800 border-2 border-slate-600 p-6 space-y-5 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-black uppercase text-white">Montar Rack Maestro al Telar</h3>
            <p className="text-xs text-slate-300">
              Selecciona un Rack con bobinas de PTI producidas por Extrusión. El telar consumirá de este Rack sin escaneos unitarios.
            </p>

            <form onSubmit={handleAssignRack} className="space-y-4">
              {/* Rol: Urdimbre, Trama o Ambos */}
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

              {/* Selector de Rack Disponible */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Rack Disponible de Extrusión:</label>
                <select
                  value={selectedPtiRackId}
                  onChange={(e) => setSelectedPtiRackId(Number(e.target.value) || '')}
                  required
                  className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Rack con Stock --</option>
                  {availableRacks.map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.rack_code} ({rack.current_quantity} bobinas disp. - {rack.currentPtiProduct?.name || 'PTI'})
                    </option>
                  ))}
                </select>
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

      {/* MODAL 2: Iniciar Corrida */}
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
                  {boms.map((bom) => (
                    <option key={bom.id} value={bom.id}>
                      {bom.code} - {bom.name} ({bom.target_width_cm}cm)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-300">Metros Planeados en Corrida:</label>
                <input
                  type="number"
                  value={plannedMetersInput}
                  onChange={(e) => setPlannedMetersInput(e.target.value)}
                  className="w-full h-12 rounded-xl bg-slate-900 border-2 border-slate-700 px-3 text-base font-black text-white focus:border-blue-500 focus:outline-none"
                  placeholder="1500"
                />
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

      {/* MODAL 3: Etiqueta de Enrutamiento (QR Viajero) */}
      <ViajeroLabelModal roll={activeViajeroRoll} onClose={() => setActiveViajeroRoll(null)} />

      {/* MODAL 4: Crear Orden de Consumo (ODC Telares) */}
      <CreateConsumptionOrderModal
        isOpen={isOdcModalOpen}
        initialAreaId={3}
        onClose={() => setIsOdcModalOpen(false)}
      />
    </div>
  );
};
export default TelaresTerminalPage;
