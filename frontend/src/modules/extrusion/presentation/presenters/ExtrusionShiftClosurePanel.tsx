import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { extrusionApi } from '../../services/extrusionApi';
import { useExtruderQueuesQuery } from '../../hooks/useExtrusionFloorQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getExtrusionCdmxShift } from '@/utils/date';

const EMPTY_SCRAP_LOGS: any[] = [];

const getInitialShiftSelection = () => {
  const shift = getExtrusionCdmxShift();
  if (shift.hour >= 6) return { shiftDate: shift.calendarDate, shiftCode: shift.shiftCode };
  const previousDay = new Date(`${shift.calendarDate}T00:00:00.000Z`);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  return { shiftDate: previousDay.toISOString().slice(0, 10), shiftCode: shift.shiftCode };
};

export const ExtrusionShiftClosurePanel: React.FC = () => {
  const [initialShift] = useState(getInitialShiftSelection);
  const [extruderId, setExtruderId] = useState<number | ''>('');
  const [shiftDate, setShiftDate] = useState(initialShift.shiftDate);
  const [shiftCode, setShiftCode] = useState(initialShift.shiftCode);
  const [groupedWeights, setGroupedWeights] = useState<Record<string, string>>({});
  const [actualPtiWeight, setActualPtiWeight] = useState('');
  const [manualColorGroups, setManualColorGroups] = useState<Array<{ key: string; color: string; weight: string }>>([{ key: 'color-1', color: '', weight: '' }]);
  const [additionalScrap, setAdditionalScrap] = useState<'UNCONFIRMED' | 'NO' | 'YES'>('UNCONFIRMED');
  const [lastClosure, setLastClosure] = useState<any>(null);
  const queryClient = useQueryClient();
  const { data: groups = [] } = useExtruderQueuesQuery();
  const activeSessionQuery = useQuery({
    queryKey: ['extrusion', 'active-shift-session'],
    queryFn: extrusionApi.getCurrentShiftSession,
    staleTime: 0,
  });
  useEffect(() => {
    const active = activeSessionQuery.data;
    if (active) {
      setShiftDate(active.shift_date);
      setShiftCode(active.shift_code);
    }
  }, [activeSessionQuery.data]);
  const activityQuery = useQuery({
    queryKey: ['extrusion', 'shift-activity', shiftDate, shiftCode, activeSessionQuery.data?.id],
    queryFn: () => extrusionApi.getShiftActivity({
      shift_date: shiftDate,
      shift_code: shiftCode,
      ...(activeSessionQuery.data?.shift_date === shiftDate && activeSessionQuery.data?.shift_code === shiftCode
        ? { shift_session_id: activeSessionQuery.data.id }
        : {}),
    }),
    enabled: Boolean(shiftDate && shiftCode),
    staleTime: 0,
  });
  const machines = activityQuery.data?.used_extruders || [];
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
  useEffect(() => { setGroupedWeights({}); setActualPtiWeight(''); setManualColorGroups([{ key: 'color-1', color: '', weight: '' }]); setAdditionalScrap('UNCONFIRMED'); setLastClosure(null); }, [extruderId, shiftDate, shiftCode]);
  useEffect(() => {
    if (extruderId && !machines.some((machine: any) => Number(machine.id) === Number(extruderId))) setExtruderId('');
  }, [machines, extruderId]);
  const scrapQuery = useQuery({
    queryKey: ['extrusion', 'scrap-shift', extruderId, shiftDate, shiftCode],
    queryFn: () => extrusionApi.getScrapLogs({ extruder_id: extruderId, shift_date: shiftDate, shift_code: shiftCode, limit: 200 }),
    enabled: Boolean(extruderId && shiftDate && shiftCode),
  });
  const selectedMachine = machines.find((machine: any) => Number(machine.id) === Number(extruderId));
  const closeMutation = useMutation({
    mutationFn: extrusionApi.closeShift,
    onSuccess: (result: any) => {
      setLastClosure(result);
      toast.success('Pesajes conciliados y turno cerrado.');
      queryClient.invalidateQueries({ queryKey: ['extrusion'] });
      scrapQuery.refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo cerrar el turno.'),
  });
  const logs = scrapQuery.data || EMPTY_SCRAP_LOGS;
  const estimatedTotal = logs.filter((log: any) => String(log.category || '').toUpperCase() !== 'MATERIAL_PURGA').reduce((sum: number, log: any) => sum + Number(log.estimated_weight_kg ?? log.actual_weight_kg ?? log.scrap_weight_kg ?? 0), 0);
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
    setGroupedWeights((previous) => {
      const next = Object.fromEntries(scrapGroups.map((group) => [group.key, previous[group.key] ?? group.estimated.toFixed(3)]));
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (previousKeys.length === nextKeys.length && nextKeys.every((key) => previous[key] === next[key])) return previous;
      return next;
    });
  }, [scrapGroups]);
  const submit = () => {
    if (activityQuery.isError || scrapQuery.isError || !extruderId) return;
    if (actualPtiWeight.trim() && (!Number.isFinite(Number(actualPtiWeight)) || Number(actualPtiWeight) < 0)) {
      return toast.error('El peso real de PTI debe ser mayor o igual a cero.');
    }
    if (additionalScrap === 'UNCONFIRMED') return toast.error('Confirma si hubo merma adicional antes de cerrar el turno.');
    if (!logs.length && additionalScrap === 'NO') {
      closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, actual_scrap_weight_kg: 0, actual_pti_weight_kg: actualPtiWeight.trim() ? Number(actualPtiWeight) : undefined });
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
    const colorGroups = additionalScrap === 'NO' ? [] : manualColorGroups.map((group) => ({ category: 'MERMA_COLOR', color: group.color.trim(), actual_weight_kg: Number(group.weight) }));
    if (colorGroups.some((item) => !item.color || !Number.isFinite(item.actual_weight_kg) || item.actual_weight_kg < 0 || !manualColorGroups.find((group) => group.color.trim() === item.color)?.weight.trim())) {
      return toast.error('Indica cada color y captura el peso real correspondiente.');
    }
    const allGroups = [...recordedGroups, ...colorGroups];
    if (new Set(allGroups.map((item) => JSON.stringify([item.category.toUpperCase(), String(item.color || '').toUpperCase(), Number(item.source_lote_id) || null]))).size !== allGroups.length) return toast.error('Combina los grupos duplicados de la misma categoría y color.');
    closeMutation.mutate({ extruder_id: Number(extruderId), shift_date: shiftDate, shift_code: shiftCode, grouped_weighings: allGroups, actual_pti_weight_kg: actualPtiWeight.trim() ? Number(actualPtiWeight) : undefined });
  };

  const missingTransitionWeight = scrapGroups.some((group: any) => {
    const value = groupedWeights[group.key]?.trim() ?? '';
    return !value || !Number.isFinite(Number(value)) || Number(value) < 0;
  });
  const missingAdditionalWeight = additionalScrap === 'YES' && manualColorGroups.some((group) => {
    const value = group.weight.trim();
    return !group.color.trim() || !value || !Number.isFinite(Number(value)) || Number(value) < 0;
  });
  const canClose = Boolean(extruderId)
    && !activityQuery.isLoading && !activityQuery.isError
    && !scrapQuery.isLoading && !scrapQuery.isError
    && additionalScrap !== 'UNCONFIRMED'
    && !missingTransitionWeight && !missingAdditionalWeight
    && !closeMutation.isPending;
  const closureGuidance = activityQuery.isError
    ? 'No se pudo consultar la actividad. Actualiza la consulta antes de continuar.'
    : !extruderId
      ? machines.length ? 'Selecciona la extrusora para consultar sus registros.' : 'Cuando exista actividad en el turno, podrás continuar.'
      : scrapQuery.isLoading
        ? 'Consultando los registros del turno…'
        : scrapQuery.isError
          ? 'No se pudieron cargar los registros. Actualiza la consulta antes de cerrar.'
          : additionalScrap === 'UNCONFIRMED'
            ? 'Indica si hubo merma adicional para habilitar el cierre.'
            : missingTransitionWeight
              ? 'Captura un peso real válido para cada grupo de transición.'
              : missingAdditionalWeight
                ? 'Completa el color y el peso real de cada merma adicional.'
                : 'Revisa los datos y cierra el turno cuando estén correctos.';

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <header>
        <h2 className="text-xl font-black">Cierre de turno</h2>
        <p className="mt-1 max-w-3xl text-base text-muted-foreground">El turno cubre toda Extrusión. Para el pesaje final, selecciona cada extrusora que tuvo actividad y concíliala por separado; al terminar, el sistema libera el cierre global.</p>
      </header>
      {lastClosure?.mass_balance_snapshot && <section role="status" className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div><h3 className="text-base font-black">Balance conciliado · {lastClosure.mass_balance_snapshot.basis === 'QUEUE_AND_HANDOFF_SNAPSHOTS' ? 'saldos registrados' : 'base parcial/legada'}</h3><p className="text-sm text-muted-foreground">Remanente digital estimado desde el saldo de WIP; el cierre no pesa ni detiene una mezcla activa.</p></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Mezcla recibida + cargada</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.mixture_input_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">Purgante (entrada)</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.purge_input_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">Remanente al cierre</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.closing_remnant_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">Mezcla consumida neta</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.consumed_mixture_kg ?? lastClosure.mass_balance_snapshot.consumed_input_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">PTI calculado por balance</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.theoretical_good_output_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">PTI bueno registrado</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.good_output_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">PTI real pesado</dt><dd className="font-bold tabular-nums">{lastClosure.mass_balance_snapshot.actual_good_output_kg == null ? 'No capturado · se conserva estimado' : `${Number(lastClosure.mass_balance_snapshot.actual_good_output_kg).toFixed(3)} kg`}</dd></div>
          {lastClosure.mass_balance_snapshot.pti_weight_variance_kg != null && <div><dt className="text-muted-foreground">Diferencia PTI real vs. registro</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.pti_weight_variance_kg).toFixed(3)} kg</dd></div>}
          <div><dt className="text-muted-foreground">Merma teórica</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.theoretical_scrap_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">Merma real pesada</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.actual_scrap_kg).toFixed(3)} kg</dd></div>
          <div><dt className="text-muted-foreground">Varianza (real − teórica)</dt><dd className="font-bold tabular-nums">{Number(lastClosure.mass_balance_snapshot.variance_kg).toFixed(3)} kg</dd></div>
        </dl>
      </section>}
      <section aria-labelledby="scrap-shift-selection" className="space-y-3">
        <div>
          <h3 id="scrap-shift-selection" className="text-lg font-bold">Turno de toda el área</h3>
          <p className="mt-1 text-sm text-muted-foreground">La fecha y el número identifican el turno completo. Después elegirás una extrusora con actividad para conciliar sus pesajes.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-base font-semibold">Fecha del turno
            <Input className="min-h-12 text-base" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} />
          </label>
          <label className="space-y-1 text-base font-semibold">Turno
            <select value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="TURNO_1">Turno 1 · 12 horas</option>
              <option value="TURNO_2">Turno 2 · 12 horas</option>
            </select>
          </label>
          <label className="space-y-1 text-base font-semibold">Extrusora a conciliar
            <select value={extruderId} onChange={(event) => setExtruderId(Number(event.target.value) || '')} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={activityQuery.isLoading || activityQuery.isError}>
              <option value="">{activityQuery.isLoading ? 'Buscando actividad…' : activityQuery.isError ? 'No se pudo consultar' : 'Selecciona extrusora'}</option>
              {machines.map((machine: any) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Se manejan dos turnos de hasta 12 horas; la duración se cuenta desde el inicio registrado. Los horarios exactos quedan pendientes de confirmación. Solo aparecen extrusoras con actividad registrada.</p>
        {activityQuery.isError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-danger">No se pudo consultar la actividad de este turno. Intenta actualizar.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => activityQuery.refetch()} disabled={activityQuery.isFetching}>Actualizar actividad</Button>
        </div>}
        {activityQuery.data && machines.length === 0 && <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-base text-warning">No hay actividad de Extrusión en esta fecha y turno. Se requiere producción, preparación de mezcla o transición para registrar merma.</p>}
      </section>
      {extruderId && <section aria-labelledby="scrap-shift-weighing" className="space-y-5 border-t border-border pt-5">
        <section className="space-y-3 rounded-xl border border-border p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-bold">Producción y mezclas del turno</h3>
            <p className="mt-1 text-sm text-muted-foreground">El cálculo del turno es: mezcla recibida y cargada − remanente − merma/scrap pesado. El purgante se concilia aparte y no cuenta como mezcla convertida a PTI. El peso real de PTI es opcional para contrastar el cálculo con las piezas registradas y su peso estándar.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-3">
              <span className="block text-sm text-muted-foreground">PTI registrado / estimado</span>
              <strong className="text-lg tabular-nums">{Number(selectedMachine?.good_pti_kg || 0).toFixed(3)} kg</strong>
            </div>
            <label className="space-y-1 text-base font-semibold">Peso real de PTI (opcional)
              <Input className="min-h-12 text-base" type="number" min="0" step="0.001" value={actualPtiWeight} onChange={(event) => setActualPtiWeight(event.target.value)} placeholder="Dejar vacío para usar estimado" />
            </label>
          </div>
          {selectedMachine?.mixtures?.length > 0
            ? <div className="space-y-2"><h4 className="font-bold">Mezclas preparadas y recibidas en esta extrusora</h4><ul className="grid gap-2 sm:grid-cols-2">{selectedMachine.mixtures.map((mix: any) => <li key={mix.queue_id} className="rounded-lg border border-border bg-muted/20 p-3"><strong className="block font-mono">{mix.mixture_qr}</strong><span className="block text-sm text-muted-foreground">{mix.formula_code ? `${mix.formula_code} · ` : ''}{mix.formula_name || `Fórmula #${mix.formula_id || '—'}`} · {mix.status || 'registrada'}</span>{mix.quantity_kg != null && <span className="mt-1 block text-sm font-semibold tabular-nums">Saldo digital: {Number(mix.quantity_kg).toFixed(3)} kg</span>}</li>)}</ul></div>
            : <p className="text-sm text-muted-foreground">La consulta no devolvió mezclas preparadas para esta extrusora.</p>}
        </section>
        <div>
          <h3 id="scrap-shift-weighing" className="text-lg font-bold">2. Revisa los pesajes de transición</h3>
          <p className="mt-1 text-sm text-muted-foreground">El peso estimado es una referencia. Captura el peso real de cada grupo.</p>
        </div>
        {scrapQuery.isLoading && <p role="status" className="rounded-xl bg-muted/40 p-4 text-base">Consultando los registros de merma del turno…</p>}
        {scrapQuery.isError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-danger">No se pudieron cargar los registros. El cierre está pausado para evitar omitir pesajes.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => scrapQuery.refetch()} disabled={scrapQuery.isFetching}>Actualizar registros</Button>
        </div>}

        {!scrapQuery.isLoading && !scrapQuery.isError && <>
          <section className="space-y-3">
            {scrapGroups.length === 0
              ? <p className="rounded-xl bg-muted/40 p-4 text-base text-muted-foreground">No hay pesajes de transición pendientes. Continúa con la declaración de merma adicional.</p>
              : <>
                <p role="status" className="text-base font-medium">{scrapGroups.length} grupo(s) por revisar · Referencia estimada: {estimatedTotal.toFixed(3)} kg</p>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {scrapGroups.map((group: any) => (
                    <label key={group.key} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
                      <span className="text-base"><strong>{group.color || 'Sin color'}</strong><span className="block text-sm text-muted-foreground">{group.category.toUpperCase() === 'MATERIAL_PURGA' ? 'Purgante pesado (entrada, no scrap)' : group.category.replaceAll('_', ' ')}{group.lot ? ' · Lote ' + group.lot : ''}</span><span className="block text-sm text-muted-foreground">Estimado {group.estimated.toFixed(3)} kg · {group.count} registro(s)</span></span>
                      <span className="space-y-1 text-base font-semibold">Peso real (kg)<Input className="min-h-12 text-base" type="number" min="0" step="0.001" value={groupedWeights[group.key] ?? ''} onChange={(event) => setGroupedWeights((previous) => ({ ...previous, [group.key]: event.target.value }))} placeholder="0.000" /></span>
                    </label>
                  ))}
                </div>
              </>}
          </section>

          <section aria-labelledby="scrap-additional-heading" className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
            <div>
              <h3 id="scrap-additional-heading" className="text-lg font-bold">3. ¿Hubo merma adicional?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Declara merma fuera de las transiciones. Si la hubo, regístrala por color; no se asocia a una mezcla específica.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="¿Hubo merma adicional en el turno?">
              <Button type="button" className="min-h-12 text-base" variant={additionalScrap === 'NO' ? 'default' : 'outline'} aria-pressed={additionalScrap === 'NO'} onClick={() => setAdditionalScrap('NO')}>No hubo merma adicional</Button>
              <Button type="button" className="min-h-12 text-base" variant={additionalScrap === 'YES' ? 'default' : 'outline'} aria-pressed={additionalScrap === 'YES'} onClick={() => setAdditionalScrap('YES')}>Sí, registrar merma</Button>
            </div>
            {additionalScrap === 'YES' && <div className="space-y-4">
              <datalist id="extrusion-shift-colors">{knownColors.map((color) => <option key={color} value={color} />)}</datalist>
              {manualColorGroups.map((group, index) => <div key={group.key} className="grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="space-y-1 text-base font-semibold">Color
                  <Input className="min-h-12 text-base" list="extrusion-shift-colors" value={group.color} onChange={(event) => setManualColorGroups((items) => items.map((item) => item.key === group.key ? { ...item, color: event.target.value } : item))} placeholder="Selecciona o escribe el color" />
                </label>
                <label className="space-y-1 text-base font-semibold">Peso real (kg)
                  <Input className="min-h-12 text-base" type="number" min="0" step="0.001" value={group.weight} onChange={(event) => setManualColorGroups((items) => items.map((item) => item.key === group.key ? { ...item, weight: event.target.value } : item))} placeholder="0.000" />
                </label>
                <Button type="button" variant="outline" className="min-h-12 text-base" disabled={manualColorGroups.length === 1} onClick={() => setManualColorGroups((items) => items.filter((item) => item.key !== group.key))} aria-label={'Quitar grupo de color ' + (index + 1)}>Quitar color</Button>
              </div>)}
              <Button type="button" variant="outline" className="min-h-12 text-base" onClick={() => setManualColorGroups((items) => [...items, { key: 'color-' + Date.now(), color: '', weight: '' }])}>Agregar otro color</Button>
            </div>}
          </section>

          {additionalScrap === 'NO' && <p className="rounded-lg bg-muted/40 p-3 text-base text-muted-foreground">Se cerrará con los pesajes de transición capturados{scrapGroups.length ? '' : ' y 0 kg de merma adicional'}.</p>}
        </>}

        <footer className="space-y-3 border-t border-border pt-4">
          <p id="scrap-close-guidance" aria-live="polite" className="text-base font-medium text-muted-foreground">{closureGuidance}</p>
          {closeMutation.isError && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-base text-danger">{(closeMutation.error as any)?.response?.data?.message || 'No se pudo cerrar el turno. Revisa la conexión y los datos e inténtalo de nuevo.'}</p>}
          <Button onClick={submit} disabled={!canClose} aria-describedby="scrap-close-guidance" className="min-h-14 w-full text-base font-bold sm:w-auto">
            {closeMutation.isPending ? 'Guardando pesajes…' : 'Guardar pesajes y cerrar turno'}
          </Button>
        </footer>
      </section>}
    </section>
  );
};
