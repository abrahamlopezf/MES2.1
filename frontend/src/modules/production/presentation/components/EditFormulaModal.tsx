import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button, Input, Badge, Icon } from '@/design-system';
import { useUpdateFormulaMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula } from '@/modules/extrusion/types/extrusion.types';

interface EditFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  formula: Formula | null;
}

export const EditFormulaModal: React.FC<EditFormulaModalProps> = ({ isOpen, onClose, formula }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costIndex, setCostIndex] = useState<number>(1.1500);
  const [batchSizeKg, setBatchSizeKg] = useState<number>(500);
  const [expectedYieldPieces, setExpectedYieldPieces] = useState<number>(5000);
  const [expectedYieldKg, setExpectedYieldKg] = useState<number>(490);
  const [isActive, setIsActive] = useState<boolean>(true);

  const updateMutation = useUpdateFormulaMutation();

  useEffect(() => {
    if (formula) {
      setName(formula.name || '');
      setDescription(formula.description || '');
      setCostIndex(Number(formula.cost_index) || 1.1500);
      setBatchSizeKg(Number(formula.batch_size_kg) || 500);
      setExpectedYieldPieces(Number(formula.expected_yield_pieces) || 5000);
      setExpectedYieldKg(Number(formula.expected_yield_kg) || 490);
      setIsActive(formula.is_active !== undefined ? formula.is_active : true);
    }
  }, [formula]);

  if (!isOpen || !formula) return null;

  // Cálculos reactivos en base al índice editado
  const rawCost = Number(formula.raw_materials_cost) || 13500.00;
  const transformedMixtureValue = Number((rawCost * (Number(costIndex) || 1)).toFixed(2));
  const suggestedPtiPrice = expectedYieldPieces > 0 ? Number((transformedMixtureValue / expectedYieldPieces).toFixed(2)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre de la fórmula es obligatorio.');
      return;
    }
    if (costIndex < 0) {
      toast.error('El índice de multiplicación debe ser mayor o igual a 0.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: formula.id,
        payload: {
          name: name.trim(),
          description: description.trim(),
          cost_index: Number(costIndex),
          batch_size_kg: Number(batchSizeKg),
          expected_yield_pieces: Number(expectedYieldPieces),
          expected_yield_kg: Number(expectedYieldKg),
          is_active: isActive
        }
      });
      toast.success(`Fórmula '${formula.code}' actualizada exitosamente.`);
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error al actualizar la fórmula.';
      toast.error(msg);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border flex flex-col overflow-hidden max-h-[92vh] shadow-2xl z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="calculate" size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
                Editar Fórmula & Multiplicador
                <Badge variant="outline" className="font-mono text-xs">{formula.code}</Badge>
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-1">
                Ajusta el índice de transformación para determinar el valor final de la mezcla de 500kg
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50 shrink-0 flex items-center justify-center"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Form with scrollable body and fixed footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-background">
            {/* SIMULACIÓN DE VALOR TRANSFORMADO EN TIEMPO REAL */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-card to-background border-2 border-primary/30 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Icon name="auto_awesome" size={14} />
                  Valorización de la Mezcla de 500kg
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Cálculo automático de transformación
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="p-2.5 rounded-lg bg-background/80 border border-border">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Materia Prima Base</span>
                  <span className="text-lg font-black font-mono text-foreground">
                    ${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Costeo de insumos</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-primary font-black text-lg">
                  <span>×</span>
                  <div className="p-2.5 rounded-lg bg-primary/20 border border-primary/40 text-center flex-1">
                    <span className="text-[11px] font-semibold text-primary block">Índice Multiplicador</span>
                    <span className="text-lg font-black font-mono text-primary">
                      {Number(costIndex).toFixed(4)}
                    </span>
                    <span className="text-[10px] text-primary/80 block">Factor operacional</span>
                  </div>
                  <Icon name="arrow_forward" size={18} className="text-primary hidden sm:block" />
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Mezcla Transformada</span>
                  <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ${transformedMixtureValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ~${suggestedPtiPrice.toFixed(2)} / PTI ({expectedYieldPieces} pzas)
                  </span>
                </div>
              </div>
            </div>

            {/* CAMPOS DEL FORMULARIO */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Nombre de la Fórmula
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Fórmula Fija Rafia 500kg"
                  className="font-medium bg-background"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Descripción / Instrucciones Operativas
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none font-medium"
                  placeholder="Detalles sobre temperatura, aplicación o consideraciones..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-primary block mb-1.5">
                    Índice de Multiplicación (cost_index)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.005"
                      min="0"
                      value={costIndex}
                      onChange={(e) => setCostIndex(parseFloat(e.target.value) || 0)}
                      className="font-mono font-bold text-lg text-primary bg-background border-primary/40"
                      required
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs font-mono"
                        onClick={() => setCostIndex((prev) => parseFloat((prev + 0.05).toFixed(4)))}
                      >
                        +0.05
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs font-mono"
                        onClick={() => setCostIndex((prev) => Math.max(0, parseFloat((prev - 0.05).toFixed(4))))}
                      >
                        -0.05
                      </Button>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Aplica sobre la suma total de materiales base (default 1.1500 = +15% de valor agregado).
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Tamaño de Lote (kg)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={batchSizeKg}
                    onChange={(e) => setBatchSizeKg(parseFloat(e.target.value) || 500)}
                    className="font-mono font-medium bg-background"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Habitualmente 500 kg para mezclas completas de extrusión.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Rendimiento Esperado (Piezas PTI / Carretes)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={expectedYieldPieces}
                    onChange={(e) => setExpectedYieldPieces(parseFloat(e.target.value) || 0)}
                    className="font-mono font-medium bg-background"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Cantidad teórica de bobinas producidas por mezcla.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Rendimiento Esperado (Kg de PTI)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={expectedYieldKg}
                    onChange={(e) => setExpectedYieldKg(parseFloat(e.target.value) || 0)}
                    className="font-mono font-medium bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Peso útil estimado tras merma estándar.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <span className="font-bold text-sm text-foreground block">Estado de la Fórmula</span>
                  <span className="text-xs text-muted-foreground">
                    {isActive ? 'Fórmula activa y disponible en piso de producción' : 'Fórmula inactiva (oculta de piso)'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-border bg-card flex justify-end items-center gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending} className="font-bold px-5">
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="gap-2 font-bold px-6">
              {updateMutation.isPending ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icon name="save" size={16} />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
