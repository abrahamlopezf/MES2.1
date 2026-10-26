import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { extrusionApi } from '../../services/extrusionApi';
import { useExtruderQueuesQuery } from '../../hooks/useExtrusionFloorQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCdmxDateString, getCdmxShift } from '@/utils/date';

export const ExtrusionShiftClosurePanel: React.FC = () => {
  const [extruderId, setExtruderId] = useState<number | ''>('');
  const [shiftDate, setShiftDate] = useState(() => getCdmxDateString());
  const [shiftCode, setShiftCode] = useState(() => getCdmxShift().shiftCode);
  const [actualScrapWeight, setActualScrapWeight] = useState('');
  const [groupedWeights, setGroupedWeights] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { data: groups = [] } = useExtruderQueuesQuery();
  const machines = useMemo(() => groups.map((group: any) => group.machine), [groups]);
  useEffect(() => { setActualScrapWeight(''); setGroupedWeights({}); }, [extruderId, shiftDate, shiftCode]);
  const scrapQuery = useQuery({
    queryKey: ['extrusion', 'scrap-shift', extruderId, shiftDate, shiftCode],
    queryFn: () => extrusionApi.getScrapLogs({ extruder_id: extruderId, shift_date: shiftDate, shift_code: shiftCode, limit: 200 }),
    enabled: Boolean(extruderId && shiftDate && shiftCode),
  });
  const closeMutation = useMutation({
    mutationFn: extrusionApi.closeShift,
    onSuccess: () => {
      toast.success('Pesajes conciliados y turno cerrado.');
      queryClient.invalidateQueries({ queryKey: ['extrusion'] });
      scrapQuery.refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo cerrar el turno.'),
  });
  const logs = scrapQuery.data || [];
  const estimatedTotal = logs.reduce((sum: number, log: any) => sum + Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg ?? 0), 0);
  const scrapGroups = useMemo(() => {
    const grouped = new Map<string, any>();
    for (const log of logs) {
      const category = String(log.category || 'SIN_CATEGORIA').trim();
      const color = String(log.color || '').trim();
      const source_lote_id = category.toUpperCase() === 'MATERIAL_PURGA' ? (Number(log.source_lote_id) || null) : null;
      const key = JSON.stringify([category.toUpperCase(), color.toUpperCase(), source_lote_id]);
      const group = grouped.get(key) || { key, category, color, source_lote_id, estimated: 0, count: 0, lot: log.source_lote?.folio || log.source_lote?.id || null };
      group.estimated += Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg ?? 0);
      group.count += 1;
      grouped.set(key, group);
    }
    return [...grouped.values()];
  }, [logs]);
  useEffect(() => {
    setGroupedWeights((previous) => Object.fromEntries(scrapGroups.map((group) => [group.key, previous[group.key] ?? group.estimated.toFixed(3)])));
  }, [scrapGroups]);
  const submit = () => {
    if (logs.length) {
      const grouped_weighings = scrapGroups.map((group) => ({
        category: group.category,
        color: group.color || null,
        source_lote_id: group.source_lote_id,
        actual_weight_kg: Number(groupedWeights[group.key]),
      }));
      if (grouped_weighings.some((item) => !Number.isFinite(item.actual_weight_kg) || item.actual_weight_kg < 0 || groupedWeights[JSON.stringify([item.category.toUpperCase(), String(item.color || '').toUpperCase(), item.category.toUpperCase() === 'MATERIAL_PURGA' ? (Number(item.source_lote_id) || null) : null])]?.trim() === '')) {
        return toast.error('Captura un peso real válido para cada grupo.');
      }
      closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, grouped_weighings });
      return;
    }
    const total = Number(actualScrapWeight);
    if (!Number.isFinite(total) || total < 0) return toast.error('Captura el peso total real de la merma; puede ser cero.');
    closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, actual_scrap_weight_kg: total });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-base font-black uppercase">Conciliación de merma por turno</h2>
        <p className="text-xs text-muted-foreground">Al cierre captura el peso real separado por categoría y color, como se clasifica para reciclaje. El sistema distribuirá ese peso entre eventos del mismo grupo y conservará el detalle auditado.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">EXTRUSORA<select value={extruderId} onChange={(event) => setExtruderId(Number(event.target.value) || '')} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2"><option value="">Selecciona</option>{machines.map((machine: any) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select></label>
        <label className="text-xs font-bold">FECHA<Input type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></label>
        <label className="text-xs font-bold">TURNO<select value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2"><option>TURNO_1</option><option>TURNO_2</option><option>TURNO_3</option></select></label>
      </div>
      {extruderId && <div className="space-y-2">
        {scrapQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando scrap del turno…</p> : logs.length === 0 ? <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">No se registraron eventos estimados. El peso se conservará como merma sin atribuir a una mezcla.</p> : <>
          <div className="rounded-lg border border-border p-3 text-sm font-semibold">Estimado acumulado: {estimatedTotal.toFixed(3)} kg · {logs.length} evento(s)</div>
          <div className="max-h-72 space-y-2 overflow-auto">{scrapGroups.map((group: any) => (
            <label key={group.key} className="grid gap-2 rounded-lg border border-border p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
              <span><strong>{group.category}</strong> · {group.color || 'Sin color'}{group.lot ? ` · Lote ${group.lot}` : ''}<span className="block text-muted-foreground">Estimado {group.estimated.toFixed(3)} kg · {group.count} evento(s)</span></span>
              <span className="font-bold">Peso real del grupo (kg)<Input type="number" min="0" step="0.001" value={groupedWeights[group.key] ?? ''} onChange={(event) => setGroupedWeights((previous) => ({ ...previous, [group.key]: event.target.value }))} placeholder="0.000" /></span>
            </label>
          ))}</div>
        </>}
        {!logs.length && <label className="block max-w-xs text-xs font-bold uppercase">Peso real total sin eventos (kg)<Input type="number" min="0" step="0.001" value={actualScrapWeight} onChange={(event) => setActualScrapWeight(event.target.value)} placeholder="0.000" /></label>}
        <div className="flex justify-end"><Button onClick={submit} disabled={scrapQuery.isLoading || (logs.length ? scrapGroups.some((group: any) => !groupedWeights[group.key]?.trim()) : !actualScrapWeight.trim()) || closeMutation.isPending}>{closeMutation.isPending ? 'Conciliando…' : 'Conciliar y cerrar turno'}</Button></div>
      </div>}
    </section>
  );
};
