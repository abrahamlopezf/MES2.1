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
  const [groupedWeights, setGroupedWeights] = useState<Record<string, string>>({});
  const [manualColorGroups, setManualColorGroups] = useState<Array<{ key: string; color: string; weight: string }>>([{ key: 'color-1', color: '', weight: '' }]);
  const [noColorScrap, setNoColorScrap] = useState(false);
  const queryClient = useQueryClient();
  const { data: groups = [] } = useExtruderQueuesQuery();
  const machines = useMemo(() => groups.map((group: any) => group.machine), [groups]);
  const knownColors = useMemo(() => {
    const colors = groups.flatMap((group: any) =>
      [group.active, ...(group.paused || []), ...(group.waiting || [])]
        .flatMap((queue: any) => [queue?.output_pti_color, ...(queue?.formula?.ptiProducts || []).map((pti: any) => pti.color)])
        .filter(Boolean)
        .map((color: string) => String(color).trim())
        .filter(Boolean)
    );
    return [...new Set(colors)];
  }, [groups]);
  useEffect(() => { setGroupedWeights({}); setManualColorGroups([{ key: 'color-1', color: '', weight: '' }]); setNoColorScrap(false); }, [extruderId, shiftDate, shiftCode]);
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
  useEffect(() => { if (logs.length) setNoColorScrap(false); }, [logs.length]);
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
    if (!logs.length && noColorScrap) {
      closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, actual_scrap_weight_kg: 0 });
      return;
    }
    const recordedGroups = scrapGroups.map((group) => ({
        category: group.category,
        color: group.color || null,
        source_lote_id: group.source_lote_id,
        actual_weight_kg: Number(groupedWeights[group.key]),
      }));
    if (recordedGroups.some((item) => !Number.isFinite(item.actual_weight_kg) || item.actual_weight_kg < 0 || groupedWeights[JSON.stringify([item.category.toUpperCase(), String(item.color || '').toUpperCase(), item.category.toUpperCase() === 'MATERIAL_PURGA' ? (Number(item.source_lote_id) || null) : null])]?.trim() === '')) {
      return toast.error('Captura un peso real válido para cada evento de transición.');
    }
    const colorGroups = manualColorGroups.map((group) => ({ category: 'MERMA_COLOR', color: group.color.trim(), actual_weight_kg: Number(group.weight) }));
    if (colorGroups.some((item) => !item.color || !Number.isFinite(item.actual_weight_kg) || item.actual_weight_kg < 0 || !manualColorGroups.find((group) => group.color.trim() === item.color)?.weight.trim())) {
      return toast.error('Indica cada color y captura el peso real correspondiente.');
    }
    const allGroups = [...recordedGroups, ...colorGroups];
    if (new Set(allGroups.map((item) => JSON.stringify([item.category.toUpperCase(), String(item.color || '').toUpperCase(), Number(item.source_lote_id) || null]))).size !== allGroups.length) return toast.error('Combina los grupos duplicados de la misma categoría y color.');
    closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, grouped_weighings: allGroups });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-base font-black uppercase">Conciliación de merma por turno</h2>
        <p className="text-xs text-muted-foreground">Al cierre captura el peso real por extrusora y color. Si hubo eventos de transición, el sistema concilia esos eventos; si no, registra cada color como merma de cierre sin atribuirla a una mezcla específica.</p>
      </div>
      <p className="text-[11px] text-muted-foreground">El turno se sugiere por hora CDMX con el horario provisional actual (06:00, 14:00 y 22:00); puedes corregirlo. Se ajustará cuando la empresa confirme los horarios.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">EXTRUSORA<select value={extruderId} onChange={(event) => setExtruderId(Number(event.target.value) || '')} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2"><option value="">Selecciona</option>{machines.map((machine: any) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select></label>
        <label className="text-xs font-bold">FECHA<Input type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></label>
        <label className="text-xs font-bold">TURNO<select value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2"><option>TURNO_1</option><option>TURNO_2</option><option>TURNO_3</option></select></label>
      </div>
      {extruderId && <div className="space-y-2">
        {scrapQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando scrap del turno…</p> : logs.length === 0 ? <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">No hay pesajes de transición pendientes. Captura aquí la merma real clasificada por color.</p> : <>
          <div className="rounded-lg border border-border p-3 text-sm font-semibold">Estimado acumulado: {estimatedTotal.toFixed(3)} kg · {logs.length} evento(s)</div>
          <div className="max-h-72 space-y-2 overflow-auto">{scrapGroups.map((group: any) => (
            <label key={group.key} className="grid gap-2 rounded-lg border border-border p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
              <span><strong>{group.category}</strong> · {group.color || 'Sin color'}{group.lot ? ` · Lote ${group.lot}` : ''}<span className="block text-muted-foreground">Estimado {group.estimated.toFixed(3)} kg · {group.count} evento(s)</span></span>
              <span className="font-bold">Peso real del grupo (kg)<Input type="number" min="0" step="0.001" value={groupedWeights[group.key] ?? ''} onChange={(event) => setGroupedWeights((previous) => ({ ...previous, [group.key]: event.target.value }))} placeholder="0.000" /></span>
            </label>
          ))}</div>
        </>}
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground">Clasifica la merma pesada por color. Sin eventos de cambio, no se atribuirá a una mezcla concreta.</p>
          {!logs.length && <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={noColorScrap} onChange={(event) => setNoColorScrap(event.target.checked)} />No se generó merma de color en este turno</label>}
          {!noColorScrap && <>
            {manualColorGroups.map((group, index) => <div key={group.key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-bold">Color de merma<Input list="extrusion-shift-colors" value={group.color} onChange={(event) => setManualColorGroups((items) => items.map((item) => item.key === group.key ? { ...item, color: event.target.value } : item))} placeholder="Ej. Negro" /><datalist id="extrusion-shift-colors">{knownColors.map((color) => <option key={color} value={color} />)}</datalist></label>
              <label className="text-xs font-bold">Peso real (kg)<Input type="number" min="0" step="0.001" value={group.weight} onChange={(event) => setManualColorGroups((items) => items.map((item) => item.key === group.key ? { ...item, weight: event.target.value } : item))} placeholder="0.000" /></label>
              <Button type="button" variant="outline" disabled={manualColorGroups.length === 1} onClick={() => setManualColorGroups((items) => items.filter((item) => item.key !== group.key))} aria-label={`Quitar grupo de color ${index + 1}`}>Quitar</Button>
            </div>)}
            <Button type="button" variant="outline" onClick={() => setManualColorGroups((items) => [...items, { key: `color-${Date.now()}`, color: '', weight: '' }])}>Agregar color</Button>
          </>}
        </div>
        <div className="flex justify-end"><Button onClick={submit} disabled={scrapQuery.isLoading || scrapGroups.some((group: any) => !groupedWeights[group.key]?.trim()) || (!noColorScrap && manualColorGroups.some((group) => !group.color.trim() || !group.weight.trim())) || closeMutation.isPending}>{closeMutation.isPending ? 'Conciliando…' : 'Conciliar y cerrar turno'}</Button></div>
      </div>}
    </section>
  );
};
