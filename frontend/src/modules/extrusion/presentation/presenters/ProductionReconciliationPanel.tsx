import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { extrusionApi } from '../../services/extrusionApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { mixtureQr: string; entries: any[] };
export const ProductionReconciliationPanel: React.FC<Props> = ({ mixtureQr, entries }) => {
  const [drafts, setDrafts] = useState<Record<number, { pieces: string; kg: string; reason: string }>>({});
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { pieces: number; net_weight_kg: number; correction_reason: string } }) => extrusionApi.adjustProductionEntry(id, payload),
    onSuccess: () => { toast.success('Producción ajustada con registro de auditoría.'); queryClient.invalidateQueries({ queryKey: ['extrusion', 'mass-balance', mixtureQr] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo corregir la producción.'),
  });
  if (!entries?.length) return null;
  return <section className="rounded-xl border border-border p-4 space-y-3"><div><h3 className="text-sm font-black uppercase">Conciliar bobinas registradas</h3><p className="text-xs text-muted-foreground">Corrige piezas o peso al cierre; cada ajuste queda auditado.</p></div>{entries.map((entry: any) => {
    const draft = drafts[entry.id] || { pieces: String(entry.pieces), kg: String(entry.net_weight_kg), reason: '' };
    return <div key={entry.id} className="grid gap-2 rounded-lg bg-muted/20 p-3 sm:grid-cols-[1fr_100px_120px_1fr_auto] sm:items-end"><div className="text-xs"><strong>{entry.mixture_qr}</strong><div className="text-muted-foreground">Color {entry.pti_color_snapshot || 'sin dato histórico'} · Rack {entry.rack_id} · {entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : ''}</div></div><label className="text-[10px] font-bold">PIEZAS<Input type="number" min="1" step="1" value={draft.pieces} onChange={(e) => setDrafts((all) => ({ ...all, [entry.id]: { ...draft, pieces: e.target.value } }))} /></label><label className="text-[10px] font-bold">PESO KG<Input type="number" min="0.001" step="0.001" value={draft.kg} onChange={(e) => setDrafts((all) => ({ ...all, [entry.id]: { ...draft, kg: e.target.value } }))} /></label><label className="text-[10px] font-bold">MOTIVO<Input value={draft.reason} onChange={(e) => setDrafts((all) => ({ ...all, [entry.id]: { ...draft, reason: e.target.value } }))} placeholder="Motivo de ajuste" /></label><Button size="sm" variant="outline" disabled={mutation.isPending || !draft.reason.trim() || (Number(draft.pieces) === Number(entry.pieces) && Number(draft.kg) === Number(entry.net_weight_kg))} onClick={() => mutation.mutate({ id: entry.id, payload: { pieces: Number(draft.pieces), net_weight_kg: Number(draft.kg), correction_reason: draft.reason.trim() } })}>Guardar</Button></div>;
  })}</section>;
};
