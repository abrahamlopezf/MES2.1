import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../../store/authStore';
import { canViewCosts as checkCanViewCosts } from '@/utils/authHelpers';
import {
  usePtiRacksQuery,
  useFloorFormulasQuery,
  useExtruderQueuesQuery,
  useScanRackPtiMutation,
  useMassBalanceQuery,
  useCreatePtiRackMutation,
  useExtrusionValuationQuery,
  useUpdatePtiRackPriceMutation,
  usePtiProductsQuery,
  useExtrusionWipQuery
} from '../../hooks/useExtrusionFloorQueries';
import { PtiIngressPresenter } from '../presenters/PtiIngressPresenter';
import {
  PtiRack,
  Formula,
  BackflushingResult,
  ExtruderQueue,
  PtiProduct
} from '../../types/extrusion.types';

export const PtiIngressContainer: React.FC = () => {
  const { user } = useAuthStore();
  const canViewCosts = checkCanViewCosts(user);
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

  const { data: ptiProducts = [] } = usePtiProductsQuery({ is_active: true });
  const { data: extrusionWip = null, refetch: refetchExtrusionWip } = useExtrusionWipQuery();

  // Puntos 3, 3.2: Valorización Total en Extrusión con índice de costo editable
  const [costIndex, setCostIndex] = useState<number>(1.15);
  const { data: valuation = null, refetch: refetchValuation } = useExtrusionValuationQuery(costIndex, canViewCosts);

  const scanMutation = useScanRackPtiMutation();
  const createRackMutation = useCreatePtiRackMutation();
  const updatePriceMutation = useUpdatePtiRackPriceMutation();

  const handleCreateRack = async (payload: { rack_code: string; max_capacity?: number; location_name?: string }) => {
    try {
      const createdRack = await createRackMutation.mutateAsync(payload);
      toast.success(`Rack ${payload.rack_code} creado exitosamente.`);
      refetchRacks();
      if (canViewCosts) refetchValuation();
      return createdRack;
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al registrar el rack.';
      toast.error(msg);
      throw error;
    }
  };

  const handleUpdateRackPrice = async (rackId: number, payload: { unit_price?: number; unit_weight_kg?: number | null }) => {
    try {
      await updatePriceMutation.mutateAsync({ rackId, payload });
      toast.success('Precio y peso del Rack actualizados con éxito.');
      refetchRacks();
      if (canViewCosts) refetchValuation();
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al actualizar el rack.';
      toast.error(msg);
      throw error;
    }
  };

  // Estados de Formulario de Escaneo con prellenado inteligente
  const [mixtureQr, setMixtureQr] = useState<string>('');
  const [rackQr, setRackQr] = useState<string>('');
  const [selectedPtiMaterialId, setSelectedPtiMaterialId] = useState<number | ''>('');
  
  // Puntos 5 y 7: Ingreso por Piezas o Báscula, y Precio Unitario
  const [ingressMode, setIngressMode] = useState<'PIECES' | 'WEIGHT'>('PIECES');
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [scaleWeightKg, setScaleWeightKg] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');

  const [scrapWeightKg, setScrapWeightKg] = useState<string>('');
  const [scrapReason, setScrapReason] = useState<string>('ARRANQUE_EXTRUSORA');
  const [scrapColor, setScrapColor] = useState<string>('');
  const [shiftCode, setShiftCode] = useState('TURNO_1');
  const [notes, setNotes] = useState<string>('');
  const [lastBackflushingResult, setLastBackflushingResult] = useState<BackflushingResult | null>(null);

  // Consulta de Balance de Masa en tiempo real para la mezcla seleccionada
  const { data: massBalance = null, refetch: refetchMassBalance } = useMassBalanceQuery(mixtureQr);

  // Mezclas activas actuales en las 4 extrusoras
  const activeQueues: ExtruderQueue[] = useMemo(() => {
    return queuesGroups
      .map((g) => g.active)
      .filter((q): q is ExtruderQueue => q !== null && q !== undefined);
  }, [queuesGroups]);

  // Prellenado inteligente: Si hay mezclas activas en piso y no hay seleccionada, preseleccionar la primera
  React.useEffect(() => {
    if (activeQueues.length > 0 && !mixtureQr) {
      setMixtureQr(activeQueues[0].consumption_order_qr_id);
    }
  }, [activeQueues, mixtureQr]);

  // Prellenado inteligente: Si hay racks y ninguno seleccionado, preseleccionar el primer rack disponible
  React.useEffect(() => {
    if (racks.length > 0 && !rackQr) {
      const available = racks.find(r => r.status !== 'LLENO') || racks[0];
      if (available) {
        setRackQr(available.qr_code);
        if (available.current_pti_type_id && available.status !== 'VACIO') {
          setSelectedPtiMaterialId(available.current_pti_type_id);
        }
        if (available.unit_price) {
          setUnitPrice(Number(available.unit_price).toString());
        }
      }
    }
  }, [racks, rackQr]);

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
      const matchingProduct = ptiProducts.find((p) => p.id === selectedRack.current_pti_product_id)
        || ptiProducts.find((p) => p.material_id === selectedRack.current_pti_type_id || p.id === selectedRack.current_pti_type_id);
      if (matchingProduct) {
        setSelectedPtiMaterialId(matchingProduct.id);
      } else {
        setSelectedPtiMaterialId(selectedRack.current_pti_type_id);
      }
    }
    if (selectedRack && selectedRack.unit_price && (!unitPrice || Number(unitPrice) === 0)) {
      setUnitPrice(Number(selectedRack.unit_price).toString());
    }
  }, [selectedRack, ptiProducts, unitPrice]);

  // Sincronizar datos del PTI seleccionado (peso y precio unitario predeterminado)
  const selectedPtiProduct = useMemo(() => {
    if (!selectedPtiMaterialId) return null;
    return ptiProducts.find((p) => p.id === Number(selectedPtiMaterialId)) || null;
  }, [selectedPtiMaterialId, ptiProducts]);

  React.useEffect(() => {
    if (selectedPtiProduct) {
      if (selectedPtiProduct.unit_price && (!unitPrice || Number(unitPrice) === 0)) {
        setUnitPrice(Number(selectedPtiProduct.unit_price).toString());
      }
    }
  }, [selectedPtiProduct, unitPrice]);

  // Fórmula activa según el QR de mezcla
  const selectedQueue: ExtruderQueue | null = useMemo(() => {
    if (!mixtureQr) return null;
    const cleanMix = mixtureQr.trim();
    return activeQueues.find((q) => q.consumption_order_qr_id === cleanMix) || null;
  }, [mixtureQr, activeQueues]);
  const selectedFormula: Formula | null = selectedQueue?.formula || null;
  const compatiblePtiProducts = useMemo(() => {
    if (!selectedFormula) return [];
    if (selectedQueue?.output_pti_product_id) {
      return ptiProducts.filter((product) => Number(product.id) === Number(selectedQueue.output_pti_product_id));
    }
    return ptiProducts.filter((product) => Number(product.formula_id) === Number(selectedFormula.id));
  }, [ptiProducts, selectedFormula, selectedQueue]);

  // Regla 6: Peso teórico por pieza = batch_size_kg / expected_yield_pieces
  const theoreticalWeightPerPiece: number = useMemo(() => {
    if (!selectedFormula || !selectedFormula.expected_yield_pieces) return 0;
    const batch = Number(selectedFormula.batch_size_kg) || 0;
    const yieldPcs = Number(selectedFormula.expected_yield_pieces) || 1;
    return Number((batch / yieldPcs).toFixed(4));
  }, [selectedFormula]);

  // Punto 5: Peso unitario del rack y cálculo de piezas desde báscula
  const rackUnitWeight = Number(selectedRack?.unit_weight_kg) || Number(selectedPtiProduct?.unit_weight_kg) || 0;
  const computedPiecesFromScale = useMemo(() => {
    const w = Number(scaleWeightKg);
    if (isNaN(w) || w <= 0) return 0;
    return rackUnitWeight > 0 ? Math.max(1, Math.round(w / rackUnitWeight)) : 0;
  }, [scaleWeightKg, rackUnitWeight]);

  const pieces = ingressMode === 'WEIGHT'
    ? (rackUnitWeight > 0 ? computedPiecesFromScale : Number(quantityPieces) || 0)
    : (Number(quantityPieces) || 0);

  // Materia prima teórica total
  const estimatedRawMaterialConsumedKg: number = useMemo(() => {
    return Number((pieces * theoreticalWeightPerPiece).toFixed(2));
  }, [pieces, theoreticalWeightPerPiece]);

  // El ingreso puede completar el rack seleccionado y continuar en racks
  // compatibles; esta condición solo informa al operador que habrá reparto.
  const willSplitAcrossRacks: boolean = useMemo(() => {
    if (!selectedRack || pieces <= 0) return false;
    const available = Math.max(0, (Number(selectedRack.max_capacity) || 100) - (Number(selectedRack.current_quantity) || 0));
    return pieces > available;
  }, [selectedRack, pieces]);

  // Regla 5: Validar incompatibilidad de condicionamiento del rack
  const isPtiMismatched: boolean = useMemo(() => {
    // No se puede afirmar que exista incompatibilidad mientras aún no se
    // identifican la mezcla y el PTI. La validación de campos requeridos y la
    // validación definitiva del QR siguen ocurriendo al registrar el ingreso.
    if (!selectedFormula || !selectedPtiProduct) return false;
    const linkedToFormula = selectedQueue?.output_pti_product_id
      ? Number(selectedPtiProduct.id) === Number(selectedQueue.output_pti_product_id)
      : Number(selectedPtiProduct.formula_id) === Number(selectedFormula.id);
    if (!linkedToFormula) return true;
    if (!selectedRack || selectedRack.status === 'VACIO' || !selectedRack.current_pti_type_id) {
      return false;
    }
    if (!selectedPtiMaterialId) return false;
    if (Number(selectedRack.current_quantity || 0) > 0 && selectedRack.current_pti_product_id
      && Number(selectedRack.current_pti_product_id) !== Number(selectedPtiProduct.id)) return true;
    if (Number(selectedRack.current_quantity || 0) > 0 && !selectedRack.current_pti_product_id) return true;
    const effectiveMatId = selectedPtiProduct?.material_id || Number(selectedPtiMaterialId);
    return (
      Number(selectedRack.current_pti_type_id) !== Number(selectedPtiMaterialId) &&
      Number(selectedRack.current_pti_type_id) !== Number(effectiveMatId)
    );
  }, [selectedRack, selectedPtiMaterialId, selectedPtiProduct, selectedFormula, selectedQueue]);

  const mismatchErrorMessage = useMemo(() => {
    if (!isPtiMismatched) return '';
    if (!selectedFormula) return 'Selecciona una mezcla activa para identificar su fórmula y color.';
    if (!selectedPtiProduct) return 'Selecciona un PTI activo enlazado a la fórmula ' + selectedFormula.name + '.';
    const isExpectedQueuePti = selectedQueue?.output_pti_product_id
      && Number(selectedPtiProduct.id) === Number(selectedQueue.output_pti_product_id);
    if (!isExpectedQueuePti && Number(selectedPtiProduct.formula_id || 0) !== Number(selectedFormula.id)) {
      return 'El PTI ' + selectedPtiProduct.code + ' (' + (selectedPtiProduct.color || 'color sin definir') + ') no está enlazado a la fórmula ' + selectedFormula.name + '.';
    }
    if (!selectedRack) return '';
    if (Number(selectedRack.current_quantity || 0) > 0 && !selectedRack.current_pti_product_id) {
      return 'Este rack contiene bobinas antiguas sin identificación exacta de PTI/color. Debe vaciarse antes de recibir nueva producción.';
    }
    const name = selectedRack.currentPtiProduct
      ? selectedRack.currentPtiProduct.name + ' · ' + (selectedRack.currentPtiProduct.color || 'color no definido')
      : selectedRack.currentPtiType?.name || ('PTI #' + selectedRack.current_pti_type_id);
    return 'El Rack ' + selectedRack.rack_code + ' está condicionado para ' + name + '. No es posible ingresar el PTI seleccionado (#' + selectedPtiMaterialId + ').';
  }, [isPtiMismatched, selectedRack, selectedPtiMaterialId, selectedFormula, selectedPtiProduct]);

  const handleSelectRackFromGrid = (rack: PtiRack) => {
    setRackQr(rack.qr_code);
    if (rack.current_pti_type_id && rack.status !== 'VACIO') {
      const matchingProduct = ptiProducts.find((p) => p.id === rack.current_pti_product_id)
        || ptiProducts.find((p) => p.material_id === rack.current_pti_type_id || p.id === rack.current_pti_type_id);
      if (matchingProduct) {
        setSelectedPtiMaterialId(matchingProduct.id);
      } else {
        setSelectedPtiMaterialId(rack.current_pti_type_id);
      }
    }
    if (rack.unit_price && Number(rack.unit_price) > 0) {
      setUnitPrice(rack.unit_price.toString());
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
      toast.error(ingressMode === 'WEIGHT' ? 'Ingrese un peso en báscula mayor a 0 kg.' : 'Ingrese una cantidad de piezas mayor a 0.');
      return;
    }

    if (isPtiMismatched) {
      toast.error('Incompatibilidad de Rack bloqueada: El rack ya tiene otro tipo de PTI.');
      return;
    }

    if (ingressMode === 'PIECES' && rackUnitWeight <= 0) {
      toast.error('Este PTI no tiene peso unitario definido. Usa báscula y captura el número de bobinas para calibrar el rack.');
      return;
    }

    try {
      const payload: any = {
        rack_qr: rackQr.trim(),
        pti_material_id: Number(selectedPtiMaterialId),
        mixture_qr: mixtureQr ? mixtureQr.trim() : undefined,
        estimated_scrap_weight_kg: Number(scrapWeightKg) > 0 ? Number(scrapWeightKg) : undefined,
        scrap_reason: Number(scrapWeightKg) > 0 ? scrapReason : undefined,
        scrap_category: 'OPERATIVA',
        scrap_color: Number(scrapWeightKg) > 0 ? (scrapColor.trim() || selectedPtiProduct?.color || undefined) : undefined,
        shift_code: shiftCode,
        notes: notes ? notes.trim() : undefined
      };

      if (ingressMode === 'WEIGHT') {
        payload.weight_kg = Number(scaleWeightKg);
      }
      payload.quantity = pieces;

      if (Number(unitPrice) > 0) {
        payload.unit_price = Number(unitPrice);
      }

      const response = await scanMutation.mutateAsync(payload);

      toast.success(response.message || `Ingreso de ${pieces} pzas registrado correctamente.`);

      if (response.backflushing) {
        setLastBackflushingResult(response.backflushing);
      }

      // Limpiar campos para el siguiente escaneo
      setQuantityPieces('');
      setScaleWeightKg('');
      setScrapWeightKg('');
      setNotes('');
      refetchMassBalance();
      if (canViewCosts) refetchValuation();
      return response;
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al registrar el ingreso en el Rack.';
      toast.error(msg);
      return undefined;
    }
  };

  const handleRefresh = () => {
    refetchRacks();
    refetchFormulas();
    refetchQueues();
    refetchMassBalance();
    if (canViewCosts) refetchValuation();
    refetchExtrusionWip();
  };

  return (
    <PtiIngressPresenter
      racks={racks}
      formulas={formulas}
      activeQueues={activeQueues}
      ptiProducts={compatiblePtiProducts}
      isLoading={isRacksLoading || isFormulasLoading || isQueuesLoading}
      onRefresh={handleRefresh}
      mixtureQr={mixtureQr}
      onMixtureQrChange={setMixtureQr}
      rackQr={rackQr}
      onRackQrChange={setRackQr}
      selectedPtiMaterialId={selectedPtiMaterialId}
      onPtiMaterialIdChange={setSelectedPtiMaterialId}
      ingressMode={ingressMode}
      onIngressModeChange={setIngressMode}
      quantityPieces={quantityPieces}
      onQuantityPiecesChange={setQuantityPieces}
      scaleWeightKg={scaleWeightKg}
      onScaleWeightKgChange={setScaleWeightKg}
      computedPiecesFromScale={computedPiecesFromScale}
      unitPrice={unitPrice}
      onUnitPriceChange={setUnitPrice}
      scrapWeightKg={scrapWeightKg}
      onScrapWeightKgChange={setScrapWeightKg}
      scrapReason={scrapReason}
      onScrapReasonChange={setScrapReason}
      scrapColor={scrapColor}
      onScrapColorChange={setScrapColor}
      shiftCode={shiftCode}
      onShiftCodeChange={setShiftCode}
      notes={notes}
      onNotesChange={setNotes}
      selectedRack={selectedRack}
      selectedFormula={selectedFormula}
      theoreticalWeightPerPiece={theoreticalWeightPerPiece}
      estimatedRawMaterialConsumedKg={estimatedRawMaterialConsumedKg}
      willSplitAcrossRacks={willSplitAcrossRacks}
      isPtiMismatched={isPtiMismatched}
      mismatchErrorMessage={mismatchErrorMessage}
      onSubmitIngress={handleSubmitIngress}
      isSubmitting={scanMutation.isPending}
      lastBackflushingResult={lastBackflushingResult}
      massBalance={massBalance}
      onSelectRackFromGrid={handleSelectRackFromGrid}
      onSelectQueueFromList={handleSelectQueueFromList}
      onCreateRack={handleCreateRack}
      isCreatingRack={createRackMutation.isPending}
      valuation={valuation}
      canViewCosts={canViewCosts}
      extrusionWip={extrusionWip}
      costIndex={costIndex}
      onCostIndexChange={setCostIndex}
      onUpdateRackPrice={handleUpdateRackPrice}
      isUpdatingRackPrice={updatePriceMutation.isPending}
    />
  );
};

export default PtiIngressContainer;
