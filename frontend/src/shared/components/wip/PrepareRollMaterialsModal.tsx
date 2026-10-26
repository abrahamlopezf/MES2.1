import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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

  useEffect(() => {
    if (isOpen && roll) {
      setGeneratedOdc(null);
      fetchAssessment();
    } else {
      setAssessment(null);
      setSelectedSpecId(null);
      setGeneratedOdc(null);
    }
  }, [isOpen, roll]);

  const handleSpecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const specId = Number(e.target.value);
    setSelectedSpecId(specId);
    fetchAssessment(specId);
  };

  const handleCreateOdc = async () => {
    if (!roll || !assessment || !selectedSpecId) return;
    if (!assessment.missing_materials || assessment.missing_materials.length === 0) {
      toast.info('No hay faltantes. El inventario de WIP en piso es suficiente.');
      return;
    }

    setSubmittingOdc(true);
    try {
      const res = await api.createOdcForRoll({
        roll_id: roll.id,
        specification_id: selectedSpecId,
        missing_materials: assessment.missing_materials,
        notes: `ODC automática para preparación de Rollo ${roll.roll_code} en ${area}`,
      });
      setGeneratedOdc(res.order);
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
                  <Button
                    onClick={handleCreateOdc}
                    disabled={submittingOdc}
                    className="w-full sm:w-auto h-12 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 shrink-0"
                  >
                    {submittingOdc ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    Generar ODC a Almacén
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
