import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  useExtruderQueuesQuery,
  useFloorFormulasQuery,
  useSwitchQueueMutation,
  useEnqueueMixMutation
} from '../../hooks/useExtrusionFloorQueries';
import { ExtrusionBoardPresenter } from '../presenters/ExtrusionBoardPresenter';
import { ExtruderQueue, Formula } from '../../types/extrusion.types';

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

  // State para Modal de Transición / Purga
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [targetQueue, setTargetQueue] = useState<ExtruderQueue | null>(null);
  const [activeQueue, setActiveQueue] = useState<ExtruderQueue | null>(null);
  const [scrapWeight, setScrapWeight] = useState('');

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

  const handleOpenSwitchModal = (target: ExtruderQueue, active: ExtruderQueue | null) => {
    setTargetQueue(target);
    setActiveQueue(active);
    setScrapWeight('');
    setIsSwitchModalOpen(true);
  };

  const handleCloseSwitchModal = () => {
    setIsSwitchModalOpen(false);
    setTargetQueue(null);
    setActiveQueue(null);
    setScrapWeight('');
  };

  const handleConfirmSwitch = async () => {
    if (!targetQueue) return;

    const scrap = Number(scrapWeight);
    if (!scrap || scrap <= 0) {
      toast.error('Debe ingresar un peso de merma de purga mayor a 0 kg para efectuar la transición.');
      return;
    }

    try {
      await switchMutation.mutateAsync({
        queue_id: targetQueue.id,
        scrap_weight_kg: scrap
      });

      toast.success(
        `Transición completada: ${targetQueue.consumption_order_qr_id} activada. Purga registrada: ${scrap} kg.`
      );
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
    if (selectedMachineId === 4) {
      const selectedFormula = formulas.find((f) => f.id === enqueueForm.formula_id);
      if (selectedFormula && isFormulaRestrictedForMachine(selectedFormula, 4)) {
        toast.error('Restricción de Máquina: La Extrusora 4 tiene estrictamente prohibido usar "POLIPROPILENO (B)".');
        return;
      }
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
    <ExtrusionBoardPresenter
      queues={queues}
      formulas={formulas}
      isLoading={isQueuesLoading || isFormulasLoading}
      isError={isQueuesError || isFormulasError}
      onRefresh={() => refetchQueues()}
      isSwitchModalOpen={isSwitchModalOpen}
      targetQueue={targetQueue}
      activeQueue={activeQueue}
      scrapWeight={scrapWeight}
      onScrapWeightChange={setScrapWeight}
      onOpenSwitchModal={handleOpenSwitchModal}
      onCloseSwitchModal={handleCloseSwitchModal}
      onConfirmSwitch={handleConfirmSwitch}
      isSwitching={switchMutation.isPending}
      isEnqueueModalOpen={isEnqueueModalOpen}
      selectedMachineId={selectedMachineId}
      enqueueForm={enqueueForm}
      onEnqueueFormChange={handleEnqueueFormChange}
      onOpenEnqueueModal={handleOpenEnqueueModal}
      onCloseEnqueueModal={handleCloseEnqueueModal}
      onConfirmEnqueue={handleConfirmEnqueue}
      isEnqueuing={enqueueMutation.isPending}
      isFormulaRestrictedForMachine={isFormulaRestrictedForMachine}
    />
  );
};

export default ExtrusionBoardContainer;
