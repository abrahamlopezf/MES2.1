import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../../store/authStore';
import { Card, CardContent, Icon } from '../../../../design-system';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { useExtruderQueuesQuery } from '../../../extrusion/hooks/useExtrusionFloorQueries';

const currency = (value: unknown) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown, digits = 1) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits }).format(Number(value || 0));

const ExtrusionAdminDashboard = ({ user, canViewFinancials }: { user: any; canViewFinancials: boolean }) => {
  const { data: queues = [], isLoading: loadingQueues, isError: queuesError, refetch: refetchQueues } = useExtruderQueuesQuery();
  const { data: wip, isLoading: loadingWip, isError: wipError, refetch: refetchWip } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'wip'],
    queryFn: async () => (await axiosClient.get('/extrusion/wip/inventory')).data.data,
    refetchInterval: 10000,
  });
  const { data: valuation, isLoading: loadingValuation, isError: valuationError, refetch: refetchValuation } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'valuation', canViewFinancials],
    queryFn: async () => (await axiosClient.get('/extrusion/valuation')).data.data,
    refetchInterval: 15000,
    enabled: canViewFinancials,
  });
  const { data: formulas = [], isLoading: loadingFormulas, isError: formulasError, refetch: refetchFormulas } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'formulas'],
    queryFn: async () => (await axiosClient.get('/extrusion/floor-formulas')).data.data,
    refetchInterval: 30000,
  });
  const { data: pendingRequests = [], isLoading: loadingRequests, isError: requestsError, refetch: refetchRequests } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'mix-requests'],
    queryFn: async () => (await axiosClient.get('/extrusion/mix-requests', { params: { status: 'SOLICITADA' } })).data.data,
    refetchInterval: 15000,
  });
  const { data: scrapLogs = [], isLoading: loadingScrap, isError: scrapError, refetch: refetchScrap } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'scrap'],
    queryFn: async () => (await axiosClient.get('/extrusion/scrap-logs', { params: { limit: 50 } })).data.data,
    refetchInterval: 30000,
  });

  const machines = (queues as any[]).map((group) => ({
    ...group,
    paused: Array.isArray(group.paused) ? group.paused : [],
    waiting: Array.isArray(group.waiting) ? group.waiting : [],
  }));
  const activeCount = machines.filter((machine) => machine.active).length;
  const waitingCount = machines.reduce((sum, machine) => sum + machine.waiting.length, 0);
  const pausedCount = machines.reduce((sum, machine) => sum + machine.paused.length, 0);
  const preparedKg = Number(wip?.mixtures_total_kg || 0);
  const materialWipKg = Number(wip?.total_kg || 0);
  const totalQueuedMixes = waitingCount + pausedCount;
  const activeFormulas = (formulas as any[]).filter((formula) => formula.is_active !== false).length;
  const estimatedScrapKg = (scrapLogs as any[]).reduce((sum, log) => sum + Number(log.scrap_weight_kg || log.estimated_weight_kg || 0), 0);
  const pendingScrapWeights = (scrapLogs as any[]).filter((log) => log.actual_weight_kg == null).length;
  const refresh = () => {
    void refetchQueues();
    void refetchWip();
    if (canViewFinancials) void refetchValuation();
    void refetchFormulas();
    void refetchRequests();
    void refetchScrap();
  };

  const failedConsultations = [
    queuesError && 'Colas de extrusoras',
    wipError && 'WIP de Extrusión',
    formulasError && 'Fórmulas',
    requestsError && 'Solicitudes de mezcla',
    scrapError && 'Merma / scrap',
    canViewFinancials && valuationError && 'Valuación',
  ].filter(Boolean);

  const kpis = [
    { label: 'Extrusoras trabajando', value: loadingQueues ? 'Cargando…' : queuesError ? '—' : `${activeCount} / ${machines.length}`, helper: queuesError ? 'No se pudo consultar el estado de las máquinas' : 'Con mezcla activa', icon: 'precision_manufacturing', tone: 'border-emerald-500' },
    { label: 'Mezclas en cola', value: loadingQueues ? 'Cargando…' : queuesError ? '—' : number(totalQueuedMixes, 0), helper: queuesError ? 'No se pudo consultar la cola' : `${waitingCount} en espera · ${pausedCount} pausadas`, icon: 'view_kanban', tone: 'border-sky-500' },
    { label: 'Mezcla preparada en WIP', value: loadingWip ? 'Cargando…' : wipError ? '—' : `${number(preparedKg)} kg`, helper: wipError ? 'No se pudo consultar el WIP' : `${number(wip?.mixtures?.length || 0, 0)} preparaciones con saldo`, icon: 'blender', tone: 'border-violet-500' },
    { label: 'Materiales en WIP', value: loadingWip ? 'Cargando…' : wipError ? '—' : `${number(materialWipKg)} kg`, helper: wipError ? 'No se pudo consultar el WIP' : `${number(wip?.items?.length || 0, 0)} lotes disponibles`, icon: 'inventory_2', tone: 'border-amber-500' },
    { label: 'Fórmulas activas', value: loadingFormulas ? 'Cargando…' : formulasError ? '—' : number(activeFormulas, 0), helper: formulasError ? 'No se pudo consultar el catálogo' : 'Disponibles para preparar mezcla', icon: 'science', tone: 'border-fuchsia-500' },
    { label: 'ODC de mezcla pendientes', value: loadingRequests ? 'Cargando…' : requestsError ? '—' : number((pendingRequests as any[]).length, 0), helper: requestsError ? 'No se pudieron consultar las solicitudes' : 'Solicitudes de surtimiento a Almacén', icon: 'assignment', tone: 'border-orange-500' },
    { label: 'Merma reciente registrada', value: loadingScrap ? 'Cargando…' : scrapError ? '—' : `${number(estimatedScrapKg)} kg`, helper: scrapError ? 'No se pudo consultar el historial reciente' : `${pendingScrapWeights} registros pendientes de pesaje · últimos 50`, icon: 'scale', tone: 'border-rose-500' },
  ];
  if (canViewFinancials) {
    kpis.push(
      { label: 'Valor total WIP Extrusión', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.total_extrusion_wip_value), helper: 'Mezclas en proceso y PTI en racks', icon: 'payments', tone: 'border-indigo-500', financial: true },
      { label: 'Valor de materiales en silos', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.silos_valuation?.total_value), helper: `${number(valuation?.silos_valuation?.total_stock_kg)} kg disponibles`, icon: 'warehouse', tone: 'border-teal-500', financial: true },
    );
  }

  return (
    <main className="extrusion-workspace min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              <Icon name="monitoring" size={32} className="shrink-0 text-primary" />
              Dashboard Ejecutivo · Extrusión
            </h1>
              <p className="mt-2 text-base font-medium text-muted-foreground">Hola, {user?.name || user?.first_name || 'Usuario'}. {canViewFinancials ? 'Estado de producción, WIP y costos exclusivos de Extrusión.' : 'Estado de producción y WIP de Extrusión.'}</p>
          </div>
          <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 font-bold text-foreground hover:bg-muted" aria-label="Actualizar información">
            <Icon name="refresh" size={18} /> Actualizar
          </button>
        </header>

        {failedConsultations.length > 0 && (
          <div role="alert" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <p>Algunas consultas de Extrusión no respondieron: {failedConsultations.join(', ')}. Los demás indicadores siguen disponibles; puedes actualizar para reintentar.</p>
          </div>
        )}

        <section aria-label="Indicadores ejecutivos de Extrusión" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className={`border-b-4 ${kpi.tone} shadow-sm`}>
              <CardContent className="flex min-h-36 items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 break-words text-2xl font-black tabular-nums text-foreground">{kpi.value}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{kpi.helper}</p>
                </div>
                <Icon name={kpi.icon} size={22} className="shrink-0 text-primary" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className={`grid grid-cols-1 gap-5 ${canViewFinancials ? 'xl:grid-cols-[1.4fr_1fr]' : ''}`}>
          <Card className="overflow-hidden border-border shadow-sm">
            <div className="border-b border-border p-5">
              <h2 className="text-lg font-black text-foreground">Producción por extrusora</h2>
              <p className="mt-1 text-sm text-muted-foreground">Mezcla activa, prioridad pausada y carga pendiente por máquina.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-4">Máquina</th><th className="p-4">Activa</th><th className="p-4">En espera</th><th className="p-4">Pausadas</th><th className="p-4">Estado</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {machines.map((machine) => (
                    <tr key={machine.machine?.id || machine.machine?.code}>
                      <td className="p-4 font-bold text-foreground">{machine.machine?.name || machine.machine?.code || 'Extrusora'}</td>
                      <td className="p-4 text-foreground">{machine.active?.formula?.name || machine.active?.formula_name || '—'}</td>
                      <td className="p-4 tabular-nums text-foreground">{machine.waiting.length}</td>
                      <td className="p-4 tabular-nums text-foreground">{machine.paused.length}</td>
                      <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${machine.active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{machine.active ? 'PRODUCIENDO' : machine.waiting.length ? 'EN COLA' : 'DISPONIBLE'}</span></td>
                    </tr>
                  ))}
                  {!loadingQueues && machines.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{queuesError ? 'No se pudo consultar el estado de las extrusoras.' : 'No hay extrusoras activas registradas.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          {canViewFinancials && <Card className="border-border shadow-sm">
            <div className="border-b border-border p-5">
              <h2 className="text-lg font-black text-foreground">WIP y valuación</h2>
              <p className="mt-1 text-sm text-muted-foreground">Inventario de proceso, mezclas preparadas y costo estimado vigente.</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-4"><span className="font-semibold text-muted-foreground">Mezclas con existencia</span><strong className="text-foreground">{number(wip?.mixtures?.length || 0, 0)}</strong></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-4"><span className="font-semibold text-muted-foreground">PTI en racks</span><strong className="text-foreground">{number(valuation?.racks_count || 0, 0)} racks · {currency(valuation?.pti_racks_value)}</strong></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-4"><span className="font-semibold text-muted-foreground">Mezclas activas</span><strong className="text-foreground">{currency(valuation?.active_mixes_value)}</strong></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-4"><span className="font-semibold text-muted-foreground">Mezclas en cola</span><strong className="text-foreground">{currency(valuation?.queued_mixes_value)}</strong></div>
              {Number(valuation?.pending_mix_valuations_count || 0) > 0 && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-200">Hay {number(valuation.pending_mix_valuations_count, 0)} mezclas pendientes de valuación por falta de costos completos de lote.</p>}
            </div>
          </Card>}
        </section>

        <section aria-label="Accesos del área" className="flex flex-wrap gap-3">
          <Link to="/extrusion/board" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Abrir tablero de colas</Link>
          <Link to="/extrusion/wip" className="rounded-xl border border-border px-5 py-3 font-bold text-foreground hover:bg-muted">Consultar WIP</Link>
          <Link to="/extrusion/scrap-control" className="rounded-xl border border-border px-5 py-3 font-bold text-foreground hover:bg-muted">Control de merma / scrap</Link>
        </section>
      </div>
    </main>
  );
};

export const ExtrusionDashboard = () => {
  const { user } = useAuthStore();
  const roleCode = String(typeof user?.role === 'string' ? user.role : user?.role?.code || '').toUpperCase();
  const isExtrusionAdmin = ['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode);
  const isExtrusionSupervisor = roleCode === 'SUPERVISOR_EXTRUSION';
  if (isExtrusionAdmin || isExtrusionSupervisor) {
    return <ExtrusionAdminDashboard user={user} canViewFinancials={isExtrusionAdmin} />;
  }

  return (
    <main className="extrusion-workspace min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            <Icon name="monitoring" size={32} className="shrink-0 text-primary" />
            Módulo de Extrusión
          </h1>
          <p className="text-base font-medium leading-relaxed text-muted-foreground">
            Hola, {user?.name || 'Usuario'}. Consulta las áreas operativas para revisar información vigente.
          </p>
        </header>

        <section aria-labelledby="dashboard-data-title" role="status" className="rounded-xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100 sm:p-6">
          <div className="flex items-start gap-3">
            <Icon name="info" size={24} className="mt-0.5 shrink-0" />
            <div className="max-w-3xl space-y-2">
              <h2 id="dashboard-data-title" className="text-lg font-black sm:text-xl">Panel ejecutivo sin datos conectados</h2>
              <p className="text-base leading-relaxed">
                Este tablero aún no recibe indicadores operativos del sistema. Para evitar decisiones basadas en cifras de ejemplo, aquí no se muestran métricas ni estados simulados.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="operations-title" className="space-y-3">
          <h2 id="operations-title" className="text-xl font-black text-foreground">Ir a operación</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-border shadow-sm">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="view_kanban" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Tablero de colas</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Consulta y organiza los lotes asignados a las extrusoras.</p>
                </div>
                <Link to="/extrusion/board" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Abrir tablero
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="precision_manufacturing" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Extrusoras</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Revisa disponibilidad y fórmulas compatibles.</p>
                </div>
                <Link to="/production/machines" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border px-6 text-base font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Ver extrusoras
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm sm:col-span-2 xl:col-span-1">
              <CardContent className="flex h-full flex-col items-start gap-4 p-5 sm:p-6">
                <Icon name="blender" size={28} className="text-primary" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Centro de mezclado</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">Prepara mezclas y consulta etiquetas de contenedores.</p>
                </div>
                <Link to="/production/mixing" className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border px-6 text-base font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
                  Abrir mezclado
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};
