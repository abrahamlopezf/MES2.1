import React, { FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, Factory, Pencil, RotateCcw, Save, X } from '@/design-system/components/Icon/googleIconCompat';
import { toast } from 'sonner';
import axiosClient from '@/api/axiosClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type LoomOption = { id: number; name: string; code: string; loom_number?: number | null; is_active?: boolean };
type ScrapLog = {
  id: number;
  loom_id: number;
  logged_date: string;
  shift_number: number;
  scrap_weight_kg: number | string;
  notes?: string | null;
  loom?: LoomOption;
  recorder?: { first_name?: string; last_name?: string; username?: string };
  updater?: { first_name?: string; last_name?: string; username?: string };
};

const localDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const emptyForm = () => ({ loom_id: '', logged_date: localDate(), shift_number: '1', scrap_weight_kg: '', notes: '' });
const personName = (person?: ScrapLog['recorder']) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.username || '—';

export const TelaresScrapControlPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'registro' | 'historial'>('registro');
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const historyTabRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterLoom, setFilterLoom] = useState('');
  const [filterShift, setFilterShift] = useState('');

  const loomsQuery = useQuery({
    queryKey: ['telares', 'scrap-log-looms'],
    queryFn: async () => (await axiosClient.get('/telares/looms')).data as LoomOption[],
    staleTime: 30000,
  });
  const params = {
    ...(filterDate ? { logged_date: filterDate } : {}),
    ...(filterLoom ? { loom_id: filterLoom } : {}),
    ...(filterShift ? { shift_number: filterShift } : {}),
    limit: 300,
  };
  const logsQuery = useQuery({
    queryKey: ['telares', 'scrap-logs', params],
    queryFn: async () => {
      const response = await axiosClient.get('/telares/scrap-logs', { params });
      return (response.data?.data || []) as ScrapLog[];
    },
    refetchInterval: 15000,
  });
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body = { ...payload, loom_id: Number(payload.loom_id), shift_number: Number(payload.shift_number), scrap_weight_kg: Number(payload.scrap_weight_kg) };
      if (editingId) return (await axiosClient.put(`/telares/scrap-logs/${editingId}`, body)).data.data as ScrapLog;
      return (await axiosClient.post('/telares/scrap-logs', body)).data.data as ScrapLog;
    },
    onSuccess: () => {
      toast.success(editingId ? 'Registro actualizado.' : 'Peso registrado para el turno.');
      setEditingId(null);
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['telares', 'scrap-logs'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.response?.data?.error || 'No se pudo guardar el registro.'),
  });

  const logs = logsQuery.data || [];
  const totalWeight = useMemo(() => logs.reduce((total, row) => total + Number(row.scrap_weight_kg || 0), 0), [logs]);
  const activeLooms = (loomsQuery.data || []).filter((loom) => loom.is_active !== false);
  const registeredLoomCount = useMemo(() => new Set(logs.map((log) => log.loom_id)).size, [logs]);
  const hasFilters = Boolean(filterDate || filterLoom || filterShift);
  const showShiftProgress = Boolean(filterDate && filterShift && !filterLoom && activeLooms.length > 0);

  const clearFilters = () => {
    setFilterDate('');
    setFilterLoom('');
    setFilterShift('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.loom_id || !form.logged_date || !form.shift_number || form.scrap_weight_kg === '') {
      toast.error('Completa telar, fecha, turno y peso real.');
      return;
    }
    if (!Number.isFinite(Number(form.scrap_weight_kg)) || Number(form.scrap_weight_kg) < 0) {
      toast.error('El peso debe ser cero o mayor.');
      return;
    }
    saveMutation.mutate(form);
  };

  const editLog = (log: ScrapLog) => {
    setEditingId(log.id);
    setForm({
      loom_id: String(log.loom_id),
      logged_date: String(log.logged_date).slice(0, 10),
      shift_number: String(log.shift_number),
      scrap_weight_kg: String(log.scrap_weight_kg),
      notes: log.notes || '',
    });
    setActiveTab('registro');
    registerTabRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm()); };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextTab = activeTab === 'registro' ? 'historial' : 'registro';
      setActiveTab(nextTab);
      (nextTab === 'registro' ? registerTabRef : historyTabRef).current?.focus();
    }
  };

  return (
    <main className="min-h-screen space-y-5 bg-background p-4 pb-24 text-foreground sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-500"><Scale className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Control de merma y scrap</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Captura el peso real conciliado para cada telar y turno. El registro no incluye costos.</p>
          </div>
        </div>
      </header>

      <div role="tablist" aria-label="Secciones de control de merma" onKeyDown={handleTabKeyDown} className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2">
        <button
          ref={registerTabRef}
          type="button"
          role="tab"
          id="scrap-register-tab"
          aria-selected={activeTab === 'registro'}
          aria-controls="scrap-register-panel"
          tabIndex={activeTab === 'registro' ? 0 : -1}
          onClick={() => setActiveTab('registro')}
          className={`min-h-12 rounded-lg px-3 py-2 text-center text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === 'registro' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          Registrar peso{editingId ? ' · Editando' : ''}
        </button>
        <button
          ref={historyTabRef}
          type="button"
          role="tab"
          id="scrap-history-tab"
          aria-selected={activeTab === 'historial'}
          aria-controls="scrap-history-panel"
          tabIndex={activeTab === 'historial' ? 0 : -1}
          onClick={() => setActiveTab('historial')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === 'historial' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <span>Historial</span>
          <span className={`rounded-full px-2 py-0.5 text-sm tabular-nums ${activeTab === 'historial' ? 'bg-primary-foreground/15' : 'bg-muted text-foreground'}`}>
            {logsQuery.isLoading ? '…' : logs.length}
          </span>
        </button>
      </div>

      {activeTab === 'registro' && <form id="scrap-register-panel" role="tabpanel" aria-labelledby="scrap-register-tab" tabIndex={0} onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
          <div>
            <h2 className="text-lg font-extrabold">{editingId ? 'Corregir peso registrado' : 'Registrar peso real'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Un registro por telar, fecha y turno. Para corregirlo, edita la fila existente.</p>
          </div>
          <label className="block space-y-1.5 text-base font-semibold">
            Telar <span className="text-destructive">*</span>
            <select required value={form.loom_id} onChange={(e) => setForm({ ...form, loom_id: e.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Selecciona el telar</option>
              {activeLooms.map((loom) => <option key={loom.id} value={loom.id}>{loom.loom_number ? `Telar ${loom.loom_number} · ` : ''}{loom.name} ({loom.code})</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-base font-semibold">Fecha <span className="text-destructive">*</span>
              <Input required type="date" value={form.logged_date} onChange={(e) => setForm({ ...form, logged_date: e.target.value })} className="min-h-11" />
            </label>
            <label className="block space-y-1.5 text-base font-semibold">Turno <span className="text-destructive">*</span>
              <select required value={form.shift_number} onChange={(e) => setForm({ ...form, shift_number: e.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="1">Turno 1</option><option value="2">Turno 2</option><option value="3">Turno 3</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1.5 text-base font-semibold">Peso real de merma / scrap (kg) <span className="text-destructive">*</span>
            <div className="relative"><Input required type="number" min="0" step="0.001" value={form.scrap_weight_kg} onChange={(e) => setForm({ ...form, scrap_weight_kg: e.target.value })} placeholder="Ej. 2.350" className="pr-12 font-mono text-lg tabular-nums" /><span className="absolute right-3 top-3 text-xs font-bold text-muted-foreground">KG</span></div>
            <span className="block text-sm font-normal text-muted-foreground">Ingresa el peso de báscula, hasta tres decimales.</span>
          </label>
          <label className="block space-y-1.5 text-base font-semibold">Observaciones <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} placeholder="Detalle breve de la conciliación o del pesaje" className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <div className="flex gap-2 border-t border-border pt-4">
            <Button type="submit" disabled={saveMutation.isPending} className="min-h-11 flex-1 gap-2 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"><Save className="h-4 w-4" />{saveMutation.isPending ? 'Guardando…' : editingId ? 'Guardar corrección' : 'Registrar peso'}</Button>
            {editingId && <Button type="button" variant="outline" onClick={resetForm} className="min-h-11 gap-2"><RotateCcw className="h-4 w-4" />Cancelar</Button>}
          </div>
        </form>}

        {activeTab === 'historial' && <section id="scrap-history-panel" role="tabpanel" aria-labelledby="scrap-history-tab" tabIndex={0} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="space-y-4 border-b border-border p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div><h2 className="text-lg font-extrabold">Pesajes por telar y turno</h2><p className="text-sm text-muted-foreground">{logs.length} {logs.length === 1 ? 'registro' : 'registros'} {hasFilters ? 'con estos filtros' : 'recientes'}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-h-11 items-center gap-2 rounded-lg bg-muted/50 px-3 text-sm" aria-live="polite">
                  <Scale className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">Total filtrado</span>
                  <strong className="tabular-nums">
                    {logsQuery.isError ? 'No disponible' : logsQuery.isLoading ? 'Cargando…' : logs.length === 0 ? 'Sin registros' : `${totalWeight.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                  </strong>
                </div>
                {hasFilters && <Button type="button" variant="outline" onClick={clearFilters} className="min-h-11 w-full gap-2 sm:w-auto"><X className="h-4 w-4" />Limpiar filtros</Button>}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="min-w-0 text-sm font-semibold text-foreground">Fecha<Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="mt-1 min-h-11 w-full text-foreground" /></label>
              <label className="min-w-0 text-sm font-semibold text-foreground">Telar<select value={filterLoom} onChange={(e) => setFilterLoom(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Todos los telares</option>{activeLooms.map((loom) => <option key={loom.id} value={loom.id}>{loom.loom_number ? `Telar ${loom.loom_number}` : loom.name}</option>)}</select></label>
              <label className="min-w-0 text-sm font-semibold text-foreground">Turno<select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Todos los turnos</option><option value="1">Turno 1</option><option value="2">Turno 2</option><option value="3">Turno 3</option></select></label>
            </div>
            {showShiftProgress && !logsQuery.isLoading && !logsQuery.isError && <div className="rounded-lg border border-border bg-muted/30 p-3" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <strong>Captura del {new Date(`${filterDate}T12:00:00`).toLocaleDateString('es-MX')} · Turno {filterShift}</strong>
                <span className="tabular-nums text-muted-foreground">{registeredLoomCount} de {activeLooms.length} telares registrados</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Avance de registros del turno" aria-valuemin={0} aria-valuemax={activeLooms.length} aria-valuenow={Math.min(registeredLoomCount, activeLooms.length)}>
                <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${Math.min((registeredLoomCount / activeLooms.length) * 100, 100)}%` }} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{Math.max(activeLooms.length - registeredLoomCount, 0)} {Math.max(activeLooms.length - registeredLoomCount, 0) === 1 ? 'telar pendiente' : 'telares pendientes'}</p>
            </div>}
          </div>
          <div className="space-y-3 p-3 sm:p-4 xl:hidden">
            {logsQuery.isLoading && <p className="p-6 text-center text-base text-muted-foreground">Cargando registros…</p>}
            {logsQuery.isError && <div className="p-6 text-center"><p className="font-semibold text-destructive">No se pudieron cargar los pesajes.</p><Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => void logsQuery.refetch()}>Reintentar</Button></div>}
            {!logsQuery.isLoading && !logsQuery.isError && logs.map((log) => <article key={log.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-bold">{new Date(`${log.logged_date}T12:00:00`).toLocaleDateString('es-MX')}</p><p className="text-sm text-muted-foreground">Turno {log.shift_number}</p></div>
                <strong className="text-lg tabular-nums text-amber-500">{Number(log.scrap_weight_kg).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</strong>
              </div>
              <div className="flex items-center gap-2 font-semibold"><Factory className="h-5 w-5 text-muted-foreground" />{log.loom?.loom_number ? `Telar ${log.loom.loom_number}` : log.loom?.name || 'Telar sin nombre'}</div>
              <dl className="grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-muted-foreground">Registró</dt><dd>{personName(log.updater || log.recorder)}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold text-muted-foreground">Observaciones</dt><dd className="break-words">{log.notes || 'Sin observaciones'}</dd></div>
              </dl>
              <Button type="button" variant="outline" onClick={() => editLog(log)} className="min-h-11 w-full gap-2"><Pencil className="h-4 w-4" />Editar registro</Button>
            </article>)}
            {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && <div className="p-8 text-center"><Scale className="mx-auto mb-2 h-7 w-7 text-muted-foreground" /><p className="font-semibold">Aún no hay pesajes para mostrar.</p><p className="mt-1 text-sm text-muted-foreground">Registra el peso real del telar al cierre del turno.</p></div>}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha / turno</th><th className="px-4 py-3">Telar</th><th className="px-4 py-3 text-right">Peso real</th><th className="px-4 py-3">Registró</th><th className="px-4 py-3">Observaciones</th><th className="px-4 py-3">Acción</th></tr></thead>
              <tbody className="divide-y divide-border">
                {logsQuery.isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando registros…</td></tr>}
                {logsQuery.isError && <tr><td colSpan={6} className="p-8 text-center"><p className="font-semibold text-destructive">No se pudieron cargar los pesajes.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void logsQuery.refetch()}>Reintentar</Button></td></tr>}
                {!logsQuery.isLoading && !logsQuery.isError && logs.map((log) => <tr key={log.id} className="align-middle hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3"><strong>{new Date(`${log.logged_date}T12:00:00`).toLocaleDateString('es-MX')}</strong><span className="ml-2 text-xs text-muted-foreground">Turno {log.shift_number}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><Factory className="h-4 w-4 text-muted-foreground" />{log.loom?.loom_number ? `Telar ${log.loom.loom_number}` : log.loom?.name || '—'}</span></td>
                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-amber-500">{Number(log.scrap_weight_kg).toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</td>
                  <td className="px-4 py-3 text-muted-foreground">{personName(log.updater || log.recorder)}</td>
                  <td className="max-w-56 truncate px-4 py-3 text-muted-foreground" title={log.notes || ''}>{log.notes || '—'}</td>
                  <td className="px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={() => editLog(log)} className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Editar</Button></td>
                </tr>)}
                {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && <tr><td colSpan={6} className="p-10 text-center"><Scale className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="font-semibold">Aún no hay pesajes para mostrar.</p><p className="mt-1 text-sm text-muted-foreground">Registra el peso real del telar al cierre del turno.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>}
    </main>
  );
};

export default TelaresScrapControlPage;
