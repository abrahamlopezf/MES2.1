import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/core/api/apiClient';
import { Badge, Button, Icon, Input } from '@/design-system';
import { useCreateFormulaMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula } from '@/modules/extrusion/types/extrusion.types';
import { getNamedColors } from '@/modules/extrusion/domain/colorRules';

interface CreateFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (formula: Formula) => void;
  allowCosts: boolean;
}

export const CreateFormulaModal: React.FC<CreateFormulaModalProps> = ({ isOpen, onClose, onCreated, allowCosts }) => {
  const [code, setCode] = useState('F-EXT-CUSTOM-');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [batchSizeKg, setBatchSizeKg] = useState(500);
  const [expectedYieldPieces, setExpectedYieldPieces] = useState(5000);
  const [expectedYieldKg, setExpectedYieldKg] = useState(490);
  const [costIndex, setCostIndex] = useState(1.15);
  const [assignmentMode, setAssignmentMode] = useState<'DYNAMIC' | 'FIXED'>('DYNAMIC');
  const [allowedExtruderIds, setAllowedExtruderIds] = useState<number[]>([]);
  const createMutation = useCreateFormulaMutation();

  const { data: machineData = [], isLoading: machinesLoading, isError: machinesError, refetch: refetchMachines } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/extrusion/machines');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      return [];
    },
    enabled: isOpen,
  });
  const machines: any[] = Array.isArray(machineData) ? machineData : [];
  const fixedCandidates = useMemo(() => machines.filter((machine) =>
    machine.is_active !== false
    && String(machine.status || 'ACTIVE').trim().toUpperCase() === 'ACTIVE'
    && !['EXT-01', 'EXT-LIQ'].includes(String(machine.code || '').trim().toUpperCase())
  ), [machines]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (assignmentMode === 'FIXED' && allowedExtruderIds.length === 0) {
      toast.error('Selecciona al menos una extrusora para esta fórmula fija.');
      return;
    }
    const formulaColors = [...new Set([...getNamedColors(name), ...getNamedColors(description)])];
    if (formulaColors.length > 1) {
      toast.error(`La fórmula solo puede describir un color. Se detectaron: ${formulaColors.join(', ')}.`);
      return;
    }
    try {
      const formula = await createMutation.mutateAsync({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        batch_size_kg: Number(batchSizeKg),
        expected_yield_pieces: Number(expectedYieldPieces),
        expected_yield_kg: Number(expectedYieldKg),
        cost_index: allowCosts ? Number(costIndex) : 1.15,
        extruder_assignment_mode: assignmentMode,
        allowed_extruders: assignmentMode === 'FIXED' ? allowedExtruderIds : [],
      });
      toast.success(`Fórmula '${formula.code}' creada como inactiva. Agrega su receta antes de activarla.`);
      onCreated(formula);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo crear la fórmula.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-foreground">Nueva fórmula de extrusión</h2>
            <p className="mt-1 text-sm text-muted-foreground">Configura sus datos y extrusoras compatibles.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            La fórmula se creará <strong>inactiva</strong>. Primero agrega y valida sus ingredientes desde la ficha técnica; después podrás activarla para producción.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold text-foreground">
              Código de fórmula
              <Input required maxLength={80} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, '-'))} placeholder="F-EXT-CUSTOM-RAFIA-VERDE" />
              <span className="block text-xs font-normal text-muted-foreground">Usa el prefijo F-EXT-CUSTOM- seguido de un identificador único.</span>
            </label>
            <label className="space-y-1.5 text-sm font-bold text-foreground">
              Nombre
              <Input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Rafia verde reforzada" />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm font-bold text-foreground">
            Descripción / instrucciones operativas
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium" placeholder="Notas de proceso para el equipo de extrusión" />
          </label>

          <section className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
            <h3 className="text-sm font-black text-foreground">Asignación de extrusoras</h3>
            <label className="block space-y-1.5 text-sm font-bold text-foreground">
              Modo
              <select value={assignmentMode} onChange={(event) => setAssignmentMode(event.target.value as 'DYNAMIC' | 'FIXED')} className="h-11 w-full rounded-lg border border-border bg-background px-3">
                <option value="DYNAMIC">Dinámica — extrusoras del grupo dinámico</option>
                <option value="FIXED">Fija — seleccionar extrusoras</option>
              </select>
            </label>
            {assignmentMode === 'FIXED' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Extrusoras activas disponibles:</p>
                {machinesLoading ? (
                  <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">Cargando extrusoras…</p>
                ) : machinesError ? (
                  <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
                    No se pudo cargar el catálogo.<Button type="button" variant="outline" onClick={() => void refetchMachines()}>Reintentar</Button>
                  </div>
                ) : fixedCandidates.length === 0 ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">No hay extrusoras activas disponibles para una asignación fija.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {fixedCandidates.map((machine) => (
                      <label key={machine.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-sm font-semibold">
                        <input type="checkbox" className="h-4 w-4" checked={allowedExtruderIds.includes(Number(machine.id))} onChange={(event) => setAllowedExtruderIds((current) => event.target.checked ? [...new Set([...current, Number(machine.id)])] : current.filter((id) => id !== Number(machine.id)))} />
                        <span>{machine.name}</span>
                        {machine.is_dynamic_member && <Badge variant="outline" className="ml-auto text-[10px]">Grupo dinámico</Badge>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold text-foreground">Tamaño de lote (kg)<Input type="number" min="1" step="0.01" required value={batchSizeKg} onChange={(event) => setBatchSizeKg(Number(event.target.value))} /></label>
            <label className="space-y-1.5 text-sm font-bold text-foreground">Rendimiento esperado (piezas)<Input type="number" min="1" step="1" required value={expectedYieldPieces} onChange={(event) => setExpectedYieldPieces(Number(event.target.value))} /></label>
            <label className="space-y-1.5 text-sm font-bold text-foreground">Rendimiento esperado (kg)<Input type="number" min="0" step="0.01" required value={expectedYieldKg} onChange={(event) => setExpectedYieldKg(Number(event.target.value))} /></label>
            {allowCosts && <label className="space-y-1.5 text-sm font-bold text-foreground">Índice de multiplicación<Input type="number" min="0" step="0.0001" required value={costIndex} onChange={(event) => setCostIndex(Number(event.target.value))} /></label>}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-border bg-card p-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending || (assignmentMode === 'FIXED' && machinesLoading)} className="gap-2">
            {createMutation.isPending ? <Icon name="progress_activity" size={16} className="animate-spin" /> : <Icon name="add" size={16} />}
            {createMutation.isPending ? 'Creando…' : 'Crear fórmula'}
          </Button>
        </footer>
      </form>
    </div>,
    document.body
  );
};
