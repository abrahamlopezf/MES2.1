import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCreatePtiProductMutation,
  useDeletePtiProductMutation,
  useFloorFormulasQuery,
  usePtiProductsQuery,
  useUpdatePtiProductMutation,
} from '../../hooks/useExtrusionFloorQueries';
import { CreatePtiProductPayload, PtiProduct } from '../../types/extrusion.types';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

type Draft = {
  code: string;
  extrusion_machine_number: string;
  tape_type: string;
  color: string;
  denier: string;
  tape_count: string;
  tape_count_tolerance: string;
  tape_width_mm: string;
  transformed_cost_index: string;
  unit_weight_kg: string;
  unit_price: string;
  formula_id: string;
  specifications: string;
  is_active: boolean;
};

const emptyDraft = (): Draft => ({
  code: '', extrusion_machine_number: '', tape_type: '', color: '', denier: '',
  tape_count: '', tape_count_tolerance: '10', tape_width_mm: '',
  transformed_cost_index: '1.0000', unit_weight_kg: '', unit_price: '0',
  formula_id: '', specifications: '', is_active: true,
});

const makeName = (draft: Draft) => [
  draft.tape_type.trim(),
  draft.denier ? `${draft.denier}D` : '',
  draft.tape_width_mm ? `${draft.tape_width_mm} mm` : '',
  draft.color.trim(),
].filter(Boolean).join(' - ');

const toDraft = (product: PtiProduct): Draft => ({
  code: product.code,
  extrusion_machine_number: String(product.extrusion_machine_number ?? ''),
  tape_type: product.tape_type || '',
  color: product.color || '',
  denier: String(product.denier ?? ''),
  tape_count: String(product.tape_count ?? ''),
  tape_count_tolerance: String(product.tape_count_tolerance ?? 10),
  tape_width_mm: String(product.tape_width_mm ?? ''),
  transformed_cost_index: String(product.transformed_cost_index ?? 1),
  unit_weight_kg: product.unit_weight_kg == null ? '' : String(product.unit_weight_kg),
  unit_price: String(product.unit_price ?? 0),
  formula_id: product.formula_id == null ? '' : String(product.formula_id),
  specifications: product.specifications || '',
  is_active: product.is_active,
});

export const PtiCatalogPanel: React.FC = () => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const [editing, setEditing] = useState<PtiProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const { data: products = [], isLoading } = usePtiProductsQuery({ is_active: 'ALL' });
  const { data: formulas = [] } = useFloorFormulasQuery();
  const createMutation = useCreatePtiProductMutation();
  const updateMutation = useUpdatePtiProductMutation();
  const deleteMutation = useDeletePtiProductMutation();
  const linkedFormulaIds = useMemo(() => new Set(products.filter((item) => item.formula_id && item.id !== editing?.id).map((item) => Number(item.formula_id))), [products, editing]);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const set = (field: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));
  const reset = () => { setEditing(null); setDraft(emptyDraft()); setIsFormOpen(false); };
  const edit = (product: PtiProduct) => { setEditing(product); setDraft(toDraft(product)); setIsFormOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = makeName(draft);
    const payload: CreatePtiProductPayload = {
      code: draft.code.trim() || undefined,
      name,
      extrusion_machine_number: Number(draft.extrusion_machine_number),
      tape_type: draft.tape_type.trim(),
      color: draft.color.trim(),
      denier: Number(draft.denier),
      tape_count: Number(draft.tape_count),
      tape_count_tolerance: Number(draft.tape_count_tolerance),
      tape_width_mm: Number(draft.tape_width_mm),
      transformed_cost_index: allowCosts ? Number(draft.transformed_cost_index) : (editing ? Number(editing.transformed_cost_index ?? 1) : 1),
      unit_weight_kg: draft.unit_weight_kg === '' ? null : Number(draft.unit_weight_kg),
      unit_price: allowCosts ? Number(draft.unit_price || 0) : (editing ? Number(editing.unit_price || 0) : 0),
      formula_id: draft.formula_id ? Number(draft.formula_id) : null,
      specifications: draft.specifications.trim() || undefined,
      is_active: draft.is_active,
    };
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload });
      else await createMutation.mutateAsync(payload);
      toast.success(editing ? 'PTI actualizado.' : 'PTI registrado.');
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'No se pudo guardar el PTI.');
    }
  };

  const deactivate = async (product: PtiProduct) => {
    if (!window.confirm(`¿Eliminar ${product.code}? El sistema impedirá la acción si tiene bobinas en racks.`)) return;
    try { await deleteMutation.mutateAsync(product.id); toast.success('PTI eliminado.'); }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo eliminar. Si ya se produjo, desactívalo desde su edición.'); }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Catálogo de cintas PTI</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">Los campos técnicos corresponden al catálogo del cliente. El nombre se construye desde esos datos para evitar duplicados y errores de captura.</p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <Badge variant="outline" className="w-fit">{products.length} fichas PTI</Badge>
          <Button type="button" onClick={() => { setEditing(null); setDraft(emptyDraft()); setIsFormOpen(true); }} className="min-h-12 shrink-0 gap-2 font-bold">
            <Plus size={18} aria-hidden="true" />
            Nueva ficha PTI
          </Button>
        </div>
      </header>

      <div className="space-y-5">
        <section className="min-w-0 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground"><tr>
                <th className="p-3">Código / tipo</th><th className="p-3">Extrusora</th><th className="p-3">Color</th><th className="p-3">Denier</th><th className="p-3">Cintas ± tolerancia</th><th className="p-3">Ancho</th>{allowCosts && <th className="p-3">Índice costo</th>}<th className="p-3">Peso bobina</th><th className="p-3">Estado</th><th className="p-3">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {isLoading ? <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Cargando catálogo…</td></tr> : products.map((product: PtiProduct) => (
                  <tr key={product.id} className="align-top">
                    <td className="p-3"><strong className="block">{product.tape_type || product.name}</strong><span className="font-mono text-xs text-muted-foreground">{product.code}</span></td>
                    <td className="p-3">{product.extrusion_machine_number ?? '—'}</td>
                    <td className="max-w-56 whitespace-normal p-3">{product.color || '—'}</td>
                    <td className="p-3 tabular-nums">{product.denier ?? '—'}</td>
                    <td className="p-3 tabular-nums">{product.tape_count ?? '—'} <span className="text-muted-foreground">±{product.tape_count_tolerance ?? 10}</span></td>
                    <td className="p-3 tabular-nums">{product.tape_width_mm == null ? '—' : `${Number(product.tape_width_mm)} mm`}</td>
                    {allowCosts && <td className="p-3 font-mono tabular-nums">×{Number(product.transformed_cost_index ?? 1).toFixed(4)}</td>}
                    <td className="p-3">{product.unit_weight_kg == null ? <span className="text-amber-700 dark:text-amber-300">Pendiente</span> : `${Number(product.unit_weight_kg).toFixed(3)} kg`}</td>
                    <td className="p-3"><Badge variant={product.is_active ? 'success' : 'outline'}>{product.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => edit(product)}>Editar</Button><Button size="sm" variant="ghost" disabled={deleteMutation.isPending} onClick={() => void deactivate(product)}>{product.is_active ? 'Eliminar' : 'Borrar'}</Button></div></td>
                  </tr>
                ))}
                {!isLoading && products.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">El catálogo está vacío. Usa el botón “Nueva ficha PTI” para registrar la primera ficha.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) reset(); else setIsFormOpen(true); }}>
          <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-border bg-card p-4 text-foreground sm:p-6">
            <DialogHeader className="border-b border-border pb-3 pr-8 text-left">
              <DialogTitle className="text-xl font-black">{editing ? `Editar ${editing.code}` : 'Nueva ficha PTI'}</DialogTitle>
              <DialogDescription>Los datos con asterisco vienen del catálogo del cliente.</DialogDescription>
            </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
            <p className="text-sm font-semibold text-muted-foreground">{editing ? 'Actualiza los datos técnicos de esta ficha.' : 'Completa los datos técnicos para registrar el producto.'}</p>
            {editing && <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(null); setDraft(emptyDraft()); }}>Nueva ficha</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">Código interno<Input value={draft.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="Automático si queda vacío" className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Extrusora *<select required value={draft.extrusion_machine_number} onChange={(e) => set('extrusion_machine_number', e.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 text-base"><option value="">Selecciona</option>{[1, 2, 4, 5].map((machine) => <option key={machine} value={machine}>Extrusora {machine}</option>)}</select></label>
            <label className="text-sm font-bold">Tipo de cinta *<Input required value={draft.tape_type} onChange={(e) => set('tape_type', e.target.value)} placeholder="Rafia, Trama, Urdimbre…" className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Color *<Input required value={draft.color} onChange={(e) => set('color', e.target.value)} placeholder="Conserva todos los colores indicados" className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Denier *<Input required type="number" min="1" step="1" value={draft.denier} onChange={(e) => set('denier', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Número de cintas *<Input required type="number" min="1" step="1" value={draft.tape_count} onChange={(e) => set('tape_count', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Tolerancia (±) *<Input required type="number" min="0" step="1" value={draft.tape_count_tolerance} onChange={(e) => set('tape_count_tolerance', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
            <label className="text-sm font-bold">Ancho de cinta (mm) *<Input required type="number" min="0.01" step="0.01" value={draft.tape_width_mm} onChange={(e) => set('tape_width_mm', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-xs"><span className="font-semibold text-muted-foreground">Nombre de producto:</span><p className="mt-1 font-bold text-foreground">{makeName(draft) || 'Se genera con el tipo, denier, ancho y color'}</p></div>
          <div className="space-y-3 border-t border-border pt-3">
            {allowCosts && (
              <>
                <h4 className="text-base font-black text-foreground">Costeo y datos operativos</h4>
                <label className="block text-sm font-bold">Índice de costo transformado *<Input required type="number" min="0.0001" step="0.0001" value={draft.transformed_cost_index} onChange={(e) => set('transformed_cost_index', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
                <p className="-mt-2 text-[11px] text-muted-foreground">Multiplica el costo/kg de la mezcla ya transformada. 1.0000 conserva ese costo; cada salida guarda el índice aplicado.</p>
              </>
            )}
            <div className={`grid gap-3 ${allowCosts ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              <label className="text-sm font-bold">Peso estándar por bobina (kg)<Input type="number" min="0.001" step="0.001" value={draft.unit_weight_kg} onChange={(e) => set('unit_weight_kg', e.target.value)} placeholder="No indicado en el PDF" className="mt-1 min-h-12 text-base" /></label>
              {allowCosts && (
                <label className="text-sm font-bold">Precio unitario histórico ($/bobina)<Input type="number" min="0" step="0.01" value={draft.unit_price} onChange={(e) => set('unit_price', e.target.value)} className="mt-1 min-h-12 text-base" /></label>
              )}
            </div>
            <label className="block text-sm font-bold">Fórmula de Extrusión (opcional)<select value={draft.formula_id} onChange={(e) => set('formula_id', e.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 text-base"><option value="">Sin enlazar</option>{formulas.filter((formula: any) => !linkedFormulaIds.has(Number(formula.id))).map((formula: any) => <option key={formula.id} value={formula.id}>{formula.code} — {formula.name}</option>)}</select></label>
            <label className="block text-sm font-bold">Notas técnicas adicionales<textarea value={draft.specifications} onChange={(e) => set('specifications', e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background p-3 text-base" /></label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} />PTI activo</label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={reset} className="min-h-12">Cancelar</Button><Button type="submit" disabled={isSaving} className="min-h-12">{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar PTI'}</Button></div>
        </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
