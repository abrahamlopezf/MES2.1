import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import axiosClient from '@/api/axiosClient';
import {
  useExtruderQueuesQuery,
  useFloorFormulasQuery,
  useSwitchQueueMutation,
  useEnqueueMixMutation
} from '../../hooks/useExtrusionFloorQueries';
import { ExtrusionBoardPresenter } from '../presenters/ExtrusionBoardPresenter';
import { ExtruderQueue, Formula } from '../../types/extrusion.types';
import { useExtrusionMixing } from '../../hooks/useExtrusionMixing';
import { MixContainersPrintModal, MixResultData } from '../../../production/presentation/components/MixContainersPrintModal';

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
  const { data: purgeMaterials = [] } = useQuery({
    queryKey: ['extrusion', 'purge-materials'],
    queryFn: async () => (await axiosClient.get('/extrusion/purge-materials')).data.data || [],
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
  const [targetQueue, setTargetQueue] = useState<ExtruderQueue | null>(null);
  const [activeQueue, setActiveQueue] = useState<ExtruderQueue | null>(null);
  const [prioritizeFormulaId, setPrioritizeFormulaId] = useState<number | null>(null);
  const [scrapAnteriorWeight, setScrapAnteriorWeight] = useState('');
  const [scrapNuevaWeight, setScrapNuevaWeight] = useState('');
  const [scrapMixtaWeight, setScrapMixtaWeight] = useState('');
  const [fromMixShare, setFromMixShare] = useState('');
  const [shiftCode, setShiftCode] = useState('TURNO_1');
  const [purgeWeight, setPurgeWeight] = useState('');
  const [purgeMaterialId, setPurgeMaterialId] = useState<number | ''>('');
  const [purgeLoteId, setPurgeLoteId] = useState<number | ''>('');
  const { data: purgeLots = [] } = useQuery({
    queryKey: ['extrusion', 'purge-lots', purgeMaterialId],
    queryFn: async () => (await axiosClient.get('/extrusion/purge-materials/' + purgeMaterialId + '/lotes')).data.data || [],
    enabled: Boolean(purgeMaterialId),
  });

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

  const handleOpenSwitchModal = (target: ExtruderQueue, active: ExtruderQueue | null, formulaId?: number) => {
    setTargetQueue(target);
    setActiveQueue(active);
    setPrioritizeFormulaId(formulaId ?? null);
    setScrapAnteriorWeight('');
    setScrapNuevaWeight('');
    setScrapMixtaWeight('');
    setFromMixShare('');
    setPurgeWeight('');
    setPurgeMaterialId('');
    setPurgeLoteId('');
    setIsSwitchModalOpen(true);
  };

  const handleCloseSwitchModal = () => {
    setIsSwitchModalOpen(false);
    setTargetQueue(null);
    setActiveQueue(null);
    setPrioritizeFormulaId(null);
    setScrapAnteriorWeight('');
    setScrapNuevaWeight('');
    setScrapMixtaWeight('');
    setFromMixShare('');
  };

  const handleConfirmSwitch = async () => {
    if (!targetQueue) return;

    const previousScrap = Number(scrapAnteriorWeight) || 0;
    const nextScrap = Number(scrapNuevaWeight) || 0;
    const mixedScrap = Number(scrapMixtaWeight) || 0;
    const purge = Number(purgeWeight) || 0;
    if ([previousScrap, nextScrap, mixedScrap, purge].some((weight) => !Number.isFinite(weight) || weight < 0)) {
      toast.error('Los pesos de merma deben ser números iguales o mayores a cero.');
      return;
    }
    if (previousScrap <= 0 && nextScrap <= 0 && mixedScrap <= 0 && purge <= 0) {
      toast.error('Registra la merma estimada de cada origen y/o el material de purga.');
      return;
    }
    if (purge > 0 && (!purgeMaterialId || !purgeLoteId)) {
      toast.error('Selecciona el material y lote utilizado para purgar el husillo.');
      return;
    }
    if (mixedScrap > 0 && (!Number.isFinite(Number(fromMixShare)) || Number(fromMixShare) <= 0 || Number(fromMixShare) >= 100)) {
      toast.error('Indica una proporción estimada mayor a 0% y menor a 100% para la mezcla anterior.');
      return;
    }

    const colorsOf = (queue: ExtruderQueue | null) => [...new Set((queue?.formula?.ptiProducts || []).filter((pti) => pti.is_active && pti.color).map((pti) => pti.color!.trim()).filter(Boolean))];
    const previousColors = colorsOf(activeQueue);
    const nextColors = colorsOf(targetQueue);
    const scrapItems: any[] = [];
    if (previousScrap > 0) scrapItems.push({ category: 'MEZCLA_ANTERIOR', estimated_weight_kg: previousScrap, color: previousColors.join(', ') || 'Color anterior no definido' });
    if (nextScrap > 0) scrapItems.push({ category: 'MEZCLA_NUEVA', estimated_weight_kg: nextScrap, color: nextColors.join(', ') || 'Color nuevo no definido' });
    if (mixedScrap > 0) scrapItems.push({
      category: 'MEZCLA_MIXTA',
      estimated_weight_kg: mixedScrap,
      color: 'Anterior: ' + (previousColors.join(', ') || 'sin color ligado') + ' → Nueva: ' + (nextColors.join(', ') || 'sin color ligado'),
      from_mix_share: Number(fromMixShare),
      to_mix_share: 100 - Number(fromMixShare),
    });
    if (purge > 0) scrapItems.push({
      category: 'MATERIAL_PURGA',
      estimated_weight_kg: purge,
      source_material_id: Number(purgeMaterialId),
      source_lote_id: Number(purgeLoteId),
      color: 'MATERIAL DE PURGA',
      notes: 'Material usado para purgar el husillo. Fórmula entrante: ' + (nextColors.join(', ') || 'color no definido') + '.',
    });

    try {
      await switchMutation.mutateAsync({
        queue_id: targetQueue.id,
        ...(prioritizeFormulaId == null ? {} : { prioritize_formula_id: prioritizeFormulaId }),
        scrap_items: scrapItems,
        shift_code: shiftCode
      });

      toast.success(
        'Transición completada: ' + targetQueue.consumption_order_qr_id + ' activada. Merma estimada total: ' + (previousScrap + nextScrap + mixedScrap + purge) + ' kg.'
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
    <>
      <ExtrusionBoardPresenter
      queues={queues}
      formulas={formulas}
      isLoading={isQueuesLoading || isFormulasLoading}
      isError={isQueuesError || isFormulasError}
      onRefresh={() => refetchQueues()}
      isSwitchModalOpen={isSwitchModalOpen}
      targetQueue={targetQueue}
      activeQueue={activeQueue}
      scrapAnteriorWeight={scrapAnteriorWeight}
      onScrapAnteriorWeightChange={setScrapAnteriorWeight}
      scrapNuevaWeight={scrapNuevaWeight}
      onScrapNuevaWeightChange={setScrapNuevaWeight}
      scrapMixtaWeight={scrapMixtaWeight}
      onScrapMixtaWeightChange={setScrapMixtaWeight}
      fromMixShare={fromMixShare}
      onFromMixShareChange={setFromMixShare}
      purgeWeight={purgeWeight}
      onPurgeWeightChange={setPurgeWeight}
      purgeMaterialId={purgeMaterialId}
      onPurgeMaterialChange={(value) => { setPurgeMaterialId(value); setPurgeLoteId(''); }}
      purgeLoteId={purgeLoteId}
      onPurgeLoteChange={setPurgeLoteId}
      purgeMaterials={purgeMaterials}
      purgeLots={purgeLots}
      shiftCode={shiftCode}
      onShiftCodeChange={setShiftCode}
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
