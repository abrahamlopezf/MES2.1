import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, Lock, Play, ShieldCheck } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { extrusionApi } from '../../services/extrusionApi';
import { useExtruderQueuesQuery } from '../../hooks/useExtrusionFloorQueries';
import { useAuthStore } from '@/store/authStore';

const isAllowedShiftDate = (value: string, operatingDays: number[] = [1, 2, 3, 4]) => {
  if (!value) return false;
  const [year, month, date] = value.split('-').map(Number);
  if (!year || !month || !date) return false;
  // A date input is a calendar date, not a local timestamp. Evaluate it in UTC
  // to avoid timezone/DST shifts changing the weekday used by the shift rule.
  const day = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  if (operatingDays.includes(day)) return true;
  // Local test exception mirrors the backend: allow only today's date while
  // running the Vite development server, even if today is not scheduled.
  if (!import.meta.env.DEV) return false;
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {} as Record<string, string>);
  return value === `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
};

export const ExtrusionShiftSessionPanel: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const role = String(typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  const normalizedRole = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const isSupervisor = normalizedRole === 'SUPERVISOR_EXTRUSION' || normalizedRole === 'SUPERVISOR_DE_EXTRUSION';
  const isExecutive = ['ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'SUPERADMIN', 'ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(role);
  const { data: extruderGroups = [] } = useExtruderQueuesQuery();
  const announcedAutoStart = useRef<number | null>(null);
  const [handoffConfirmation, setHandoffConfirmation] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const activeQuery = useQuery({
    queryKey: ['extrusion', 'active-shift-session'],
    queryFn: async () => {
      const result = await extrusionApi.getActiveShiftSession();
      // Compatibilidad con respuestas del backend que envuelven la sesión en
      // { session } y versiones anteriores que devolvían la sesión directa.
      if (result && Object.prototype.hasOwnProperty.call(result, 'session')) return result;
      return { session: result?.status === 'ABIERTO' ? result : null, auto_started: false, suggested_shift: null };
    },
    // También refrescar cuando no hay sesión: otro supervisor puede iniciar el
    // relevo en otro dispositivo y el tablero debe reflejarlo sin recargar.
    refetchInterval: 5000,
    staleTime: 0,
  });
  const refresh = async () => {
    // The shift screen and the extrusion dashboard use separate query keys for
    // the active session. Wait for both to become fresh before reporting the
    // handoff as complete, so navigation cannot briefly show "no open shift".
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'active-shift-session'] }),
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'dashboard-active-shift'] }),
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'dashboard-shift-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['extrusion'] }),
    ]);
  };
  const openMutation = useMutation({
    mutationFn: extrusionApi.openShiftSession,
    onSuccess: async () => { await refresh(); toast.success('Turno iniciado o relevo confirmado correctamente.'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo iniciar el turno.'),
  });
  const closeMutation = useMutation({
    mutationFn: extrusionApi.closeShiftSession,
    onSuccess: async (result: any) => { await refresh(); toast.success(result?.handoff_ready ? 'Turno listo para entrega. La extrusora sigue activa hasta que el supervisor entrante confirme.' : 'Turno cerrado. Los racks quedaron liberados para movimientos.'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo cerrar el turno. Conciliar la merma por extrusora antes de cerrar.'),
  });
  const entryState = activeQuery.data;
  const session = entryState?.session || null;
  const canClose = isExecutive || (isSupervisor && Number(session?.supervisor_id) === Number(user?.id));
  const summary = session?.summary;
  const activeMixes = summary?.active_mixes_to_transfer || [];
  const incomingHandoffReady = Boolean(isSupervisor && session?.handoff_ready_at && Number(session.supervisor_id) !== Number(user?.id));
  const hasActiveMixture = activeMixes.some((mix: any) => mix.queue_status === 'ACTIVA');
  const suggestedShift = entryState?.suggested_shift;
  const configuredShifts = entryState?.schedule?.shifts || session?.schedule?.shifts || [];
  const suggestedSchedule = session?.handoff_ready_at ? (entryState?.handoff_schedule || entryState?.schedule) : entryState?.schedule;
  const suggestedShifts = suggestedSchedule?.shifts || configuredShifts;
  const operatingDays = suggestedSchedule?.operating_days || [1, 2, 3, 4];
  const selectedShift = configuredShifts.find((shift: any) => shift.code === session?.shift_code);
  const nextShift = suggestedShifts.find((shift: any) => shift.code === suggestedShift?.shift_code);
  const displayShiftName = (code: string) => configuredShifts.find((shift: any) => shift.code === code)?.label || String(code || '').replaceAll('_', ' ');
  useEffect(() => {
    const sessionId = Number(session?.id);
    if (entryState?.auto_started && sessionId && announcedAutoStart.current !== sessionId) {
      announcedAutoStart.current = sessionId;
      toast.success(`${displayShiftName(session?.shift_code)} iniciado automáticamente para este día operativo.`);
    }
  }, [entryState?.auto_started, session?.id]);
  const confirmCloseShift = () => {
    const activeNames = activeMixes.filter((mix: any) => mix.queue_status === 'ACTIVA').map((mix: any) => `${mix.extruder_name} (${mix.formula_code || mix.formula_name || mix.mixture_qr})`).join(', ');
    const question = activeNames
      ? `¿Quedó mezcla activa en ${activeNames}? Confirma que continuará en la extrusora y pasará al siguiente supervisor con el saldo digital, sin pesaje ni interrupción.`
      : 'No hay mezcla activa detectada. ¿Confirmas que el turno está listo para entregar?';
    setHandoffConfirmation({
      open: true,
      message: `${question} El cambio se completará cuando el supervisor entrante confirme.`,
    });
  };
  return <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4 shadow-sm sm:p-6" aria-labelledby="extrusion-shift-session-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${session ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
          {session ? <Lock className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
        </span>
        <div>
          <h2 id="extrusion-shift-session-title" className="text-lg font-black sm:text-xl">Turno operativo de Extrusión</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">El turno se inicia para toda Extrusión, no para una sola máquina. El supervisor queda a cargo de las cuatro extrusoras y revisa aquí las mezclas activas o en espera que recibe del turno anterior.</p>
        </div>
      </div>
      <span className={`inline-flex min-h-9 items-center gap-2 self-start rounded-full px-3 text-sm font-bold ${session ? 'bg-warning/10 text-warning' : activeQuery.isLoading ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${session ? 'animate-pulse bg-warning' : activeQuery.isLoading ? 'animate-pulse bg-primary' : 'bg-muted-foreground/50'}`} />{session ? session.handoff_ready_at ? 'ESPERANDO RECEPCIÓN' : 'TURNO ABIERTO' : activeQuery.isLoading ? 'CONSULTANDO TURNO' : activeQuery.isError ? 'ESTADO NO DISPONIBLE' : 'SIN TURNO ABIERTO'}
      </span>
    </div>
    {activeQuery.isError && <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm font-semibold text-danger">No se pudo consultar el turno actual. Actualiza la pantalla antes de iniciar producción.</div>}
    {activeQuery.isLoading ? <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-semibold text-muted-foreground">Consultando el turno activo y las mezclas asignadas…</p> : session ? incomingHandoffReady ? <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div><h3 className="text-lg font-black">Recibir turno y confirmar saldos</h3><p className="mt-1 text-sm text-muted-foreground">Revisa las extrusoras y los saldos digitales que recibes. Al confirmar, el sistema registra la custodia de todas las mezclas activas y en espera sin escanear QR ni interrumpir la producción. Los remanentes pausados deben pesarse y clasificarse antes del relevo.</p></div>
      {activeMixes.length > 0 ? <div className="space-y-3">{activeMixes.map((mix: any) => {
        return <div key={Number(mix.queue_id)} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold">{mix.extruder_name} · {mix.formula_code || mix.formula_name || 'Mezcla en cola'}</p><p className="text-sm text-muted-foreground">{mix.queue_status === 'ACTIVA' ? 'Activa en máquina' : 'En espera'} · {mix.color || 'Color no especificado'} · saldo digital <strong className="tabular-nums text-foreground">{Number(mix.expected_remaining_kg).toFixed(3)} kg</strong></p></div>
          <span className="inline-flex min-h-8 items-center self-start rounded-full bg-warning/10 px-3 text-xs font-bold text-warning">Pendiente de recepción</span>
        </div>;
      })}</div> : <p className="rounded-lg border border-border bg-background p-3 text-sm">No hay mezclas activas ni en espera por recibir. Confirma el turno para quedar a cargo del área.</p>}
      <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-muted-foreground">Siguiente: {nextShift?.label || String(suggestedShift?.shift_code || '').replaceAll('_', ' ')} · {suggestedShift?.shift_date || '—'}{nextShift ? ` · ${nextShift.start_time}–${nextShift.end_time}` : ''}</p>{suggestedShift?.can_start === false && <p className="mt-1 text-sm font-semibold text-warning">Podrás recibir este turno a partir de las {nextShift?.start_time || 'hora programada'} (hora CDMX).</p>}</div><Button type="button" className="min-h-12" disabled={!suggestedShift || suggestedShift.can_start === false || !isAllowedShiftDate(suggestedShift.shift_date, operatingDays) || openMutation.isPending} onClick={() => openMutation.mutate({ shift_date: suggestedShift.shift_date, shift_code: suggestedShift.shift_code, confirm_carryover: true, confirm_active_mixture: hasActiveMixture })}><Play className="mr-2 h-5 w-5" />{openMutation.isPending ? 'Confirmando…' : 'Confirmar y tomar turno'}</Button></div>
      {suggestedShift && !isAllowedShiftDate(suggestedShift.shift_date, operatingDays) && <p className="text-sm font-semibold text-warning">La fecha sugerida no coincide con los días de operación configurados. Revisa la programación con administración.</p>}
    </div> : <>
      <section aria-label="Cobertura del turno en extrusoras" className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-black">Cobertura del turno: toda el área</h3><p className="text-sm text-muted-foreground">El inicio y el cierre pertenecen al turno completo; esta lista muestra el estado por máquina.</p></div><span className="text-sm font-bold tabular-nums">{extruderGroups.length} extrusora(s)</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{extruderGroups.map((group: any) => {
          const machine = group.machine || {};
          const active = Boolean(group.active);
          const waiting = (group.waiting || []).length;
          const paused = (group.paused || []).length;
          return <div key={machine.id || machine.code} className="rounded-lg border border-border p-3"><p className="font-bold">{machine.name || machine.code || 'Extrusora'}</p><p className="mt-1 text-sm text-muted-foreground">{active ? 'Mezcla activa' : paused ? 'Mezcla pausada' : waiting ? 'Mezcla en espera' : 'Sin mezcla activa'}</p><p className="mt-1 text-xs text-muted-foreground">{waiting} en espera · {paused} pausada(s)</p></div>;
        })}</div>
      </section>
      <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Turno / fecha</p><p className="mt-1 font-bold">{displayShiftName(session.shift_code)} · {session.shift_date}</p><p className="text-xs text-muted-foreground">Horario programado: {selectedShift?.start_time || '—'}–{selectedShift?.end_time || '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Duración máxima</p><p className={`mt-1 font-bold ${session.is_expired ? 'text-danger' : ''}`}>{session.is_expired ? 'Turno vencido · requiere cierre' : selectedShift ? `${Number(selectedShift.duration_hours)} horas desde el inicio` : 'Horario histórico conservado'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Supervisor responsable</p><p className="mt-1 font-bold">{[session.supervisor?.first_name, session.supervisor?.last_name].filter(Boolean).join(' ') || session.supervisor?.username || `Usuario ${session.supervisor_id}`}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Mezcla preparada / consumida</p><p className="mt-1 font-bold tabular-nums">{summary ? `${Number(summary.prepared_mix_kg).toFixed(3)} / ${Number(summary.mixture_consumed_kg).toFixed(3)} kg` : '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">PTI producido / racks retenidos</p><p className="mt-1 font-bold tabular-nums">{summary?.production_entries ?? '—'} ingresos · {summary?.racks_in_custody ?? '—'} racks</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Merma estimada / pesada</p><p className="mt-1 font-bold tabular-nums">{summary ? `${Number(summary.estimated_scrap_kg).toFixed(3)} / ${Number(summary.weighed_scrap_kg).toFixed(3)} kg` : '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Purgante pesado / remanente pesado</p><p className="mt-1 font-bold tabular-nums">{summary ? `${Number(summary.weighed_purge_kg || 0).toFixed(3)} / ${Number(summary.weighed_remnant_kg || 0).toFixed(3)} kg` : '—'}</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Mezcla recibida del turno previo</p><p className="mt-1 font-bold tabular-nums">{Number(summary?.mixture_handoff_in_kg || 0).toFixed(3)} kg</p></div>
        <div><p className="text-xs font-bold uppercase text-muted-foreground">Mezclas en cola del turno</p><p className="mt-1 font-bold tabular-nums">{summary?.queued_mixes ?? '—'}</p></div>
      </div>
      {!!summary?.consumed_by_material?.length && <div className="overflow-x-auto rounded-xl border border-border"><div className="border-b border-border px-3 py-2 text-sm font-bold">Materiales cargados a preparación</div><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Material</th><th className="p-3">Cantidad</th><th className="p-3">Origen</th></tr></thead><tbody>{summary.consumed_by_material.map((row: any, index: number) => <tr key={`${row.material_id}-${row.source_silo_id || ''}-${row.source_lote_id || ''}-${index}`} className="border-t border-border"><td className="p-3 font-semibold">{row.code || `Material ${row.material_id}`} · {row.name}</td><td className="p-3 tabular-nums">{Number(row.quantity).toFixed(3)} {row.unit}</td><td className="p-3">{row.source_silo_id ? `Silo ${row.source_silo_id}` : row.source_lote_id ? `Lote ${row.source_lote_id}` : row.source_qr_code_id ? `QR ${row.source_qr_code_id}` : 'WIP'}</td></tr>)}</tbody></table></div>}
      {!!summary?.produced_by_pti?.length && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">PTI producido</th><th className="p-3">Piezas</th><th className="p-3">Peso</th></tr></thead><tbody>{summary.produced_by_pti.map((row: any) => <tr key={row.pti_product_id} className="border-t border-border"><td className="p-3 font-semibold">{row.code} · {row.name}</td><td className="p-3 tabular-nums">{row.pieces}</td><td className="p-3 tabular-nums">{Number(row.weight_kg).toFixed(3)} kg</td></tr>)}</tbody></table></div>}
      {activeMixes.length > 0 && <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div><h3 className="font-black">Mezclas que pasan al siguiente turno</h3><p className="mt-1 text-sm text-muted-foreground">La mezcla activa y los contenedores en espera conservan su saldo digital. No se pesa ni se detiene una extrusora que sigue produciendo.</p></div>
        {activeMixes.map((mix: any) => <div key={mix.queue_id} className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{mix.extruder_name} · {mix.formula_code || mix.formula_name || 'Mezcla en proceso'}</p><p className="text-xs text-muted-foreground">{mix.queue_status === 'ACTIVA' ? 'Activa en máquina' : 'En espera'} · {mix.color || 'Sin color'} · QR {mix.mixture_qr}</p></div><p className="font-bold tabular-nums">{Number(mix.expected_remaining_kg).toFixed(3)} kg <span className="text-xs font-medium text-muted-foreground">saldo digital</span></p></div>)}
      </div>}
      <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground"><p><strong className="text-foreground">Cambio de turno:</strong> concilia merma/scrap por extrusora. Si hay una mezcla activa, quedará corriendo y el turno seguirá abierto hasta que el supervisor entrante confirme; el saldo se toma del sistema.</p>{summary?.pending_extruder_closures?.length > 0 && <p className="mt-1 font-bold text-warning">Pendiente: {summary.pending_extruder_closures.join(', ')}</p>}{session.handoff_ready_at && <p className="mt-1 font-bold text-warning">Esperando que el nuevo supervisor confirme la continuidad.</p>}</div>
        {canClose && !session.handoff_ready_at && <Button type="button" variant="destructive" className="min-h-12 shrink-0" disabled={closeMutation.isPending || activeQuery.isFetching || (summary?.pending_extruder_closures?.length || 0) > 0} onClick={confirmCloseShift}><ShieldCheck className="mr-2 h-5 w-5" />{closeMutation.isPending ? 'Preparando…' : 'Dejar turno listo para entrega'}</Button>}
      </div>
    </> : isSupervisor ? suggestedShift?.reason === 'RELEVO_DEL_DIA' ? <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">El siguiente supervisor debe iniciar el relevo</h3><p className="text-sm text-muted-foreground">{nextShift?.label || String(suggestedShift.shift_code).replaceAll('_', ' ')} · {suggestedShift.shift_date}. El inicio requiere confirmación explícita.</p>{nextShift && <p className="text-xs text-muted-foreground">{nextShift.start_time}–{nextShift.end_time} · {Number(nextShift.duration_hours)} horas</p>}</div><Button type="button" className="min-h-12" disabled={!isAllowedShiftDate(suggestedShift.shift_date, operatingDays) || openMutation.isPending || activeQuery.isFetching} onClick={() => openMutation.mutate({ shift_date: suggestedShift.shift_date, shift_code: suggestedShift.shift_code })}><Play className="mr-2 h-5 w-5" />{openMutation.isPending ? 'Iniciando…' : `Iniciar ${nextShift?.label || String(suggestedShift.shift_code).replaceAll('_', ' ').toLowerCase()}`}</Button></div> : <div className="rounded-xl border border-border bg-background/60 p-4"><p className="font-semibold">El primer turno del día operativo se inicia automáticamente cuando ingresa el supervisor.</p><p className="mt-1 text-sm text-muted-foreground">{suggestedShift?.shift_date ? `Siguiente fecha operativa: ${suggestedShift.shift_date}.` : 'No hay un turno que iniciar manualmente en este momento.'} Los relevos siguen los días configurados para Extrusión.</p></div>
    : <p className="rounded-xl border border-border bg-background/50 p-4 text-sm text-muted-foreground">El supervisor de Extrusión debe iniciar el turno antes de registrar mezclas o producción.</p>}
    <AlertDialog open={handoffConfirmation.open} onOpenChange={(open) => setHandoffConfirmation((current) => ({ ...current, open }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar entrega del turno</AlertDialogTitle>
          <AlertDialogDescription>{handoffConfirmation.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setHandoffConfirmation((current) => ({ ...current, open: false }));
            closeMutation.mutate({ id: Number(session?.id) });
          }}>Dejar turno listo para entrega</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
};
