import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../identity/presentation/context/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Input,
  Icon,
} from '@/design-system';
import {
  useExtruderQueuesQuery,
  useFloorFormulasQuery,
  usePtiRacksQuery,
  usePtiProductsQuery,
  useSwitchQueueMutation,
  useEnqueueMixMutation,
  useScanRackPtiMutation,
  useCreatePtiRackMutation,
} from '../../../extrusion/hooks/useExtrusionFloorQueries';
import { toast } from 'sonner';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';

interface SessionRoll {
  rollIndex: number;
  rackId: string;
  ptiName: string;
  pieces: number;
  quantity: number;
  time: string;
}

export const ExtrusionTerminalPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNewRackRoute = location.pathname.includes('/rack/new');
  const qrFromUrl = searchParams.get('qr') || '';
  const feedQrFromUrl = searchParams.get('feedQr') || '';
  const savedSessionMachineId = (() => {
    try {
      return Number(JSON.parse(localStorage.getItem('extrusion_machine_session') || '{}').machineId) || 0;
    } catch {
      return 0;
    }
  })();
  const initialMachineId = Number(searchParams.get('machineId')) || savedSessionMachineId || 2;

  // Consultas Reales de MES
  const {
    data: queuesGroups = [],
    isLoading: isQueuesLoading,
    refetch: refetchQueues
  } = useExtruderQueuesQuery();

  const {
    data: formulas = [],
    isLoading: isFormulasLoading
  } = useFloorFormulasQuery();

  const {
    data: racks = [],
    isLoading: isRacksLoading,
    refetch: refetchRacks
  } = usePtiRacksQuery();

  const { data: ptiProducts = [] } = usePtiProductsQuery({ is_active: true });

  // Mutaciones Reales de MES
  const switchMutation = useSwitchQueueMutation();
  const enqueueMutation = useEnqueueMixMutation();
  const scanRackMutation = useScanRackPtiMutation();
  const createRackMutation = useCreatePtiRackMutation();

  // Estados de Control de Máquina Seleccionada
  const [selectedMachineId, setSelectedMachineId] = useState<number>(initialMachineId);
  const [isChangingMix, setIsChangingMix] = useState(false);
  const [feedQr, setFeedQr] = useState(feedQrFromUrl);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | ''>('');
  const [selectedQueueToSwitch, setSelectedQueueToSwitch] = useState<number | ''>('');
  const [purgeScrapWeight, setPurgeScrapWeight] = useState<number | ''>(0.5);

  // Estados de Registro Directo de Carretes en Rack PTI (Sin QR Virgen)
  const [rackId, setRackId] = useState('QR-RACK-004');
  const [piecesInput, setPiecesInput] = useState<string>('1');
  const [weightInput, setWeightInput] = useState<string>('6.80');
  const [sessionRolls, setSessionRolls] = useState<SessionRoll[]>([]);

  useEffect(() => {
    const syncMachineSession = () => {
      try {
        const machineId = Number(JSON.parse(localStorage.getItem('extrusion_machine_session') || '{}').machineId);
        if (machineId > 0) setSelectedMachineId(machineId);
      } catch {
        // Mantener la máquina actual si no hay sesión válida.
      }
    };
    window.addEventListener('extruder-session-updated', syncMachineSession);
    window.addEventListener('storage', syncMachineSession);
    return () => {
      window.removeEventListener('extruder-session-updated', syncMachineSession);
      window.removeEventListener('storage', syncMachineSession);
    };
  }, []);

  // Extrusora y Cola actual
  const currentGroup = useMemo(() => {
    return queuesGroups.find((g) => g.machine.id === selectedMachineId) || queuesGroups[0] || null;
  }, [queuesGroups, selectedMachineId]);

  const activeQueue = currentGroup?.active || null;
  const waitingQueues = currentGroup?.waiting || [];

  // Sincronizar máquina inicial si existe en los datos
  useEffect(() => {
    if (queuesGroups.length > 0 && !queuesGroups.some((g) => g.machine.id === selectedMachineId)) {
      setSelectedMachineId(queuesGroups[0].machine.id);
    }
  }, [queuesGroups, selectedMachineId]);

  // Preseleccionar fórmula si cambia de máquina o carga inicial
  useEffect(() => {
    if (formulas.length > 0 && selectedRecipeId === '') {
      setSelectedRecipeId(formulas[0].id);
    }
  }, [formulas, selectedRecipeId]);

  // Preseleccionar rack disponible si existe
  useEffect(() => {
    if (racks.length > 0 && (!rackId || rackId === 'QR-RACK-004')) {
      const avail = racks.find((r) => r.status !== 'LLENO') || racks[0];
      if (avail) {
        setRackId(avail.rack_code || avail.qr_code);
      }
    }
  }, [racks, rackId]);

  // PTI esperado según la fórmula de la mezcla activa en tolva
  const expectedPti = useMemo(() => {
    if (!activeQueue || !activeQueue.formula) return null;
    const formulaId = activeQueue.formula.id;
    // 1. Buscar en ptiProducts cargados del catálogo
    const fromCatalog = ptiProducts.find((p) => p.formula_id === formulaId);
    if (fromCatalog) return fromCatalog;
    // 2. Buscar en anidados de la fórmula
    if (activeQueue.formula.ptiProducts && activeQueue.formula.ptiProducts.length > 0) {
      return activeQueue.formula.ptiProducts[0];
    }
    // 3. Fallback con datos de la fórmula
    const unitWeight = activeQueue.formula.expected_yield_pieces
      ? Number((Number(activeQueue.formula.batch_size_kg || 500) / Number(activeQueue.formula.expected_yield_pieces)).toFixed(3))
      : 6.8;
    return {
      id: formulaId,
      material_id: formulaId,
      name: `PTI - ${activeQueue.formula.name}`,
      code: activeQueue.formula.code,
      unit_weight_kg: unitWeight,
    };
  }, [activeQueue, ptiProducts]);

  // Rack seleccionado en piso
  const selectedRack = useMemo(() => {
    if (!rackId) return null;
    const clean = rackId.trim().toUpperCase();
    return (
      racks.find(
        (r) => r.rack_code?.toUpperCase() === clean || r.qr_code?.toUpperCase() === clean
      ) || null
    );
  }, [racks, rackId]);

  // Peso unitario base del PTI / Rack (según registro previo o fórmula)
  const ptiUnitWeight = useMemo(() => {
    const fromRack = Number(selectedRack?.unit_weight_kg);
    if (!isNaN(fromRack) && fromRack > 0) return fromRack;
    const fromPti = Number(expectedPti?.unit_weight_kg);
    if (!isNaN(fromPti) && fromPti > 0) return fromPti;
    return 6.80;
  }, [selectedRack, expectedPti]);

  // Sincronizar peso cuando cambia el peso unitario base
  useEffect(() => {
    if (ptiUnitWeight > 0) {
      const p = parseInt(piecesInput, 10);
      const validPieces = !isNaN(p) && p > 0 ? p : 1;
      setWeightInput((validPieces * ptiUnitWeight).toFixed(2));
    }
  }, [ptiUnitWeight]);

  // Cálculo bidireccional: cuando el usuario ingresa CANTIDAD de bobinas -> calcula peso total
  const handlePiecesChange = (val: string) => {
    setPiecesInput(val);
    const p = parseInt(val, 10);
    if (!isNaN(p) && p > 0 && ptiUnitWeight > 0) {
      const computedWeight = Number((p * ptiUnitWeight).toFixed(2));
      setWeightInput(computedWeight.toFixed(2));
    }
  };

  // Cálculo bidireccional: cuando el usuario ingresa PESO en báscula -> calcula cantidad de bobinas
  const handleWeightChange = (val: string) => {
    setWeightInput(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0 && ptiUnitWeight > 0) {
      const computedPieces = Math.max(1, Math.round(w / ptiUnitWeight));
      setPiecesInput(computedPieces.toString());
    }
  };

  // Verificación estricta de correspondencia entre el Rack Destino y el PTI de la mezcla
  const rackVerification = useMemo(() => {
    if (!activeQueue) {
      return {
        isReady: false,
        status: 'NO_ACTIVE_QUEUE',
        title: 'Sin Mezcla Activa',
        message: 'Alimenta o inicia una extrusora en el Panel 1 para definir el PTI en producción.',
        badgeVariant: 'outline' as const,
        badgeText: 'Sin Mezcla',
      };
    }

    if (!selectedRack) {
      return {
        isReady: false,
        status: 'NO_RACK',
        title: 'Seleccione un Rack',
        message: 'Selecciona o escanea el Rack destino en el piso de planta.',
        badgeVariant: 'outline' as const,
        badgeText: 'Sin Rack',
      };
    }

    const currentQty = Number(selectedRack.current_quantity) || 0;
    const maxCap = Number(selectedRack.max_capacity) || 100;

    if (selectedRack.status === 'LLENO' || currentQty >= maxCap) {
      return {
        isReady: false,
        status: 'FULL',
        title: 'Capacidad Excedida',
        message: `El Rack ${selectedRack.rack_code} está LLENO (${currentQty}/${maxCap} pzas). Selecciona un rack disponible o inicializa uno nuevo.`,
        badgeVariant: 'danger' as const,
        badgeText: 'Rack Lleno',
      };
    }

    // Caso Rack Virgen / Vacío
    const isVacio = selectedRack.status === 'VACIO' || currentQty === 0 || !selectedRack.current_pti_type_id;
    if (isVacio) {
      return {
        isReady: true,
        status: 'VIRGIN',
        title: 'Rack Virgen / Disponible',
        message: `El Rack está vacío (0/${maxCap} pzas). Al estibar la bobina quedará condicionado para '${expectedPti?.name || 'PTI de la mezcla'}'.`,
        badgeVariant: 'outline' as const,
        badgeText: 'Rack Libre (Se Acondicionará)',
      };
    }

    // Caso Rack con material previo: Verificación de correspondencia con el PTI de la mezcla
    const rackPtiId = Number(selectedRack.current_pti_type_id);
    const expectedPtiId = expectedPti ? Number(expectedPti.id) : null;
    const expectedMatId = expectedPti?.material_id ? Number(expectedPti.material_id) : null;
    const rackFormulaId = selectedRack.currentPtiProduct?.formula_id ? Number(selectedRack.currentPtiProduct.formula_id) : null;
    const activeFormulaId = activeQueue.formula?.id ? Number(activeQueue.formula.id) : null;

    const isMatch =
      (expectedPtiId && rackPtiId === expectedPtiId) ||
      (expectedMatId && rackPtiId === expectedMatId) ||
      (rackFormulaId && activeFormulaId && rackFormulaId === activeFormulaId);

    const rackMaterialName =
      selectedRack.pti_product_name ||
      selectedRack.currentPtiProduct?.name ||
      selectedRack.currentPtiType?.name ||
      `PTI #${rackPtiId}`;

    if (isMatch) {
      return {
        isReady: true,
        status: 'MATCH',
        title: 'PTI Coincide con la Mezcla',
        message: `El Rack contiene '${rackMaterialName}', el cual corresponde exactamente al resultado de la mezcla activa en tolva (${currentQty}/${maxCap} pzas).`,
        badgeVariant: 'success' as const,
        badgeText: 'PTI Coincide',
      };
    } else {
      return {
        isReady: false,
        status: 'MISMATCH',
        title: 'Incompatibilidad de PTI Bloqueada',
        message: `Incompatible: El Rack ${selectedRack.rack_code} está condicionado para '${rackMaterialName}', pero la mezcla activa en ${currentGroup?.machine.name} produce '${expectedPti?.name || 'Otro PTI'}'. No se permite mezclar productos diferentes en el mismo rack.`,
        badgeVariant: 'danger' as const,
        badgeText: 'No Coincide',
      };
    }
  }, [activeQueue, selectedRack, expectedPti, currentGroup]);

  // Manejador: Iniciar / Activar Extrusión en Máquina
  const handleStartExtrusion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMachineId) {
      toast.error('Seleccione una máquina extrusora.');
      return;
    }

    try {
      // Caso 1: Se seleccionó un contenedor ya existente en la cola de espera
      if (selectedQueueToSwitch) {
        await switchMutation.mutateAsync({
          queue_id: Number(selectedQueueToSwitch),
          scrap_weight_kg: Number(purgeScrapWeight) || 0.1,
        });

        toast.success(`Contenedor activado en ${currentGroup?.machine.name || 'Extrusora'}. Tolva alimentada.`);
        setIsChangingMix(false);
        setSelectedQueueToSwitch('');
        refetchQueues();
        return;
      }

      // Caso 2: Se ingresó un código QR de mezcla nuevo
      const cleanQr = feedQr.trim().toUpperCase();
      if (!cleanQr) {
        toast.error('Ingrese o escanee el código QR del contenedor de mezcla o seleccione un turno de espera.');
        return;
      }

      // Validar si el QR ya está en la cola de espera de esta máquina
      const existingInWait = waitingQueues.find(
        (q) => q.consumption_order_qr_id.toUpperCase() === cleanQr
      );

      if (existingInWait) {
        await switchMutation.mutateAsync({
          queue_id: existingInWait.id,
          scrap_weight_kg: Number(purgeScrapWeight) || 0.1,
        });
        toast.success(`Mezcla ${cleanQr} activada en ${currentGroup?.machine.name}.`);
      } else {
        // Encolar y activar
        const formulaId = Number(selectedRecipeId) || formulas[0]?.id;
        if (!formulaId) {
          toast.error('Seleccione una fórmula para la mezcla.');
          return;
        }

        const enqueued = await enqueueMutation.mutateAsync({
          extruder_id: selectedMachineId,
          consumption_order_qr_id: cleanQr,
          formula_id: formulaId,
          priority: 1,
          notes: `Ingresado desde Terminal de Extrusión por ${user?.username || 'OP-100'}`,
        });

        // Activar inmediatamente
        if (enqueued?.id) {
          await switchMutation.mutateAsync({
            queue_id: enqueued.id,
            scrap_weight_kg: Number(purgeScrapWeight) || 0.1,
          });
        }
        toast.success(`Extrusión iniciada exitosamente para ${cleanQr} en ${currentGroup?.machine.name}.`);
      }

      setFeedQr('');
      setIsChangingMix(false);
      refetchQueues();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al iniciar extrusión.';
      toast.error(msg);
    }
  };

  // Manejador: Registrar Bobinas Directamente en Rack (Sin QR Virgen)
  const handleRegisterRoll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeQueue) {
      toast.error('La máquina seleccionada no tiene una mezcla activa en tolva.');
      return;
    }

    if (!selectedRack) {
      toast.error('Seleccione un rack destino.');
      return;
    }

    if (!rackVerification.isReady) {
      toast.error(rackVerification.message);
      return;
    }

    const pieces = parseInt(piecesInput, 10);
    const totalWeight = parseFloat(weightInput);

    if (isNaN(pieces) || pieces <= 0) {
      toast.error('La cantidad de bobinas debe ser al menos 1.');
      return;
    }

    if (isNaN(totalWeight) || totalWeight <= 0) {
      toast.error('El peso total en báscula debe ser mayor a 0 kg.');
      return;
    }

    const effectivePtiId =
      selectedRack.current_pti_type_id ||
      expectedPti?.material_id ||
      expectedPti?.id ||
      1;

    try {
      const response = await scanRackMutation.mutateAsync({
        rack_qr: selectedRack.rack_code || selectedRack.qr_code,
        pti_material_id: effectivePtiId,
        quantity: pieces,
        weight_kg: Number(totalWeight.toFixed(2)),
        unit_weight_kg: ptiUnitWeight,
        mixture_qr: activeQueue.consumption_order_qr_id,
        notes: `Producción directa en ${currentGroup?.machine.name || 'Extrusora'} - Rack ${selectedRack.rack_code}`,
      });

      toast.success(
        response.message || `${pieces} bobina(s) (${totalWeight.toFixed(2)} kg) ingresadas al Rack ${selectedRack.rack_code}.`
      );

      setSessionRolls((prev) => [
        {
          rollIndex: prev.length + 1,
          rackId: selectedRack.rack_code,
          ptiName: expectedPti?.name || selectedRack.pti_product_name || 'Bobina PTI',
          pieces: pieces,
          quantity: Number(totalWeight.toFixed(2)),
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
        ...prev,
      ]);

      // Resetear a 1 bobina con su peso unitario base
      setPiecesInput('1');
      setWeightInput(ptiUnitWeight.toFixed(2));
      refetchRacks();
      refetchQueues();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al registrar carrete en Rack.';
      toast.error(msg);
    }
  };

  // Manejador: Crear / Inicializar Nuevo Rack
  const handleRegisterRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackId.trim()) return;

    try {
      await createRackMutation.mutateAsync({
        rack_code: rackId.trim().toUpperCase(),
        max_capacity: 100,
        location_name: 'Piso de Extrusión',
      });

      toast.success(`Rack ${rackId.trim().toUpperCase()} inicializado exitosamente en planta.`);
      navigate('/production/extrusion');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al inicializar Rack.';
      toast.error(msg);
    }
  };

  const totalSessionWeight = sessionRolls.reduce((sum, r) => sum + r.quantity, 0);
  const totalSessionPieces = sessionRolls.reduce((sum, r) => sum + r.pieces, 0);

  // =========================================================
  // VISTA 1: Acondicionamiento / Inicialización de Nuevo Rack
  // =========================================================
  if (isNewRackRoute) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-background flex flex-col gap-5 pb-24">
        {/* Banner Superior */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-4 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Icon name="shelves" size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Módulo de Extrusión
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Acondicionamiento PTI
                  </span>
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  Inicializar Nuevo Rack
                </h1>
                <p className="text-muted-foreground text-xs font-medium mt-0.5">
                  Registra un Rack físico virgen en el piso de Extrusión para comenzar a recibir bobinas.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/production/extrusion')}
              className="gap-2 font-bold h-10 px-4 text-xs"
            >
              <Icon name="arrow_back" size={16} />
              Volver a Terminal
            </Button>
          </div>
        </section>

        {/* Formulario de Inicialización */}
        <Card className="max-w-2xl mx-auto w-full border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border pb-3.5">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Icon name="qr_code_scanner" className="text-primary" size={20} />
              Identificación del Rack Físico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleRegisterRack} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Código QR Virgen del Rack *</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    Requerido
                  </Badge>
                </label>
                <div className="flex gap-2">
                  <QrScannerButton onScan={(code) => setRackId(code.toUpperCase())} title="Escanear QR virgen del rack" />
                  <Input
                    required
                    value={rackId || qrFromUrl}
                    onChange={(e) => setRackId(e.target.value.toUpperCase())}
                    className="!h-11 font-mono font-bold uppercase text-sm bg-background border-border"
                    placeholder="Ej. QR-RACK-005"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                  <Icon name="info" size={13} className="text-primary shrink-0" />
                  <span>Escanea el QR pegado físicamente a la estructura metálica del rack.</span>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={createRackMutation.isPending || !rackId.trim()}
                  className="w-full h-11 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2"
                >
                  {createRackMutation.isPending ? (
                    <>
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      Inicializando Rack...
                    </>
                  ) : (
                    <>
                      <Icon name="shelves" size={18} />
                      Inicializar Rack en Planta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================
  // VISTA 2: Terminal de Control Operativo en Piso
  // =========================================================
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-5 pb-32 lg:pr-24">
      {/* Header Banner Estandarizado */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-4 sm:px-6 sm:py-3.5 w-full shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="precision_manufacturing" size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Módulo de Extrusión
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground font-medium">
                  Terminal de Operación en Piso
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Terminal de Extrusión
              </h1>
              <p className="text-muted-foreground text-xs font-medium mt-0.5">
                Alimentación de tolvas por extrusora, trazabilidad en tiempo real y empaque directo de bobinas a Racks PTI.
              </p>
            </div>
          </div>

          {/* Badges de Operador y Accesos Rápidos */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/extrusion/board')}
              className="h-8 text-xs font-bold gap-1.5 border-border"
            >
              <Icon name="view_kanban" size={15} className="text-primary" />
              Tablero de Colas
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/extrusion/rack-ingress')}
              className="h-8 text-xs font-bold gap-1.5 border-border"
            >
              <Icon name="shelves" size={15} className="text-primary" />
              Racks PTI
            </Button>

            <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Icon name="account_circle" size={16} className="text-primary" />
              <span className="text-muted-foreground">Operador:</span>
              <span className="font-bold text-foreground uppercase">{user?.username || 'OP-100'}</span>
            </div>

            {activeQueue ? (
              <Badge variant="success" className="gap-1.5 font-bold py-1.5 px-3 uppercase animate-pulse">
                <Icon name="check_circle" size={14} />
                {currentGroup?.machine.name || 'Extrusora'}: ACTIVA
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 font-bold py-1.5 px-3 uppercase text-muted-foreground">
                <Icon name="pause_circle" size={14} />
                {currentGroup?.machine.name || 'Extrusora'}: DETENIDA
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Grid Principal de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================= */}
        {/* COLUMNA 1: Alimentación de Máquina (5 cols) */}
        {/* ========================================= */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            className={`border-border shadow-sm transition-all overflow-hidden ${
              activeQueue ? 'border-primary/40 bg-card ring-1 ring-primary/20' : 'bg-card'
            }`}
          >
            <CardHeader className="bg-muted/30 border-b border-border py-3.5 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="factory" size={18} className="text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  1. Alimentación de Máquina
                </CardTitle>
              </div>
              {activeQueue ? (
                <Badge variant="success" className="text-[11px] font-bold uppercase gap-1">
                  <Icon name="play_arrow" size={13} />
                  Corriendo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] font-bold uppercase text-muted-foreground">
                  En Espera
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Selector de Extrusora Dinámico */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Extrusora de Operación *</span>
                  {currentGroup?.machine.type && (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {currentGroup.machine.type}
                    </Badge>
                  )}
                </label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => {
                    const machineId = Number(e.target.value);
                    setSelectedMachineId(machineId);
                    localStorage.setItem('extrusion_machine_session', JSON.stringify({ machineId, timestamp: Date.now() }));
                    setIsChangingMix(false);
                    setSelectedQueueToSwitch('');
                  }}
                  className="w-full h-11 bg-background border border-border rounded-lg px-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                >
                  {queuesGroups.map((g) => (
                    <option key={g.machine.id} value={g.machine.id}>
                      {g.machine.name} {g.active ? '• [CORRIENDO]' : '• [DISPONIBLE]'} ({g.waiting.length} en cola)
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado de la Mezcla Actual en Máquina */}
              {activeQueue && !isChangingMix ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 shrink-0">
                        <Icon name="bolt" size={18} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        Tolva Alimentada (En Proceso)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingMix(true)}
                      className="h-7 px-2.5 text-[11px] font-bold border-emerald-500/40 bg-background/60 hover:bg-emerald-500/20 text-foreground gap-1.5 shrink-0"
                    >
                      <Icon name="sync" size={13} />
                      Cambiar / Purgar
                    </Button>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 pt-0.5">
                    <span
                      className="font-mono text-base sm:text-lg font-black text-foreground tracking-tight select-all truncate block"
                      title={activeQueue.consumption_order_qr_id}
                    >
                      {activeQueue.consumption_order_qr_id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-emerald-500/40 text-emerald-500 shrink-0">
                      ACTIVA
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-500/20">
                    <div className="min-w-0">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Fórmula:</span>
                      <span
                        className="font-bold text-foreground block truncate"
                        title={`${activeQueue.formula?.code || 'N/A'} - ${activeQueue.formula?.name || ''}`}
                      >
                        {activeQueue.formula?.code || 'N/A'} • {activeQueue.formula?.name || ''}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Prioridad en Cola:</span>
                      <span className="inline-flex items-center gap-1 font-mono font-black text-foreground">
                        <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 border-emerald-500/40">
                          Nivel {activeQueue.priority}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStartExtrusion} className="space-y-4">
                  {/* Si hay mezcla activa y estamos en modo cambio, mostrar aviso */}
                  {activeQueue && isChangingMix && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <Icon name="warning" size={16} />
                        <span>Transición / Purga de Línea</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsChangingMix(false)}
                        className="h-6 text-[10px] font-bold"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Selector de Contenedores en Espera para esta Máquina */}
                  {waitingQueues.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Contenedores en Cola de Espera</span>
                        <Badge variant="outline" className="text-[10px] font-bold font-mono">
                          {waitingQueues.length} LISTOS
                        </Badge>
                      </label>
                      <select
                        value={selectedQueueToSwitch}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : '';
                          setSelectedQueueToSwitch(val);
                          if (val) {
                            setFeedQr('');
                          }
                        }}
                        className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Seleccionar contenedor en espera o escanear abajo --</option>
                        {waitingQueues.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.consumption_order_qr_id} • {q.formula?.code || 'Sin Código'} (Pza teórica: {q.priority})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Si no se seleccionó de la cola de espera, permitir escanear/ingresar QR */}
                  {!selectedQueueToSwitch && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Icon name="qr_code_2" size={15} className="text-primary" />
                            <span>Código QR de Contenedor / Mezcla *</span>
                          </span>
                          {feedQr && (
                            <span className="font-mono text-[11px] font-bold text-primary">
                              {feedQr.length} CARACTERES
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <QrScannerButton onScan={(code) => setFeedQr(code.toUpperCase())} title="Escanear QR de mezcla" />
                          <Input
                            value={feedQr}
                            onChange={(e) => setFeedQr(e.target.value.toUpperCase())}
                            placeholder="Ej. CONT-MIX-20261023-XXXX-C1"
                            className="!h-11 font-mono font-bold uppercase text-sm bg-background border-border"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Icon name="info" size={13} className="text-primary shrink-0" />
                          <span>Escanea la etiqueta QR del contenedor/tambo preparado en el Centro de Mezclado.</span>
                        </p>
                      </div>

                      {/* Receta Programada */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Fórmula Programada
                        </label>
                        <select
                          value={selectedRecipeId}
                          onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
                          className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                        >
                          {formulas.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.code} - {f.name} ({f.batch_size_kg} kg)
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Merma de Purga en caso de cambio de mezcla */}
                  {activeQueue && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Merma de Purga Estimada *</span>
                        <span className="font-mono text-[11px] font-bold text-primary">PURGA / TRANSICIÓN</span>
                      </label>
                      <div className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={purgeScrapWeight}
                          onChange={(e) =>
                            setPurgeScrapWeight(e.target.value === '' ? '' : parseFloat(e.target.value))
                          }
                          className="w-full h-10 bg-transparent px-3 text-right font-mono font-bold text-sm text-foreground outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0.5"
                        />
                        <div className="flex items-center justify-center px-3 bg-muted/40 border-l border-border text-xs font-bold text-muted-foreground uppercase select-none shrink-0">
                          KG
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón de Iniciar Extrusión */}
                  <Button
                    type="submit"
                    disabled={
                      switchMutation.isPending ||
                      enqueueMutation.isPending ||
                      (!selectedQueueToSwitch && !feedQr.trim())
                    }
                    className="w-full h-11 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 mt-2"
                  >
                    {switchMutation.isPending || enqueueMutation.isPending ? (
                      <>
                        <Icon name="progress_activity" size={18} className="animate-spin" />
                        Alimentando Tolva...
                      </>
                    ) : (
                      <>
                        <Icon name="play_arrow" size={20} />
                        Iniciar Extrusión en Estación
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Ficha Rápida de Especificación de la Máquina */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Icon name="speed" size={16} className="text-primary" />
                Parámetros de Operación
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold font-mono">
                {currentGroup?.machine.name || 'Extrusora'}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Velocidad
                </span>
                <span className="font-mono text-xs font-black text-foreground">185 m/min</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Temperatura
                </span>
                <span className="font-mono text-xs font-black text-foreground">225 °C</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Presión Cabezal
                </span>
                <span className="font-mono text-xs font-black text-emerald-500">142 Bar</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* COLUMNA 2: Registro Directo de Bobinas en Rack PTI (7 cols) */}
        {/* ========================================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            className={`border-border shadow-sm transition-all overflow-hidden ${
              !activeQueue ? 'opacity-85' : 'bg-card'
            }`}
          >
            <CardHeader className="bg-muted/30 border-b border-border py-3.5 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="shelves" size={18} className="text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  2. Registro de Bobinas en Rack PTI
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/extrusion/rack-ingress')}
                  className="h-7 px-2.5 text-[11px] font-bold border-border gap-1"
                >
                  <Icon name="open_in_new" size={13} />
                  Terminal Racks PTI
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {!activeQueue && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <Icon name="info" size={18} className="text-primary shrink-0" />
                  <span>
                    Selecciona o inicia la alimentación de la máquina en el Panel 1 para habilitar el pesaje y registro de bobinas hacia racks.
                  </span>
                </div>
              )}

              <form onSubmit={handleRegisterRoll} className="space-y-4">
                {/* 1. Información de PTI Activo de la Mezcla */}
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon name="science" size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Producto PTI Activo de la Mezcla
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-foreground block truncate" title={expectedPti?.name || undefined}>
                        {expectedPti?.name || 'Esperando inicio de mezcla en tolva...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    {expectedPti?.code && (
                      <Badge variant="outline" className="font-mono text-[10px] font-bold">
                        {expectedPti.code}
                      </Badge>
                    )}
                    <Badge
                      variant={rackVerification.badgeVariant}
                      className="text-[10px] uppercase font-bold gap-1 shrink-0"
                    >
                      {rackVerification.badgeVariant === 'success' && <Icon name="verified" size={12} />}
                      {rackVerification.badgeVariant === 'danger' && <Icon name="error" size={12} />}
                      {rackVerification.badgeText || rackVerification.title}
                    </Badge>
                  </div>
                </div>

                {/* 2. Selector de Rack Destino a Ancho Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Icon name="shelves" size={15} className="text-primary" />
                      <span>Rack Destino *</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate('/production/extrusion/rack/new')}
                      className="h-5 px-1.5 text-[10px] font-bold text-primary hover:text-primary"
                    >
                      + Nuevo Rack
                    </Button>
                  </label>
                  <select
                    value={rackId}
                    onChange={(e) => setRackId(e.target.value)}
                    disabled={!activeQueue}
                    className="w-full h-11 bg-background border border-border rounded-xl px-3 text-xs sm:text-sm font-bold font-mono text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer disabled:opacity-70"
                  >
                    {racks.map((r) => {
                      const isVacio = r.status === 'VACIO' || Number(r.current_quantity) === 0 || !r.current_pti_type_id;
                      const isRackMatch = expectedPti && (
                        Number(r.current_pti_type_id) === Number(expectedPti.id) ||
                        Number(r.current_pti_type_id) === Number(expectedPti.material_id) ||
                        Number(r.currentPtiProduct?.formula_id) === Number(activeQueue?.formula?.id)
                      );
                      const tag = r.status === 'LLENO' ? '[LLENO]' : isVacio ? '[LIBRE]' : isRackMatch ? '[COMPATIBLE]' : '[NO COINCIDE]';
                      return (
                        <option key={r.id} value={r.rack_code || r.qr_code}>
                          {r.rack_code} • {tag} ({r.current_quantity}/{r.max_capacity} pzas) - {r.pti_product_name || 'Libre'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Callout de Verificación y Compatibilidad de Rack */}
                {selectedRack && activeQueue && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-3 transition-all ${
                      rackVerification.status === 'MISMATCH' || rackVerification.status === 'FULL'
                        ? 'bg-destructive/10 border-destructive/30 text-destructive'
                        : rackVerification.status === 'MATCH'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary/10 border-primary/20 text-foreground'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {rackVerification.status === 'MISMATCH' && <Icon name="error" size={18} className="text-destructive" />}
                      {rackVerification.status === 'FULL' && <Icon name="block" size={18} className="text-destructive" />}
                      {rackVerification.status === 'MATCH' && <Icon name="verified" size={18} className="text-emerald-500" />}
                      {rackVerification.status === 'VIRGIN' && <Icon name="shelves" size={18} className="text-primary" />}
                    </div>
                    <div className="space-y-1">
                      <strong className="font-bold uppercase tracking-wider block text-xs">
                        {rackVerification.title}
                      </strong>
                      <p className="leading-relaxed text-xs">{rackVerification.message}</p>
                    </div>
                  </div>
                )}

                {/* Cantidad de Bobinas y Peso en Báscula con Cálculo Bidireccional Automático */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs pb-0.5">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon name="sync_alt" size={14} className="text-primary" />
                      <span>Cálculo Automático Bidireccional</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-muted/40 border border-border px-2.5 py-1 rounded-lg text-muted-foreground shrink-0">
                      <span>Peso Unitario PTI:</span>
                      <strong className="text-primary font-bold">{ptiUnitWeight.toFixed(2)} KG / pza</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Input de Bobinas con Stepper interactivo */}
                    <div className="sm:col-span-4 lg:col-span-3 space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Bobinas (Piezas) *</span>
                        <span className="text-[10px] text-muted-foreground font-mono">CANTIDAD</span>
                      </label>
                      <div className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!rackVerification.isReady || (parseInt(piecesInput, 10) || 1) <= 1}
                          onClick={() => {
                            const current = parseInt(piecesInput, 10) || 1;
                            handlePiecesChange(Math.max(1, current - 1).toString());
                          }}
                          className="h-12 w-10 rounded-none px-0 shrink-0 font-black text-lg border-r border-border hover:bg-muted/50 disabled:opacity-50"
                        >
                          -
                        </Button>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={piecesInput}
                          onChange={(e) => handlePiecesChange(e.target.value)}
                          disabled={!rackVerification.isReady}
                          className="w-full h-12 bg-transparent text-center font-mono font-black text-xl text-foreground outline-none border-none disabled:opacity-70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!rackVerification.isReady}
                          onClick={() => {
                            const current = parseInt(piecesInput, 10) || 1;
                            handlePiecesChange((current + 1).toString());
                          }}
                          className="h-12 w-10 rounded-none px-0 shrink-0 font-black text-lg border-l border-border hover:bg-muted/50 disabled:opacity-50"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Input de Peso Total en Báscula */}
                    <div className="sm:col-span-4 lg:col-span-4 space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Peso Total (Báscula) *</span>
                        <span className="font-mono text-[10px] font-bold text-primary">EN LÍNEA</span>
                      </label>
                      <div className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          required
                          value={weightInput}
                          onChange={(e) => handleWeightChange(e.target.value)}
                          disabled={!rackVerification.isReady}
                          placeholder="0.00"
                          className="w-full h-12 bg-transparent px-3 text-right font-mono font-black text-xl text-foreground outline-none border-none disabled:opacity-70 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex items-center justify-center px-3.5 bg-muted/40 border-l border-border text-xs font-black text-muted-foreground uppercase select-none shrink-0">
                          KG
                        </div>
                      </div>
                    </div>

                    {/* Botón de Registro */}
                    <div className="sm:col-span-4 lg:col-span-5">
                      <Button
                        type="submit"
                        disabled={
                          !rackVerification.isReady ||
                          scanRackMutation.isPending ||
                          (parseFloat(weightInput) || 0) <= 0 ||
                          (parseInt(piecesInput, 10) || 0) <= 0
                        }
                        className={`w-full !h-12 font-black text-xs sm:text-sm shadow-sm gap-2 transition-all px-3 ${
                          !rackVerification.isReady
                            ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {scanRackMutation.isPending ? (
                          <>
                            <Icon name="progress_activity" size={18} className="animate-spin" />
                            <span>Registrando...</span>
                          </>
                        ) : (
                          <>
                            <Icon name="add_circle" size={19} className="shrink-0" />
                            <span className="whitespace-nowrap">Registrar en Rack</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Bitácora de Bobinas Registradas en la Sesión */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="format_list_bulleted" size={15} className="text-primary" />
                    Bobinas Estibadas en Esta Sesión ({sessionRolls.length})
                  </span>
                  <div className="flex items-center gap-3 font-mono font-bold text-foreground">
                    <span>Piezas: <strong className="text-foreground">{totalSessionPieces} pzas</strong></span>
                    <span>Total: <strong className="text-primary">{totalSessionWeight.toFixed(2)} KG</strong></span>
                  </div>
                </div>

                <div className="border border-border rounded-xl bg-background overflow-hidden min-h-[140px] max-h-[220px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 whitespace-nowrap"># Registro</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">Rack Destino</th>
                        <th className="px-3.5 py-2.5">PTI / Producto</th>
                        <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Cantidad</th>
                        <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Peso (KG)</th>
                        <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessionRolls.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Icon
                                name="shelves"
                                size={24}
                                className="text-muted-foreground/40"
                              />
                              <span className="font-semibold text-xs text-foreground/80">
                                Sin bobinas registradas aún en esta sesión
                              </span>
                              <span className="text-[11px] text-muted-foreground max-w-md">
                                Las bobinas registradas se asociarán directamente al rack seleccionado con Backflushing real de inventario.
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        sessionRolls.map((roll, idx) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3.5 py-2 font-mono font-bold text-foreground uppercase whitespace-nowrap">
                              Bobina #{roll.rollIndex}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-muted-foreground whitespace-nowrap">
                              {roll.rackId}
                            </td>
                            <td className="px-3.5 py-2 font-bold text-foreground truncate max-w-[200px]" title={roll.ptiName}>
                              {roll.ptiName}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                              {roll.pieces} pza(s)
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-black text-foreground whitespace-nowrap">
                              {roll.quantity.toFixed(2)} KG
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                              {roll.time}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExtrusionTerminalPage;
