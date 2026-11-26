import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Edit2, Plus, Trash2 } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { extrusionApi } from '../../services/extrusionApi';

type ShiftRow = { code: string; label: string; start_time: string; end_time: string };
const OPERATING_DAY_OPTIONS = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' }, { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' }, { value: 0, label: 'Domingo' },
];
const formatOperatingDays = (days: number[] = []) => OPERATING_DAY_OPTIONS.filter((day) => days.includes(day.value)).map((day) => day.label).join(', ');
const toMinutes = (time: string) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const formatTime = (minutes: number) => `${String(Math.floor(((minutes % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((minutes % 1440) + 1440) % 60).padStart(2, '0')}`;
const scheduleError = (shifts: ShiftRow[], operatingDays: number[]) => {
  if (shifts.length < 1 || shifts.length > 24) return 'La programación debe tener entre 1 y 24 turnos.';
  if (!operatingDays.length) return 'Selecciona al menos un día de operación.';
  const codes = shifts.map((shift) => shift.code).filter(Boolean);
  if (new Set(codes).size !== codes.length) return 'Hay códigos repetidos. Vuelve a cargar la programación.';
  if (shifts.some((shift) => !shift.label.trim() || toMinutes(shift.start_time) == null || toMinutes(shift.end_time) == null)) return 'Completa el nombre, inicio y término de cada turno.';
  const ordered = [...shifts].sort((a, b) => Number(toMinutes(a.start_time)) - Number(toMinutes(b.start_time)));
  if (ordered.length === 1 && ordered[0].start_time === ordered[0].end_time) return '';
  let totalMinutes = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const next = ordered[(index + 1) % ordered.length];
    const duration = (Number(toMinutes(current.end_time)) - Number(toMinutes(current.start_time)) + 1440) % 1440 || 1440;
    if (duration < 60 || current.end_time !== next.start_time) return 'Acomoda los horarios para cubrir las 24 horas sin huecos ni traslapes. Cada turno debe durar al menos 1 hora.';
    totalMinutes += duration;
  }
  return totalMinutes === 1440 ? '' : 'Los horarios deben cubrir exactamente las 24 horas.';
};

export const ExtrusionShiftSchedulePanel: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const roleValue = typeof user?.role === 'string'
    ? user.role
    : (user?.role?.code || user?.role?.name || user?.role_code || user?.roleCode || '');
  const role = String(roleValue).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const canEdit = [
    'ADMIN_EXT', 'ADMIN_EXTRUSION', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'SUPERADMIN',
    'SUPER_ADMIN', 'SUPER_ADMINISTRADOR', 'SUPERADMINISTRADOR',
  ].includes(role);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShiftRow[]>([]);
  const [operatingDays, setOperatingDays] = useState<number[]>([1, 2, 3, 4]);
  const scheduleQuery = useQuery({
    queryKey: ['extrusion', 'shift-schedule'],
    queryFn: extrusionApi.getShiftSchedule,
    staleTime: 60_000,
  });
  const activeSessionOpen = Boolean(scheduleQuery.data?.active_session_open);

  useEffect(() => {
    if (!scheduleQuery.data) return;
    const editable = scheduleQuery.data.pending_schedule || scheduleQuery.data;
    setDraft(editable.shifts.map((shift: ShiftRow) => ({ ...shift })));
    setOperatingDays(editable.operating_days || [1, 2, 3, 4]);
  }, [scheduleQuery.data]);

  const updateMutation = useMutation({
    mutationFn: extrusionApi.updateShiftSchedule,
    onSuccess: async (result: any) => {
      toast.success(result?.pending_schedule
        ? 'Cambios guardados. Se aplicarán cuando el siguiente turno inicie; el turno actual conserva su horario.'
        : 'Programación de turnos actualizada. Los registros anteriores conservan sus códigos y horas.');
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'shift-schedule'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'active-shift-session'] }),
        queryClient.invalidateQueries({ queryKey: ['extrusion', 'current-shift-session'] }),
      ]);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo guardar la programación.'),
  });

  const validationMessage = useMemo(() => scheduleError(draft, operatingDays), [draft, operatingDays]);
  const activeShiftRemoved = activeSessionOpen && scheduleQuery.data?.active_shift_code && !draft.some((shift) => shift.code === scheduleQuery.data.active_shift_code);
  const orderedSchedule = [...(scheduleQuery.data?.shifts || [])].sort((a: ShiftRow, b: ShiftRow) => Number(toMinutes(a.start_time)) - Number(toMinutes(b.start_time)));
  const orderedPendingSchedule = [...(scheduleQuery.data?.pending_schedule?.shifts || [])].sort((a: ShiftRow, b: ShiftRow) => Number(toMinutes(a.start_time)) - Number(toMinutes(b.start_time)));
  const orderedDraft = [...draft].sort((a, b) => Number(toMinutes(a.start_time)) - Number(toMinutes(b.start_time)));
  const updateRow = (index: number, patch: Partial<ShiftRow>) => setDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const addShift = () => setDraft((current) => [...current, {
    code: '',
    label: `Turno ${current.length + 1}`,
    start_time: '',
    end_time: '',
  }]);

  return <>
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Horario de trabajo de Extrusión">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Clock className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-black">Horario de trabajo</h2>
            {scheduleQuery.isLoading ? <p className="mt-1 text-sm text-muted-foreground">Consultando programación…</p>
              : scheduleQuery.isError ? <p role="alert" className="mt-1 text-sm font-semibold text-danger">No se pudo consultar el horario.</p>
                : <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                  {orderedSchedule.map((shift: ShiftRow) => <span key={shift.code}><strong className="text-foreground">{shift.label}:</strong> {shift.start_time}–{shift.end_time}</span>)}
                  <span>{orderedSchedule.length} turno(s) · CDMX</span>
                  <span className="sm:col-span-2 xl:col-span-3"><strong className="text-foreground">Días de operación:</strong> {formatOperatingDays(scheduleQuery.data?.operating_days || []) || 'Sin días configurados'}</span>
                </div>}
            {!scheduleQuery.data?.configured && !scheduleQuery.data?.pending_schedule && !scheduleQuery.isLoading && !scheduleQuery.isError && <p className="mt-2 text-xs text-warning">Programación inicial provisional; puedes ajustarla a la operación acordada.</p>}
          </div>
        </div>
        {canEdit && <Button type="button" variant="outline" className="min-h-11 shrink-0 self-start" onClick={() => { const editable = scheduleQuery.data?.pending_schedule || scheduleQuery.data; setDraft(editable?.shifts.map((shift: ShiftRow) => ({ ...shift })) || []); setOperatingDays(editable?.operating_days || [1, 2, 3, 4]); setOpen(true); }} disabled={scheduleQuery.isLoading || scheduleQuery.isError}>
          <Edit2 className="mr-2 h-4 w-4" />Editar turnos
        </Button>}
      </div>
      {canEdit && (activeSessionOpen || scheduleQuery.data?.pending_schedule) && <div className="mt-4 space-y-2 border-t border-border pt-3">
        {canEdit && activeSessionOpen && <p role="status" className="text-sm text-warning">El turno actual conserva su horario. Los cambios pendientes entrarán en vigor al iniciar el siguiente turno.</p>}
        {canEdit && scheduleQuery.data?.pending_schedule && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-bold text-primary">Programación pendiente para el siguiente turno</p>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
            {orderedPendingSchedule.map((shift: ShiftRow) => <span key={shift.code}><strong className="text-foreground">{shift.label}:</strong> {shift.start_time}–{shift.end_time}</span>)}
            <span className="sm:col-span-2 xl:col-span-3"><strong className="text-foreground">Días:</strong> {formatOperatingDays(scheduleQuery.data.pending_schedule.operating_days || [])}</span>
          </div>
        </div>}
      </div>}
    </section>

    <Dialog open={open} onOpenChange={(next) => { if (!updateMutation.isPending) setOpen(next); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Configurar turnos de Extrusión</DialogTitle>
          <DialogDescription>Define los días que opera Extrusión y agrega, elimina o ajusta los turnos. Los horarios cubren las 24 horas de cada día seleccionado, sin huecos ni traslapes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {activeSessionOpen && <p role="status" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm font-semibold text-warning">Hay un turno activo. Puedes guardar la nueva programación ahora; se aplicará al iniciar el siguiente turno. El turno actual mantiene su horario. Conserva {scheduleQuery.data?.active_shift_code?.replace('_', ' ')} en la programación.</p>}
          <fieldset className="space-y-3 rounded-xl border border-border bg-background/60 p-3 sm:p-4" disabled={updateMutation.isPending}>
            <legend className="px-1 text-sm font-black">Días en que opera Extrusión</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPERATING_DAY_OPTIONS.map((day) => <label key={day.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={operatingDays.includes(day.value)} onChange={(event) => setOperatingDays((current) => event.target.checked ? [...new Set([...current, day.value])].sort((a, b) => a - b) : current.filter((value) => value !== day.value))} />
                {day.label}
              </label>)}
            </div>
            <p className="text-xs text-muted-foreground">Los inicios automáticos y los relevos entre jornadas respetarán estos días.</p>
          </fieldset>
          {orderedDraft.map((shift) => {
            const originalIndex = draft.indexOf(shift);
            const start = toMinutes(shift.start_time);
            const end = toMinutes(shift.end_time);
            const duration = start == null || end == null ? null : (end - start + 1440) % 1440 || 1440;
            return <article key={shift.code || `nuevo-${originalIndex}`} className="grid gap-3 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:p-4">
              <label className="min-w-0 space-y-1 text-sm font-bold">Nombre del turno
                <Input value={shift.label} maxLength={30} onChange={(event) => updateRow(originalIndex, { label: event.target.value })} className="min-h-11 text-base" aria-label={`Nombre del turno ${originalIndex + 1}`} />
              </label>
              <label className="min-w-0 space-y-1 text-sm font-bold">Hora de inicio
                <Input type="time" value={shift.start_time} onChange={(event) => updateRow(originalIndex, { start_time: event.target.value })} className="min-h-11 text-base" aria-label={`Inicio del turno ${originalIndex + 1}`} />
              </label>
              <label className="min-w-0 space-y-1 text-sm font-bold">Hora de término
                <Input type="time" value={shift.end_time} onChange={(event) => updateRow(originalIndex, { end_time: event.target.value })} className="min-h-11 text-base" aria-label={`Término del turno ${originalIndex + 1}`} />
              </label>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm tabular-nums text-muted-foreground">{duration == null ? 'Duración pendiente' : `${(duration / 60).toFixed(2)} h`}</span>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 text-danger hover:bg-danger/10" aria-label={`Eliminar ${shift.label || `turno ${originalIndex + 1}`}`} disabled={draft.length <= 1} onClick={() => setDraft((current) => current.filter((_, index) => index !== originalIndex))}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </article>;
          })}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" className="min-h-11" onClick={addShift} disabled={draft.length >= 24 || updateMutation.isPending}><Plus className="mr-2 h-5 w-5" />Agregar turno</Button>
            <span className="text-sm text-muted-foreground">{draft.length} de 24 turnos máximos</span>
          </div>
          {validationMessage && <p role="alert" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm font-semibold text-warning">{validationMessage}</p>}
          {activeShiftRemoved && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm font-semibold text-danger">No puedes eliminar {scheduleQuery.data?.active_shift_code?.replace('_', ' ')} mientras siga activo.</p>}
          <p className="text-xs text-muted-foreground">Los códigos de turnos ya registrados se conservan en reportes. Si eliminas un turno, no se borran sus registros anteriores; el código no se reutiliza.</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)} disabled={updateMutation.isPending}>Cancelar</Button>
          <Button type="button" className="min-h-11" disabled={updateMutation.isPending || Boolean(validationMessage) || Boolean(activeShiftRemoved)} onClick={() => updateMutation.mutate({ shifts: draft.map((shift) => ({ ...shift, code: shift.code || 'NEW' })), operating_days: operatingDays })}>
            {updateMutation.isPending ? 'Guardando…' : activeSessionOpen ? 'Guardar para siguiente turno' : 'Guardar programación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
};

export default ExtrusionShiftSchedulePanel;
