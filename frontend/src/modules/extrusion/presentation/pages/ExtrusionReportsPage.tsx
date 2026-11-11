import React, { useMemo, useState } from 'react';
import { Printer, RefreshCw } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { extrusionApi } from '../../services/extrusionApi';

type Period = 'day' | 'week' | 'month' | 'year';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const dateRange = (reference: string, period: Period) => {
  const date = new Date(`${reference}T12:00:00.000Z`);
  const from = new Date(date);
  const to = new Date(date);
  if (period === 'week') {
    const offset = (date.getUTCDay() + 6) % 7;
    from.setUTCDate(from.getUTCDate() - offset);
    to.setUTCDate(from.getUTCDate() + 6);
  } else if (period === 'month') {
    from.setUTCDate(1);
    to.setUTCMonth(to.getUTCMonth() + 1, 0);
  } else if (period === 'year') {
    from.setUTCMonth(0, 1);
    to.setUTCMonth(11, 31);
  }
  return { from_date: from.toISOString().slice(0, 10), to_date: to.toISOString().slice(0, 10) };
};
const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
const formatKg = (value: unknown) => `${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
const formatLoadedKg = (value: unknown, pending: unknown) => `${formatKg(value)}${Number(pending || 0) ? ` · ${Number(pending).toLocaleString('es-MX')} carga(s) histórica(s) sin snapshot` : ''}`;
const handoffStatusLabel = (status: string) => status === 'RECIBIDO' ? 'Recibida y confirmada' : status === 'SIN_REMANENTE' ? 'Sin remanente' : status.replaceAll('_', ' ').toLowerCase();

export const ExtrusionReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('day');
  const [referenceDate, setReferenceDate] = useState(today);
  const range = useMemo(() => dateRange(referenceDate, period), [referenceDate, period]);
  const reportQuery = useQuery({
    queryKey: ['extrusion', 'shift-report', period, range.from_date, range.to_date],
    queryFn: () => extrusionApi.getShiftReport(range),
    enabled: Boolean(referenceDate),
    refetchInterval: 30000,
  });
  const report = reportQuery.data;
  const printReport = () => {
    const cleanup = () => document.body.classList.remove('extrusion-report-printing');
    document.body.classList.add('extrusion-report-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 60000);
  };

  return <main className="extrusion-workspace extrusion-report-printable mx-auto w-full max-w-[1500px] space-y-6 p-4 pb-24 md:p-6 lg:p-8">
    <header className="flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Reportes de Extrusión</h1>
        <p className="mt-2 max-w-3xl text-base text-muted-foreground">Producción, mezclas y merma por turno y extrusora. Los datos se actualizan automáticamente.</p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" className="min-h-11 gap-2" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}><RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? 'animate-spin' : ''}`} />Actualizar</Button>
        <Button className="min-h-11 gap-2" onClick={printReport} disabled={!report}><Printer className="h-4 w-4" />Imprimir reporte</Button>
      </div>
    </header>

    <section aria-label="Filtros del reporte" className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] sm:items-end print:hidden">
      <label className="space-y-1 text-sm font-bold">Periodo
        <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base">
          <option value="day">Diario</option><option value="week">Semanal</option><option value="month">Mensual</option><option value="year">Anual</option>
        </select>
      </label>
      <label className="space-y-1 text-sm font-bold">Fecha de referencia
        <Input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="min-h-12 text-base" />
      </label>
      <p className="pb-3 text-sm font-semibold text-muted-foreground">Periodo consultado: {range.from_date} — {range.to_date}</p>
    </section>

    <div className="hidden print:block"><h2 className="text-xl font-black">Reporte {period === 'day' ? 'diario' : period === 'week' ? 'semanal' : period === 'month' ? 'mensual' : 'anual'} de Extrusión</h2><p>{formatDate(range.from_date)} — {formatDate(range.to_date)}</p><p>Generado: {report?.generated_at ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generated_at)) : '—'}</p></div>

    {reportQuery.isError && <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 font-semibold text-danger">No se pudo cargar el reporte. Actualiza la consulta para volver a intentarlo.</div>}
    {reportQuery.isLoading ? <p role="status" className="rounded-xl border border-border bg-card p-5 text-muted-foreground">Consultando turnos y producción…</p> : report && <>
      <section aria-label="Totales del periodo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Mezclas preparadas', Number(report.totals.mixes_prepared || 0).toLocaleString('es-MX')],
          ['Mezclas cargadas a máquina', Number(report.totals.mixes_loaded || 0).toLocaleString('es-MX')],
          ['Kg preparados / cargados documentados', `${formatKg(report.totals.mix_prepared_kg)} / ${formatLoadedKg(report.totals.mix_loaded_kg, report.totals.loaded_mix_kg_pending_count)}`],
          ['PTI producido', `${Number(report.totals.pti_pieces || 0).toLocaleString('es-MX')} piezas · ${formatKg(report.totals.pti_weight_kg)}`],
          ['Merma real pesada', formatKg(report.totals.actual_scrap_kg)],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-xl font-black tabular-nums">{value}</p></div>)}
      </section>

      {report.shifts.length === 0 ? <p className="rounded-xl border border-dashed border-border bg-card p-6 text-base text-muted-foreground">No hay turnos registrados para este periodo.</p> : <section aria-label="Detalle por turno" className="space-y-5">
        {report.shifts.map((shift: any) => <article key={shift.id} className="break-inside-avoid rounded-xl border border-border bg-card p-4 sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div><h2 className="text-lg font-black">{formatDate(shift.shift_date)} · {String(shift.shift_code).replaceAll('_', ' ')}</h2><p className="mt-1 text-sm text-muted-foreground">Supervisor: {shift.supervisor || 'Sin registrar'} · Estado: {shift.status === 'ABIERTO' ? 'Abierto' : shift.status === 'CERRADO' ? 'Cerrado' : shift.status}</p></div>
            <p className="text-sm font-semibold text-muted-foreground">{shift.status === 'SIN_SESION' ? 'Actividad histórica sin turno abierto' : `${shift.machines.length} extrusora(s) con actividad`}</p>
          </header>
          {shift.machines.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Extrusora</th><th className="p-3">Preparadas</th><th className="p-3">Cargadas</th><th className="p-3">Kg preparados / cargados documentados</th><th className="p-3">PTI por tipo</th><th className="p-3">Merma estimada / real</th><th className="p-3">Varianza</th></tr></thead><tbody>
            {shift.machines.map((machine: any) => <tr key={machine.id} className="break-inside-avoid border-t border-border align-top"><td className="p-3 font-bold">{machine.name}<span className="block text-xs font-normal text-muted-foreground">{machine.code}</span></td><td className="p-3">{Number(machine.prepared_mixes || 0)}<span className="block text-xs text-muted-foreground">lotes · {Number(machine.prepared_containers || 0)} contenedores</span></td><td className="p-3">{Number(machine.loaded_mixes || 0)}<span className="block text-xs text-muted-foreground">lotes · {Number(machine.loaded_containers || 0)} contenedores cargados · {Number(machine.queued_mixes || 0)} en espera</span></td><td className="p-3 tabular-nums">{formatKg(machine.prepared_mix_kg)} / {formatLoadedKg(machine.loaded_mix_kg, machine.loaded_mix_kg_pending_count)}</td><td className="p-3">{(machine.produced_by_pti || []).length ? machine.produced_by_pti.map((pti: any) => <span key={pti.pti_product_id} className="mb-1 block">{pti.code || pti.name || 'PTI'} · {Number(pti.pieces || 0).toLocaleString('es-MX')} pz · {formatKg(pti.weight_kg)}</span>) : <span className="text-muted-foreground">Sin salidas registradas</span>}</td><td className="p-3 tabular-nums">{machine.closure ? <>{formatKg(machine.closure.estimated_scrap_kg)} / {formatKg(machine.closure.actual_scrap_kg)}</> : <span className="font-semibold text-warning">Pendiente de cierre</span>}</td><td className="p-3 tabular-nums">{machine.closure ? formatKg(machine.closure.variance_kg) : '—'}</td></tr>)}
          </tbody></table></div> : <p className="mt-3 text-sm text-muted-foreground">No se encontraron registros por extrusora.</p>}
          {(shift.mixture_handoffs_in?.length > 0 || shift.mixture_handoffs_out?.length > 0) && <section className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><div><h3 className="font-bold">Mezclas recibidas de otro turno</h3>{shift.mixture_handoffs_in?.length ? <ul className="mt-2 space-y-2">{shift.mixture_handoffs_in.map((handoff: any, index: number) => <li key={`${handoff.mixture_qr}-${index}`} className="rounded-lg border border-border p-3 text-sm"><strong>{handoff.extruder_name} · {handoff.formula_code || handoff.formula_name || 'Mezcla'}</strong><span className="block text-muted-foreground">QR {handoff.mixture_qr} · {handoff.color || 'Color no especificado'} · {formatKg(handoff.remaining_balance_kg)} · {handoffStatusLabel(handoff.status)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Sin mezclas recibidas.</p>}</div><div><h3 className="font-bold">Mezclas entregadas al siguiente turno</h3>{shift.mixture_handoffs_out?.length ? <ul className="mt-2 space-y-2">{shift.mixture_handoffs_out.map((handoff: any, index: number) => <li key={`${handoff.mixture_qr}-${index}`} className="rounded-lg border border-border p-3 text-sm"><strong>{handoff.extruder_name} · {handoff.formula_code || handoff.formula_name || 'Mezcla'}</strong><span className="block text-muted-foreground">QR {handoff.mixture_qr} · {handoff.color || 'Color no especificado'} · {formatKg(handoff.remaining_balance_kg)} · {handoffStatusLabel(handoff.status)}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Sin mezclas entregadas.</p>}</div></section>}
          <footer className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-sm font-bold tabular-nums"><span>Total PTI: {Number(shift.totals.pti_pieces || 0).toLocaleString('es-MX')} piezas · {formatKg(shift.totals.pti_weight_kg)}</span><span>Merma pesada: {formatKg(shift.totals.actual_scrap_kg)}</span><span>Preparado / cargado: {formatKg(shift.totals.mix_prepared_kg)} / {formatLoadedKg(shift.totals.mix_loaded_kg, shift.totals.loaded_mix_kg_pending_count)}</span></footer>
        </article>)}
      </section>}
      <p className="text-xs text-muted-foreground">Las cantidades provienen de preparaciones, activaciones registradas, entradas de PTI y cierres guardados. Los kg de carga previos al registro de activaciones se señalan sin snapshot para no presentarlos como un pesaje exacto. Los relevos se muestran por separado y no se vuelven a sumar como mezcla nueva. Un cierre pendiente aparece como tal; no se interpreta como merma real igual a cero.</p>
    </>}
  </main>;
};

export default ExtrusionReportsPage;
