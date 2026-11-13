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
  useExtrusionWipQuery,
  useDispatchPtiRackToWarehouseMutation,
  useRegisterPtiSaleExitMutation
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
  const dispatchWarehouseMutation = useDispatchPtiRackToWarehouseMutation();
  const saleExitMutation = useRegisterPtiSaleExitMutation();
  const roleCode = String(typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name) || '').toUpperCase();
  const canRegisterSale = ['SUPERADMIN', 'ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION'].includes(roleCode);

  const handleDispatchToWarehouse = async (rackId: number, payload: { quantity_pieces?: number; weight_kg?: number; notes?: string }) => {
    try {
      const result = await dispatchWarehouseMutation.mutateAsync({ rackId, payload });
      toast.success(`Transferencia ${result.transfer_code} creada. Almacén debe escanear el QR para confirmar la recepción.`);
      refetchRacks();
      refetchExtrusionWip();
      if (canViewCosts) refetchValuation();
      return result;
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'No se pudo transferir el PTI a Almacén.';
      toast.error(msg);
      throw error;
    }
  };

  const handleRegisterSaleExit = async (rackId: number, payload: { rack_qr: string }) => {
    try {
      const result = await saleExitMutation.mutateAsync({ rackId, payload });
      toast.success(`Salida a Venta ${result.exit_code} registrada: ${result.quantity_pieces} piezas / ${result.quantity_kg} kg.`);
      refetchRacks();
      refetchExtrusionWip();
      if (canViewCosts) refetchValuation();
      return result;
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'No se pudo registrar la salida a Venta.';
      toast.error(msg);
      throw error;
    }
  };

  const handleCreateRack = async (payload: { virgin_qr_code: string; max_capacity?: number }) => {
    try {
      const createdRack = await createRackMutation.mutateAsync(payload);
      toast.success(`Rack ${createdRack.rack_code} creado exitosamente con el QR escaneado.`);
      refetchRacks();
      if (canViewCosts) refetchValuation();
      return createdRack;
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al registrar el rack.';
      toast.error(msg);
      throw error;
    }
  };
  const defaultRackLocation = String(user?.area?.name || user?.role?.area?.name || 'Extrusión');

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
  const [selectedExtruderId, setSelectedExtruderId] = useState<number | null>(null);
  const [rackQr, setRackQr] = useState<string>('');
  // Puntos 5 y 7: Ingreso por Piezas o Báscula, y Precio Unitario
  const [ingressMode, setIngressMode] = useState<'FULL_RACK' | 'PIECES' | 'WEIGHT'>('PIECES');
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [scaleWeightKg, setScaleWeightKg] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');

  const [scrapWeightKg, setScrapWeightKg] = useState<string>('');
  const [scrapReason, setScrapReason] = useState<string>('ARRANQUE_EXTRUSORA');
  const [scrapColor, setScrapColor] = useState<string>('');
  const [shiftCode, setShiftCode] = useState('TURNO_1');
  const [notes, setNotes] = useState<string>('');
  const [lastBackflushingResult, setLastBackflushingResult] = useState<BackflushingResult | null>(null);

  // Mezclas activas actuales en las 4 extrusoras
  const activeQueues: ExtruderQueue[] = useMemo(() => {
    return queuesGroups
      .map((g) => g.active)
      .filter((q): q is ExtruderQueue => q !== null && q !== undefined);
  }, [queuesGroups]);

  // La selección se hace por extrusora; la mezcla activa se resuelve desde su cola.
  const selectedQueue: ExtruderQueue | null = useMemo(() => {
    if (selectedExtruderId == null) return null;
    return activeQueues.find((queue) => Number(queue.extruder_id) === Number(selectedExtruderId)) || null;
  }, [activeQueues, selectedExtruderId]);
  const mixtureQr = selectedQueue?.consumption_order_qr_id || '';
  const { data: massBalance = null, refetch: refetchMassBalance } = useMassBalanceQuery(mixtureQr);

  React.useEffect(() => {
    if (activeQueues.length === 0) {
      setSelectedExtruderId(null);
    } else if (!activeQueues.some((queue) => Number(queue.extruder_id) === Number(selectedExtruderId))) {
      setSelectedExtruderId(Number(activeQueues[0].extruder_id));
    }
  }, [activeQueues, selectedExtruderId]);

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

  // La fórmula y sus PTI compatibles se calculan antes de derivar la selección.
  // Mantener este orden evita leer compatiblePtiProducts durante su TDZ.
  const selectedFormula: Formula | null = selectedQueue?.formula || null;
  const compatiblePtiProducts = useMemo(() => {
    if (!selectedFormula) return [];
    if (selectedQueue?.output_pti_product_id) {
      return ptiProducts.filter((product) => Number(product.id) === Number(selectedQueue.output_pti_product_id));
    }
    return ptiProducts.filter((product) => Number(product.formula_id) === Number(selectedFormula.id));
  }, [ptiProducts, selectedFormula, selectedQueue]);

  const colorMatchedOutputs = selectedQueue?.output_pti_color
    ? compatiblePtiProducts.filter((product) => String(product.color || '').trim().toUpperCase() === String(selectedQueue.output_pti_color).trim().toUpperCase())
    : [];
  const selectedPtiMaterialId: number | '' = selectedQueue?.output_pti_product_id
    ? Number(selectedQueue.output_pti_product_id)
    : selectedQueue?.output_pti_color
      ? colorMatchedOutputs.length === 1 ? Number(colorMatchedOutputs[0].id) : ''
      : compatiblePtiProducts.length === 1 ? Number(compatiblePtiProducts[0].id) : '';
  const selectedPtiProduct = compatiblePtiProducts.find((product) => Number(product.id) === Number(selectedPtiMaterialId)) || null;

  React.useEffect(() => {
    if (selectedRack && selectedRack.unit_price && (!unitPrice || Number(unitPrice) === 0)) {
      setUnitPrice(Number(selectedRack.unit_price).toString());
    }
  }, [selectedRack, unitPrice]);

  React.useEffect(() => {
    if (selectedPtiProduct) {
      if (selectedPtiProduct.unit_price && (!unitPrice || Number(unitPrice) === 0)) {
        setUnitPrice(Number(selectedPtiProduct.unit_price).toString());
      }
    }
  }, [selectedPtiProduct, unitPrice]);

  // Regla 6: Peso teórico por pieza = batch_size_kg / expected_yield_pieces
  const theoreticalWeightPerPiece: number = useMemo(() => {
    if (!selectedFormula || !selectedFormula.expected_yield_pieces) return 0;
    const batch = Number(selectedFormula.batch_size_kg) || 0;
    const yieldPcs = Number(selectedFormula.expected_yield_pieces) || 1;
    return Number((batch / yieldPcs).toFixed(4));
  }, [selectedFormula]);

  // Punto 5: Peso unitario del rack y cálculo de piezas desde báscula
  const rackUnitWeight = Number(selectedPtiProduct?.unit_weight_kg) || 0;
  const expectedPtiRoute = selectedPtiProduct?.telares_subarea_code === 'TELARES_BANDA'
    || (!selectedPtiProduct?.telares_subarea_code && Number(selectedExtruderId) === 1)
    ? 'TELARES_BANDA'
    : selectedPtiProduct?.telares_subarea_code === 'TELARES_ROLLO'
      || (!selectedPtiProduct?.telares_subarea_code && [2, 4, 5].includes(Number(selectedExtruderId)))
      ? 'TELARES_ROLLO'
      : null;
  const fullRackTarget = useMemo(() => {
    if (!selectedPtiProduct || !expectedPtiRoute) return null;
    const eligible = racks.filter((rack) => {
      if (rack.locked_until_shift_close || rack.available_for_active_shift === false
        || (rack.custody_shift_session_id != null && rack.available_for_active_shift !== true)) return false;
      const occupied = Number(rack.current_quantity || 0);
      if (occupied <= 0) return true;
      return Number(rack.current_pti_product_id) === Number(selectedPtiProduct.id)
        && rack.destination_route === expectedPtiRoute
        && rack.destination_subarea_id == null;
    });
    const target = [...eligible]
      .sort((a, b) => Number(b.current_quantity || 0) - Number(a.current_quantity || 0) || Number(a.id) - Number(b.id))
      .find((rack) => Number(rack.current_quantity || 0) < Number(rack.max_capacity || 100));
    return target
      ? { rackCode: target.rack_code, pieces: Math.max(0, Number(target.max_capacity || 100) - Number(target.current_quantity || 0)) }
      : { rackCode: null, pieces: 100 };
  }, [racks, selectedPtiProduct, expectedPtiRoute]);
  const computedPiecesFromScale = useMemo(() => {
    const w = Number(scaleWeightKg);
    if (isNaN(w) || w <= 0) return 0;
    return rackUnitWeight > 0 ? Math.max(1, Math.round(w / rackUnitWeight)) : 0;
  }, [scaleWeightKg, rackUnitWeight]);

  const pieces = ingressMode === 'FULL_RACK'
    ? (fullRackTarget?.pieces || 0)
    : ingressMode === 'WEIGHT'
      ? (rackUnitWeight > 0 ? computedPiecesFromScale : Number(quantityPieces) || 0)
      : (Number(quantityPieces) || 0);

  // Materia prima teórica total
  const estimatedRawMaterialConsumedKg: number = useMemo(() => {
    return Number((pieces * theoreticalWeightPerPiece).toFixed(2));
  }, [pieces, theoreticalWeightPerPiece]);

  const handleSelectRackFromGrid = (rack: PtiRack) => {
    setRackQr(rack.qr_code);
    if (rack.unit_price && Number(rack.unit_price) > 0) {
      setUnitPrice(rack.unit_price.toString());
    }
  };

  const handleSelectQueueFromList = (queue: ExtruderQueue) => {
    setSelectedExtruderId(Number(queue.extruder_id));
  };

  const handleSubmitIngress = async () => {
    if (!selectedPtiMaterialId) {
      toast.error('Seleccione el tipo de material PTI a ingresar.');
      return;
    }

    if (pieces <= 0) {
      toast.error(ingressMode === 'WEIGHT' ? 'Ingrese un peso parcial mayor a 0 kg.' : 'Ingrese una cantidad de piezas mayor a 0.');
      return;
    }

    if (rackUnitWeight <= 0) {
      toast.error('Este PTI no tiene un peso estándar válido. Regístralo en el Catálogo de PTI antes de ingresar producción.');
      return;
    }

    try {
      const payload: any = {
        pti_material_id: Number(selectedPtiMaterialId),
        extruder_id: selectedExtruderId || undefined,
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

      const assignedRacks = (response as any)?.racks || (response as any)?.rack_allocations || [];
      const rackSummary = assignedRacks.map((item: any) => item.rack_code).filter(Boolean).join(', ');
      toast.success(response.message || `Ingreso de ${pieces} pzas registrado${rackSummary ? ` en: ${rackSummary}` : ''}.`);

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
      selectedExtruderId={selectedExtruderId}
      rackQr={rackQr}
      onRackQrChange={setRackQr}
      selectedPtiMaterialId={selectedPtiMaterialId}
      ingressMode={ingressMode}
      onIngressModeChange={setIngressMode}
      quantityPieces={quantityPieces}
      onQuantityPiecesChange={setQuantityPieces}
      scaleWeightKg={scaleWeightKg}
      onScaleWeightKgChange={setScaleWeightKg}
      computedPiecesFromScale={computedPiecesFromScale}
      fullRackTarget={fullRackTarget}
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
      onSubmitIngress={handleSubmitIngress}
      isSubmitting={scanMutation.isPending}
      lastBackflushingResult={lastBackflushingResult}
      massBalance={massBalance}
      onSelectRackFromGrid={handleSelectRackFromGrid}
      onSelectQueueFromList={handleSelectQueueFromList}
      onCreateRack={handleCreateRack}
      defaultRackLocation={defaultRackLocation}
      isCreatingRack={createRackMutation.isPending}
      valuation={valuation}
      canViewCosts={canViewCosts}
      extrusionWip={extrusionWip}
      costIndex={costIndex}
      onCostIndexChange={setCostIndex}
      onUpdateRackPrice={handleUpdateRackPrice}
      isUpdatingRackPrice={updatePriceMutation.isPending}
      onDispatchToWarehouse={handleDispatchToWarehouse}
      isDispatchingToWarehouse={dispatchWarehouseMutation.isPending}
      canRegisterSale={canRegisterSale}
      onRegisterSaleExit={handleRegisterSaleExit}
      isRegisteringSaleExit={saleExitMutation.isPending}
    />
  );
};

export default PtiIngressContainer;
