import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Badge, Icon } from '@/design-system';
import { apiClient } from '@/core/api/apiClient';
import { useFormulas, useFormulaDetails, fetchWipChildQr, useMixFormula } from '../../../extrusion/hooks/useExtrusionMixing';
import { useExtruderQueuesQuery, usePtiProductsQuery } from '../../../extrusion/hooks/useExtrusionFloorQueries';
import { CameraScanner } from '@/design-system/components/scanner-overlay/CameraScanner';
import { CreateConsumptionOrderModal, PreloadedOdcItem } from '../../../warehouse/presentation/components/CreateConsumptionOrderModal';
import { MixContainersPrintModal, MixResultData } from './MixContainersPrintModal';
import { sendBrowserNotification } from '@/core/notifications/browserNotifications';

// Helpers de validación de materiales de Polipropileno
export const isPpMaterial = (item: any) => {
  const name = (item?.material_name || item?.material?.name || item?.name || '').toUpperCase();
  const code = (item?.material_code || item?.material?.material_code || item?.internal_code || '').toUpperCase();
  return name.includes('POLIPROPILENO') || name.includes('PP ') || code.startsWith('MP-PP');
};

export const isPpBMaterial = (item: any) => {
  const name = (item?.material_name || item?.material?.name || item?.name || '').toUpperCase();
  const code = (item?.material_code || item?.material?.material_code || item?.internal_code || '').toUpperCase();
  return Boolean(item?.is_restricted) || name.includes('POLIPROPILENO (B)') || name.includes('PP-B') || name.includes('PP B') || code.includes('PP-B');
};

interface MixingTerminalFormProps {
  ticket?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ScannedInput {
  qr_code: string;
  quantity: number;
  material_id?: number;
  material_name?: string;
  material_code?: string;
}

export const MixingTerminalForm: React.FC<MixingTerminalFormProps> = ({
  ticket,
  onSuccess,
  onCancel
}) => {
  const navigate = useNavigate();
  const { data: rawFormulas, isLoading: loadingFormulas } = useFormulas();
  const { data: queueGroups = [] } = useExtruderQueuesQuery();
  const { data: registeredPtis = [] } = usePtiProductsQuery({ is_active: true });
  const mutation = useMixFormula();

  // Consulta de catálogo real de máquinas extrusoras con información de Silos y Matriz
  const { data: machinesData } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/machines');
      return res.data?.data || res.data || [];
    }
  });

  const machines: any[] = Array.isArray(machinesData) ? machinesData : [];
  const formulas: any[] = Array.isArray(rawFormulas) ? rawFormulas : [];

  const [formulaId, setFormulaId] = useState('');
  // 1. Selector de número de contenedores (el sistema asigna los QRs y divide los 500kg)
  const [containerCount, setContainerCount] = useState<number>(1);
  // 2. Extrusora seleccionada (sugerida automáticamente según compatibilidad y restricciones)
  const [selectedExtruderId, setSelectedExtruderId] = useState<number>(1);

  // Modal para imprimir etiquetas QR generadas de los N contenedores
  const [mixResultModalData, setMixResultModalData] = useState<MixResultData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [isMixingCameraOpen, setIsMixingCameraOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Consulta de detalles de fórmula con verificación de inventario WIP en Extrusión (Área 2)
  const { data: formulaDetails, isLoading: loadingDetails, refetch: refetchFormulaDetails } = useFormulaDetails(formulaId);

  const formulaItems: any[] = formulaDetails?.items || [];
  const allWipAvailable: boolean = Boolean(formulaDetails?.all_materials_available);
  const hasSufficientIngredients: boolean = Boolean(
    formulaDetails?.all_materials_available ??
    (formulaItems.length > 0 && formulaItems.every((item: any) => item.is_sufficient))
  );

  // Estado para modal de Orden de Consumo (ODC) hacia Almacén con insumos precargados
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);
  const [odcInitialItems, setOdcInitialItems] = useState<PreloadedOdcItem[]>([]);
  const [odcInitialNotes, setOdcInitialNotes] = useState('');

  // Insumos escaneados en este lote
  const [inputs, setInputs] = useState<ScannedInput[]>([]);

  // Estado del modal / panel de escaneo de QR Hijo
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [targetMaterialForScan, setTargetMaterialForScan] = useState<{
    id: number;
    name: string;
    required: number;
    pending: number;
    suggested_fifo_qr?: string | null;
    suggested_fifo_amount?: number | null;
    fifo_qrs?: any[];
  } | null>(null);

  const [scannedQrInput, setScannedQrInput] = useState('');
  const [isValidatingQr, setIsValidatingQr] = useState(false);
  const [recognizedChildQr, setRecognizedChildQr] = useState<{
    qr_code: string;
    material_id: number;
    material_name: string;
    material_code: string;
    available_amount: number;
    unit: string;
  } | null>(null);
  const [customDoseQty, setCustomDoseQty] = useState<number | ''>('');
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setFormulaId(ticket.formula_id ? String(ticket.formula_id) : '');
      setNotes(`Atendiendo solicitud: ${ticket.folio}`);
    } else if (formulas.length > 0 && !formulaId) {
      setFormulaId(String(formulas[0].id));
    }
  }, [ticket, formulas]);

  const selectedFormula = formulas.find((f: any) => String(f.id) === String(formulaId));
  const hasLinkedActivePti = Boolean(selectedFormula && registeredPtis.some((pti: any) =>
    Number(pti.id) === Number(selectedFormula.output_pti_id) || Number(pti.formula_id) === Number(selectedFormula.id)
  ));
  const batchTargetKg = Number(formulaDetails?.batch_size_kg || selectedFormula?.batch_size_kg || 500);

  // Restricciones operativas especiales de materiales se conservan aparte de
  // la matriz editable de compatibilidad por máquina.
  const hasPpbInFormula = useMemo(() => {
    if (!selectedFormula) return false;
    const code = (selectedFormula.code || '').toUpperCase();
    const name = (selectedFormula.name || '').toUpperCase();
    if (code.includes('PPB') || name.includes('PP-B') || name.includes('NEGRO') || name.includes('VERDE OPT')) return true;
    return (formulaItems || []).some(isPpBMaterial);
  }, [selectedFormula, formulaItems]);

  // Filtro de extrusoras autorizadas: OCULTA máquinas incompatibles (Fase 3 Validación PDF)
  const { availableExtruders, suggestedExtruder } = useMemo(() => {
    if (!selectedFormula || machines.length === 0) {
      return { availableExtruders: machines, suggestedExtruder: machines[0] || null };
    }

    const filtered = machines.filter((ext: any) => {
      // 2. Hard-block Extrusora 4: PROHIBIDO Polipropileno B (por fórmula o por silo con lote B)
      if (ext.id === 4) {
        if (hasPpbInFormula) return false;
        if (ext.modo_silo && ext.silo) {
          const sLotType = (ext.silo.current_lot_type || '').toUpperCase();
          const sLotNum = (ext.silo.current_lot_number || '').toUpperCase();
          if (sLotType === 'B' || sLotNum.includes('B')) return false;
        }
      }

      // 3. Matriz técnica de compatibilidad (extrusoras_formulas)
      if (ext.has_formula_matrix) {
        const isMatched = ext.compatible_formulas.some((cf: any) => 
          cf.id === selectedFormula.id || cf.code === selectedFormula.code
        );
        if (!isMatched) return false;
      } else {
        // Conserva la compatibilidad histórica hasta que el cliente configure la matriz.
        if (selectedFormula.allowed_extruders && Array.isArray(selectedFormula.allowed_extruders) && selectedFormula.allowed_extruders.length > 0) {
        if (!selectedFormula.allowed_extruders.map(Number).includes(ext.id)) return false;
        }
        if (selectedFormula.restricted_extruders && Array.isArray(selectedFormula.restricted_extruders)) {
          if (selectedFormula.restricted_extruders.map(Number).includes(ext.id)) return false;
        }
      }

      return true;
    });

    // Sugerencia inteligente de máquina compatible
    const fCode = (selectedFormula?.code || '').toUpperCase();
    const fName = (selectedFormula?.name || '').toUpperCase();
    let suggested = filtered.find((ext: any) => {
      if (ext.id === 1 && (fCode.includes('-1-') || fCode.includes('-01-') || fName.includes('EXTRUSORA 1'))) return true;
      if (ext.id === 2 && (fCode.includes('-2-') || fName.includes('EXTRUSORA 2'))) return true;
      if (ext.id === 4 && (fCode.includes('-4-') || fName.includes('EXTRUSORA 4'))) return true;
      if (ext.id === 5 && (fCode.includes('-5-') || fName.includes('EXTRUSORA 5'))) return true;
      return false;
    });

    if (!suggested && filtered.length > 0) {
      suggested = filtered.reduce((best: any, curr: any) => {
        const queueCurr = queueGroups.find((g: any) => g.machine?.id === curr.id);
        const queueBest = queueGroups.find((g: any) => g.machine?.id === best.id);
        const waitingCurr = queueCurr?.waiting?.length || 0;
        const waitingBest = queueBest?.waiting?.length || 0;
        return waitingCurr < waitingBest ? curr : best;
      }, filtered[0]);
    }

    return {
      availableExtruders: filtered,
      suggestedExtruder: suggested || filtered[0] || null
    };
  }, [selectedFormula, machines, hasPpbInFormula, queueGroups]);

  // Actualizar extrusora seleccionada con la sugerencia al cambiar fórmula
  useEffect(() => {
    if (suggestedExtruder && (!selectedExtruderId || !availableExtruders.some((e: any) => e.id === selectedExtruderId))) {
      setSelectedExtruderId(suggestedExtruder.id);
    }
  }, [suggestedExtruder, availableExtruders, selectedExtruderId]);

  // Extrusora seleccionada actualmente con detalles de Silo
  const selectedMachine = useMemo(() => {
    return machines.find((m: any) => m.id === Number(selectedExtruderId)) || suggestedExtruder || null;
  }, [machines, selectedExtruderId, suggestedExtruder]);

  const isSelectedMachineSilo = Boolean(selectedMachine?.modo_silo);

  // En modo silo, el PP no se dosifica en mezclado; solo se prepara el Kit de Aditivos
  const nonPpIngredientsKg = useMemo(() => {
    return (formulaItems || [])
      .filter((i: any) => !isPpMaterial(i))
      .reduce((sum: number, i: any) => sum + Number(i.required_quantity || 0), 0);
  }, [formulaItems]);

  const effectiveTargetKg = isSelectedMachineSilo && nonPpIngredientsKg > 0
    ? Number(nonPpIngredientsKg.toFixed(2))
    : batchTargetKg;

  // Suma total escaneada
  const totalScannedKg = inputs.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const isBatchBalanced = Math.abs(totalScannedKg - effectiveTargetKg) < 0.05;
  const progressPercent = Math.min(100, Math.round((totalScannedKg / (effectiveTargetKg || 1)) * 100));

  // Mapa de insumos dosificados por material_id
  const dosedByMaterial = useMemo(() => {
    const map: Record<number, number> = {};
    for (const inp of inputs) {
      if (inp.material_id) {
        map[inp.material_id] = (map[inp.material_id] || 0) + Number(inp.quantity || 0);
      }
    }
    return map;
  }, [inputs]);

  // Conjunto de QRs ya dosificados en este batch
  const scannedQrCodesSet = useMemo(() => {
    return new Set(inputs.map(i => (i.qr_code || '').trim().toUpperCase()));
  }, [inputs]);

  // Helper para obtener la cola de sacos FIFO disponibles y el siguiente saco prioritario no agregado
  const getMaterialFifoState = (matId: number) => {
    const item = (formulaItems || []).find((it: any) => Number(it.material_id) === Number(matId));
    if (!item) return { remainingFifoList: [], nextFifoSack: null, totalFifoAvailable: 0 };
    const allFifo = Array.isArray(item.fifo_qrs) ? item.fifo_qrs : [];
    const remainingFifoList = allFifo.filter((f: any) => !scannedQrCodesSet.has((f.qr_code || '').trim().toUpperCase()));
    const nextFifoSack = remainingFifoList[0] || null;
    const totalFifoAvailable = remainingFifoList.reduce((acc: number, f: any) => acc + (Number(f.amount) || 0), 0);
    return { remainingFifoList, nextFifoSack, totalFifoAvailable };
  };

  // Abrir escáner para un material específico o general (predeterminadamente abre la cámara)
  const handleOpenScanner = (mat?: {
    id: number;
    name: string;
    required: number;
    suggested_fifo_qr?: string | null;
    suggested_fifo_amount?: number | null;
    fifo_qrs?: any[];
  }) => {
    if (mat) {
      const alreadyDosed = dosedByMaterial[mat.id] || 0;
      const pending = Math.max(0, Number((mat.required - alreadyDosed).toFixed(2)));
      const { remainingFifoList, nextFifoSack } = getMaterialFifoState(mat.id);

      setTargetMaterialForScan({
        id: mat.id,
        name: mat.name,
        required: mat.required,
        pending,
        suggested_fifo_qr: nextFifoSack?.qr_code || mat.suggested_fifo_qr || null,
        suggested_fifo_amount: nextFifoSack ? Number(nextFifoSack.amount) : (mat.suggested_fifo_amount || null),
        fifo_qrs: remainingFifoList
      });
    } else {
      setTargetMaterialForScan(null);
    }
    setScannedQrInput('');
    setRecognizedChildQr(null);
    setCustomDoseQty('');
    setScanError(null);
    setIsScanModalOpen(true);
    setIsMixingCameraOpen(true);
  };

  // Sincronizar targetMaterialForScan con la última información de FIFO cuando se refrescan los detalles o cambian los inputs
  useEffect(() => {
    if (targetMaterialForScan && formulaDetails?.items) {
      const updatedItem = formulaDetails.items.find((it: any) => Number(it.material_id) === Number(targetMaterialForScan.id));
      if (updatedItem) {
        const { remainingFifoList, nextFifoSack } = getMaterialFifoState(targetMaterialForScan.id);
        const alreadyDosed = dosedByMaterial[targetMaterialForScan.id] || 0;
        const pending = Math.max(0, Number((targetMaterialForScan.required - alreadyDosed).toFixed(2)));

        setTargetMaterialForScan(prev => prev ? ({
          ...prev,
          pending,
          suggested_fifo_qr: nextFifoSack?.qr_code || null,
          suggested_fifo_amount: nextFifoSack ? Number(nextFifoSack.amount) : null,
          fifo_qrs: remainingFifoList
        }) : null);
      }
    }
  }, [formulaDetails, inputs, targetMaterialForScan?.id]);

  // Abrir modal de Orden de Consumo (ODC) hacia Almacén con insumos precargados y editables
  const handleOpenOdcModal = (mode: 'missing' | 'full' | 'single', singleItem?: any) => {
    if (!selectedFormula && !singleItem) {
      toast.warning('Selecciona una fórmula primero para cargar los materiales.');
      return;
    }

    if (mode === 'single' && singleItem) {
      if (isSelectedMachineSilo && isPpMaterial(singleItem)) {
        toast.warning(`Suministro por Silo: "${singleItem.material_name}" se alimenta directamente desde la tolva del ${selectedMachine?.silo?.name || 'Silo'}. No se requiere solicitar costales en ODC.`);
        return;
      }

      const req = Number(singleItem.required_quantity || 0);
      const wip = Math.max(0, Number(singleItem.available_wip_kg || 0));
      const missing = Math.max(0, Number((req - wip).toFixed(2)));
      const qty = missing > 0 ? missing : req;

      const preloaded: PreloadedOdcItem[] = [{
        material_id: singleItem.material_id,
        req_quantity: qty,
        material: {
          id: singleItem.material_id,
          name: singleItem.material_name,
          material_code: singleItem.material_code,
          description: `Faltan ${missing.toFixed(2)} kg en WIP Extrusión (Receta requiere ${req.toFixed(2)} kg)`
        },
        unit: { code: 'KG' },
        isConfirmed: false
      }];

      const notesStr = `Solicitud de insumo individual para Extrusión - Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. Material: ${singleItem.material_name}. Faltante en piso: ${missing.toFixed(2)} kg.`;

      setOdcInitialItems(preloaded);
      setOdcInitialNotes(notesStr);
      setIsOdcModalOpen(true);
      return;
    }

    if (mode === 'full' && hasSufficientIngredients) {
      toast.info('La fórmula ya cuenta con insumos suficientes en piso (WIP) para preparar la mezcla.');
      return;
    }

    let preloaded: PreloadedOdcItem[] = [];
    let notesStr = '';

    if (mode === 'full') {
      let itemsToLoad = formulaItems;
      // Fase 4: En modo_silo, Mezclado omite el PP en la ODC. Solo pide aditivos -> genera Kit de Aditivos
      if (isSelectedMachineSilo) {
        itemsToLoad = itemsToLoad.filter((item: any) => !isPpMaterial(item));
      }

      preloaded = itemsToLoad.map((item: any) => {
        const req = Number(item.required_quantity || 0);
        return {
          material_id: item.material_id,
          req_quantity: req,
          material: {
            id: item.material_id,
            name: item.material_name,
            material_code: item.material_code,
            description: `Receta: ${selectedFormula?.name || ''} - Requerido: ${req.toFixed(2)} kg`
          },
          unit: { code: 'KG' },
          isConfirmed: false
        };
      });

      notesStr = isSelectedMachineSilo
        ? `[MODO SILO]: Solicitud de Kit de Aditivos para Extrusión - Máquina: ${selectedMachine?.name || `Extrusora ${selectedExtruderId}`} (Tolva conectada a ${selectedMachine?.silo?.name || 'Silo PP'}). Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. El Polipropileno se abastece directo de silo.`
        : `Solicitud de batch completo (500kg) para Extrusión - Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}.`;
    } else {
      // Mode 'missing': insumos faltantes de la fórmula (donde el stock WIP es insuficiente)
      let candidateItems = formulaItems.filter((i: any) => !i.is_sufficient);
      if (candidateItems.length === 0) candidateItems = formulaItems;

      // En modo silo, no solicitar PP faltante en ODC pues se alimenta de tolva
      if (isSelectedMachineSilo) {
        candidateItems = candidateItems.filter((item: any) => !isPpMaterial(item));
      }

      preloaded = candidateItems.map((item: any) => {
        const req = Number(item.required_quantity || 0);
        const wip = Math.max(0, Number(item.available_wip_kg || 0));
        const missing = Math.max(0, Number((req - wip).toFixed(2)));
        const qty = req > 0 ? req : missing;

        return {
          material_id: item.material_id,
          req_quantity: qty,
          material: {
            id: item.material_id,
            name: item.material_name,
            material_code: item.material_code,
            description: wip > 0
              ? `Requerido para receta: ${req.toFixed(2)} kg (En piso WIP hay ${wip.toFixed(2)} kg, faltan ${missing.toFixed(2)} kg)`
              : `Cantidad requerida por receta para crear la mezcla: ${req.toFixed(2)} kg`
          },
          unit: { code: 'KG' },
          isConfirmed: false
        };
      });

      notesStr = isSelectedMachineSilo
        ? `[MODO SILO]: Solicitud de insumos faltantes para Kit de Aditivos - Máquina: ${selectedMachine?.name || `Extrusora ${selectedExtruderId}`}. Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. PP omitido por alimentación automatizada.`
        : `Solicitud de insumos faltantes para Extrusión - Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. Insumos faltantes precargados con la cantidad necesaria para crear la mezcla.`;
    }

    if (isSelectedMachineSilo) {
      toast.info('Modo Silo activo: Se omitió el Polipropileno (PP) de la ODC. Solicitando únicamente Kit de Aditivos.');
    }

    setOdcInitialItems(preloaded);
    setOdcInitialNotes(notesStr);
    setIsOdcModalOpen(true);
  };

  // Validar código QR escaneado (estricto QR Hijo -SN)
  const handleValidateChildQr = async (qrToValidate?: string) => {
    const cleanQr = (qrToValidate || scannedQrInput).trim().toUpperCase();
    setScanError(null);

    if (!cleanQr) {
      setScanError('Por favor introduce o escanea un código QR.');
      return;
    }

    // 2. REGLA ESTRICTA: Solo reconocer QR Hijos (-SN) para preparación de mezclas
    if (!cleanQr.includes('-SN')) {
      const err = 'Código rechazado: Solo se admiten QRs Hijos (-SN) surtidos hacia el WIP de Extrusión. (Los QRs Padre o Lotes de almacén deben surtirse primero).';
      setScanError(err);
      toast.error(err);
      return;
    }

    setIsValidatingQr(true);
    try {
      const childData = await fetchWipChildQr(cleanQr);

      // Calcular cantidad sugerida inteligentemente y verificar pertenencia a receta
      const formulaItems = formulaDetails?.items || [];
      const matchingItem = formulaItems.find((it: any) => Number(it.material_id) === Number(childData.material_id));

      if (!matchingItem) {
        const err = `El material escaneado "${childData.material_name}" (${childData.material_code || 'S/C'}) no forma parte de la receta de esta fórmula.`;
        setScanError(err);
        toast.error(err);
        setRecognizedChildQr(null);
        return;
      }

      if (targetMaterialForScan && Number(childData.material_id) !== Number(targetMaterialForScan.id)) {
        toast.info(`Insumo detectado: "${childData.material_name}". Se sincronizó la dosificación a este insumo de la receta.`);
        const alreadyDosed = dosedByMaterial[childData.material_id] || 0;
        const pending = Math.max(0, Number(matchingItem.required_quantity) - alreadyDosed);
        setTargetMaterialForScan({
          id: matchingItem.material_id,
          name: matchingItem.material_name,
          required: Number(matchingItem.required_quantity),
          pending
        });
      }

      setRecognizedChildQr(childData);

      let suggestedQty = Number(childData.available_amount);
      if (matchingItem) {
        const alreadyDosed = dosedByMaterial[childData.material_id] || 0;
        const pending = Math.max(0, Number(matchingItem.required_quantity) - alreadyDosed);
        if (pending > 0 && pending < suggestedQty) {
          suggestedQty = Number(pending.toFixed(2));
        }
      }

      // Prellenar cantidad con opción a modificar
      setCustomDoseQty(suggestedQty);
      toast.success(`QR Hijo reconocido: ${childData.material_name} (${childData.available_amount} kg en WIP)`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || err.message || 'Error al validar QR Hijo.';
      setScanError(msg);
      toast.error(msg);
      setRecognizedChildQr(null);
      refetchFormulaDetails();
    } finally {
      setIsValidatingQr(false);
    }
  };

  // Confirmar y agregar insumo escaneado al batch
  const handleConfirmDose = () => {
    if (!recognizedChildQr) {
      toast.error('Primero debes validar un QR Hijo válido.');
      return;
    }

    const qty = Number(customDoseQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('La cantidad a dosificar debe ser mayor a 0 kg.');
      return;
    }

    if (qty > Number(recognizedChildQr.available_amount)) {
      toast.error(`La cantidad no puede superar las existencias del QR Hijo (${recognizedChildQr.available_amount} kg).`);
      return;
    }

    // Verificar si ya se escaneó este mismo QR en la lista actual
    const existingIndex = inputs.findIndex(i => (i.qr_code || '').trim().toUpperCase() === recognizedChildQr.qr_code.trim().toUpperCase());
    if (existingIndex >= 0) {
      toast.error(`El QR Hijo ${recognizedChildQr.qr_code} ya está agregado a esta mezcla.`);
      return;
    }

    const newInputs = [
      ...inputs,
      {
        qr_code: recognizedChildQr.qr_code,
        quantity: qty,
        material_id: recognizedChildQr.material_id,
        material_name: recognizedChildQr.material_name,
        material_code: recognizedChildQr.material_code
      }
    ];
    setInputs(newInputs);

    // Calcular estado restante del insumo dosificado
    const matId = recognizedChildQr.material_id;
    const formulaItem = (formulaItems || []).find((it: any) => Number(it.material_id) === Number(matId));
    const targetReq = Number(targetMaterialForScan?.required || formulaItem?.required_quantity || 0);
    const newAlreadyDosed = (dosedByMaterial[matId] || 0) + qty;
    const newPending = Math.max(0, Number((targetReq - newAlreadyDosed).toFixed(2)));

    // Obtener los siguientes sacos FIFO disponibles que no estén en newInputs
    const allFifo = Array.isArray(formulaItem?.fifo_qrs) ? formulaItem.fifo_qrs : [];
    const remainingFifo = allFifo.filter((f: any) => 
      !newInputs.some(inp => inp.qr_code.toUpperCase() === (f.qr_code || '').trim().toUpperCase())
    );
    const nextFifo = remainingFifo[0] || null;

    if (newPending > 0.05 && targetMaterialForScan) {
      // Aún falta material para completar la receta: mantener modal abierto y señalar el siguiente FIFO
      toast.info(`Dosificados ${qty} kg de ${recognizedChildQr.material_name}. Faltan ${newPending.toFixed(2)} kg. Señalando siguiente saco FIFO.`);
      
      setTargetMaterialForScan({
        ...targetMaterialForScan,
        pending: newPending,
        suggested_fifo_qr: nextFifo?.qr_code || null,
        suggested_fifo_amount: nextFifo ? Number(nextFifo.amount) : null,
        fifo_qrs: remainingFifo
      });
      setScannedQrInput('');
      setRecognizedChildQr(null);
      setCustomDoseQty('');
      setScanError(null);
    } else {
      // Insumo completado
      toast.success(`¡Insumo ${recognizedChildQr.material_name} completado al 100%! (${targetReq.toFixed(2)} kg dosificados).`);
      setIsScanModalOpen(false);
      setScannedQrInput('');
      setRecognizedChildQr(null);
      setCustomDoseQty('');
      setScanError(null);
      setTargetMaterialForScan(null);
    }
  };

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLinkedActivePti) {
      toast.error('Registra y enlaza un PTI activo a esta fórmula antes de preparar la mezcla.');
      return;
    }
    if (!formulaId) {
      toast.error('Selecciona una fórmula de extrusión.');
      return;
    }
    if (!selectedExtruderId) {
      toast.error('Selecciona la extrusora de destino para encolar la mezcla.');
      return;
    }
    if (inputs.length === 0) {
      toast.error('Debes agregar al menos un insumo escaneado con QR Hijo desde WIP.');
      return;
    }

    mutation.mutate({
      formula_id: formulaId,
      preparation_id: ticket?.id,
      container_count: containerCount,
      extruder_id: selectedExtruderId ? Number(selectedExtruderId) : undefined,
      inputs: inputs.map(i => ({ qr_code: i.qr_code, quantity: Number(i.quantity) })),
      notes: notes.trim() || undefined
    }, {
      onSuccess: (res: any) => {
        const data = res?.data || res;
        const createdContainers = data.containers || [];

        toast.success(`¡Mezcla registrada y encolada con éxito en Extrusora ${selectedExtruderId}!`);
        sendBrowserNotification(`Mezcla Registrada: Extrusora ${selectedExtruderId}`, {
          body: `Folio: ${data.folio || 'MIX-EXT'} | Fórmula: ${selectedFormula?.name || ''} | ${createdContainers.length || containerCount} contenedor(es) listos.`,
          icon: '/favicon.ico'
        });

        // Preparar y desplegar modal con las N etiquetas QR listas para imprimir
        setMixResultModalData({
          folio: data.folio || `MIX-EXT-${Date.now()}`,
          formula_name: selectedFormula?.name || 'Fórmula Extrusión',
          formula_code: selectedFormula?.code || '',
          total_quantity: Number(data.total_quantity || totalScannedKg || batchTargetKg),
          extruder_id: selectedExtruderId ? Number(selectedExtruderId) : null,
          containers: createdContainers.length > 0 ? createdContainers : [
            {
              container_number: 1,
              total_containers: 1,
              qr_code: data.destination_qr_code || `CONT-MIX-${Date.now()}`,
              capacity_kg: Number(data.total_quantity || totalScannedKg || batchTargetKg),
              formula_name: selectedFormula?.name || '',
              formula_code: selectedFormula?.code || '',
              folio: data.folio || '',
              extruder_id: selectedExtruderId ? Number(selectedExtruderId) : null
            }
          ]
        });
        setIsPrintModalOpen(true);

        // Limpiar formulario operativo
        setInputs([]);
        setNotes('');
        setContainerCount(1);
        // NOTA: No llamamos onSuccess() aquí porque desmontaría MixingTerminalForm
        // y destruiría el modal de impresión. onSuccess() se llama al cerrar el modal o finalizar.
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || err.message || 'Error al registrar la mezcla.';
        toast.error(msg);
      }
    });
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Alerta de Verificación de Materiales en el Área WIP (Extrusión) */}
      {formulaDetails && (
        <div className={`p-4 rounded-xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md ${
          allWipAvailable
            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-[#072417] dark:border-emerald-500/80 dark:text-emerald-100'
            : 'bg-amber-50 border-amber-400 text-amber-950 dark:bg-[#281706] dark:border-amber-500/80 dark:text-amber-100'
        }`}>
          <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 border shadow-sm ${
              allWipAvailable
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/25 border-amber-500/60 text-amber-700 dark:text-amber-300'
            }`}>
              <Icon name={allWipAvailable ? 'verified' : 'warning'} size={24} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className={`font-black text-sm uppercase tracking-wider ${
                  allWipAvailable
                    ? 'text-emerald-900 dark:text-emerald-300'
                    : 'text-amber-900 dark:text-amber-300'
                }`}>
                  {allWipAvailable
                    ? 'Materiales Suficientes en WIP Extrusión'
                    : 'Atención: Materiales Insuficientes en WIP Extrusión'}
                </h4>
                <Badge
                  variant={allWipAvailable ? 'success' : 'warning'}
                  className="font-mono text-[11px] font-black uppercase shrink-0 px-2.5 py-0.5 shadow-xs"
                >
                  {allWipAvailable ? 'Inventario OK' : 'Faltan Insumos'}
                </Badge>
              </div>
              <p className={`text-xs font-semibold leading-relaxed ${
                allWipAvailable
                  ? 'text-emerald-800 dark:text-emerald-100'
                  : 'text-amber-800 dark:text-amber-100'
              }`}>
                {allWipAvailable
                  ? (isSelectedMachineSilo
                      ? 'El área de Extrusión cuenta con aditivos suficientes en piso para preparar este Kit (PP en Silo).'
                      : 'El área de Extrusión cuenta con existencias suficientes en piso para completar este lote.')
                  : (isSelectedMachineSilo
                      ? 'Faltan aditivos en piso de Extrusión para preparar el Kit. Se requiere surtir Orden de Consumo (ODC) desde Almacén (PP omitido por alimentación en Silo).'
                      : 'Faltan existencias en piso de Extrusión para preparar la receta completa. Se requiere surtir Orden de Consumo (ODC) desde Almacén para los insumos marcados en rojo.')}
              </p>
            </div>
          </div>
          {!allWipAvailable && (
            <div className="shrink-0 w-full sm:w-auto flex sm:justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenOdcModal('missing')}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-xs gap-2 shadow-sm border border-amber-400/50 h-10 px-4 whitespace-nowrap transition-colors"
                title="Crear ODC hacia Almacén con los insumos faltantes de la fórmula (cantidades editables)"
              >
                <Icon name={isSelectedMachineSilo ? 'hub' : 'post_add'} size={17} />
                <span>{isSelectedMachineSilo ? 'Crear ODC de Kit (Modo Silo)' : 'Crear ODC hacia Almacén'}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Grid de 2 Columnas: Receta & Contenedor Destino vs Surtido de Materiales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Izquierda: Selección de Receta y Contenedor Destino */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            {/* Header del Card de Configuración */}
            <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <Icon name="science" size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground truncate">
                    1. Fórmula y Destino
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium truncate">
                    Lote y asignación a máquina
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {ticket ? (
                  <Badge variant="warning" className="font-mono text-xs font-bold px-2 py-0.5">
                    {ticket.folio}
                  </Badge>
                ) : (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    Lote Estándar
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* 1. Selector de Fórmula de Extrusión */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="menu_book" size={14} className="text-primary" />
                    <span>Fórmula de Extrusión *</span>
                  </label>
                  {selectedFormula?.code && (
                    <span className="font-mono text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                      {selectedFormula.code}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    required
                    value={formulaId}
                    onChange={(e) => setFormulaId(e.target.value)}
                    disabled={Boolean(ticket)}
                    className="w-full !h-11 bg-background border border-border rounded-lg pl-3 pr-10 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="" disabled>-- Seleccione Fórmula --</option>
                    {formulas.map((f: any) => (
                      <option
                        key={f.id}
                        value={f.id}
                        disabled={!registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(f.id) || Number(pti.id) === Number(f.output_pti_id))}
                      >
                        {f.code ? `[${f.code}] ` : ''}{f.name} ({f.batch_size_kg || 500} kg)
                        {!registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(f.id) || Number(pti.id) === Number(f.output_pti_id)) ? ' — REGISTRA PTI PARA PREPARAR' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <Icon name="expand_more" size={20} />
                  </div>
                </div>

                {selectedFormula && !hasLinkedActivePti && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Esta fórmula no tiene un PTI activo enlazado. Regístralo en el catálogo de Extrusión antes de preparar la mezcla.
                  </div>
                )}

                {/* Ficha Resumen de Parámetros de la Fórmula */}
                {selectedFormula && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-tight">
                        Lote Objetivo
                      </span>
                      <span className="font-mono text-xs font-black text-foreground">
                        {batchTargetKg} Kg
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-tight">
                        Factor Costo
                      </span>
                      <span className="font-mono text-xs font-black text-primary">
                        ×{Number(selectedFormula.cost_index || 1.15).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-tight">
                        Rendimiento
                      </span>
                      <span className="font-mono text-xs font-black text-foreground">
                        {selectedFormula.expected_yield_pieces || 4900} car.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Contenedores Destino (División Automática de los 500 Kg) */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="inventory_2" size={15} className="text-primary" />
                    <span>Contenedores Destino *</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 shrink-0">
                    <Icon name="auto_awesome" size={11} />
                    QR SISTEMA
                  </span>
                </div>

                {/* Panel de Distribución de Contenedores */}
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-3">
                  {/* Fila 1: Control de Cantidad (Stepper) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Cantidad de Contenedores:
                    </span>
                    <div className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-lg p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setContainerCount(prev => Math.max(1, prev - 1))}
                        disabled={containerCount <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-background border border-border/80 hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed font-black text-base transition-colors shadow-2xs"
                        title="Reducir un contenedor"
                      >
                        -
                      </button>
                      <span className="w-9 text-center font-mono font-black text-base text-foreground">
                        {containerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setContainerCount(prev => Math.min(10, prev + 1))}
                        disabled={containerCount >= 10}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-background border border-border/80 hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed font-black text-base transition-colors shadow-2xs"
                        title="Aumentar un contenedor"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Indicador de Reparto por Contenedor */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">
                        {containerCount === 1 ? 'Contenedor Único' : `Reparto por Contenedor (${containerCount})`}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-base font-black text-primary">
                          {(batchTargetKg / containerCount).toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">Kg c/u</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 border-l border-border/60 pl-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">
                        Lote Total
                      </span>
                      <span className="font-mono text-sm font-black text-foreground mt-0.5 block">
                        {batchTargetKg} Kg
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Botones de acceso rápido (Grid de 3 columnas para ajuste perfecto) */}
                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Presets Rápidos:</span>
                      <span className="font-mono text-primary font-black">
                        {containerCount} {containerCount === 1 ? 'Contenedor' : 'Contenedores'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 4].map(num => {
                        const isSelected = containerCount === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setContainerCount(num)}
                            className={`h-9 flex items-center justify-center gap-1.5 text-xs font-mono rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-black ring-1 ring-primary/40'
                                : 'bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border font-bold'
                            }`}
                            title={`Configurar en ${num} ${num === 1 ? 'contenedor' : 'contenedores'}`}
                          >
                            <span className="text-sm font-black">{num}</span>
                            <span className="text-[11px] font-medium opacity-85">
                              {num === 1 ? 'cont.' : 'conts.'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 px-0.5">
                  <Icon name="info" size={13} className="text-primary shrink-0" />
                  <span>El sistema dividirá los {batchTargetKg} kg y generará {containerCount} etiqueta(s) QR.</span>
                </p>
              </div>

              {/* 3. Extrusora Destino con Sugerencia Inteligente y Restricciones */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="precision_manufacturing" size={15} className="text-primary" />
                    <span>Extrusora Destino (Encolado) *</span>
                  </label>
                  {suggestedExtruder && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                      <Icon name="stars" size={12} className="text-amber-500 shrink-0" />
                      Sugerida: {suggestedExtruder.name}
                    </span>
                  )}
                </div>

                {availableExtruders.length === 0 ? (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                    <Icon name="block" size={16} className="shrink-0 text-red-500" />
                    <span>Receta incompatible: Ninguna extrusora cumple los requerimientos de la matriz técnica para esta fórmula.</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      required
                      value={selectedExtruderId}
                      onChange={(e) => setSelectedExtruderId(Number(e.target.value))}
                      className="w-full !h-11 bg-background border border-border rounded-lg pl-3 pr-10 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      {availableExtruders.map((ext: any) => {
                        const isSuggested = suggestedExtruder?.id === ext.id;
                        const modeLabel = ext.modo_silo ? `[Silo: ${ext.silo?.code || 'PP'}]` : '[Manual]';
                        return (
                          <option key={ext.id} value={ext.id}>
                            {ext.name} {isSuggested ? '★ [Sugerida]' : ''} — {modeLabel} {ext.type}
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <Icon name="expand_more" size={20} />
                    </div>
                  </div>
                )}

                {/* Ficha Informativa del Modo Operativo (Silo vs Manual) */}
                {selectedMachine && (
                  <div className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    isSelectedMachineSilo
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                      : 'bg-muted/40 border-border text-foreground'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Icon name={isSelectedMachineSilo ? 'hub' : 'handyman'} size={15} className={isSelectedMachineSilo ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-500'} />
                        <span>{isSelectedMachineSilo ? 'Alimentación por Silo Automatizado' : 'Alimentación Manual (Costales)'}</span>
                      </span>
                      <Badge variant={isSelectedMachineSilo ? 'success' : 'outline'} className="text-[10px] font-bold font-mono">
                        {isSelectedMachineSilo ? 'MODO SILO' : 'MODO MANUAL'}
                      </Badge>
                    </div>

                    {isSelectedMachineSilo ? (
                      <div className="text-[11px] space-y-1 text-emerald-800 dark:text-emerald-300">
                        <p className="font-semibold">
                          Tolva conectada a <strong className="text-emerald-900 dark:text-emerald-100">{selectedMachine.silo?.name || 'Silo Principal PP'}</strong>
                          {selectedMachine.silo && (
                            <span className="font-mono ml-1">
                              ({Number(selectedMachine.silo.current_stock_kg || 0).toLocaleString()} kg disp. - Lote: {selectedMachine.silo.current_lot_number})
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Esta orden generará un &quot;QR de Kit de Aditivos&quot; ({effectiveTargetKg.toFixed(2)} kg). El Polipropileno se abastece directo de tolva y se descontará automáticamente en Extrusión.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground font-medium">
                        El operador debe solicitar y escanear la mezcla total ({batchTargetKg} kg: PP + Aditivos) surtida en costales.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Observaciones del Operador */}
              <div className="space-y-1.5 pt-3 border-t border-border/60">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Icon name="edit_note" size={15} className="text-muted-foreground" />
                  <span>Notas / Observaciones del Operador (Opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none font-medium placeholder:text-muted-foreground/50 transition-colors"
                  placeholder="Ej. Mezcla para Extrusora 1, aditivo UV reforzado..."
                />
              </div>
            </div>
          </div>

          {/* Barra de Progreso y Balance de Carga */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-bold flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Icon name="scale" size={16} className="text-primary" />
                {isSelectedMachineSilo ? 'Balance de Kit de Aditivos (Modo Silo)' : 'Balance de Carga Total (PP + Aditivos)'}
              </span>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isBatchBalanced
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : totalScannedKg > effectiveTargetKg
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}>
                {totalScannedKg.toFixed(2)} / {effectiveTargetKg.toFixed(2)} Kg ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/40">
              <div
                className={`h-full transition-all duration-300 ${
                  isBatchBalanced
                    ? 'bg-emerald-500'
                    : totalScannedKg > effectiveTargetKg
                    ? 'bg-red-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Insumos Requeridos y Surtido */}
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-foreground whitespace-nowrap shrink-0">
                <Icon name="checklist" size={18} className="text-primary shrink-0" />
                <span>2. Insumos Requeridos</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {formulaItems.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={hasSufficientIngredients || loadingDetails}
                    onClick={() => handleOpenOdcModal('full')}
                    className="gap-1.5 font-black text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-xs border border-amber-400/50 transition-all h-8 px-3 whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto"
                    title={
                      isSelectedMachineSilo
                        ? 'Solicitar el Kit de Aditivos hacia Almacén (el Polipropileno se abastece directo de tolva / Silo)'
                        : hasSufficientIngredients
                        ? 'La fórmula cuenta con insumos suficientes en piso (WIP) para preparar la mezcla'
                        : 'Solicitar la fórmula completa (batch de 500 kg) como Orden de Consumo hacia Almacén'
                    }
                  >
                    <Icon name={isSelectedMachineSilo ? 'hub' : 'local_shipping'} size={15} />
                    <span>{isSelectedMachineSilo ? 'Pedir Kit de Aditivos' : 'Pedir Fórmula Completa'}</span>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenScanner()}
                  className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs h-8 px-3 whitespace-nowrap shrink-0"
                  title="Abrir cámara para escanear QR Hijo (-SN)"
                >
                  <Icon name="photo_camera" size={15} />
                  <span>Escanear QR Hijo</span>
                </Button>
              </div>
            </div>

            {/* Tabla de Insumos Requeridos por Fórmula */}
            <div className="p-4 space-y-3">
              {loadingDetails ? (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Icon name="progress_activity" size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-semibold">Verificando materiales y existencias WIP...</span>
                </div>
              ) : formulaItems.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  Selecciona una fórmula para visualizar los insumos requeridos.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-xs">
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3.5 py-3 min-w-[260px]">Material</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap w-24">Requerido</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap w-28">Stock WIP</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap w-24">Dosificado</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap w-28">Estado</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap w-28">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {formulaItems.map((item: any) => {
                        const dosed = dosedByMaterial[item.material_id] || 0;
                        const req = Number(item.required_quantity || 0);
                        const wip = Number(item.available_wip_kg || 0);
                        const isSufficient = Boolean(item.is_sufficient);
                        const isComplete = Math.abs(dosed - req) < 0.05;
                        const isPartial = dosed > 0 && dosed < req - 0.05;
                        const isExcess = dosed > req + 0.05;
                        const isPp = isPpMaterial(item);
                        const isSiloItem = isPp && isSelectedMachineSilo;
                        const { remainingFifoList, nextFifoSack } = getMaterialFifoState(item.material_id);

                        return (
                          <tr key={item.id || item.material_id} className={`transition-colors ${isSiloItem ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-muted/20'}`}>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-xs block">{item.material_name}</span>
                                {isSiloItem && (
                                  <Badge variant="outline" className="font-mono text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    TOLVA SILO
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {item.material_code && (
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50 whitespace-nowrap">
                                    {item.material_code}
                                  </span>
                                )}
                                {isSiloItem ? (
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                    <Icon name="hub" size={11} />
                                    <span>Alimentación por Tolva ({selectedMachine?.silo?.name || 'Silo PP'})</span>
                                  </span>
                                ) : nextFifoSack ? (
                                  <span
                                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 whitespace-nowrap"
                                    title={`Próximo saco según orden FIFO en piso: ${nextFifoSack.qr_code} (${nextFifoSack.amount || 0} kg). Total disponibles en piso: ${remainingFifoList.length} sacos.`}
                                  >
                                    <Icon name="history" size={12} className="text-blue-500 shrink-0" />
                                    <span>FIFO: {nextFifoSack.qr_code}</span>
                                    {nextFifoSack.amount && (
                                      <span className="text-blue-800 dark:text-blue-200 font-black">({nextFifoSack.amount}k)</span>
                                    )}
                                    {remainingFifoList.length > 1 && (
                                      <span className="text-[9px] font-semibold text-blue-600/80 dark:text-blue-400/80 ml-1">
                                        +{remainingFifoList.length - 1} en cola
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/70 italic font-medium whitespace-nowrap">
                                    (Sin sacos en WIP)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap w-24">
                              {req.toFixed(2)} kg
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap w-28">
                              {isSiloItem ? (
                                <div>
                                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                                    Silo {selectedMachine?.silo?.code || 'PP'}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                                    Tolva Auto
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className={`font-mono text-xs font-bold block ${
                                    isSufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {wip.toFixed(2)} kg
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                                    isSufficient ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {isSufficient ? 'Disponible' : 'Insuficiente'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap w-24">
                              {isSiloItem ? (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
                                  Auto (Silo)
                                </span>
                              ) : (
                                <span className={
                                  isComplete
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isExcess
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : dosed > 0
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                }>
                                  {dosed.toFixed(2)} kg
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap w-28">
                              {isSiloItem ? (
                                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2 py-0.5">
                                  SILO ACTIVO
                                </Badge>
                              ) : isComplete ? (
                                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">COMPLETO</Badge>
                              ) : isPartial ? (
                                <Badge variant="warning" className="text-[10px] font-bold px-2 py-0.5">
                                  FALTAN {(req - dosed).toFixed(1)}k
                                </Badge>
                              ) : isExcess ? (
                                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5">EXCESO</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">PENDIENTE</Badge>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap w-28">
                              {isSiloItem ? (
                                <div 
                                  className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1.5 rounded-md border border-emerald-500/20"
                                  title="Alimentación automatizada por Tolva de Silo. Backflushing al reportar piezas en Extrusión."
                                >
                                  <Icon name="hub" size={13} />
                                  <span>Backflushing</span>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenScanner({
                                    id: item.material_id,
                                    name: item.material_name,
                                    required: req,
                                    suggested_fifo_qr: nextFifoSack?.qr_code || item.suggested_fifo_qr,
                                    suggested_fifo_amount: nextFifoSack ? Number(nextFifoSack.amount) : item.suggested_fifo_amount,
                                    fifo_qrs: remainingFifoList
                                  })}
                                  className="!h-8 px-3 text-xs font-bold gap-1.5 border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors whitespace-nowrap shrink-0 min-w-[92px] inline-flex items-center justify-center"
                                  title={
                                    nextFifoSack
                                      ? `Abrir escáner para registrar FIFO: ${nextFifoSack.qr_code} (${nextFifoSack.amount} kg)`
                                      : `Abrir escáner para escanear QR de ${item.material_name}`
                                  }
                                >
                                  <Icon name="photo_camera" size={14} className="text-primary shrink-0" />
                                  <span>Agregar</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Insumos Escaneados (Lista de QRs Hijos agregados) */}
            <div className="px-4 pb-4 pt-2.5 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Icon name="verified" size={15} className="text-emerald-500" />
                  QRs Hijos Agregados al Lote ({inputs.length})
                </span>
                <span className="text-xs font-mono font-bold text-foreground">
                  Subtotal: <span className="text-primary font-black">{totalScannedKg.toFixed(2)}</span> / {batchTargetKg.toFixed(2)} Kg
                </span>
              </div>

              <div className="border border-border rounded-xl bg-background max-h-[160px] overflow-y-auto overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left min-w-[520px]">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border sticky top-0 z-10 text-[10px] uppercase">
                    <tr>
                      <th className="px-3.5 py-2 min-w-[180px]">QR Hijo (-SN)</th>
                      <th className="px-3.5 py-2 min-w-[150px]">Material</th>
                      <th className="px-3.5 py-2 text-right whitespace-nowrap w-28">Dosificado</th>
                      <th className="px-3.5 py-2 text-center w-14">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inputs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-[11px]">
                          No hay insumos escaneados. Haz clic en "Escanear QR Hijo" o en "Agregar" en la tabla superior.
                        </td>
                      </tr>
                    ) : (
                      inputs.map((inp, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono font-bold text-foreground uppercase">
                            {inp.qr_code}
                          </td>
                          <td className="px-3 py-2 font-semibold text-foreground">
                            {inp.material_name || 'Insumo'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                            {Number(inp.quantity).toFixed(2)} kg
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeInput(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Eliminar insumo"
                            >
                              <Icon name="delete" size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Acciones y Guardado */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          {isBatchBalanced ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-bold">
              <Icon name="check_circle" size={16} />
              Batch balanceado ({totalScannedKg.toFixed(2)} Kg) — Listo para {containerCount} contenedor(es) en Extrusora {selectedExtruderId}
            </span>
          ) : totalScannedKg > batchTargetKg ? (
            <span className="inline-flex items-center gap-1.5 text-red-500 font-bold">
              <Icon name="warning" size={16} />
              Exceso de peso: +{(totalScannedKg - batchTargetKg).toFixed(2)} Kg por encima del objetivo ({batchTargetKg} Kg)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
              <Icon name="info" size={16} className="text-primary" />
              Faltan {(batchTargetKg - totalScannedKg).toFixed(2)} Kg para completar el lote de {batchTargetKg} Kg
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={mutation.isPending}
              className="w-full sm:w-auto font-bold h-11 px-5 border-border text-xs sm:text-sm"
            >
              Cancelar
            </Button>
          )}

          <Button
            type="submit"
            disabled={mutation.isPending || loadingFormulas || inputs.length === 0 || !formulaId || !selectedExtruderId || !hasLinkedActivePti}
            className="w-full sm:w-auto font-bold text-xs sm:text-sm h-11 px-6 gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mutation.isPending ? (
              <>
                <Icon name="progress_activity" size={18} className="animate-spin" />
                Registrando Mezcla...
              </>
            ) : (
              <>
                <Icon name="blender" size={18} />
                Registrar y Encolar Mezcla ({containerCount} Cont.)
              </>
            )}
          </Button>
        </div>
      </div>
      </form>

      {/* 2. Modal de Escaneo Exclusivo de QR Hijo (-SN) */}
      {isScanModalOpen && (
        <div 
          onClick={() => setIsScanModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col space-y-4 p-5 sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Icon name="qr_code_scanner" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground uppercase tracking-wide">
                    Escanear Insumo (QR Hijo)
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {targetMaterialForScan
                      ? `Dosificando para: ${targetMaterialForScan.name} (Faltan ${targetMaterialForScan.pending.toFixed(2)} kg)`
                      : 'Escaneo de saco/tarima con código QR Hijo (-SN)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Banner de Restricción Operativa */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/80 flex items-center gap-2">
              <Icon name="info" size={16} className="text-primary shrink-0" />
              <span>Esta estación solo reconoce <strong>QRs Hijos (-SN)</strong> con existencias activas en el área de Extrusión.</span>
            </div>

            {/* Alerta si el saco no cubre la totalidad faltante */}
            {targetMaterialForScan?.suggested_fifo_amount && targetMaterialForScan.suggested_fifo_amount < targetMaterialForScan.pending && !recognizedChildQr && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col gap-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <Icon name="warning" size={16} className="text-amber-600 shrink-0" />
                  <span>Capacidad insuficiente en un solo saco:</span>
                </div>
                <p className="text-foreground/80 text-[11px] leading-relaxed">
                  El próximo saco FIFO ({targetMaterialForScan.suggested_fifo_amount} kg) <strong>no cubre los {targetMaterialForScan.pending.toFixed(2)} kg faltantes</strong>. Al registrarlo, el sistema señalará automáticamente el siguiente saco en orden FIFO.
                </p>
              </div>
            )}

            {/* Banner de Prioridad FIFO si está disponible */}
            {targetMaterialForScan?.suggested_fifo_qr && !recognizedChildQr && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold min-w-0">
                  <div className="p-1.5 bg-blue-500/20 text-blue-600 rounded-lg shrink-0">
                    <Icon name="history" size={17} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block tracking-wider">
                      Saco Prioritario en Piso (FIFO):
                    </span>
                    <span className="font-mono font-bold text-foreground text-xs truncate block">
                      {targetMaterialForScan.suggested_fifo_qr} {targetMaterialForScan.suggested_fifo_amount ? `(${targetMaterialForScan.suggested_fifo_amount} kg)` : ''}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (targetMaterialForScan.suggested_fifo_qr) {
                      setScannedQrInput(targetMaterialForScan.suggested_fifo_qr);
                      handleValidateChildQr(targetMaterialForScan.suggested_fifo_qr);
                    }
                  }}
                  className="font-bold text-xs h-8 px-3 border-blue-400/60 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 shrink-0 shadow-xs"
                >
                  Usar este código
                </Button>
              </div>
            )}

            {/* Secuencia FIFO para cobertura total */}
            {targetMaterialForScan?.fifo_qrs && targetMaterialForScan.fifo_qrs.length > 1 && !recognizedChildQr && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Sacos disponibles en orden FIFO ({targetMaterialForScan.fifo_qrs.length} sacos):</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl border border-border/60 bg-muted/20 p-1.5">
                  {targetMaterialForScan.fifo_qrs.map((sack: any, sIdx: number) => {
                    const isCurrent = sack.qr_code === targetMaterialForScan.suggested_fifo_qr;
                    return (
                      <div
                        key={sack.qr_code || sIdx}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                          isCurrent
                            ? 'bg-blue-500/15 border border-blue-500/30 font-bold text-foreground'
                            : 'hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant={isCurrent ? 'default' : 'outline'}
                            className="text-[9px] font-mono h-5 px-1.5 shrink-0"
                          >
                            #{sIdx + 1}
                          </Badge>
                          <span className="font-mono text-xs truncate">
                            {sack.qr_code}
                          </span>
                          <span className="font-bold text-foreground shrink-0">
                            ({sack.amount} kg)
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setScannedQrInput(sack.qr_code);
                            handleValidateChildQr(sack.qr_code);
                          }}
                          className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 shrink-0"
                        >
                          {isCurrent ? 'Cargar Prioritario' : 'Cargar este'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input para escanear QR */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Código QR Hijo *
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setIsMixingCameraOpen(true)}
                  className="!h-11 px-3.5 font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1.5 border-2 border-border shrink-0"
                  title="Abrir cámara del dispositivo para escanear QR Hijo"
                >
                  <Icon name="photo_camera" size={18} className="text-primary" />
                  <span>Escanear</span>
                </Button>
                <div className="relative flex-1">
                  <Icon name="qr_code_2" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    autoFocus
                    value={scannedQrInput}
                    onChange={(e) => {
                      setScannedQrInput(e.target.value.toUpperCase());
                      setScanError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleValidateChildQr();
                      }
                    }}
                    placeholder="Ej. QR-LOT-PPA-...-SN1"
                    className="!h-11 !pl-11 font-mono uppercase font-bold text-sm bg-background border-border"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleValidateChildQr()}
                  disabled={isValidatingQr || !scannedQrInput.trim()}
                  className="!h-11 px-4 font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  {isValidatingQr ? (
                    <Icon name="progress_activity" size={18} className="animate-spin" />
                  ) : (
                    <Icon name="search" size={18} />
                  )}
                  <span>Verificar</span>
                </Button>

              </div>
            </div>

            {/* Error si no es QR Hijo o no existe */}
            {scanError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Icon name="error" size={16} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{scanError}</span>
                </div>
                {targetMaterialForScan?.suggested_fifo_qr && (
                  <div className="pt-2 border-t border-destructive/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-foreground text-[11px] font-semibold">
                      Siguiente saco activo según FIFO: <strong>{targetMaterialForScan.suggested_fifo_qr}</strong> {targetMaterialForScan.suggested_fifo_amount ? `(${targetMaterialForScan.suggested_fifo_amount} kg)` : ''}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (targetMaterialForScan.suggested_fifo_qr) {
                          setScannedQrInput(targetMaterialForScan.suggested_fifo_qr);
                          handleValidateChildQr(targetMaterialForScan.suggested_fifo_qr);
                        }
                      }}
                      className="h-7 px-2.5 text-xs font-bold border-destructive/40 hover:bg-destructive/15 text-foreground shrink-0 shadow-xs"
                    >
                      Cargar siguiente FIFO
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Información del QR Hijo Reconocido y Prellenado de Cantidad */}
            {recognizedChildQr && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                    <Icon name="check_circle" size={16} className="text-emerald-500" />
                    QR Hijo Validado con Éxito
                  </span>
                  <Badge variant="success" className="font-mono text-xs font-bold">
                    {recognizedChildQr.available_amount} KG EN WIP
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-background border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Material</span>
                    <span className="font-bold text-foreground block">{recognizedChildQr.material_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{recognizedChildQr.material_code}</span>
                  </div>
                  <div className="p-2.5 rounded bg-background border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Existencia en Saco</span>
                    <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {recognizedChildQr.available_amount} kg
                    </span>
                  </div>
                </div>

                {/* Prellenado y Edición de Cantidad */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Cantidad a Verter en Mezcla (Kg) *</span>
                    <span className="text-[10px] font-semibold text-primary">Editable / Parcializable</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max={recognizedChildQr.available_amount}
                      value={customDoseQty}
                      onChange={(e) => setCustomDoseQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="!h-11 font-mono font-bold text-base bg-background text-right border-border"
                    />
                  </div>

                  {/* Botones de selección rápida de cantidad */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCustomDoseQty(recognizedChildQr.available_amount)}
                      className="text-[11px] font-bold text-muted-foreground hover:text-primary underline"
                    >
                      Verter todo ({recognizedChildQr.available_amount} kg)
                    </button>
                    {targetMaterialForScan && targetMaterialForScan.pending > 0 && targetMaterialForScan.pending < recognizedChildQr.available_amount && (
                      <button
                        type="button"
                        onClick={() => setCustomDoseQty(Number(targetMaterialForScan.pending.toFixed(2)))}
                        className="text-[11px] font-bold text-muted-foreground hover:text-primary underline ml-2"
                      >
                        Verter restante de receta ({targetMaterialForScan.pending.toFixed(2)} kg)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción del Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScanModalOpen(false)}
                className="font-bold border-border"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDose}
                disabled={!recognizedChildQr || Number(customDoseQty) <= 0}
                className="font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <Icon name="add" size={18} />
                <span>Confirmar Dosificación</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de Cámara Industrial para Escanear QR Hijo */}
      {isMixingCameraOpen && (
        <CameraScanner
          title={targetMaterialForScan ? `Escanear: ${targetMaterialForScan.name}` : 'Escanear QR Hijo (-SN)'}
          subtitle={targetMaterialForScan?.suggested_fifo_qr ? `Prioridad FIFO: ${targetMaterialForScan.suggested_fifo_qr}` : undefined}
          expectedCode={targetMaterialForScan?.suggested_fifo_qr || undefined}
          onScan={(code: string) => {
            const clean = (code || '').trim().toUpperCase();
            setIsMixingCameraOpen(false);
            setScannedQrInput(clean);
            handleValidateChildQr(clean);
          }}
          onClose={() => setIsMixingCameraOpen(false)}
        />
      )}

      {/* Modal para Crear Orden de Consumo (ODC) hacia Almacén con Insumos Precargados y Editables */}
      <CreateConsumptionOrderModal
        isOpen={isOdcModalOpen}
        onClose={() => setIsOdcModalOpen(false)}
        initialItems={odcInitialItems}
        initialAreaId={2}
        initialNotes={odcInitialNotes}
        initialOrderMode="SUELTO"
        formulaName={selectedFormula?.name ? `${selectedFormula.name}${selectedFormula.code ? ` (${selectedFormula.code})` : ''}` : undefined}
        onOrderCreated={() => {
          refetchFormulaDetails();
          toast.success('Orden de Consumo generada hacia Almacén. Al ser surtida, el inventario WIP se actualizará automáticamente.');
        }}
      />

      {/* Modal de Impresión y Descarga de Etiquetas QR de Contenedores Generados */}
      <MixContainersPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setMixResultModalData(null);
          if (onSuccess) onSuccess();
        }}
        mixData={mixResultModalData}
        autoPrint={true}
        onNavigateToBoard={() => {
          setIsPrintModalOpen(false);
          setMixResultModalData(null);
          if (onSuccess) onSuccess();
          navigate('/extrusion/board');
        }}
      />
    </div>
  );
};
