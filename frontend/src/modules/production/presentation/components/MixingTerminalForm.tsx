import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Badge, Icon } from '@/design-system';
import { apiClient } from '@/core/api/apiClient';
import { getClientAllowedExtruders, getClientFormulaKind, isClientFormula } from '@/modules/extrusion/domain/clientFormulaRules';
import { getFormulaColorLabel } from '@/modules/extrusion/domain/colorRules';
import { useFormulas, useFormulaDetails, fetchWipChildQr, useMixFormula } from '../../../extrusion/hooks/useExtrusionMixing';
import { useExtruderQueuesQuery, usePtiProductsQuery } from '../../../extrusion/hooks/useExtrusionFloorQueries';
import { CameraScanner } from '@/design-system/components/scanner-overlay/CameraScanner';
import { CreateConsumptionOrderModal, PreloadedOdcItem } from '../../../warehouse/presentation/components/CreateConsumptionOrderModal';
import { MixContainersPrintModal, MixResultData } from './MixContainersPrintModal';
import { sendBrowserNotification } from '@/core/notifications/browserNotifications';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';

// Helpers de validación de materiales de Polipropileno
export const isPpMaterial = (item: any) => {
  const name = (item?.material_name || item?.material?.name || item?.name || '').toUpperCase();
  const code = (item?.material_code || item?.material?.material_code || item?.material?.internal_code || item?.internal_code || '').toUpperCase();
  return name.trim().startsWith('POLIPROPILENO') || name.trim() === 'PP' || name.trim().startsWith('PP ') || code.trim().startsWith('MP-PP');
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
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const { data: rawFormulas, isLoading: loadingFormulas } = useFormulas();
  const { data: queueGroups = [] } = useExtruderQueuesQuery();
  const { data: registeredPtis = [] } = usePtiProductsQuery({ is_active: true });
  const mutation = useMixFormula();

  // Catálogo de extrusoras y fórmulas compatibles; los silos se consultan aparte para el mezclador.
  const { data: machinesData } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/machines');
      return res.data?.data || res.data || [];
    }
  });

  // Consulta de Silos disponibles en planta (suministran a la Mezcladora)
  const { data: silosData = [] } = useQuery({
    queryKey: ['warehouse', 'silos', 'extrusion-feed'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouse/silos', { params: { purpose: 'EXTRUSION' } });
      return res.data?.data || res.data || [];
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });

  const machines: any[] = Array.isArray(machinesData) ? machinesData : [];
  const formulas: any[] = Array.isArray(rawFormulas)
    ? rawFormulas.filter((formula: any) => isClientFormula(formula.code) || Number(formula.id) === Number(ticket?.formula_id))
    : [];
  const silos: any[] = Array.isArray(silosData) ? silosData : [];
  const formulaColorOptions = useMemo(() => [...new Set(formulas
    .map((formula: any) => getFormulaColorLabel(formula))
    .filter((color): color is string => Boolean(color)))].sort((a, b) => a.localeCompare(b, 'es')),
  [formulas]);

  const [formulaId, setFormulaId] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  // 1. Selector de QRs para dividir un solo lote total entre N contenedores.
  const [containerCount, setContainerCount] = useState<number>(1);
  // 2. Extrusora seleccionada (sugerida automáticamente según compatibilidad y restricciones)
  const [selectedExtruderId, setSelectedExtruderId] = useState<number | 'AUTO'>('AUTO');

  // Modal para imprimir etiquetas QR generadas de los N contenedores
  const [mixResultModalData, setMixResultModalData] = useState<MixResultData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [isMixingCameraOpen, setIsMixingCameraOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Consulta de detalles de fórmula con verificación de inventario WIP en Extrusión (Área 2)
  const { data: formulaDetails, isLoading: loadingDetails, refetch: refetchFormulaDetails } = useFormulaDetails(formulaId);

  const formulaItems: any[] = formulaDetails?.items || [];

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
    ingredient_id?: number;
    allowed_material_ids?: number[];
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
      const ticketFormula = formulas.find((formula: any) => Number(formula.id) === Number(ticket.formula_id));
      setSelectedColor(getFormulaColorLabel(ticketFormula) || '');
      setNotes(`Atendiendo solicitud: ${ticket.folio}`);
    } else if (formulas.length > 0 && !formulaId) {
      const firstAvailable = formulas.find((formula: any) => registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(formula.id))) || formulas[0];
      setFormulaId(String(firstAvailable.id));
      setSelectedColor(getFormulaColorLabel(firstAvailable) || '');
    }
  }, [ticket, formulas, registeredPtis]);

  const formulasForSelectedColor = useMemo(() => selectedColor
    ? formulas.filter((formula: any) => getFormulaColorLabel(formula) === selectedColor)
    : formulas.filter((formula: any) => !getFormulaColorLabel(formula)),
  [formulas, selectedColor]);

  const selectedFormula = formulas.find((f: any) => String(f.id) === String(formulaId));
  const hasLinkedActivePti = Boolean(selectedFormula && registeredPtis.some((pti: any) =>
    Number(pti.formula_id) === Number(selectedFormula.id)
  ));
  const batchTargetKg = Number(formulaDetails?.batch_size_kg || selectedFormula?.batch_size_kg || 500);

  // Las fórmulas F-EXT-1 son exclusivas de la 1; el resto del catálogo del
  // cliente puede correrse en cualquier otra extrusora, sin restricción PP-B.
  const { availableExtruders, suggestedExtruder } = useMemo(() => {
    if (!selectedFormula || machines.length === 0) {
      return { availableExtruders: machines, suggestedExtruder: machines[0] || null };
    }

    const filtered = machines.filter((ext: any) => {
      const dynamicExtruderIds = machines.filter((machine: any) => machine.is_active !== false && machine.status === 'ACTIVE' && machine.is_dynamic_member).map((machine: any) => Number(machine.id));
      const clientAllowedExtruders = getClientAllowedExtruders(selectedFormula, dynamicExtruderIds);
      if (clientAllowedExtruders) return clientAllowedExtruders.includes(Number(ext.id));

      // Matriz técnica solo para fórmulas fuera del catálogo de estos PDF.
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
    const suggested = filtered.length > 0
      ? filtered.reduce((best: any, curr: any) => {
          const queueCurr = queueGroups.find((g: any) => Number(g.machine?.id) === Number(curr.id));
          const queueBest = queueGroups.find((g: any) => Number(g.machine?.id) === Number(best.id));
          const loadCurr = (queueCurr?.active?.length || 0) + (queueCurr?.waiting?.length || 0) + (queueCurr?.paused?.length || 0);
          const loadBest = (queueBest?.active?.length || 0) + (queueBest?.waiting?.length || 0) + (queueBest?.paused?.length || 0);
          return loadCurr < loadBest ? curr : best;
        }, filtered[0])
      : null;

    return {
      availableExtruders: filtered,
      suggestedExtruder: suggested || filtered[0] || null
    };
  }, [selectedFormula, machines, queueGroups]);

  // Actualizar extrusora seleccionada con la sugerencia al cambiar fórmula
  useEffect(() => {
    const autoAssignmentAllowed = !selectedFormula || isClientFormula(selectedFormula.code);
    if (selectedExtruderId === 'AUTO' && !autoAssignmentAllowed && suggestedExtruder) {
      setSelectedExtruderId(Number(suggestedExtruder.id));
    } else if (selectedExtruderId !== 'AUTO' && suggestedExtruder && (!selectedExtruderId || !availableExtruders.some((e: any) => Number(e.id) === Number(selectedExtruderId)))) {
      setSelectedExtruderId(suggestedExtruder.id);
    }
  }, [suggestedExtruder, availableExtruders, selectedExtruderId, selectedFormula?.code]);

  const selectedSilo = silos[0] || null;

  // Separación de ingredientes: Polipropileno (Silo a Mezcladora) vs Aditivos (QR Hijo -SN)
  const ppIngredients = useMemo(() => {
    return (formulaItems || []).filter((it: any) => isPpMaterial(it));
  }, [formulaItems]);
  const ppIngredient = ppIngredients[0] || null;
  const requiredKgPerBatch = (item: any) => Number(item?.required_quantity || 0);
  const ppRequiredKg = Number(ppIngredients.reduce((sum: number, item: any) => sum + requiredKgPerBatch(item), 0).toFixed(3));
  const ppSiloStockKg = Number(silos.reduce((sum: number, silo: any) => sum + (Number(silo.current_stock_kg) || 0), 0).toFixed(3));

  const nonPpIngredients = useMemo(() => {
    return (formulaItems || []).filter((it: any) => !isPpMaterial(it));
  }, [formulaItems]);

  const nonPpRequiredKg = useMemo(() => {
    return Number(nonPpIngredients.reduce((sum: number, it: any) => sum + requiredKgPerBatch(it), 0).toFixed(2));
  }, [nonPpIngredients]);

  // Las cantidades pertenecen al lote completo; elegir más QRs solo lo divide.
  const hasSufficientIngredients = nonPpIngredients.every((item: any) =>
    Number(item.available_wip_kg || 0) + 0.005 >= requiredKgPerBatch(item)
  );
  const allWipAvailable = hasSufficientIngredients;

  // Total de aditivos escaneados con QR Hijo
  const totalScannedNonPpKg = useMemo(() => {
    return inputs.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [inputs]);
  const totalScannedKg = totalScannedNonPpKg;

  // Verificación de stock en Silo para el PP de este lote
  const hasSufficientPpInSilo = useMemo(() => {
    return ppRequiredKg <= 0 || (silos.length === 2 && ppSiloStockKg + 0.0005 >= ppRequiredKg);
  }, [ppRequiredKg, ppSiloStockKg, silos.length]);

  // Validar cada aditivo por separado; un exceso en un material no debe
  // compensar el faltante de otro aunque el total de kg coincida.
  const isNonPpBalanced = nonPpIngredients.every((item: any) => {
    const allowedIds = new Set((item.allowed_material_ids || [item.material_id]).map(Number));
    const dosedForMaterial = inputs.reduce((sum, input) =>
      allowedIds.has(Number(input.material_id)) ? sum + (Number(input.quantity) || 0) : sum, 0);
    return Math.abs(dosedForMaterial - requiredKgPerBatch(item)) < 0.05;
  });

  const totalBatchKg = batchTargetKg;
  const weightPerContainerKg = Number((totalBatchKg / containerCount).toFixed(2));
  const isBatchBalanced = isNonPpBalanced && hasSufficientPpInSilo;
  const progressPercent = Math.min(100, Math.round(((ppRequiredKg + totalScannedNonPpKg) / (totalBatchKg || 1)) * 100));

  // Conjunto de QRs ya dosificados en este batch
  const scannedQrCodesSet = useMemo(() => {
    return new Set(inputs.map(i => (i.qr_code || '').trim().toUpperCase()));
  }, [inputs]);

  // Helper para obtener la cola de sacos FIFO disponibles y el siguiente saco prioritario no agregado
  const getMaterialFifoState = (materialOrIngredient: any) => {
    const isObject = materialOrIngredient !== null && typeof materialOrIngredient === 'object';
    const requestedId = isObject ? Number(materialOrIngredient.material_id ?? materialOrIngredient.id) : Number(materialOrIngredient);
    const ingredientId = isObject
      ? Number(materialOrIngredient.ingredient_id ?? (materialOrIngredient.required_quantity !== undefined ? materialOrIngredient.id : 0))
      : 0;
    const item = (formulaItems || []).find((it: any) =>
      (ingredientId > 0 && Number(it.id) === ingredientId) ||
      Number(it.material_id) === requestedId ||
      (it.allowed_material_ids || []).map(Number).includes(requestedId)
    );
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
    ingredient_id?: number;
    allowed_material_ids?: number[];
    name: string;
    required: number;
    suggested_fifo_qr?: string | null;
    suggested_fifo_amount?: number | null;
    fifo_qrs?: any[];
  }) => {
    if (mat) {
      if (isPpMaterial(mat)) {
        toast.info(`Alimentación Automática de Silo: "${mat.name}" se abastece directamente desde el Silo seleccionado hacia la Mezcladora. No requiere escaneo de QR.`);
        return;
      }

      const item = formulaItems.find((candidate: any) => Number(candidate.id) === Number(mat.ingredient_id || 0))
        || formulaItems.find((candidate: any) => Number(candidate.material_id) === Number(mat.id));
      const allowedIds = new Set((item?.allowed_material_ids || [mat.id]).map(Number));
      const alreadyDosed = inputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
      const pending = Math.max(0, Number((mat.required - alreadyDosed).toFixed(2)));
      const { remainingFifoList, nextFifoSack } = getMaterialFifoState(item || mat.id);

      setTargetMaterialForScan({
        id: mat.id,
        ingredient_id: item?.id,
        allowed_material_ids: item?.allowed_material_ids || [mat.id],
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
      const updatedItem = formulaDetails.items.find((it: any) =>
        Number(it.id) === Number(targetMaterialForScan.ingredient_id || 0) ||
        Number(it.material_id) === Number(targetMaterialForScan.id)
      );
      if (updatedItem) {
        const { remainingFifoList, nextFifoSack } = getMaterialFifoState(updatedItem);
        const allowedIds = new Set((updatedItem.allowed_material_ids || [updatedItem.material_id]).map(Number));
        const alreadyDosed = inputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
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
  }, [formulaDetails, inputs, targetMaterialForScan?.id, targetMaterialForScan?.ingredient_id]);

  // Abrir modal de Orden de Consumo (ODC) hacia Almacén con insumos precargados y editables
  const handleOpenOdcModal = (mode: 'missing' | 'full' | 'single', singleItem?: any) => {
    if (!selectedFormula && !singleItem) {
      toast.warning('Selecciona una fórmula primero para cargar los materiales.');
      return;
    }

    if (mode === 'single' && singleItem) {
      if (isPpMaterial(singleItem)) {
        toast.warning(`Alimentación por Silo: "${singleItem.material_name}" se alimenta directamente desde el ${selectedSilo?.name || 'Silo de PP'} por tubería hacia la Mezcladora. No se requiere solicitar costales en ODC.`);
        return;
      }

      const req = requiredKgPerBatch(singleItem);
      const wip = Math.max(0, Number(singleItem.physical_wip_kg ?? singleItem.available_wip_kg ?? 0));
      const missing = Math.max(0, Number((req - wip).toFixed(2)));
      if (missing <= 0) {
        const unscannable = Number(singleItem.unscannable_wip_kg || 0);
        toast.info(unscannable > 0.005
          ? `${singleItem.material_name}: hay ${unscannable.toFixed(2)} kg en WIP sin un QR hijo activo. No se creó una ODC duplicada; solicita corregir el QR/WIP existente.`
          : `${singleItem.material_name} ya tiene cobertura suficiente en WIP para esta mezcla.`);
        return;
      }

      const preloaded: PreloadedOdcItem[] = [{
        material_id: singleItem.material_id,
        eligible_material_ids: singleItem.allowed_material_ids || [singleItem.material_id],
        eligible_materials: singleItem.eligible_materials || [],
        equivalence_tag_id: singleItem.equivalence_tag_id || null,
        equivalence_tag_name: singleItem.equivalenceTag?.name || null,
        req_quantity: missing,
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
      // El PP se alimenta directamente desde el Silo hacia la Mezcladora. Solo pedimos aditivos en la ODC.
      const itemsToLoad = formulaItems.filter((item: any) => !isPpMaterial(item));

      preloaded = itemsToLoad.map((item: any) => {
        const req = requiredKgPerBatch(item);
        return {
          material_id: item.material_id,
          eligible_material_ids: item.allowed_material_ids || [item.material_id],
          eligible_materials: item.eligible_materials || [],
          equivalence_tag_id: item.equivalence_tag_id || null,
          equivalence_tag_name: item.equivalenceTag?.name || null,
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

      notesStr = `Solicitud de Aditivos para Mezcladora - Silo PP: ${selectedSilo?.name || 'Silo'}. Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. El Polipropileno se abastece directo de silo por tubería.`;
    } else {
      // El WIP cubre la fórmula con stock existente; solicitar solo el déficit
      // respecto al tamaño total de mezcla (incluye varias tandas/contendedores).
      const candidateItems = formulaItems
        .filter((item: any) => !isPpMaterial(item))
        .map((item: any) => {
          const req = requiredKgPerBatch(item);
          const wip = Math.max(0, Number(item.physical_wip_kg ?? item.available_wip_kg ?? 0));
          const missing = Math.max(0, Number((req - wip).toFixed(2)));
          return { item, req, wip, missing };
        })
        .filter(({ missing }) => missing > 0.005);

      if (candidateItems.length === 0) {
        const unscannableKg = formulaItems.reduce((sum: number, item: any) =>
          sum + (isPpMaterial(item) ? 0 : Number(item.unscannable_wip_kg || 0)), 0);
        toast.info(unscannableKg > 0.005
          ? `El stock físico cubre la receta, pero ${unscannableKg.toFixed(2)} kg no tienen un QR hijo activo. No se creó una ODC duplicada; hay que corregir el QR/WIP existente.`
          : 'No hay aditivos faltantes: el WIP disponible cubre todos los ingredientes no suministrados por silo.');
        return;
      }

      preloaded = candidateItems.map(({ item, req, wip, missing }: any) => {
        return {
          material_id: item.material_id,
          eligible_material_ids: item.allowed_material_ids || [item.material_id],
          eligible_materials: item.eligible_materials || [],
          equivalence_tag_id: item.equivalence_tag_id || null,
          equivalence_tag_name: item.equivalenceTag?.name || null,
          req_quantity: missing,
          material: {
            id: item.material_id,
            name: item.material_name,
            material_code: item.material_code,
            description: `Requerido para esta mezcla: ${req.toFixed(2)} kg. WIP disponible: ${wip.toFixed(2)} kg. Faltante a solicitar: ${missing.toFixed(2)} kg.`
          },
          unit: { code: 'KG' },
          isConfirmed: false
        };
      });

      notesStr = `Solicitud de aditivos faltantes para Mezcladora - Silo PP: ${selectedSilo?.name || 'Silo'}. Fórmula: ${selectedFormula?.name || ''} ${selectedFormula?.code ? `(${selectedFormula.code})` : ''}. PP omitido por alimentación directa desde Silo.`;
    }

    toast.info('Alimentación por Silo: Se omitió el Polipropileno (PP) de la ODC. Solicitando aditivos requeridos.');

    setOdcInitialItems(preloaded);
    setOdcInitialNotes(notesStr);
    setIsOdcModalOpen(true);
  };

  // Validar código QR escaneado (estricto QR Hijo -SN)
  const handleValidateChildQr = async (qrToValidate?: string) => {
    const scannedValue = (qrToValidate || scannedQrInput).trim();
    // Preserve the case-sensitive Base64 payload of encrypted system QR labels.
    const isEncryptedQr = /^AGY:/i.test(scannedValue);
    const cleanQr = isEncryptedQr ? `AGY:${scannedValue.slice(4)}` : scannedValue.toUpperCase();
    setScanError(null);

    if (!cleanQr) {
      setScanError('Por favor introduce o escanea un código QR.');
      return;
    }

    // 2. REGLA ESTRICTA: Solo reconocer QR Hijos (-SN) para preparación de mezclas
    if (!isEncryptedQr && !cleanQr.includes('-SN')) {
      const err = 'Código rechazado: Solo se admiten QRs Hijos (-SN) surtidos hacia el WIP de Extrusión. (Los QRs Padre o Lotes de almacén deben surtirse primero).';
      setScanError(err);
      toast.error(err);
      return;
    }

    setIsValidatingQr(true);
    try {
      const childData = await fetchWipChildQr(cleanQr);

      // Bloquear escaneo de Polipropileno (PP)
      if (isPpMaterial(childData)) {
        const err = `El Polipropileno "${childData.material_name}" se abastece directamente desde el Silo seleccionado hacia la Mezcladora. No requiere ni admite escaneo de QR.`;
        setScanError(err);
        toast.warning(err);
        setRecognizedChildQr(null);
        return;
      }

      // Calcular cantidad sugerida inteligentemente y verificar pertenencia a receta
      const formulaItems = formulaDetails?.items || [];
      const matchingItem = formulaItems.find((it: any) =>
        (it.allowed_material_ids || [it.material_id]).map(Number).includes(Number(childData.material_id))
      );

      if (!matchingItem) {
        const err = `El material escaneado "${childData.material_name}" (${childData.material_code || 'S/C'}) no forma parte de la receta de esta fórmula.`;
        setScanError(err);
        toast.error(err);
        setRecognizedChildQr(null);
        return;
      }

      if (targetMaterialForScan && Number(matchingItem.id) !== Number(targetMaterialForScan.ingredient_id || 0)) {
        toast.info(`Insumo detectado: "${childData.material_name}". Se sincronizó la dosificación a este insumo de la receta.`);
        const allowedIds = new Set((matchingItem.allowed_material_ids || [matchingItem.material_id]).map(Number));
        const alreadyDosed = inputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
        const pending = Math.max(0, requiredKgPerBatch(matchingItem) - alreadyDosed);
        setTargetMaterialForScan({
          id: matchingItem.material_id,
          ingredient_id: matchingItem.id,
          allowed_material_ids: matchingItem.allowed_material_ids || [matchingItem.material_id],
          name: matchingItem.material_name,
          required: requiredKgPerBatch(matchingItem),
          pending
        });
      }

      setRecognizedChildQr(childData);

      let suggestedQty = Number(childData.available_amount);
      if (matchingItem) {
        const allowedIds = new Set((matchingItem.allowed_material_ids || [matchingItem.material_id]).map(Number));
        const alreadyDosed = inputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
        const pending = Math.max(0, requiredKgPerBatch(matchingItem) - alreadyDosed);
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

    // Un QR puede aportar en más de una dosificación del mismo borrador.
    // Se acumula en una sola línea y se valida contra el saldo total del saco.
    const existingIndex = inputs.findIndex(i => (i.qr_code || '').trim().toUpperCase() === recognizedChildQr.qr_code.trim().toUpperCase());
    const previousQrQuantity = existingIndex >= 0 ? Number(inputs[existingIndex].quantity) || 0 : 0;
    const combinedQrQuantity = Number((previousQrQuantity + qty).toFixed(3));
    if (combinedQrQuantity > Number(recognizedChildQr.available_amount) + 0.005) {
      const remainingOnQr = Math.max(0, Number((Number(recognizedChildQr.available_amount) - previousQrQuantity).toFixed(2)));
      toast.error(`Este QR ya aporta ${previousQrQuantity.toFixed(2)} kg. Solo puedes agregar ${remainingOnQr.toFixed(2)} kg más (disponible total: ${Number(recognizedChildQr.available_amount).toFixed(2)} kg).`);
      return;
    }

    const updatedInput = {
      qr_code: recognizedChildQr.qr_code,
      quantity: combinedQrQuantity,
      material_id: recognizedChildQr.material_id,
      material_name: recognizedChildQr.material_name,
      material_code: recognizedChildQr.material_code
    };
    const newInputs = existingIndex >= 0
      ? inputs.map((input, index) => index === existingIndex ? updatedInput : input)
      : [...inputs, updatedInput];
    setInputs(newInputs);

    // Calcular estado restante del insumo dosificado
    const matId = recognizedChildQr.material_id;
    const formulaItem = (formulaItems || []).find((it: any) =>
      (it.allowed_material_ids || [it.material_id]).map(Number).includes(Number(matId))
    );
    const targetReq = Number(targetMaterialForScan?.required || requiredKgPerBatch(formulaItem));
    const allowedIds = new Set((formulaItem?.allowed_material_ids || [matId]).map(Number));
    const newAlreadyDosed = newInputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
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
    if (formulaColorOptions.length > 0 && !selectedColor) {
      toast.error('Selecciona el color de producción para cargar su receta y masterbatch correctos.');
      return;
    }
    if (selectedFormula && getFormulaColorLabel(selectedFormula) !== selectedColor) {
      toast.error('El color seleccionado no corresponde a la fórmula elegida.');
      return;
    }
    if (availableExtruders.length === 0) {
      toast.error('No hay una extrusora compatible activa para esta fórmula.');
      return;
    }
    if (ppRequiredKg > 0 && !hasSufficientPpInSilo) {
      toast.error(`Stock insuficiente o configuración incompleta de silos: se requieren 2 silos activos y ${ppRequiredKg} kg de PP; hay ${ppSiloStockKg} kg disponibles.`);
      return;
    }
    if (nonPpRequiredKg > 0 && inputs.length === 0) {
      toast.error('Debes agregar al menos un insumo de aditivos escaneado con QR Hijo desde WIP.');
      return;
    }

    mutation.mutate({
      formula_id: formulaId,
      output_color: getFormulaColorLabel(selectedFormula) || undefined,
      // El backend distribuye el consumo entre ambos silos por stock disponible.
      silo_inputs: [],
      preparation_id: ticket?.id,
      container_count: containerCount,
      extruder_id: selectedExtruderId === 'AUTO' ? undefined : Number(selectedExtruderId),
      inputs: inputs.map(i => ({ qr_code: i.qr_code, quantity: Number(i.quantity) })),
      notes: notes.trim() || undefined
    }, {
      onSuccess: (res: any) => {
        const data = res?.data || res;
        const createdContainers = data.containers || [];
        const assignedExtruderId = Number(data.extruder_id || (selectedExtruderId === 'AUTO' ? 0 : selectedExtruderId)) || null;
        const assignedExtruderName = machines.find((machine: any) => Number(machine.id) === assignedExtruderId)?.name || (assignedExtruderId ? `Extrusora ${assignedExtruderId}` : 'sin asignación');

        toast.success(`¡Mezcla registrada y encolada con éxito en ${assignedExtruderName}!`);
        sendBrowserNotification(`Mezcla Registrada: ${assignedExtruderName}`, {
          body: `Folio: ${data.folio || 'MIX-EXT'} | Fórmula: ${selectedFormula?.name || ''} | ${createdContainers.length || containerCount} contenedor(es) listos.`,
          icon: '/favicon.ico'
        });

        // Preparar y desplegar modal con las N etiquetas QR listas para imprimir
        setMixResultModalData({
          folio: data.folio || `MIX-EXT-${Date.now()}`,
          formula_name: selectedFormula?.name || 'Fórmula Extrusión',
          formula_code: selectedFormula?.code || '',
          total_quantity: Number(data.total_quantity || totalBatchKg),
          extruder_id: assignedExtruderId,
          containers: createdContainers.length > 0 ? createdContainers : [
            {
              container_number: 1,
              total_containers: 1,
              qr_code: data.destination_qr_code || `CONT-MIX-${Date.now()}`,
              capacity_kg: Number(data.total_quantity || totalBatchKg),
              formula_name: selectedFormula?.name || '',
              formula_code: selectedFormula?.code || '',
              folio: data.folio || '',
              extruder_id: assignedExtruderId
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
              <p className={`text-base font-semibold leading-relaxed ${
                allWipAvailable
                  ? 'text-emerald-800 dark:text-emerald-100'
                  : 'text-amber-800 dark:text-amber-100'
              }`}>
                {allWipAvailable
                  ? 'El área de Extrusión cuenta con aditivos suficientes en piso para preparar este lote (PP abastecido por Silo).'
                  : 'Faltan aditivos en piso para preparar la receta en la Mezcladora. Se requiere surtir Orden de Consumo (ODC) desde Almacén (PP abastecido por Silo).'}
              </p>
            </div>
          </div>
          {!allWipAvailable && (
            <div className="shrink-0 w-full sm:w-auto flex sm:justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenOdcModal('missing')}
                className="w-full min-h-12 sm:w-auto bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-base gap-2 shadow-sm border border-amber-400/50 px-4 whitespace-normal text-center leading-snug transition-colors"
                title="Crear ODC hacia Almacén con los aditivos faltantes de la fórmula (cantidades editables)"
              >
                <Icon name="post_add" size={17} />
                <span>Crear ODC de Aditivos hacia Almacén</span>
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
                  <h3 className="font-black text-base text-foreground truncate">
                    1. Fórmula y Destino
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium truncate">
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
                <label className="text-sm font-bold text-foreground flex items-center gap-2" htmlFor="mix-output-color">
                  <Icon name="palette" size={14} className="text-primary" />
                  Color de producción *
                </label>
                <select
                  id="mix-output-color"
                  required={formulaColorOptions.length > 0}
                  value={selectedColor}
                  disabled={Boolean(ticket) || formulaColorOptions.length === 0}
                  onChange={(event) => {
                    const nextColor = event.target.value;
                    setSelectedColor(nextColor);
                    const currentFormula = formulas.find((formula: any) => String(formula.id) === String(formulaId));
                    if (getFormulaColorLabel(currentFormula) !== nextColor) {
                      const nextFormula = formulas.find((formula: any) => getFormulaColorLabel(formula) === nextColor
                        && registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(formula.id)))
                        || formulas.find((formula: any) => getFormulaColorLabel(formula) === nextColor);
                      if (nextFormula) setFormulaId(String(nextFormula.id));
                    }
                  }}
                  className="w-full !h-11 bg-background border border-border rounded-lg px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:opacity-60"
                >
                  <option value="">-- Seleccione color --</option>
                  {formulaColorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
                </select>
                {selectedColor && (
                  <p className="text-xs text-muted-foreground">
                    El color selecciona la fórmula y su masterbatch. La receta conserva sus cantidades aprobadas.
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
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
                    {formulasForSelectedColor.map((f: any) => (
                      <option
                        key={f.id}
                        value={f.id}
                        disabled={!registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(f.id))}
                      >
                        {f.code ? `[${f.code}] ` : ''}{f.name} ({f.batch_size_kg || 500} kg)
                        {!registeredPtis.some((pti: any) => Number(pti.formula_id) === Number(f.id)) ? ' — REGISTRA PTI PARA PREPARAR' : ''}
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

                {selectedFormula && formulaItems.some((item: any) => String(item.material_name || item.material?.name || '').toUpperCase().includes('MASTERBATCH')) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                    <span className="font-bold text-foreground">Masterbatch de {getFormulaColorLabel(selectedFormula) || 'la receta'}: </span>
                    {formulaItems.filter((item: any) => String(item.material_name || item.material?.name || '').toUpperCase().includes('MASTERBATCH'))
                      .map((item: any) => `${item.material_name || item.material?.name} (${Number(item.required_quantity || item.quantity || 0).toFixed(2)} kg)`)
                      .join(', ')}
                  </div>
                )}

                {/* Ficha Resumen de Parámetros de la Fórmula */}
                {selectedFormula && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-sm font-bold text-muted-foreground block leading-tight">
                        Lote Objetivo
                      </span>
                      <span className="font-mono text-xs font-black text-foreground">
                        {batchTargetKg} Kg
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-sm font-bold text-muted-foreground block leading-tight">
                        {allowCosts ? 'Factor Costo' : 'Esperado'}
                      </span>
                      <span className="font-mono text-xs font-black text-primary">
                        {allowCosts
                          ? `×${Number(selectedFormula.cost_index || 1.15).toFixed(2)}`
                          : `${selectedFormula.expected_yield_kg || 490} Kg`}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                      <span className="text-sm font-bold text-muted-foreground block leading-tight">
                        Rendimiento
                      </span>
                      <span className="font-mono text-xs font-black text-foreground">
                        {selectedFormula.expected_yield_pieces || 4900} car.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Contenedores Destino (división de un único lote) */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
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
                    aria-label="Reducir cantidad de contenedores"
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-md bg-background border border-border/80 hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-black text-xl transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    aria-label="Aumentar cantidad de contenedores"
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-md bg-background border border-border/80 hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-black text-xl transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Aumentar un contenedor"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Indicador de Reparto por Contenedor */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-muted-foreground block leading-tight">
                        {containerCount === 1 ? 'Contenedor de mezcla' : `${containerCount} contenedores de mezcla`}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-base font-black text-primary">
                          {weightPerContainerKg.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">kg c/u aprox.</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 border-l border-border/60 pl-3">
                      <span className="text-sm font-bold text-muted-foreground block leading-tight">
                        Lote Total
                      </span>
                      <span className="font-mono text-sm font-black text-foreground mt-0.5 block">
                        {totalBatchKg.toFixed(2)} Kg
                      </span>
                    </div>
                  </div>

                  {/* Fila 3: Botones de acceso rápido (Grid de 3 columnas para ajuste perfecto) */}
                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
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
                            className={`min-h-12 flex items-center justify-center gap-1.5 text-base font-mono rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                  <span>Se preparará un solo lote de {totalBatchKg.toFixed(2)} kg, dividido en {containerCount} contenedor(es) con QR propio. El último ajusta cualquier diferencia de redondeo.</span>
                </p>
              </div>

              {/* 3. Extrusora Destino con Sugerencia Inteligente y Restricciones */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
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
                      onChange={(e) => setSelectedExtruderId(e.target.value === 'AUTO' ? 'AUTO' : Number(e.target.value))}
                      className="w-full !h-11 bg-background border border-border rounded-lg pl-3 pr-10 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      {isClientFormula(selectedFormula?.code) && <option value="AUTO">Automática — menor carga en el grupo permitido</option>}
                      {availableExtruders.map((ext: any) => {
                        const isSuggested = suggestedExtruder?.id === ext.id;
                        return (
                          <option key={ext.id} value={ext.id}>
                            {ext.name} {isSuggested ? '★ [Sugerida]' : ''} — {ext.type}
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <Icon name="expand_more" size={20} />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Silo de Polipropileno (Alimentación Automática a Mezcladora) */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Icon name="propane_tank" size={15} className="text-primary" />
                    <span>Silos de Polipropileno (Alimentación a Mezcladora) *</span>
                  </label>
                  {selectedSilo && (
                    <Badge
                      variant={hasSufficientPpInSilo ? 'success' : 'destructive'}
                      className="text-[10px] font-mono font-bold shrink-0"
                    >
                      {hasSufficientPpInSilo ? '✅ AMBOS SILOS LISTOS' : '⚠️ REVISAR SILOS'}
                    </Badge>
                  )}
                </div>

                {silos.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Icon name="warning" size={16} className="shrink-0" />
                    <span>No hay silos designados para alimentar la mezcladora. En Control de Silos, edita y marca los dos silos físicos de PP.</span>
                  </div>
                ) : (
                  <div className={`p-3 rounded-xl border space-y-3 ${hasSufficientPpInSilo ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/40'}`}>
                    <div className="text-xs text-foreground">
                      Se requieren <strong>{ppRequiredKg.toFixed(2)} kg</strong> de PP. El sistema los distribuirá automáticamente entre ambos silos activos sin importar el tipo indicado en la receta.
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {silos.map((silo: any) => (
                        <div key={silo.id} className="rounded-lg bg-background/70 border border-border p-2 text-xs">
                          <strong>{silo.code} · {silo.name}</strong>
                          <div className="text-muted-foreground">Disponible: {Number(silo.current_stock_kg || 0).toLocaleString()} kg</div>
                        </div>
                      ))}
                    </div>
                    <div className={`text-[11px] font-bold ${hasSufficientPpInSilo ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`}>
                      {silos.length !== 2 ? `Se requieren exactamente 2 silos activos; hay ${silos.length}.` : hasSufficientPpInSilo ? `Stock combinado: ${ppSiloStockKg.toLocaleString()} kg · Consumo equilibrado habilitado.` : `Stock combinado insuficiente: ${ppSiloStockKg.toLocaleString()} kg disponibles.`}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Observaciones del Operador */}
              <div className="space-y-1.5 pt-3 border-t border-border/60">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
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
                <span>Balance Mezcla Total (Silo PP + Aditivos)</span>
              </span>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isBatchBalanced
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}>
                {(ppRequiredKg + totalScannedNonPpKg).toFixed(2)} / {totalBatchKg.toFixed(2)} Kg ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/40">
              <div
                className={`h-full transition-all duration-300 ${
                  isBatchBalanced
                    ? 'bg-emerald-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-0.5">
              <span>PP del silo al mezclador: {ppRequiredKg.toFixed(2)} kg</span>
              <span>Aditivos WIP: {totalScannedNonPpKg.toFixed(2)} / {nonPpRequiredKg.toFixed(2)} kg</span>
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
                    onClick={() => handleOpenOdcModal('missing')}
                    className="gap-1.5 font-black text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-xs border border-amber-400/50 transition-all h-8 px-3 whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto"
                    title={
                      hasSufficientIngredients
                        ? 'La fórmula cuenta con insumos suficientes en piso (WIP) para preparar la mezcla'
                        : 'Solicitar los aditivos de la fórmula como Orden de Consumo hacia Almacén (el Polipropileno se abastece directo del Silo)'
                    }
                  >
                    <Icon name="local_shipping" size={15} />
                    <span>Pedir Aditivos Faltantes</span>
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
                        const allowedIds = new Set((item.allowed_material_ids || [item.material_id]).map(Number));
                        const dosed = inputs.reduce((sum, input) => allowedIds.has(Number(input.material_id)) ? sum + Number(input.quantity || 0) : sum, 0);
                        const req = requiredKgPerBatch(item);
                        const wip = Number(item.available_wip_kg || 0);
                        const physicalWip = Number(item.physical_wip_kg ?? wip);
                        const unscannableWip = Number(item.unscannable_wip_kg || 0);
                        const isSufficient = wip + 0.005 >= req;
                        const wipMissing = Math.max(0, Number((req - wip).toFixed(2)));
                        const isComplete = Math.abs(dosed - req) < 0.05;
                        const isExcess = dosed > req + 0.05;
                        const isPp = isPpMaterial(item);
                        const isSiloItem = isPp; // Polipropileno siempre se surte desde Silo a Mezcladora
                        const { remainingFifoList, nextFifoSack } = getMaterialFifoState(item);

                        return (
                          <tr key={item.id || item.material_id} className={`transition-colors ${isSiloItem ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-muted/20'}`}>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-xs block">{item.material_name}</span>
                                {isSiloItem && (
                                  <Badge variant="outline" className="font-mono text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    ALIMENTACIÓN POR SILO
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {item.material_code && (
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50 whitespace-nowrap">
                                    {item.material_code}
                                  </span>
                                )}
                                {item.equivalenceTag?.name && (
                                  <Badge variant="outline" className="text-[9px]">Equivalentes: {item.equivalenceTag.name}</Badge>
                                )}
                                {isSiloItem ? (
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                    <Icon name="hub" size={11} />
                                    <span>Tolva directa a Mezcladora ({selectedSilo?.name || 'Silo PP'})</span>
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
                                  <span className={`text-[10px] italic font-medium whitespace-nowrap ${physicalWip > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/70'}`}>
                                    {physicalWip > 0.005
                                      ? `(${unscannableWip.toFixed(2)} kg en WIP sin QR hijo activo)`
                                      : '(Sin sacos con QR en WIP)'}
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
                                  <span className={`font-mono text-xs font-bold block ${
                                    hasSufficientPpInSilo ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                                  }`}>
                                    {ppSiloStockKg.toLocaleString()} kg
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Disponible en ambos silos de PP
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
                                    {isSufficient ? 'Disponible con QR' : 'Disponible con QR insuficiente'}
                                  </span>
                                  {unscannableWip > 0.005 && (
                                    <span
                                      className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block"
                                      title={`${physicalWip.toFixed(2)} kg físicos en WIP; ${unscannableWip.toFixed(2)} kg no están respaldados por un QR hijo activo.`}
                                    >
                                      {unscannableWip.toFixed(2)} kg sin QR válido
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap w-24">
                              {isSiloItem ? (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
                                  {req.toFixed(2)} kg (Auto)
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
                                <Badge
                                  variant={hasSufficientPpInSilo ? 'success' : 'destructive'}
                                  className="text-[10px] font-bold px-2 py-0.5"
                                >
                                  {hasSufficientPpInSilo ? '✅ SILO LISTO' : '⚠️ SILO INSUF.'}
                                </Badge>
                              ) : isExcess ? (
                                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5">EXCESO</Badge>
                              ) : isComplete ? (
                                <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5">COMPLETO</Badge>
                              ) : dosed > 0.005 ? (
                                <Badge
                                  variant="warning"
                                  className="text-[10px] font-bold px-2 py-0.5"
                                  title={`Falta dosificar ${Math.max(0, req - dosed).toFixed(2)} kg. WIP requerido: ${req.toFixed(2)} kg; disponible: ${wip.toFixed(2)} kg.`}
                                >DOSIF. {Math.max(0, req - dosed).toFixed(2)} kg</Badge>
                              ) : wipMissing > 0.005 ? (
                                <Badge
                                  variant="warning"
                                  className="text-[10px] font-bold px-2 py-0.5"
                                  title={`Faltan ${wipMissing.toFixed(2)} kg en WIP (requerido ${req.toFixed(2)} kg - disponible ${wip.toFixed(2)} kg)`}
                                >
                                  FALTAN {wipMissing.toFixed(2)} kg
                                </Badge>
                              ) : (
                                <Badge
                                  variant="success"
                                  className="text-[10px] font-bold px-2 py-0.5"
                                  title={`WIP suficiente: ${wip.toFixed(2)} kg disponibles para ${req.toFixed(2)} kg requeridos.`}
                                >LISTO PARA DOSIFICAR</Badge>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap w-28">
                              {isSiloItem ? (
                                <div 
                                  className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1.5 rounded-md border border-emerald-500/20"
                                  title="Alimentación directa por tubería desde el Silo seleccionado hacia la Mezcladora. Sin escaneo de QR."
                                >
                                  <Icon name="hub" size={13} />
                                  <span>Tolva Activa</span>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenScanner({
                                    id: item.material_id,
                                    ingredient_id: item.id,
                                    allowed_material_ids: item.allowed_material_ids || [item.material_id],
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
                  Subtotal Aditivos: <span className="text-primary font-black">{totalScannedNonPpKg.toFixed(2)}</span> / {nonPpRequiredKg.toFixed(2)} Kg
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
              Mezcla balanceada ({totalBatchKg.toFixed(2)} kg totales: Silo PP + Aditivos) — Dividida en {containerCount} contenedor(es) para {selectedExtruderId === 'AUTO' ? 'asignación automática' : `Extrusora ${selectedExtruderId}`}
            </span>
          ) : !hasSufficientPpInSilo ? (
            <span className="inline-flex items-center gap-1.5 text-amber-500 font-bold">
              <Icon name="warning" size={16} />
              {silos.length !== 2
                ? `Configuración incompleta: se requieren 2 silos activos y se detectaron ${silos.length}.`
                : `Stock combinado insuficiente: se requieren ${ppRequiredKg.toFixed(3)} kg entre ambos silos y hay ${ppSiloStockKg.toFixed(3)} kg disponibles.`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
              <Icon name="info" size={16} className="text-primary" />
              Faltan {(nonPpRequiredKg - totalScannedNonPpKg).toFixed(2)} Kg de aditivos escaneados con QR Hijo
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
            disabled={mutation.isPending || loadingFormulas || !formulaId || (formulaColorOptions.length > 0 && !selectedColor) || !selectedExtruderId || availableExtruders.length === 0 || !hasLinkedActivePti || !isBatchBalanced || (nonPpRequiredKg > 0 && inputs.length === 0)}
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
