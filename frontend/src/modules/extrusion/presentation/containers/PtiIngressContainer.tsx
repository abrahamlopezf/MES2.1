import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  usePtiRacksQuery,
  useFloorFormulasQuery,
  useExtruderQueuesQuery,
  useScanRackPtiMutation
} from '../../hooks/useExtrusionFloorQueries';
import { useMaterialsQuery } from '../../../materials/hooks/useMaterialsQueries';
import { PtiIngressPresenter } from '../presenters/PtiIngressPresenter';
import {
  PtiRack,
  Formula,
  BackflushingResult,
  ExtruderQueue
} from '../../types/extrusion.types';

export const PtiIngressContainer: React.FC = () => {
  const {
    data: racks = [],
    isLoading: isRacksLoading,
    refetch: refetchRacks
  } = usePtiRacksQuery();

  const {
    data: formulas = [],
    isLoading: isFormulasLoading,
    refetch: refetchFormulas
  } = useFloorFormulasQuery();

  const {
    data: queuesGroups = [],
    isLoading: isQueuesLoading,
    refetch: refetchQueues
  } = useExtruderQueuesQuery();

  const { data: materialsData } = useMaterialsQuery({ pageSize: 100 });
  const materials = materialsData?.items || [];

  const scanMutation = useScanRackPtiMutation();

  // Estados de Formulario de Escaneo
  const [mixtureQr, setMixtureQr] = useState<string>('QR-MIX-ORD-001');
  const [rackQr, setRackQr] = useState<string>('');
  const [selectedPtiMaterialId, setSelectedPtiMaterialId] = useState<number | ''>('');
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lastBackflushingResult, setLastBackflushingResult] = useState<BackflushingResult | null>(null);

  // Mezclas activas actuales en las 4 extrusoras
  const activeQueues: ExtruderQueue[] = useMemo(() => {
    return queuesGroups
      .map((g) => g.active)
      .filter((q): q is ExtruderQueue => q !== null && q !== undefined);
  }, [queuesGroups]);

  // Rack seleccionado según lo escaneado o clickeado
  const selectedRack: PtiRack | null = useMemo(() => {
    if (!rackQr) return null;
    const cleanQr = rackQr.trim().toUpperCase();
    return (
      racks.find(
        (r) =>
          r.qr_code.toUpperCase() === cleanQr ||
          r.rack_code.toUpperCase() === cleanQr
      ) || null
    );
  }, [racks, rackQr]);

  // Si el rack ya tiene un material asignado, sincronizar la sugerencia
  React.useEffect(() => {
    if (selectedRack && selectedRack.current_pti_type_id && selectedRack.status !== 'VACIO') {
      setSelectedPtiMaterialId(selectedRack.current_pti_type_id);
    }
  }, [selectedRack]);

  // Fórmula activa según el QR de mezcla
  const selectedFormula: Formula | null = useMemo(() => {
    if (!mixtureQr) return formulas[0] || null;
    const cleanMix = mixtureQr.trim();
    const active = activeQueues.find((q) => q.consumption_order_qr_id === cleanMix);
    if (active && active.formula) {
      return active.formula;
    }
    return formulas[0] || null;
  }, [mixtureQr, activeQueues, formulas]);

  // Regla 6: Peso teórico por pieza = batch_size_kg / expected_yield_pieces
  const theoreticalWeightPerPiece: number = useMemo(() => {
    if (!selectedFormula || !selectedFormula.expected_yield_pieces) return 0;
    const batch = Number(selectedFormula.batch_size_kg) || 0;
    const yieldPcs = Number(selectedFormula.expected_yield_pieces) || 1;
    return Number((batch / yieldPcs).toFixed(4));
  }, [selectedFormula]);

  const pieces = Number(quantityPieces) || 0;

  // Materia prima teórica total
  const estimatedRawMaterialConsumedKg: number = useMemo(() => {
    return Number((pieces * theoreticalWeightPerPiece).toFixed(2));
  }, [pieces, theoreticalWeightPerPiece]);

  // Regla 5: Validar si excede capacidad máxima
  const isCapacityExceeded: boolean = useMemo(() => {
    if (!selectedRack || pieces <= 0) return false;
    const current = Number(selectedRack.current_quantity) || 0;
    const max = Number(selectedRack.max_capacity) || 100;
    return selectedRack.status === 'LLENO' || current + pieces > max;
  }, [selectedRack, pieces]);

  // Regla 5: Validar incompatibilidad de condicionamiento del rack
  const isPtiMismatched: boolean = useMemo(() => {
    if (!selectedRack || selectedRack.status === 'VACIO' || !selectedRack.current_pti_type_id) {
      return false;
    }
    if (!selectedPtiMaterialId) return false;
    return Number(selectedRack.current_pti_type_id) !== Number(selectedPtiMaterialId);
  }, [selectedRack, selectedPtiMaterialId]);

  const mismatchErrorMessage = useMemo(() => {
    if (!isPtiMismatched || !selectedRack) return '';
    const name = selectedRack.currentPtiType?.name || `PTI #${selectedRack.current_pti_type_id}`;
    return `El Rack ${selectedRack.rack_code} está condicionado para '${name}'. No es posible ingresar el PTI seleccionado (#${selectedPtiMaterialId}).`;
  }, [isPtiMismatched, selectedRack, selectedPtiMaterialId]);

  const handleSelectRackFromGrid = (rack: PtiRack) => {
    setRackQr(rack.qr_code);
    if (rack.current_pti_type_id && rack.status !== 'VACIO') {
      setSelectedPtiMaterialId(rack.current_pti_type_id);
    }
  };

  const handleSelectQueueFromList = (queue: ExtruderQueue) => {
    setMixtureQr(queue.consumption_order_qr_id);
  };

  const handleSubmitIngress = async () => {
    if (!rackQr) {
      toast.error('Escanee o seleccione un código QR de Rack.');
      return;
    }

    if (!selectedPtiMaterialId) {
      toast.error('Seleccione el tipo de material PTI a ingresar.');
      return;
    }

    if (pieces <= 0) {
      toast.error('Ingrese una cantidad de piezas mayor a 0.');
      return;
    }

    if (isPtiMismatched) {
      toast.error('Incompatibilidad de Rack bloqueada: El rack ya tiene otro tipo de PTI.');
      return;
    }

    if (isCapacityExceeded) {
      toast.error('Capacidad Excedida: El rack no puede almacenar esa cantidad.');
      return;
    }

    try {
      const response = await scanMutation.mutateAsync({
        rack_qr: rackQr.trim(),
        pti_material_id: Number(selectedPtiMaterialId),
        quantity: pieces,
        mixture_qr: mixtureQr ? mixtureQr.trim() : undefined,
        notes: notes ? notes.trim() : undefined
      });

      toast.success(response.message || `Ingreso de ${pieces} pzas registrado correctamente.`);

      if (response.backflushing) {
        setLastBackflushingResult(response.backflushing);
      }

      // Limpiar campos para el siguiente escaneo
      setQuantityPieces('');
      setNotes('');
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al registrar el ingreso en el Rack.';
      toast.error(msg);
    }
  };

  const handleRefresh = () => {
    refetchRacks();
    refetchFormulas();
    refetchQueues();
  };

  return (
    <PtiIngressPresenter
      racks={racks}
      formulas={formulas}
      activeQueues={activeQueues}
      materials={materials}
      isLoading={isRacksLoading || isFormulasLoading || isQueuesLoading}
      onRefresh={handleRefresh}
      mixtureQr={mixtureQr}
      onMixtureQrChange={setMixtureQr}
      rackQr={rackQr}
      onRackQrChange={setRackQr}
      selectedPtiMaterialId={selectedPtiMaterialId}
      onPtiMaterialIdChange={setSelectedPtiMaterialId}
      quantityPieces={quantityPieces}
      onQuantityPiecesChange={setQuantityPieces}
      notes={notes}
      onNotesChange={setNotes}
      selectedRack={selectedRack}
      selectedFormula={selectedFormula}
      theoreticalWeightPerPiece={theoreticalWeightPerPiece}
      estimatedRawMaterialConsumedKg={estimatedRawMaterialConsumedKg}
      isCapacityExceeded={isCapacityExceeded}
      isPtiMismatched={isPtiMismatched}
      mismatchErrorMessage={mismatchErrorMessage}
      onSubmitIngress={handleSubmitIngress}
      isSubmitting={scanMutation.isPending}
      lastBackflushingResult={lastBackflushingResult}
      onSelectRackFromGrid={handleSelectRackFromGrid}
      onSelectQueueFromList={handleSelectQueueFromList}
    />
  );
};

export default PtiIngressContainer;
