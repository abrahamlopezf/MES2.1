import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, Eye, RefreshCw, Scale } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { extrusionApi } from '../../services/extrusionApi';
import { useExtruderQueuesQuery } from '../../hooks/useExtrusionFloorQueries';
import { ExtrusionShiftClosurePanel } from '../presenters/ExtrusionShiftClosurePanel';

type ControlTab = 'shift' | 'history';
type ScrapStatusFilter = 'ALL' | 'PENDING' | 'CLOSED';

const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

export const ExtrusionScrapControlPage: React.FC = () => {
  const [tab, setTab] = useState<ControlTab>('shift');
  const [extruderId, setExtruderId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScrapStatusFilter>('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const { data: queueGroups = [] } = useExtruderQueuesQuery();
  const machines = useMemo(() => queueGroups.map((group) => group.machine), [queueGroups]);
  const historyQuery = useQuery({
    queryKey: ['extrusion', 'scrap-control-history', extruderId, shiftDate, shiftCode],
    queryFn: () => extrusionApi.getScrapLogs({
      ...(extruderId ? { extruder_id: Number(extruderId) } : {}),
      ...(shiftDate ? { shift_date: shiftDate } : {}),
      ...(shiftCode ? { shift_code: shiftCode } : {}),
      limit: 200,
    }),
    enabled: tab === 'history',
  });

  const visibleLogs = useMemo(() => (historyQuery.data || []).filter((log: any) => {
    if (statusFilter === 'PENDING') return log.actual_weight_kg == null;
    if (statusFilter === 'CLOSED') return log.actual_weight_kg != null;
    return true;
  }), [historyQuery.data, statusFilter]);
  const pendingVisibleCount = visibleLogs.filter((log: any) => log.actual_weight_kg == null).length;
  const reconciledVisibleCount = visibleLogs.length - pendingVisibleCount;
  const hasHistoryFilters = Boolean(extruderId || shiftDate || shiftCode || statusFilter !== 'ALL');
  const clearHistoryFilters = () => {
    setExtruderId('');
    setShiftDate('');
    setShiftCode('');
    setStatusFilter('ALL');
  };
  const calculationNotes = String(selectedLog?.notes || '');
  const transitionNotes = String(selectedLog?.transition?.notes || '');
  const purgePercentMatch = /purgante utilizado:\s*([\d.,]+)\s*%/i.exec(`${transitionNotes} ${calculationNotes}`);
  const estimateFormulaMatch = /saldo de mezcla nueva\s*\(([\d.,]+)\s*kg\)\s*[×x]\s*([\d.,]+)\s*%/i.exec(calculationNotes);
  const purgePercent = purgePercentMatch?.[1]?.replace(',', '.') || estimateFormulaMatch?.[2]?.replace(',', '.') || null;
  const transition = selectedLog?.transition;
  const getQueueDescription = (queue: any, qr?: string) => {
    const selectedPti = (queue?.formula?.ptiProducts || []).find((product: any) => Number(product.id) === Number(queue?.output_pti_product_id));
    const colors = queue?.output_pti_color || selectedPti?.color || [...new Set((queue?.formula?.ptiProducts || []).map((product: any) => product.color).filter(Boolean))].join(', ');
    return {
      qr: queue?.consumption_order_qr_id || qr || 'QR no disponible',
      formula: queue?.formula?.name || queue?.formula?.code || 'Fórmula no disponible',
      code: queue?.formula?.code || null,
      colors: colors || 'Color no registrado',
    };
  };
  const fromMix = selectedLog ? getQueueDescription(transition?.fromQueue, transition?.from_mixture_qr || selectedLog.from_mixture_qr_id) : null;
  const toMix = selectedLog?.to_mixture_qr_id ? getQueueDescription(transition?.toQueue, transition?.to_mixture_qr || selectedLog.to_mixture_qr_id) : null;
  const fromScrapBalance = selectedLog?.calculation?.from_mix?.scrap_balance_kg;
  const toScrapBalance = selectedLog?.calculation?.to_mix?.scrap_balance_kg;
  const totalTransitionScrapBalance = fromScrapBalance != null && toScrapBalance != null
    ? Number((Number(fromScrapBalance) + Number(toScrapBalance)).toFixed(3))
    : null;

  const tabs: Array<{ id: ControlTab; label: string; description: string }> = [
    { id: 'shift', label: 'Cerrar turno', description: 'Capturar pesajes y declarar merma adicional.' },
    { id: 'history', label: 'Historial', description: 'Consultar registros anteriores.' },
  ];
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: ControlTab) => {
    const currentIndex = tabs.findIndex((item) => item.id === currentTab);
    let nextIndex: number | undefined;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (nextIndex == null) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setTab(nextTab);
    document.getElementById(`scrap-tab-${nextTab}`)?.focus();
  };

  return (
    <main className="extrusion-workspace mx-auto w-full max-w-[1500px] space-y-6 p-4 pb-24 md:p-6 lg:p-8">
      <header className="flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary"><Scale className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Control de merma y scrap</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Registra el peso real y cierra la merma de cada turno.</p>
          </div>
        </div>
        {tab === 'history' && <Button variant="outline" onClick={() => historyQuery.refetch()} disabled={historyQuery.isFetching} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
          Actualizar historial
        </Button>}
      </header>

      <div role="tablist" aria-label="Secciones de control de merma y scrap" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`scrap-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`scrap-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, item.id)}
            className={`min-h-16 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted/40'}`}
          >
            <span className="block font-bold">{item.label}</span>
            <span className="mt-1 block text-sm font-medium text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" id="scrap-panel-shift" aria-labelledby="scrap-tab-shift" tabIndex={0} hidden={tab !== 'shift'} className="space-y-4">
          <ExtrusionShiftClosurePanel />
      </section>
      <section role="tabpanel" id="scrap-panel-history" aria-labelledby="scrap-tab-history" tabIndex={0} hidden={tab !== 'history'} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Registros por turno</h2>
              <p className="mt-1 text-sm text-muted-foreground">Eventos recientes. Filtra por fecha o turno para revisar una jornada.</p>
            </div>
          </div>

          <div aria-label="Resumen de registros visibles" className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-4"><p className="text-xs font-semibold text-muted-foreground sm:text-sm">Registros</p><p className="mt-1 text-xl font-black tabular-nums sm:text-2xl">{historyQuery.isLoading ? '—' : visibleLogs.length}</p></div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 sm:p-4"><p className="text-xs font-semibold text-warning sm:text-sm">Por pesar</p><p className="mt-1 text-xl font-black tabular-nums text-warning sm:text-2xl">{historyQuery.isLoading ? '—' : pendingVisibleCount}</p></div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 sm:p-4"><p className="text-xs font-semibold text-success sm:text-sm">Conciliados</p><p className="mt-1 text-xl font-black tabular-nums text-success sm:text-2xl">{historyQuery.isLoading ? '—' : reconciledVisibleCount}</p></div>
          </div>

          <details className="group rounded-xl border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span>Filtrar registros{hasHistoryFilters ? ' · filtros activos' : ''}</span>
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><span className="hidden sm:inline">Fecha · turno · extrusora · estado</span><ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
            </summary>
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm font-semibold">Extrusora
                <select value={extruderId} onChange={(event) => setExtruderId(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Todas</option>{machines.map((machine: any) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select>
              </label>
              <label className="space-y-1 text-sm font-semibold">Fecha del turno<Input className="min-h-12 text-base" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></label>
              <label className="space-y-1 text-sm font-semibold">Turno
                <select value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Todos</option><option value="TURNO_1">Turno 1</option><option value="TURNO_2">Turno 2</option><option value="TURNO_3">Turno 3</option></select>
              </label>
              <label className="space-y-1 text-sm font-semibold">Estado
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ScrapStatusFilter)} className="min-h-12 w-full rounded-lg border border-border bg-background px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="ALL">Todos</option><option value="PENDING">Pendientes de pesaje</option><option value="CLOSED">Pesados / conciliados</option></select>
              </label>
              {hasHistoryFilters && <Button type="button" variant="outline" className="min-h-11 sm:col-span-2 lg:col-span-4 lg:justify-self-start" onClick={clearHistoryFilters}>Quitar filtros</Button>}
            </div>
          </details>

          {historyQuery.isLoading ? <div role="status" className="rounded-xl border border-border bg-card p-6 text-base text-muted-foreground">Cargando registros de merma…</div>
            : historyQuery.isError ? <div role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-3 text-base font-semibold text-danger"><AlertTriangle className="h-5 w-5 shrink-0" />No se pudo cargar el historial.</p><Button variant="outline" className="min-h-11" onClick={() => historyQuery.refetch()} disabled={historyQuery.isFetching}>Reintentar</Button></div>
              : visibleLogs.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-lg font-bold">No hay registros para mostrar</p><p className="mt-1 text-base text-muted-foreground">Prueba otro turno o quita los filtros.</p>{hasHistoryFilters && <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={clearHistoryFilters}>Quitar filtros</Button>}</div>
                : <>
                  <div className="space-y-3 lg:hidden">
                    {visibleLogs.map((log: any) => {
                      const machine = machines.find((item: any) => Number(item.id) === Number(log.extruder_id));
                      const isPending = log.actual_weight_kg == null;
                      return <article key={`mobile-${log.id}`} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-muted-foreground">{formatDateTime(log.created_at)} · {String(log.shift_code || 'Turno sin dato').replaceAll('_', ' ')}</p>
                            <h3 className="mt-1 text-lg font-bold">{String(log.category || 'Merma').replaceAll('_', ' ')}</h3>
                            <p className="text-base text-muted-foreground">{log.color || 'Sin color'} · {machine?.name || `Extrusora ${log.extruder_id}`}</p>
                          </div>
                          <span className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${isPending ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                            {isPending ? <><AlertTriangle className="h-4 w-4" />Por pesar</> : <><CheckCircle2 className="h-4 w-4" />Conciliado</>}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                          <span className="text-sm font-semibold text-muted-foreground">{isPending ? 'Peso real pendiente' : 'Peso real'}</span>
                          <span className="text-lg font-black tabular-nums">{isPending ? '—' : `${Number(log.actual_weight_kg).toFixed(3)} kg`}</span>
                        </div>
                        <Button type="button" variant="outline" className="mt-3 min-h-11 w-full gap-2" onClick={() => setSelectedLog(log)} aria-label={`Ver detalle de merma ${log.id}`}><Eye className="h-4 w-4" />Ver detalle</Button>
                      </article>;
                    })}
                  </div>
                  <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left text-base">
                        <thead className="bg-muted/50 text-sm font-bold text-muted-foreground"><tr><th className="px-4 py-3">Fecha y turno</th><th className="px-4 py-3">Extrusora</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3 text-right">Peso real</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Detalle</th></tr></thead>
                        <tbody className="divide-y divide-border">{visibleLogs.map((log: any) => {
                          const machine = machines.find((item: any) => Number(item.id) === Number(log.extruder_id));
                          const isPending = log.actual_weight_kg == null;
                          return <tr key={log.id} className="hover:bg-muted/20">
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums"><span className="block font-semibold">{formatDateTime(log.created_at)}</span><span className="text-sm text-muted-foreground">{String(log.shift_code || 'Turno sin dato').replaceAll('_', ' ')}</span></td>
                            <td className="px-4 py-3 font-semibold">{machine?.name || `Extrusora ${log.extruder_id}`}</td>
                            <td className="px-4 py-3"><span className="block font-semibold">{String(log.category || 'Merma').replaceAll('_', ' ')}</span><span className="text-sm text-muted-foreground">{log.color || 'Sin color'}</span></td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums">{isPending ? 'Pendiente' : `${Number(log.actual_weight_kg).toFixed(3)} kg`}</td>
                            <td className="px-4 py-3"><span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${isPending ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{isPending ? <><AlertTriangle className="h-4 w-4" />Por pesar</> : <><CheckCircle2 className="h-4 w-4" />Conciliado</>}</span></td>
                            <td className="px-4 py-3"><Button type="button" variant="outline" className="min-h-11 gap-1.5" onClick={() => setSelectedLog(log)} aria-label={`Ver detalle de merma ${log.id}`}><Eye className="h-4 w-4" />Ver detalle</Button></td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                </>}
      </section>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-border bg-card text-foreground">
          {selectedLog && <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-xl font-black">Detalle de merma / scrap</DialogTitle>
              <DialogDescription>Registro #{selectedLog.id} · {formatDateTime(selectedLog.created_at)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Extrusora</p><p className="mt-1 font-semibold">{machines.find((item: any) => Number(item.id) === Number(selectedLog.extruder_id))?.name || `Extrusora ${selectedLog.extruder_id}`}</p></div>
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Turno</p><p className="mt-1 font-semibold">{String(selectedLog.shift_code || transition?.shift_code || '—').replace('_', ' ')}</p></div>
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Clasificación</p><p className="mt-1 font-semibold">{String(selectedLog.category || 'Merma').replaceAll('_', ' ')} · {selectedLog.color || 'Sin color'}</p></div>
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Purgante utilizado</p><p className="mt-1 font-semibold">{purgePercent == null ? 'No registrado para este evento' : `${purgePercent}%`}</p></div>
              </div>

              {transition || selectedLog.to_mixture_qr_id ? <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wide">Mezclas involucradas en el cambio</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{ label: 'Mezcla interrumpida', mix: fromMix }, ...(toMix ? [{ label: 'Mezcla que entró', mix: toMix }] : [])].map(({ label, mix }: any) => <div key={label} className="min-w-0 rounded-xl border border-border p-4">
                    <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                    <p className="mt-2 break-all font-mono text-sm font-bold">{mix?.qr}</p>
                    <p className="mt-1 font-semibold">{mix?.formula}</p>
                    {mix?.code && <p className="text-xs text-muted-foreground">{mix.code}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Color(es) de PTI: {mix?.colors}</p>
                  </div>)}
                </div>
              </div> : <p className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">Este registro se capturó al cierre por color y no pertenece a un cambio entre mezclas.</p>}

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <h3 className="text-sm font-black uppercase tracking-wide">Cálculo y conciliación</h3>
                {estimateFormulaMatch ? <p className="mt-2 font-mono text-sm font-bold tabular-nums">{estimateFormulaMatch[1].replace(',', '.')} kg × {estimateFormulaMatch[2].replace(',', '.')}% = {Number(selectedLog.estimated_weight_kg || 0).toFixed(3)} kg estimados</p>
                  : <p className="mt-2 text-sm">Merma estimada registrada: <strong>{selectedLog.estimated_weight_kg == null ? 'sin estimación' : `${Number(selectedLog.estimated_weight_kg).toFixed(3)} kg`}</strong></p>}
                <p className="mt-1 text-xs text-muted-foreground">{calculationNotes || transitionNotes || 'No hay notas de cálculo guardadas para este registro.'}</p>
                <div className="mt-3 grid gap-2 border-t border-primary/20 pt-3 sm:grid-cols-3">
                  <p className="text-sm"><span className="block text-xs text-muted-foreground">Estimado</span><strong>{selectedLog.estimated_weight_kg == null ? '—' : `${Number(selectedLog.estimated_weight_kg).toFixed(3)} kg`}</strong></p>
                  <p className="text-sm"><span className="block text-xs text-muted-foreground">Peso real</span><strong>{selectedLog.actual_weight_kg == null ? 'Pendiente' : `${Number(selectedLog.actual_weight_kg).toFixed(3)} kg`}</strong></p>
                  <p className="text-sm"><span className="block text-xs text-muted-foreground">Diferencia real − estimado</span><strong>{selectedLog.actual_weight_kg == null || selectedLog.estimated_weight_kg == null ? '—' : `${(Number(selectedLog.actual_weight_kg) - Number(selectedLog.estimated_weight_kg)).toFixed(3)} kg`}</strong></p>
                </div>
              </div>

              {(selectedLog.calculation?.from_mix || selectedLog.calculation?.to_mix) && <section className="space-y-3 rounded-xl border border-border p-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Balance de mezcla y PTI útil</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Cada QR se calcula por separado: consumo trazado − PTI útil estimado con las piezas y el peso estándar guardado. Si falta ese peso, se usa el peso neto registrado. Las mezclas y colores no se combinan.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Mezcla interrumpida', value: selectedLog.calculation.from_mix },
                    { title: 'Mezcla entrante', value: selectedLog.calculation.to_mix },
                  ].filter((item) => item.value).map(({ title, value }: any) => <article key={title} className="rounded-lg border border-border bg-muted/20 p-3">
                    <h4 className="break-all text-xs font-black uppercase text-muted-foreground">{title} · {value.qr}</h4>
                    {value.initial_kg != null && <p className="mt-2 font-mono text-xs tabular-nums">Inicial {Number(value.initial_kg).toFixed(3)} kg − remanente {Number(value.remaining_kg || 0).toFixed(3)} kg</p>}
                    <p className="mt-2 font-mono text-xs tabular-nums">{value.consumed_kg == null ? 'Consumo sin traza' : `${Number(value.consumed_kg).toFixed(3)} kg consumidos`}</p>
                    <p className="font-mono text-xs tabular-nums">− {Number(value.useful_pti_kg || 0).toFixed(3)} kg de PTI útil</p>
                    <p className="font-mono text-xs tabular-nums">Piezas registradas: {Number(value.observed_pieces || 0).toLocaleString('es-MX')}</p>
                    {value.estimated_pieces_from_consumed_kg != null && <p className="font-mono text-xs tabular-nums">Equivalente bruto (sin descontar merma): ≈ {Number(value.estimated_pieces_from_consumed_kg).toLocaleString('es-MX')} piezas a {Number(value.average_standard_unit_weight_kg).toFixed(6)} kg/pza</p>}
                    <p className="mt-1 text-sm font-black tabular-nums">= {value.scrap_balance_kg == null ? 'Balance pendiente' : `${Number(value.scrap_balance_kg).toFixed(3)} kg de merma/scrap`}</p>
                    {Number(value.mass_balance_variance_kg) < -0.001 && <p className="mt-1 text-xs font-bold text-destructive">Descuadre: el PTI útil supera la mezcla consumida por {Math.abs(Number(value.mass_balance_variance_kg)).toFixed(3)} kg. Revisa pesos y registros.</p>}
                    <p className="mt-2 text-xs text-muted-foreground">Primer ingreso PTI: {formatDateTime(value.first_pti_at)} · último: {formatDateTime(value.last_pti_at)}</p>
                    <p className="text-xs text-muted-foreground">Base: {String(value.pti_weight_basis || 'pendiente').replaceAll('_', ' ').toLowerCase()} · Registros: {value.pti_entry_count} · Fuente: {(value.weight_sources || []).join(', ') || 'sin registros'}</p>
                  </article>)}
                </div>
                {transition && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-bold tabular-nums">
                  Merma/scrap calculado del cambio: {totalTransitionScrapBalance == null ? 'pendiente de datos completos de ambas mezclas' : `${totalTransitionScrapBalance.toFixed(3)} kg`}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">El total es solo una suma de consulta; los registros de la mezcla anterior y la entrante permanecen separados.</span>
                </p>}
              </section>}

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Registró:</span> <strong>{selectedLog.operator ? [selectedLog.operator.first_name, selectedLog.operator.last_name].filter(Boolean).join(' ') || selectedLog.operator.username : '—'}</strong></p>
                <p><span className="text-muted-foreground">Pesaje:</span> <strong>{selectedLog.weighed_at ? formatDateTime(selectedLog.weighed_at) : 'Pendiente'}</strong></p>
                {selectedLog.reason && <p className="sm:col-span-2"><span className="text-muted-foreground">Motivo:</span> <strong>{String(selectedLog.reason).replaceAll('_', ' ')}</strong></p>}
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ExtrusionScrapControlPage;
