import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, RefreshCw, Scale } from 'lucide-react';
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
  const pendingCount = (historyQuery.data || []).filter((log: any) => log.actual_weight_kg == null).length;
  const calculationNotes = String(selectedLog?.notes || '');
  const transitionNotes = String(selectedLog?.transition?.notes || '');
  const purgePercentMatch = /purgante utilizado:\s*([\d.,]+)\s*%/i.exec(`${transitionNotes} ${calculationNotes}`);
  const estimateFormulaMatch = /saldo de mezcla nueva\s*\(([\d.,]+)\s*kg\)\s*[×x]\s*([\d.,]+)\s*%/i.exec(calculationNotes);
  const purgePercent = purgePercentMatch?.[1]?.replace(',', '.') || estimateFormulaMatch?.[2]?.replace(',', '.') || null;
  const transition = selectedLog?.transition;
  const getQueueDescription = (queue: any, qr?: string) => {
    const colors = [...new Set((queue?.formula?.ptiProducts || []).map((product: any) => product.color).filter(Boolean))].join(', ');
    return {
      qr: queue?.consumption_order_qr_id || qr || 'QR no disponible',
      formula: queue?.formula?.name || queue?.formula?.code || 'Fórmula no disponible',
      code: queue?.formula?.code || null,
      colors: colors || 'Color no registrado',
    };
  };
  const fromMix = selectedLog ? getQueueDescription(transition?.fromQueue, transition?.from_mixture_qr || selectedLog.from_mixture_qr_id) : null;
  const toMix = selectedLog?.to_mixture_qr_id ? getQueueDescription(transition?.toQueue, transition?.to_mixture_qr || selectedLog.to_mixture_qr_id) : null;

  const tabs: Array<{ id: ControlTab; label: string; description: string }> = [
    { id: 'shift', label: 'Registro por turno', description: 'Captura y conciliación del peso real por extrusora y color.' },
    { id: 'history', label: 'Historial de merma / scrap', description: 'Consulta eventos estimados y pesajes conciliados.' },
  ];

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 p-4 pb-24 md:p-6 lg:p-8">
      <header className="flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary"><Scale className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Control de Merma/Scrap</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Registra el peso real del turno y consulta las transiciones de Extrusión.</p>
          </div>
        </div>
        {tab === 'history' && <Button variant="outline" onClick={() => historyQuery.refetch()} disabled={historyQuery.isFetching} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
          Actualizar historial
        </Button>}
      </header>

      <div role="tablist" aria-label="Secciones de Control de Merma/Scrap" className="flex flex-col gap-2 border-b border-border sm:flex-row">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`scrap-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`scrap-panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`min-h-12 border-b-2 px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-56 ${tab === item.id ? 'border-primary bg-primary/5 text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}
          >
            <span className="block font-bold">{item.label}</span>
            <span className="mt-0.5 block text-xs font-medium opacity-80">{item.description}</span>
          </button>
        ))}
      </div>

      {tab === 'shift' ? (
        <section role="tabpanel" id="scrap-panel-shift" aria-labelledby="scrap-tab-shift" className="space-y-4">
          <div className="max-w-3xl">
            <h2 className="text-lg font-black">Registro por turno</h2>
            <p className="mt-1 text-sm text-muted-foreground">Captura la merma pesada al terminar el turno. Las estimaciones de transición se concilian aquí con el peso real.</p>
          </div>
          <ExtrusionShiftClosurePanel />
        </section>
      ) : (
        <section role="tabpanel" id="scrap-panel-history" aria-labelledby="scrap-tab-history" className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Historial de merma y scrap</h2>
              <p className="mt-1 text-sm text-muted-foreground">Hasta 200 registros recientes. Los costos no se muestran en esta consulta operativa.</p>
            </div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400" aria-live="polite">{pendingCount} pendiente(s) de pesaje</p>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs font-bold">Extrusora
              <select value={extruderId} onChange={(event) => setExtruderId(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium"><option value="">Todas</option>{machines.map((machine: any) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select>
            </label>
            <label className="space-y-1 text-xs font-bold">Fecha del turno<Input type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></label>
            <label className="space-y-1 text-xs font-bold">Turno
              <select value={shiftCode} onChange={(event) => setShiftCode(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium"><option value="">Todos</option><option value="TURNO_1">Turno 1</option><option value="TURNO_2">Turno 2</option><option value="TURNO_3">Turno 3</option></select>
            </label>
            <label className="space-y-1 text-xs font-bold">Estado
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ScrapStatusFilter)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium"><option value="ALL">Todos</option><option value="PENDING">Pendientes de pesaje</option><option value="CLOSED">Pesados / conciliados</option></select>
            </label>
          </div>

          {historyQuery.isLoading ? <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Cargando registros de merma…</div>
            : historyQuery.isError ? <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive"><AlertTriangle className="h-5 w-5 shrink-0" />No se pudo cargar el historial. Actualiza la consulta para volver a intentarlo.</div>
              : visibleLogs.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-bold">No hay registros para estos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba otra extrusora, fecha o estado.</p></div>
                : <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[930px] border-collapse text-left text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Fecha y hora</th><th className="px-4 py-3">Extrusora / turno</th><th className="px-4 py-3">Tipo y color</th><th className="px-4 py-3 text-right">Estimado (kg)</th><th className="px-4 py-3 text-right">Real (kg)</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Acción</th></tr></thead>
                      <tbody className="divide-y divide-border">{visibleLogs.map((log: any) => {
                        const machine = machines.find((item: any) => Number(item.id) === Number(log.extruder_id));
                        const isPending = log.actual_weight_kg == null;
                        const operator = log.operator ? [log.operator.first_name, log.operator.last_name].filter(Boolean).join(' ') || log.operator.username : '—';
                        return <tr key={log.id} className="hover:bg-muted/20">
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatDateTime(log.created_at)}</td>
                          <td className="px-4 py-3"><span className="block font-semibold">{machine?.name || `Extrusora ${log.extruder_id}`}</span><span className="text-xs text-muted-foreground">{String(log.shift_code || '—').replace('_', ' ')}</span></td>
                          <td className="px-4 py-3"><span className="block font-semibold">{String(log.category || 'Merma').replaceAll('_', ' ')}</span><span className="text-xs text-muted-foreground">{log.color || 'Sin color'}</span></td>
                          <td className="px-4 py-3 text-right tabular-nums">{log.estimated_weight_kg == null ? '—' : Number(log.estimated_weight_kg).toFixed(3)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{log.actual_weight_kg == null ? '—' : `${Number(log.actual_weight_kg).toFixed(3)} kg`}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isPending ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>{isPending ? <><AlertTriangle className="h-3.5 w-3.5" />Pendiente</> : <><CheckCircle2 className="h-3.5 w-3.5" />Conciliado</>}</span></td>
                          <td className="px-4 py-3">{operator}</td>
                          <td className="px-4 py-3"><Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setSelectedLog(log)} aria-label={`Ver detalle de merma ${log.id}`}><Eye className="h-4 w-4" />Detalle</Button></td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>}
        </section>
      )}

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
