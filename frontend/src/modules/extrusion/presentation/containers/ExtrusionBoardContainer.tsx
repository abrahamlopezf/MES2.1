import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import axiosClient from '@/api/axiosClient';
import {
  useExtruderQueuesQuery,
  useFloorFormulasQuery,
  useSwitchQueueMutation,
  useEnqueueMixMutation,
  usePtiRacksQuery,
  usePtiProductsQuery,
  useScanRackPtiMutation
} from '../../hooks/useExtrusionFloorQueries';
import { ExtrusionBoardPresenter } from '../presenters/ExtrusionBoardPresenter';
import { ExtruderQueue, Formula, PtiProduct } from '../../types/extrusion.types';
import { getClientAllowedExtruders, isClientFormula } from '../../domain/clientFormulaRules';
import { useExtrusionMixing } from '../../hooks/useExtrusionMixing';
import { MixContainersPrintModal, MixResultData } from '../../../production/presentation/components/MixContainersPrintModal';
import { getCdmxShift } from '@/utils/date';

export const ExtrusionBoardContainer: React.FC = () => {
  const {
    data: queues = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
    refetch: refetchQueues
  } = useExtruderQueuesQuery();

  const {
    data: formulas = [],
    isLoading: isFormulasLoading,
    isError: isFormulasError
  } = useFloorFormulasQuery();

  const switchMutation = useSwitchQueueMutation();
  const enqueueMutation = useEnqueueMixMutation();
  const { data: ptiRacks = [] } = usePtiRacksQuery();
  const { data: ptiProducts = [] } = usePtiProductsQuery({ is_active: true });
  const scanRackPtiMutation = useScanRackPtiMutation();
  const { data: machines = [] } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => (await axiosClient.get('/extrusion/machines')).data?.data || [],
  });

  // Integración de Recuperación e Impresión de Etiquetas QR de Contenedores
  const { fetchMixContainersByQrOrFolio } = useExtrusionMixing();
  const [printModalData, setPrintModalData] = useState<MixResultData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleOpenContainerQr = async (qrCodeOrFolio: string) => {
    try {
      const data = await fetchMixContainersByQrOrFolio(qrCodeOrFolio);
      if (data && data.containers?.length > 0) {
        setPrintModalData(data);
        setIsPrintModalOpen(true);
      } else {
        toast.error(`No se encontraron etiquetas QR para '${qrCodeOrFolio}'.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al recuperar etiquetas QR.');
    }
  };

  // State para Modal de Transición / Purga
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isPendingPtiPromptOpen, setIsPendingPtiPromptOpen] = useState(false);
  const [pendingPtiStep, setPendingPtiStep] = useState<'QUESTION' | 'QUICK_INGRESS'>('QUESTION');
  const [quickRackId, setQuickRackId] = useState<number | ''>('');
  const [quickPtiProductId, setQuickPtiProductId] = useState<number | ''>('');
  const [quickPieces, setQuickPieces] = useState('');
  const [targetQueue, setTargetQueue] = useState<ExtruderQueue | null>(null);
  const [activeQueue, setActiveQueue] = useState<ExtruderQueue | null>(null);
  const [scannedPausedQr, setScannedPausedQr] = useState<string | null>(null);
  const [prioritizeFormulaId, setPrioritizeFormulaId] = useState<number | null>(null);
  const [shiftCode, setShiftCode] = useState(() => getCdmxShift().shiftCode);
  const [purgePercentage, setPurgePercentage] = useState('');

  // State para Modal de Encolar
  const [isEnqueueModalOpen, setIsEnqueueModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number>(1);
  const [enqueueForm, setEnqueueForm] = useState<{
    consumption_order_qr_id: string;
    formula_id: number | '';
    priority: number;
    notes: string;
  }>({
    consumption_order_qr_id: '',
    formula_id: '',
    priority: 1,
    notes: ''
  });

  const isFormulaRestrictedForMachine = (formula: Formula, machineId: number): boolean => {
    const dynamicIds = (Array.isArray(machines) ? machines : [])
      .filter((machine: any) => machine.is_dynamic_member && machine.is_active !== false && machine.status === 'ACTIVE')
      .map((machine: any) => Number(machine.id));
    const clientAllowed = getClientAllowedExtruders(formula, dynamicIds);
    if (clientAllowed) return !clientAllowed.includes(Number(machineId));
    if (isClientFormula(formula.code)) return true;
    if (machineId !== 4) return false;

    if (formula.restricted_extruders && formula.restricted_extruders.includes(4)) {
      return true;
    }

    if (formula.ingredients && formula.ingredients.length > 0) {
      return formula.ingredients.some((ing) => {
        const matName = (ing.material?.name || '').toUpperCase();
        return ing.is_restricted_on_machine_4 || matName.includes('POLIPROPILENO (B)');
      });
    }

    return false;
  };

  const openSwitchModal = (target: ExtruderQueue, active: ExtruderQueue | null, formulaId?: number) => {
    setShiftCode(getCdmxShift().shiftCode);
    setTargetQueue(target);
    setActiveQueue(active);
    setScannedPausedQr(null);
    setPrioritizeFormulaId(formulaId ?? null);
    setPurgePercentage('');
    setIsSwitchModalOpen(true);
  };

  const handleOpenSwitchModal = (target: ExtruderQueue, active: ExtruderQueue | null, formulaId?: number) => {
    if (active && active.id !== target.id) {
      setTargetQueue(target);
      setActiveQueue(active);
      setPrioritizeFormulaId(formulaId ?? null);
      setPendingPtiStep('QUESTION');
      setIsPendingPtiPromptOpen(true);
      return;
    }
    openSwitchModal(target, active, formulaId);
  };

  const handleContinueWithoutPendingPti = () => {
    if (!targetQueue) return;
    const target = targetQueue;
    const active = activeQueue;
    const formulaId = prioritizeFormulaId ?? undefined;
    setIsPendingPtiPromptOpen(false);
    openSwitchModal(target, active, formulaId);
  };

  const handleStartQuickPtiIngress = () => {
    const linkedPtiId = Number(activeQueue?.output_pti_product_id || activeQueue?.formula?.ptiProducts?.[0]?.id || 0);
    setQuickPtiProductId(linkedPtiId || '');
    setQuickRackId('');
    setQuickPieces('');
    setPendingPtiStep('QUICK_INGRESS');
  };

  const handleConfirmQuickPtiIngress = async () => {
    if (!activeQueue || !targetQueue) return;
    const rack = ptiRacks.find((item) => Number(item.id) === Number(quickRackId));
    const product = ptiProducts.find((item: PtiProduct) => Number(item.id) === Number(quickPtiProductId));
    const pieces = Number(quickPieces);
    if (!rack || !product || !Number.isInteger(pieces) || pieces <= 0) {
      toast.error('Selecciona un rack, el PTI de la mezcla activa y una cantidad válida de bobinas.');
      return;
    }
    try {
      const result = await scanRackPtiMutation.mutateAsync({
        rack_qr: rack.qr_code,
        pti_material_id: product.id,
        quantity: pieces,
        mixture_qr: activeQueue.consumption_order_qr_id,
        unit_price: Number(rack.unit_price || product.unit_price || 0) || undefined,
      });
      const rackAssignments = result?.racks || result?.data?.racks;
      const assignmentSummary = Array.isArray(rackAssignments)
        ? rackAssignments.map((assignment: any) => `${assignment.pieces_added} en ${assignment.rack_code}`).join(', ')
        : rack.rack_code;
      toast.success(`${pieces} bobina(s) registradas: ${assignmentSummary}.`);
      setIsPendingPtiPromptOpen(false);
      openSwitchModal(targetQueue, activeQueue, prioritizeFormulaId ?? undefined);
    } catch (error: any) {
      toast.error(error.friendlyMessage || error.response?.data?.message || 'No se pudo registrar el PTI en el rack.');
    }
  };

  const handleScanPausedQr = (scannedCode: string, expectedQueue: ExtruderQueue) => {
    const normalizedCode = String(scannedCode || '').trim().toUpperCase();
    if (!normalizedCode || normalizedCode !== String(expectedQueue.consumption_order_qr_id).trim().toUpperCase()) {
      toast.error('El QR escaneado no corresponde a esta mezcla pausada. Verifica la etiqueta y la extrusora.');
      return;
    }
    const machineGroup = queues.find((group) => group.machine.id === expectedQueue.extruder_id);
    const currentPaused = machineGroup?.paused.find((queue) => queue.id === expectedQueue.id);
    if (!currentPaused) {
      toast.error('Esta mezcla ya no está pausada en esa extrusora. Actualiza el tablero y vuelve a escanear.');
      return;
    }
    handleOpenSwitchModal(currentPaused, machineGroup?.active || null);
    setScannedPausedQr(normalizedCode);
    toast.success(`QR verificado: ${normalizedCode}. Revisa la transición y confirma para reanudar.`);
  };

  const handleCloseSwitchModal = () => {
    setIsSwitchModalOpen(false);
    setTargetQueue(null);
    setActiveQueue(null);
    setScannedPausedQr(null);
    setPrioritizeFormulaId(null);
  };

  const handleConfirmSwitch = async () => {
    if (!targetQueue) return;

    const percentage = Number(purgePercentage);
    if (activeQueue && activeQueue.id !== targetQueue.id && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
      toast.error('Indica un porcentaje de purgante entre 0 y 100.');
      return;
    }
    if (targetQueue.status === 'PAUSADA' && scannedPausedQr !== String(targetQueue.consumption_order_qr_id).trim().toUpperCase()) {
      toast.error('Escanea el QR original de la mezcla pausada antes de confirmar su reanudación.');
      return;
    }
    const scrapItems: any[] = [];

    try {
      await switchMutation.mutateAsync({
        queue_id: targetQueue.id,
        ...(targetQueue.status === 'PAUSADA' ? { scanned_qr: scannedPausedQr || undefined } : {}),
        ...(prioritizeFormulaId == null ? {} : { prioritize_formula_id: prioritizeFormulaId }),
        scrap_items: scrapItems,
        ...(activeQueue && activeQueue.id !== targetQueue.id ? { purge_percentage: percentage } : {}),
        shift_code: shiftCode
      });

      toast.success(targetQueue.status === 'PAUSADA'
        ? `${targetQueue.consumption_order_qr_id} reanudada en la extrusora ${targetQueue.extruder_id}.${activeQueue ? ' Transición registrada.' : ' No había otra mezcla activa.'}`
        : `${targetQueue.consumption_order_qr_id} activada. Registra la merma real por color al cierre del turno.`);
      handleCloseSwitchModal();
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al realizar el cambio de prioridad.';
      toast.error(msg);
    }
  };

  const handleOpenEnqueueModal = (machineId: number) => {
    setSelectedMachineId(machineId);
    setEnqueueForm({
      consumption_order_qr_id: '',
      formula_id: '',
      priority: 1,
      notes: ''
    });
    setIsEnqueueModalOpen(true);
  };

  const handleCloseEnqueueModal = () => {
    setIsEnqueueModalOpen(false);
  };

  const handleEnqueueFormChange = (field: string, value: any) => {
    setEnqueueForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirmEnqueue = async () => {
    if (!enqueueForm.consumption_order_qr_id) {
      toast.error('Ingrese el código QR de la Orden de Consumo.');
      return;
    }

    if (!enqueueForm.formula_id) {
      toast.error('Seleccione una fórmula.');
      return;
    }

    // Validación estricta máquina 4 en frontend
    const selectedFormula = formulas.find((f) => f.id === enqueueForm.formula_id);
    if (selectedFormula && isFormulaRestrictedForMachine(selectedFormula, selectedMachineId)) {
      toast.error('Esta fórmula no está autorizada para la extrusora seleccionada. Revisa el grupo dinámico o la matriz de compatibilidad.');
      return;
    }

    try {
      await enqueueMutation.mutateAsync({
        extruder_id: selectedMachineId,
        consumption_order_qr_id: enqueueForm.consumption_order_qr_id.trim(),
        formula_id: Number(enqueueForm.formula_id),
        priority: Number(enqueueForm.priority) || 1,
        notes: enqueueForm.notes
      });

      toast.success('Mezcla encolada con éxito en la Extrusora ' + selectedMachineId);
      handleCloseEnqueueModal();
    } catch (error: any) {
      const msg = error.friendlyMessage || error.response?.data?.message || 'Error al encolar la mezcla.';
      toast.error(msg);
    }
  };

  return (
    <>
      <ExtrusionBoardPresenter
      queues={queues}
      formulas={formulas}
      isLoading={isQueuesLoading || isFormulasLoading}
      isError={isQueuesError || isFormulasError}
      onRefresh={() => refetchQueues()}
      isSwitchModalOpen={isSwitchModalOpen}
      isPendingPtiPromptOpen={isPendingPtiPromptOpen}
      onPendingPtiRegister={handleStartQuickPtiIngress}
      onPendingPtiContinue={handleContinueWithoutPendingPti}
      onPendingPtiCancel={() => { setIsPendingPtiPromptOpen(false); setPendingPtiStep('QUESTION'); setTargetQueue(null); setActiveQueue(null); setPrioritizeFormulaId(null); }}
      targetQueue={targetQueue}
      activeQueue={activeQueue}
      purgePercentage={purgePercentage}
      onPurgePercentageChange={setPurgePercentage}
      estimatedTransitionScrapKg={Number(((Number(targetQueue?.preparation?.remaining_quantity_kg || 0) * (Number(purgePercentage) || 0)) / 100).toFixed(3))}
      pendingPtiStep={pendingPtiStep}
      quickRacks={ptiRacks}
      quickPtiProducts={ptiProducts.filter((product: PtiProduct) => Number(product.formula_id) === Number(activeQueue?.formula_id))}
      quickRackId={quickRackId}
      onQuickRackChange={setQuickRackId}
      quickPtiProductId={quickPtiProductId}
      onQuickPtiProductChange={setQuickPtiProductId}
      quickPieces={quickPieces}
      onQuickPiecesChange={setQuickPieces}
      onStartQuickPtiIngress={handleStartQuickPtiIngress}
      onConfirmQuickPtiIngress={handleConfirmQuickPtiIngress}
      isQuickPtiSubmitting={scanRackPtiMutation.isPending}
      onOpenSwitchModal={handleOpenSwitchModal}
      onScanPausedQr={handleScanPausedQr}
      onCloseSwitchModal={handleCloseSwitchModal}
      onConfirmSwitch={handleConfirmSwitch}
      isSwitching={switchMutation.isPending}
      resumeQrVerified={Boolean(targetQueue?.status === 'PAUSADA' && scannedPausedQr === String(targetQueue?.consumption_order_qr_id || '').trim().toUpperCase())}
      isEnqueueModalOpen={isEnqueueModalOpen}
      selectedMachineId={selectedMachineId}
      enqueueForm={enqueueForm}
      onEnqueueFormChange={handleEnqueueFormChange}
      onOpenEnqueueModal={handleOpenEnqueueModal}
      onCloseEnqueueModal={handleCloseEnqueueModal}
      onConfirmEnqueue={handleConfirmEnqueue}
      isEnqueuing={enqueueMutation.isPending}
      isFormulaRestrictedForMachine={isFormulaRestrictedForMachine}
      onOpenContainerQr={handleOpenContainerQr}
    />

    {/* Modal de Impresión y Visualización de Etiquetas QR de Contenedor */}
    <MixContainersPrintModal
      isOpen={isPrintModalOpen}
      onClose={() => {
        setIsPrintModalOpen(false);
        setPrintModalData(null);
      }}
      mixData={printModalData}
      autoPrint={false}
    />
    </>
  );
};

export default ExtrusionBoardContainer;
