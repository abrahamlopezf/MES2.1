import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Badge, Icon } from '@/design-system';
import { useUpdateFormulaMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula } from '@/modules/extrusion/types/extrusion.types';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { apiClient } from '@/core/api/apiClient';
import { getClientFormulaKind, isClientFormula } from '@/modules/extrusion/domain/clientFormulaRules';

interface EditFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  formula: Formula | null;
}

export const EditFormulaModal: React.FC<EditFormulaModalProps> = ({ isOpen, onClose, formula }) => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costIndex, setCostIndex] = useState<number>(1.1500);
  const [batchSizeKg, setBatchSizeKg] = useState<number>(500);
  const [expectedYieldPieces, setExpectedYieldPieces] = useState<number>(5000);
  const [expectedYieldKg, setExpectedYieldKg] = useState<number>(490);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [assignmentMode, setAssignmentMode] = useState<'DYNAMIC' | 'FIXED' | 'EXTRUDER_1'>('DYNAMIC');
  const [allowedExtruderIds, setAllowedExtruderIds] = useState<number[]>([]);
  const fixedSelectionInitialized = useRef(false);

  const updateMutation = useUpdateFormulaMutation();
  const { data: machineData = [], isLoading: machinesLoading, isError: machinesError, refetch: refetchMachines } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/extrusion/machines');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      return [];
    },
  });
  const machines: any[] = Array.isArray(machineData) ? machineData : [];
  const formulaKind = getClientFormulaKind(formula);
  const isExtruderOneFormula = formulaKind === 'EXTRUDER_1';
  const fixedAssignmentCandidates = useMemo(() => machines.filter((machine) =>
    machine.is_active !== false
    && String(machine.status || 'ACTIVE').trim().toUpperCase() === 'ACTIVE'
    && !['EXT-01', 'EXT-LIQ'].includes(String(machine.code || '').trim().toUpperCase())
  ), [machines]);

  useEffect(() => {
    if (formula) {
      setName(formula.name || '');
      setDescription(formula.description || '');
      setCostIndex(Number(formula.cost_index) || 1.1500);
      setBatchSizeKg(Number(formula.batch_size_kg) || 500);
      setExpectedYieldPieces(Number(formula.expected_yield_pieces) || 5000);
      setExpectedYieldKg(Number(formula.expected_yield_kg) || 490);
      setIsActive(formula.is_active !== undefined ? formula.is_active : true);
      const mode = formula.extruder_assignment_mode || (getClientFormulaKind(formula) === 'EXTRUDER_1' ? 'EXTRUDER_1' : 'DYNAMIC');
      setAssignmentMode(mode as 'EXTRUDER_1' | 'DYNAMIC' | 'FIXED');
      setAllowedExtruderIds((formula.allowed_extruders || []).map(Number));
      fixedSelectionInitialized.current = (formula.allowed_extruders || []).length > 0;
    }
  }, [formula]);

  useEffect(() => {
    if (assignmentMode === 'FIXED' && allowedExtruderIds.length === 0 && !fixedSelectionInitialized.current && !machinesLoading && !machinesError) {
      const dynamicIds = fixedAssignmentCandidates.filter((machine) => machine.is_dynamic_member).map((machine) => Number(machine.id));
      if (dynamicIds.length > 0) setAllowedExtruderIds(dynamicIds);
      fixedSelectionInitialized.current = true;
    }
  }, [assignmentMode, allowedExtruderIds.length, fixedAssignmentCandidates, machinesLoading, machinesError]);

  if (!isOpen || !formula) return null;

  // Cálculos reactivos en base al índice editado
  const rawCost = formula.raw_materials_cost == null ? null : Number(formula.raw_materials_cost);
  const transformedMixtureValue = rawCost == null ? null : Number((rawCost * Number(costIndex)).toFixed(2));
  const suggestedPtiPrice = transformedMixtureValue != null && expectedYieldPieces > 0
    ? Number((transformedMixtureValue / expectedYieldPieces).toFixed(2))
    : null;

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
    if (isClientFormula(formula.code) && !isExtruderOneFormula && assignmentMode === 'FIXED' && allowedExtruderIds.length === 0) {
      toast.error('Selecciona al menos una extrusora para enlazar esta fórmula fija.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: formula.id,
        payload: {
          name: name.trim(),
          description: description.trim(),
          cost_index: allowCosts ? Number(costIndex) : (formula.cost_index != null ? Number(formula.cost_index) : 1.15),
          batch_size_kg: Number(batchSizeKg),
          expected_yield_pieces: Number(expectedYieldPieces),
          expected_yield_kg: Number(expectedYieldKg),
          is_active: isActive,
          ...(isClientFormula(formula.code) ? {
            extruder_assignment_mode: isExtruderOneFormula ? 'EXTRUDER_1' : assignmentMode,
            allowed_extruders: isExtruderOneFormula
              ? [Number(machines.find((machine) => machine.code === 'EXT-01')?.id || 1)]
              : assignmentMode === 'FIXED' ? allowedExtruderIds : [],
          } : {}),
        }
      });
      toast.success(`Fórmula '${formula.code}' actualizada exitosamente.`);
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error al actualizar la fórmula.';
      toast.error(msg);
    }
  };

  const handleToggleFormulaStatus = async () => {
    const nextIsActive = !isActive;
    try {
      await updateMutation.mutateAsync({ id: formula.id, payload: { is_active: nextIsActive } });
      setIsActive(nextIsActive);
      toast.success(`Fórmula '${formula.code}' ${nextIsActive ? 'activada' : 'desactivada'}; ${nextIsActive ? 'está disponible para nuevas mezclas' : 'ya no se ofrece para crear mezclas nuevas'}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo cambiar el estado de la fórmula.');
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
            <section className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/10'}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <h3 className="text-sm font-black text-foreground">Fórmula {isActive ? 'activa' : 'inactiva'}</h3>
                  <Badge variant={isActive ? 'success' : 'secondary'}>{isActive ? 'DISPONIBLE' : 'PAUSADA'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isActive ? 'Se puede seleccionar en el Centro de Mezclado.' : 'No aparecerá para preparar mezclas nuevas; las que ya están en cola se conservan.'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => void handleToggleFormulaStatus()}
                className={`min-h-11 shrink-0 gap-2 font-bold ${isActive ? 'border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300' : 'border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300'}`}
              >
                <Icon name={updateMutation.isPending ? 'progress_activity' : 'power_settings_new'} size={17} className={updateMutation.isPending ? 'animate-spin' : ''} />
                {updateMutation.isPending ? 'Actualizando…' : isActive ? 'Desactivar fórmula' : 'Activar fórmula'}
              </Button>
            </section>

            {isClientFormula(formula.code) && (
              <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-foreground">Asignación de extrusoras</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Define si el sistema puede escoger cualquier máquina del grupo dinámico o si esta fórmula queda enlazada a máquinas específicas.</p>
                </div>
                {isExtruderOneFormula ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-800 dark:text-amber-300">
                    Fórmula exclusiva de Extrusora 1. Esta asignación no se puede cambiar.
                  </div>
                ) : (
                  <>
                    <label className="block space-y-1.5 text-xs font-bold text-foreground">
                      Modo de asignación
                      <select value={assignmentMode} onChange={(event) => {
                        const nextMode = event.target.value as 'DYNAMIC' | 'FIXED';
                        fixedSelectionInitialized.current = nextMode !== 'FIXED' || allowedExtruderIds.length > 0;
                        setAssignmentMode(nextMode);
                      }} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold">
                        <option value="DYNAMIC">Dinámica — cualquier máquina del grupo</option>
                        <option value="FIXED">Fija — extrusoras seleccionadas</option>
                      </select>
                    </label>
                    {assignmentMode === 'FIXED' && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground">Enlazar a una o varias extrusoras activas:</p>
                        {machinesLoading ? (
                          <p className="rounded-lg border border-border bg-background p-3 text-xs font-semibold text-muted-foreground">Cargando extrusoras activas…</p>
                        ) : machinesError ? (
                          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
                            <span>No se pudo cargar el catálogo de extrusoras.</span>
                            <Button type="button" variant="outline" onClick={() => refetchMachines()} className="min-h-9">Reintentar</Button>
                          </div>
                        ) : fixedAssignmentCandidates.length === 0 ? (
                          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-300">No hay extrusoras activas disponibles para una asignación fija.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {fixedAssignmentCandidates.map((machine) => (
                              <label key={machine.id} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-sm font-semibold">
                                <input type="checkbox" checked={allowedExtruderIds.includes(Number(machine.id))} onChange={(event) => setAllowedExtruderIds((current) => event.target.checked
                                  ? [...new Set([...current, Number(machine.id)])]
                                  : current.filter((id) => id !== Number(machine.id)))} />
                                <span>{machine.name}</span>
                                {machine.is_dynamic_member && <Badge variant="outline" className="ml-auto text-[10px]">También dinámica</Badge>}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
            {/* SIMULACIÓN DE VALOR TRANSFORMADO EN TIEMPO REAL */}
            {allowCosts && (
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
                      {rawCost == null ? 'Pendiente de costeo' : `$${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                      {transformedMixtureValue == null ? 'Pendiente' : `$${transformedMixtureValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {suggestedPtiPrice == null ? 'Precio sugerido pendiente' : `~$${suggestedPtiPrice.toFixed(2)} / PTI (${expectedYieldPieces} pzas)`}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

              <div className={`grid grid-cols-1 ${allowCosts ? 'sm:grid-cols-2' : ''} gap-4`}>
                {allowCosts && (
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
                )}

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
