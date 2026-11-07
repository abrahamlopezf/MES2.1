import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, Lock, Play, ShieldCheck } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extrusionApi } from '../../services/extrusionApi';
import { useAuth } from '@/modules/identity/presentation/context/AuthContext';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

export const ExtrusionShiftSessionPanel: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = String(user?.role?.code || '').toUpperCase();
  const isSupervisor = role === 'SUPERVISOR_EXTRUSION';
  const canClose = isSupervisor || ['ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'SUPERADMIN', 'ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(role);
  const [shiftDate, setShiftDate] = useState(today());
  const [shiftCode, setShiftCode] = useState('TURNO_1');
  const activeQuery = useQuery({
    queryKey: ['extrusion', 'active-shift-session'],
    queryFn: extrusionApi.getActiveShiftSession,
    refetchInterval: (query) => query.state.data ? 5000 : false,
    staleTime: 0,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['extrusion'] });
    activeQuery.refetch();
  };
  const openMutation = useMutation({
    mutationFn: extrusionApi.openShiftSession,
    onSuccess: () => { toast.success('Turno de Extrusión iniciado.'); refresh(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo iniciar el turno.'),
  });
  const closeMutation = useMutation({
    mutationFn: extrusionApi.closeShiftSession,
    onSuccess: () => { toast.success('Turno cerrado. Los racks quedaron liberados para movimientos.'); refresh(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo cerrar el turno. Conciliar la merma por extrusora antes de cerrar.'),
  });
  const session = activeQuery.data;
  const summary = session?.summary;
  return <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4 shadow-sm sm:p-6" aria-labelledby="extrusion-shift-session-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${session ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
          {session ? <Lock className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
        </span>
        <div>
          <h2 id="extrusion-shift-session-title" className="text-lg font-black sm:text-xl">Turno operativo de Extrusión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Un supervisor queda a cargo. El PTI que se registra en racks permanece bajo custodia hasta el cierre.</p>
        </div>
      </div>
      <span className={`inline-flex min-h-9 items-center gap-2 self-start rounded-full px-3 text-sm font-bold ${session ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${session ? 'animate-pulse bg-warning' : 'bg-muted-foreground/50'}`} />{session ? 'TURNO ABIERTO' : 'SIN TURNO ABIERTO'}
      </span>
    </div>
    {activeQuery.isError && <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm font-semibold text-danger">No se pudo consultar el turno actual. Actualiza la pantalla antes de iniciar producción.</div>}
    {session ? <>
      <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Turno / fecha</p><p className="mt-1 font-bold">{String(session.shift_code).replaceAll('_', ' ')} · {session.shift_date}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Supervisor responsable</p><p className="mt-1 font-bold">{[session.supervisor?.first_name, session.supervisor?.last_name].filter(Boolean).join(' ') || session.supervisor?.username || `Usuario ${session.supervisor_id}`}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Mezcla preparada / consumida</p><p className="mt-1 font-bold tabular-nums">{summary ? `${Number(summary.prepared_mix_kg).toFixed(3)} / ${Number(summary.mixture_consumed_kg).toFixed(3)} kg` : '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">PTI producido / racks retenidos</p><p className="mt-1 font-bold tabular-nums">{summary?.production_entries ?? '—'} ingresos · {summary?.racks_in_custody ?? '—'} racks</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Merma estimada / pesada</p><p className="mt-1 font-bold tabular-nums">{summary ? `${Number(summary.estimated_scrap_kg).toFixed(3)} / ${Number(summary.weighed_scrap_kg).toFixed(3)} kg` : '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Mezclas en cola del turno</p><p className="mt-1 font-bold tabular-nums">{summary?.queued_mixes ?? '—'}</p></div>
      </div>
      {!!summary?.consumed_by_material?.length && <div className="overflow-x-auto rounded-xl border border-border"><div className="border-b border-border px-3 py-2 text-sm font-bold">Materiales cargados a preparación</div><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Material</th><th className="p-3">Cantidad</th><th className="p-3">Origen</th></tr></thead><tbody>{summary.consumed_by_material.map((row: any, index: number) => <tr key={`${row.material_id}-${row.source_silo_id || ''}-${row.source_lote_id || ''}-${index}`} className="border-t border-border"><td className="p-3 font-semibold">{row.code || `Material ${row.material_id}`} · {row.name}</td><td className="p-3 tabular-nums">{Number(row.quantity).toFixed(3)} {row.unit}</td><td className="p-3">{row.source_silo_id ? `Silo ${row.source_silo_id}` : row.source_lote_id ? `Lote ${row.source_lote_id}` : row.source_qr_code_id ? `QR ${row.source_qr_code_id}` : 'WIP'}</td></tr>)}</tbody></table></div>}
      {!!summary?.produced_by_pti?.length && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">PTI producido</th><th className="p-3">Piezas</th><th className="p-3">Peso</th></tr></thead><tbody>{summary.produced_by_pti.map((row: any) => <tr key={row.pti_product_id} className="border-t border-border"><td className="p-3 font-semibold">{row.code} · {row.name}</td><td className="p-3 tabular-nums">{row.pieces}</td><td className="p-3 tabular-nums">{Number(row.weight_kg).toFixed(3)} kg</td></tr>)}</tbody></table></div>}
      <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground"><p><strong className="text-foreground">Cierre:</strong> primero concilia merma/scrap por cada extrusora utilizada en la pestaña de abajo. El sistema exige esas conciliaciones antes de liberar los racks.</p>{summary?.pending_extruder_closures?.length > 0 && <p className="mt-1 font-bold text-warning">Pendiente: {summary.pending_extruder_closures.join(', ')}</p>}</div>
        {canClose && <Button type="button" variant="destructive" className="min-h-12 shrink-0" disabled={closeMutation.isPending || activeQuery.isFetching || (summary?.pending_extruder_closures?.length || 0) > 0} onClick={() => { if (window.confirm('¿Cerrar el turno operativo? Se liberará la custodia de los racks registrados en este turno.')) closeMutation.mutate(Number(session.id)); }}><ShieldCheck className="mr-2 h-5 w-5" />{closeMutation.isPending ? 'Cerrando…' : 'Cerrar turno y liberar racks'}</Button>}
      </div>
    </> : isSupervisor ? <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="space-y-1 text-sm font-semibold">Fecha del turno<Input type="date" className="min-h-12 text-base" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></label>
      <label className="space-y-1 text-sm font-semibold">Turno<select className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-base" value={shiftCode} onChange={(event) => setShiftCode(event.target.value)}><option value="TURNO_1">Turno 1</option><option value="TURNO_2">Turno 2</option><option value="TURNO_3">Turno 3</option></select></label>
      <Button type="button" className="min-h-12" disabled={!shiftDate || openMutation.isPending || activeQuery.isLoading} onClick={() => openMutation.mutate({ shift_date: shiftDate, shift_code: shiftCode })}><Play className="mr-2 h-5 w-5" />{openMutation.isPending ? 'Iniciando…' : 'Iniciar turno'}</Button>
    </div> : <p className="rounded-xl border border-border bg-background/50 p-4 text-sm text-muted-foreground">El supervisor de Extrusión debe iniciar el turno antes de registrar mezclas o producción.</p>}
  </section>;
};
