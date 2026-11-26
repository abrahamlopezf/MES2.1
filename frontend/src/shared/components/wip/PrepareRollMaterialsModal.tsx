import React, { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { Button, Badge } from '@/design-system';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Send,
  Loader2,
  FileText,
  Boxes,
} from '@/design-system/components/Icon/googleIconCompat';
import { toast } from 'sonner';

interface PrepareRollMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: 'GLOBO' | 'LAMINADO';
  roll: {
    id: number;
    roll_code: string;
    qr_code: string;
    meters: number;
    weight_kg: number;
    bom?: { id: number; code: string; name: string };
    loom?: { id: number; code: string; name: string };
  } | null;
  api: {
    assessRollMaterials: (payload: { roll_id: number; specification_id?: number }) => Promise<any>;
    createOdcForRoll: (payload: {
      roll_id: number;
      specification_id: number;
      missing_materials: any[];
      additional_materials?: Array<{ material_id: number; quantity: number }>;
      notes?: string;
    }) => Promise<any>;
  };
  onOdcCreated?: () => void;
}

export const PrepareRollMaterialsModal: React.FC<PrepareRollMaterialsModalProps> = ({
  isOpen,
  onClose,
  area,
  roll,
  api,
  onOdcCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [submittingOdc, setSubmittingOdc] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<number | null>(null);
  const [generatedOdc, setGeneratedOdc] = useState<any>(null);
  const [warehouseMaterials, setWarehouseMaterials] = useState<any[]>([]);
  const [loadingWarehouseMaterials, setLoadingWarehouseMaterials] = useState(false);
  const [warehouseMaterialsError, setWarehouseMaterialsError] = useState<string | null>(null);
  const [extraMaterialId, setExtraMaterialId] = useState('');
  const [extraMaterialQuantity, setExtraMaterialQuantity] = useState('');
  const [extraMaterials, setExtraMaterials] = useState<Array<{ material_id: number; quantity: number; material: any }>>([]);
  const [extraMaterialSearch, setExtraMaterialSearch] = useState('');

  const fetchAssessment = async (specId?: number) => {
    if (!roll) return;
    setLoading(true);
    try {
      const data = await api.assessRollMaterials({
        roll_id: roll.id,
        specification_id: specId || undefined,
      });
      setAssessment(data);
      if (data.specification?.id) {
        setSelectedSpecId(data.specification.id);
      }
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al evaluar materiales del rollo');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseMaterials = async () => {
    setLoadingWarehouseMaterials(true);
    setWarehouseMaterialsError(null);
    try {
      const response = await axiosClient.get('/warehouse/inventory', {
        params: { limit: 1000, include_fifo_packages: true },
      });
      const data = response.data?.data || response.data;
      const entries = (data?.items || data || []).filter((entry: any) =>
        entry?.inventory_source !== 'SILO'
        && Number(entry?.material_id) > 0
        && Number(entry?.amount || 0) > 0
        && entry?.material?.is_active !== false
      );
      const uniqueMaterials = new Map<number, any>();
      for (const entry of entries) {
        const id = Number(entry.material_id);
        const current = uniqueMaterials.get(id);
        if (!current || Number(entry.amount || 0) > Number(current.amount || 0)) uniqueMaterials.set(id, entry);
      }
      setWarehouseMaterials([...uniqueMaterials.values()]);
    } catch (error: any) {
      setWarehouseMaterialsError(error?.friendlyMessage || error?.message || 'No se pudo consultar el inventario de Almacén.');
    } finally {
      setLoadingWarehouseMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen && roll) {
      setGeneratedOdc(null);
      setExtraMaterials([]);
      setExtraMaterialId('');
      setExtraMaterialQuantity('');
      setExtraMaterialSearch('');
      fetchAssessment();
      fetchWarehouseMaterials();
    } else {
      setAssessment(null);
      setSelectedSpecId(null);
      setGeneratedOdc(null);
      setWarehouseMaterials([]);
      setExtraMaterials([]);
    }
  }, [isOpen, roll]);

  const handleSpecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const specId = Number(e.target.value);
    setSelectedSpecId(specId);
    fetchAssessment(specId);
  };

  const handleCreateOdc = async () => {
    if (!roll || !assessment || !selectedSpecId) return;
    const missingMaterials = assessment.missing_materials || [];
    if (missingMaterials.length === 0 && extraMaterials.length === 0) {
      toast.info('No hay faltantes. El inventario de WIP en piso es suficiente.');
      return;
    }

    setSubmittingOdc(true);
    try {
      const res = await api.createOdcForRoll({
        roll_id: roll.id,
        specification_id: selectedSpecId,
        missing_materials: missingMaterials,
        additional_materials: extraMaterials.map(({ material_id, quantity }) => ({ material_id, quantity })),
        notes: `ODC para ${area}: rollo ${roll.roll_code}; incluye faltantes de receta y materiales adicionales cuando aplique.`,
      });
      setGeneratedOdc(res.order);
      setExtraMaterials([]);
      toast.success(
        `Orden de Consumo ${res.order.order_number} generada exitosamente dirigida a Almacén.`
      );
      if (onOdcCreated) onOdcCreated();
      // Refrescar evaluación
      fetchAssessment(selectedSpecId);
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al generar Orden de Consumo');
    } finally {
      setSubmittingOdc(false);
    }
  };

  if (!isOpen || !roll) return null;

  const areaColor = area === 'GLOBO' ? 'cyan' : 'indigo';
  const normalizedExtraSearch = extraMaterialSearch.trim().toLocaleLowerCase();
  const extraMaterialOptions = warehouseMaterials.filter((entry: any) => {
    const material = entry.material || {};
    const haystack = `${material.name || ''} ${material.internal_code || ''} ${material.material_code || ''} ${material.description || ''}`.toLocaleLowerCase();
    return !normalizedExtraSearch || haystack.includes(normalizedExtraSearch);
  }).slice(0, 30);

  const addExtraMaterial = () => {
    const materialId = Number(extraMaterialId);
    const quantity = Number(extraMaterialQuantity);
    const entry = warehouseMaterials.find((item: any) => Number(item.material_id) === materialId);
    if (!entry || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Selecciona un material disponible e indica una cantidad mayor a cero.');
      return;
    }
    setExtraMaterials((current) => {
      const existing = current.find((item) => item.material_id === materialId);
      if (existing) return current.map((item) => item.material_id === materialId
        ? { ...item, quantity: Number((item.quantity + quantity).toFixed(3)) }
        : item);
      return [...current, { material_id: materialId, quantity, material: entry.material }];
    });
    setExtraMaterialId('');
    setExtraMaterialQuantity('');
    toast.success('Material adicional agregado a la ODC.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Industrial */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${areaColor}-600/20 border border-${areaColor}-500/40 text-${areaColor}-400`}>
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                Preparación de Materiales WIP — {area}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Rollo: <span className="font-mono font-bold text-white">{roll.roll_code}</span> | QR:{' '}
                <span className="font-mono text-slate-300">{roll.qr_code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenido Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Ficha Resumen del Rollo de Telar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Metros de Tela</span>
              <span className="text-xl font-mono font-black text-white">{Number(roll.meters).toFixed(0)} m</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Peso Neto</span>
              <span className="text-xl font-mono font-black text-emerald-400">
                {Number(roll.weight_kg).toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">BOM Telar</span>
              <span className="text-xs font-black text-slate-200 truncate block">
                {roll.bom?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Telar Origen</span>
              <span className="text-xs font-black text-slate-200">
                {roll.loom?.name || roll.loom?.code || 'Telar'}
              </span>
            </div>
          </div>

          {/* Selector de Especificación / Receta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-400" />
                Especificación / Receta Aplicable en {area}:
              </label>
              {assessment?.specification && (
                <span className="text-xs font-bold text-slate-400">
                  Tipo: <span className="text-white">{assessment.specification.process_type || 'Estándar'}</span>
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-12 bg-slate-800 animate-pulse rounded-xl" />
            ) : (
              <select
                value={selectedSpecId || ''}
                onChange={handleSpecChange}
                className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
              >
                {assessment?.compatible_specifications?.map((spec: any) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.code} — {spec.name} ({spec.process_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Estado de la Orden de Consumo si fue recién generada */}
          {generatedOdc && (
            <div className="p-4 rounded-xl bg-blue-950/60 border-2 border-blue-600 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm font-black uppercase text-white">
                    Orden de Consumo Generada Exitosamente: {generatedOdc.order_number}
                  </p>
                  <p className="text-xs text-blue-200">
                    Se solicitó a Almacén el despacho de insumos faltantes para custodia en WIP {area}.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-900 text-blue-200 border-blue-500 font-bold">
                {generatedOdc.status}
              </Badge>
            </div>
          )}

          {/* Matriz de Materiales de Almacén Requeridos vs Stock WIP */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-amber-400" />
                Balance de Insumos Requeridos vs WIP en Piso ({area}):
              </h3>
              {assessment && (
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                    assessment.all_materials_sufficient
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600'
                      : 'bg-amber-950/80 text-amber-400 border-amber-600'
                  }`}
                >
                  {assessment.all_materials_sufficient
                    ? '✔ WIP COMPLETO EN PISO'
                    : `⚠️ FALTANTE: ${assessment.total_missing_kg} kg`}
                </span>
              )}
            </div>

            <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/90 border-b border-slate-700 text-slate-300 font-black uppercase">
                    <th className="p-3">Insumo Requerido</th>
                    <th className="p-3 text-right">Ratio / Merma</th>
                    <th className="p-3 text-right">Requerido (kg)</th>
                    <th className="p-3 text-right">En WIP Piso (kg)</th>
                    <th className="p-3 text-right">Faltante (kg)</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
                        <span className="block mt-2 text-xs">Evaluando fórmulas y saldos de piso...</span>
                      </td>
                    </tr>
                  ) : assessment?.materials?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                        Esta especificación no requiere insumos de almacén adicionales.
                      </td>
                    </tr>
                  ) : (
                    assessment?.materials?.map((item: any) => (
                      <tr key={item.material_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans">
                          <span className="font-bold text-white block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.internal_code}</span>
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {item.consumption_per_unit} kg/u ({item.waste_percentage}%)
                        </td>
                        <td className="p-3 text-right font-black text-white">
                          {Number(item.required_kg).toFixed(3)}
                        </td>
                        <td className="p-3 text-right font-black text-slate-300">
                          {Number(item.available_wip_kg).toFixed(3)}
                        </td>
                        <td className="p-3 text-right font-black">
                          {item.missing_kg > 0 ? (
                            <span className="text-red-400">+{Number(item.missing_kg).toFixed(3)} kg</span>
                          ) : (
                            <span className="text-slate-500">0.000</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.is_sufficient ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold font-sans text-[11px]">
                              <CheckCircle2 className="h-4 w-4" /> En Piso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold font-sans text-[11px]">
                              <AlertTriangle className="h-4 w-4" /> Requiere ODC
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Materiales adicionales independientes de la receta */}
          <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4" aria-label="Materiales adicionales para ODC">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Materiales adicionales de Almacén</h3>
                <p className="mt-1 text-xs text-slate-400">Agrega insumos extra que requiera el proceso, aunque no estén en la receta. Se enviarán al WIP de {area}.</p>
              </div>
              {loadingWarehouseMaterials && <span className="text-xs text-slate-400">Consultando inventario…</span>}
            </div>
            {warehouseMaterialsError && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-600/50 bg-amber-950/30 p-3 text-xs text-amber-200">
                <span>{warehouseMaterialsError}</span>
                <button type="button" onClick={fetchWarehouseMaterials} className="rounded-md border border-amber-500/50 px-3 py-2 font-bold">Reintentar</button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
              <div className="relative">
                <label className="mb-1 block text-[11px] font-bold text-slate-300" htmlFor={`extra-material-search-${area}`}>Buscar material disponible</label>
                <input
                  id={`extra-material-search-${area}`}
                  value={extraMaterialSearch}
                  onChange={(event) => { setExtraMaterialSearch(event.target.value); setExtraMaterialId(''); }}
                  placeholder="Nombre o código de material"
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
                {extraMaterialSearch && !extraMaterialId && (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                    {extraMaterialOptions.length ? extraMaterialOptions.map((entry: any) => (
                      <button
                        type="button"
                        key={entry.material_id}
                        onClick={() => { setExtraMaterialId(String(entry.material_id)); setExtraMaterialSearch(`${entry.material?.name || 'Material'} · ${entry.material?.internal_code || entry.material_id}`); }}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs text-slate-100 hover:bg-slate-800"
                      >
                        <span className="min-w-0"><strong className="block truncate">{entry.material?.name || `Material ${entry.material_id}`}</strong><span className="text-slate-400">{entry.material?.internal_code || 'Sin código'}</span></span>
                        <span className="shrink-0 text-emerald-300">{Number(entry.amount).toLocaleString()} {entry.material?.base_unit?.code || entry.material?.unit?.code || ''}</span>
                      </button>
                    )) : <p className="p-3 text-xs text-slate-400">No hay coincidencias con saldo disponible.</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-300" htmlFor={`extra-material-quantity-${area}`}>Cantidad</label>
                <input
                  id={`extra-material-quantity-${area}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  inputMode="decimal"
                  value={extraMaterialQuantity}
                  onChange={(event) => setExtraMaterialQuantity(event.target.value)}
                  placeholder="0.000"
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <Button type="button" onClick={addExtraMaterial} disabled={loadingWarehouseMaterials || !extraMaterialId || !extraMaterialQuantity} className="h-11 w-full sm:w-auto">Agregar</Button>
            </div>
            {extraMaterials.length > 0 && (
              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                {extraMaterials.map((item) => (
                  <li key={item.material_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                    <span className="min-w-0"><strong className="text-white">{item.material?.name || `Material ${item.material_id}`}</strong><span className="ml-2 text-slate-400">{item.material?.internal_code || ''}</span></span>
                    <span className="font-mono font-bold text-cyan-300">{item.quantity.toLocaleString()} {item.material?.base_unit?.code || item.material?.unit?.code || ''}</span>
                    <button type="button" onClick={() => setExtraMaterials((current) => current.filter((extra) => extra.material_id !== item.material_id))} aria-label={`Quitar ${item.material?.name || 'material'}`} className="rounded-md p-2 text-slate-400 hover:bg-red-950/50 hover:text-red-300"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Veredicto y Acciones Operativas */}
          {assessment && (
            <div className="space-y-4">
              {assessment.all_materials_sufficient ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border-2 border-emerald-600/70 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-white uppercase">
                        Material Disponible en el WIP de Piso
                      </p>
                      <p className="text-xs text-emerald-200/90 font-medium">
                        El stock actual en piso cubre el 100% de la receta. Al escanear el rollo para
                        producción, los insumos se descontarán automáticamente del WIP de {area}.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onClose}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-wider shrink-0"
                  >
                    Listo para Procesar
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/60 border-2 border-amber-600/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-white uppercase">
                        Requiere Material Adicional de Almacén
                      </p>
                      <p className="text-xs text-amber-200/90 font-medium">
                        El WIP de piso no tiene suficiente stock. Genera una Orden de Consumo (ODC) a
                        Almacén para surtir los {assessment.total_missing_kg} kg faltantes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {(assessment.missing_materials?.length > 0 || extraMaterials.length > 0) && (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-700/60 bg-blue-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-blue-100">
                    La ODC incluirá <strong>{assessment.missing_materials?.length || 0} faltante(s) de receta</strong> y <strong>{extraMaterials.length} material(es) adicional(es)</strong>. El surtido quedará asignado al WIP de {area}.
                  </p>
                  <Button onClick={handleCreateOdc} disabled={submittingOdc || Boolean(generatedOdc)} className="h-11 w-full shrink-0 bg-blue-600 font-black text-white hover:bg-blue-700 sm:w-auto">
                    {submittingOdc ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                    Crear ODC
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/80 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 font-bold"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
