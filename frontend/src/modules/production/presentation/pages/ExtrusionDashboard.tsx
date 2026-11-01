import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../../store/authStore';
import { Card, CardContent, Icon } from '../../../../design-system';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { useExtruderQueuesQuery } from '../../../extrusion/hooks/useExtrusionFloorQueries';
import { canViewCosts, isAdminUser } from '../../../../utils/authHelpers';
import { useThemeStore } from '../../../../store/themeStore';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';

const currency = (value: unknown) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown, digits = 1) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits }).format(Number(value || 0));
const formatConsultedAt = (timestamp: number) => timestamp > 0
  ? new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(timestamp)
  : 'Consultando…';
const formatDashboardDate = (date: string) => new Intl.DateTimeFormat('es-MX', {
  weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00.000Z`));

const ExtrusionAdminDashboard = ({ user, canViewFinancials }: { user: any; canViewFinancials: boolean }) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? '#475569' : '#e2e8f0';
  const tooltipBackground = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#475569' : '#cbd5e1';
  const { data: queues = [], isLoading: loadingQueues, isError: queuesError, dataUpdatedAt: queuesUpdatedAt, refetch: refetchQueues } = useExtruderQueuesQuery();
  const { data: wip, isLoading: loadingWip, isError: wipError, dataUpdatedAt: wipUpdatedAt, refetch: refetchWip } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'wip'],
    queryFn: async () => (await axiosClient.get('/extrusion/wip/inventory')).data.data,
    refetchInterval: 10000,
  });
  const { data: valuation, isLoading: loadingValuation, isError: valuationError, dataUpdatedAt: valuationUpdatedAt, refetch: refetchValuation } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'valuation', canViewFinancials],
    queryFn: async () => (await axiosClient.get('/extrusion/valuation')).data.data,
    refetchInterval: 15000,
    enabled: canViewFinancials,
  });
  const { data: formulas = [], isLoading: loadingFormulas, isError: formulasError, dataUpdatedAt: formulasUpdatedAt, refetch: refetchFormulas } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'formulas'],
    queryFn: async () => (await axiosClient.get('/extrusion/floor-formulas')).data.data,
    refetchInterval: 30000,
  });
  const { data: pendingRequests = [], isLoading: loadingRequests, isError: requestsError, dataUpdatedAt: requestsUpdatedAt, refetch: refetchRequests } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'mix-requests'],
    queryFn: async () => (await axiosClient.get('/extrusion/mix-requests', { params: { status: 'SOLICITADA' } })).data.data,
    refetchInterval: 15000,
  });
  const { data: dashboardMetrics, isLoading: loadingMetrics, isError: metricsError, dataUpdatedAt: metricsUpdatedAt, refetch: refetchMetrics } = useQuery({
    queryKey: ['extrusion', 'admin-dashboard', 'metrics'],
    queryFn: async () => (await axiosClient.get('/extrusion/dashboard/metrics')).data.data,
    refetchInterval: 60000,
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
  const dailyMetrics = dashboardMetrics?.daily || [];
  const pendingScrapWeights = Number(dashboardMetrics?.pending_scrap_weights || 0);
  const todayPtiWeighedKg = Number(dailyMetrics[dailyMetrics.length - 1]?.pti_weighed_kg || 0);
  const dailyChartRows = dailyMetrics.map((day: any) => ({ ...day, label: formatDashboardDate(String(day.date)) }));
  const wipValueSlices = [
    { name: 'Mezclas en cola', value: Number(valuation?.queued_mixes_value || 0), color: isDark ? '#60a5fa' : '#1d4ed8' },
    { name: 'Mezclas en extrusoras', value: Number(valuation?.active_mixes_value || 0), color: isDark ? '#34d399' : '#15803d' },
    { name: 'PTI en racks', value: Number(valuation?.pti_racks_value || 0), color: isDark ? '#a78bfa' : '#6d28d9' },
  ];
  const fetchedTimestamps = [
    queuesUpdatedAt,
    wipUpdatedAt,
    formulasUpdatedAt,
    requestsUpdatedAt,
    metricsUpdatedAt,
    ...(canViewFinancials ? [valuationUpdatedAt] : []),
  ].filter((timestamp) => timestamp > 0);
  const dataAsOf = fetchedTimestamps.length > 0 ? Math.min(...fetchedTimestamps) : 0;
  const refresh = () => {
    void refetchQueues();
    void refetchWip();
    if (canViewFinancials) void refetchValuation();
    void refetchFormulas();
    void refetchRequests();
    void refetchMetrics();
  };

  const failedConsultations = [
    queuesError && 'Colas de extrusoras',
    wipError && 'WIP de Extrusión',
    formulasError && 'Fórmulas',
    requestsError && 'Solicitudes de mezcla',
    metricsError && 'Indicadores de producción y merma',
    canViewFinancials && valuationError && 'Valuación',
  ].filter(Boolean);

  const executiveKpis = [
    { label: 'Extrusoras trabajando', value: loadingQueues ? 'Cargando…' : queuesError ? '—' : `${activeCount} / ${machines.length}`, helper: queuesError ? 'No se pudo consultar el piso' : 'Máquinas con mezcla activa', icon: 'precision_manufacturing', accent: 'border-emerald-500' },
    { label: 'Mezclas en espera o pausa', value: loadingQueues ? 'Cargando…' : queuesError ? '—' : number(totalQueuedMixes, 0), helper: queuesError ? 'No se pudo consultar la cola' : `${waitingCount} en espera · ${pausedCount} pausadas`, icon: 'view_kanban', accent: 'border-amber-500' },
    { label: 'Mezcla preparada disponible', value: loadingWip ? 'Cargando…' : wipError ? '—' : `${number(preparedKg)} kg`, helper: wipError ? 'No se pudo consultar el WIP' : `${number(wip?.mixtures?.length || 0, 0)} preparaciones con saldo`, icon: 'blender', accent: 'border-sky-500' },
    { label: 'PTI pesado hoy', value: loadingMetrics ? 'Cargando…' : metricsError ? '—' : `${number(todayPtiWeighedKg)} kg`, helper: metricsError ? 'No se pudo consultar producción' : 'Ingreso confirmado por báscula', icon: 'inventory_2', accent: 'border-primary' },
    { label: 'Merma pendiente de pesar', value: loadingMetrics ? 'Cargando…' : metricsError ? '—' : number(pendingScrapWeights, 0), helper: metricsError ? 'No se pudo consultar la merma' : 'Eventos abiertos de los últimos 7 días', icon: 'scale', accent: 'border-rose-500' },
  ];

  const financialKpis = [
    { label: 'WIP total de Extrusión', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.total_extrusion_wip_value), helper: 'Mezclas en proceso y PTI en racks', icon: 'payments', accent: 'border-primary' },
    { label: 'Mezclas en cola', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.queued_mixes_value), helper: `${number(valuation?.queued_items_count || 0, 0)} mezclas por procesar`, icon: 'view_kanban', accent: 'border-sky-500' },
    { label: 'Mezclas en extrusoras', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.active_mixes_value), helper: `${number(valuation?.active_items_count || 0, 0)} mezclas activas`, icon: 'precision_manufacturing', accent: 'border-emerald-500' },
    { label: 'PTI en racks', value: loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.pti_racks_value), helper: `${number(valuation?.racks_count || 0, 0)} racks registrados`, icon: 'inventory_2', accent: 'border-violet-500' },
  ];
  const visibleKpis = canViewFinancials ? financialKpis : executiveKpis;

  const supportingKpis = [
    { label: 'Materiales en WIP', value: loadingWip ? 'Cargando…' : wipError ? '—' : `${number(materialWipKg)} kg`, helper: wipError ? 'No se pudo consultar el WIP' : `${number(wip?.items?.length || 0, 0)} lotes disponibles`, icon: 'inventory_2' },
    { label: 'Fórmulas activas', value: loadingFormulas ? 'Cargando…' : formulasError ? '—' : number(activeFormulas, 0), helper: formulasError ? 'No se pudo consultar el catálogo' : 'Disponibles para preparar mezcla', icon: 'science' },
    { label: 'Solicitudes de mezcla pendientes', value: loadingRequests ? 'Cargando…' : requestsError ? '—' : number((pendingRequests as any[]).length, 0), helper: requestsError ? 'No se pudieron consultar' : 'Surtimiento solicitado a Almacén', icon: 'assignment' },
  ];

  return (
    <main className="extrusion-workspace min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-border border-l-4 border-l-primary bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              <Icon name="monitoring" size={32} className="shrink-0 text-primary" />
              Extrusión · Centro de control
            </h1>
              <p className="mt-2 text-base font-medium text-muted-foreground">Hola, {user?.name || user?.first_name || 'Usuario'}. Piso en tiempo real e indicadores para decidir la operación.</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground" aria-live="off">
                Actualizado {formatConsultedAt(dataAsOf)}{failedConsultations.length > 0 ? ' · Información parcial' : ' · Actualización automática'}
              </p>
          </div>
          <button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 font-bold text-foreground hover:bg-muted" aria-label="Actualizar información">
            <Icon name="refresh" size={18} /> Actualizar
          </button>
        </header>

        {failedConsultations.length > 0 && (
          <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-base font-semibold text-warning">
            <p>No se pudo actualizar: {failedConsultations.join(', ')}. Los demás indicadores siguen disponibles.</p>
          </div>
        )}

        <section aria-label={canViewFinancials ? 'Valuación ejecutiva de Extrusión' : 'Indicadores ejecutivos de Extrusión'} className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canViewFinancials ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
          {visibleKpis.map((kpi) => (
            <Card key={kpi.label} className={`border border-border border-l-4 ${kpi.accent} bg-card shadow-sm`}>
              <CardContent className="flex min-h-32 items-start justify-between gap-3 p-4 sm:min-h-36 sm:p-5">
                <div className="min-w-0">
                  <p className="text-base font-bold leading-snug text-foreground">{kpi.label}</p>
                  <p className="mt-2 break-words text-2xl font-black tabular-nums text-foreground">{kpi.value}</p>
                  <p className="mt-2 text-sm font-medium leading-snug text-muted-foreground">{kpi.helper}</p>
                </div>
                <span className="hidden shrink-0 rounded-lg bg-primary/10 p-2 text-primary sm:block"><Icon name={kpi.icon} size={22} /></span>
              </CardContent>
            </Card>
          ))}
        </section>

        {canViewFinancials && !loadingValuation && !valuationError && Number(valuation?.pending_mix_valuations_count || 0) > 0 && (
          <p role="status" className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-base font-semibold text-warning">
            La valuación total no incluye {number(valuation.pending_mix_valuations_count, 0)} {Number(valuation.pending_mix_valuations_count) === 1 ? 'mezcla pendiente de costo' : 'mezclas pendientes de costo'}.
          </p>
        )}

        <section aria-labelledby="extrusion-report-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="extrusion-report-title" className="text-xl font-black">Tendencia del área</h2><p className="mt-1 text-base text-muted-foreground">Últimos 7 días · cantidades calculadas en el sistema.</p></div>
            <Link to="/extrusion/scrap-control" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-bold hover:bg-muted">Abrir control de merma</Link>
          </div>
          <div className={`grid gap-4 ${canViewFinancials ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
            <Card className="border-border shadow-sm">
              <div className="border-b border-border p-4 sm:p-5"><h3 className="text-lg font-black">Ingreso de PTI a racks</h3><p className="mt-1 text-sm text-muted-foreground">Distingue el peso de báscula de las estimaciones.</p></div>
              <div className="p-3 sm:p-4">
                {metricsError || loadingMetrics || dailyChartRows.every((day: any) => Number(day.pti_entries) === 0) ? <p className="flex min-h-64 items-center justify-center text-center text-base text-muted-foreground">{loadingMetrics ? 'Cargando tendencia…' : metricsError ? 'No se pudo consultar la producción.' : 'Sin ingresos PTI registrados en este periodo.'}</p>
                  : <div role="img" aria-label="Gráfica diaria de PTI pesado en báscula y peso estimado durante los últimos siete días">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dailyChartRows} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={axisColor} tick={{ fill: axisColor, fontSize: 13 }} tickLine={false} axisLine={false} />
                        <YAxis width={58} stroke={axisColor} tick={{ fill: axisColor, fontSize: 13 }} tickLine={false} axisLine={false} tickFormatter={(value) => number(value, 0)} />
                        <RechartsTooltip contentStyle={{ background: tooltipBackground, borderColor: tooltipBorder, color: axisColor, borderRadius: 12, fontSize: 14 }} formatter={(value: any, name: any) => [`${number(value)} kg`, name]} />
                        <Legend wrapperStyle={{ fontSize: 14, paddingTop: 8 }} />
                        <Bar dataKey="pti_weighed_kg" name="Báscula" stackId="pti" fill={isDark ? '#34d399' : '#15803d'} isAnimationActive={false} />
                        <Bar dataKey="pti_estimated_kg" name="Estimado" stackId="pti" fill={isDark ? '#818cf8' : '#4338ca'} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
              </div>
            </Card>

            <Card className="border-border shadow-sm">
              <div className="border-b border-border p-4 sm:p-5"><h3 className="text-lg font-black">Tendencia de merma</h3><p className="mt-1 text-sm text-muted-foreground">Estimado frente al peso real de turnos cerrados.</p></div>
              <div className="p-3 sm:p-4">
                {metricsError || loadingMetrics || dailyChartRows.every((day: any) => Number(day.closed_shifts) === 0) ? <p className="flex min-h-64 items-center justify-center text-center text-base text-muted-foreground">{loadingMetrics ? 'Cargando tendencia…' : metricsError ? 'No se pudo consultar la merma.' : 'Aún no hay cierres de turno en este periodo.'}</p>
                  : <div role="img" aria-label="Gráfica diaria de merma estimada comparada con merma real de turnos cerrados">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyChartRows} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" stroke={axisColor} tick={{ fill: axisColor, fontSize: 13 }} tickLine={false} axisLine={false} />
                        <YAxis width={58} stroke={axisColor} tick={{ fill: axisColor, fontSize: 13 }} tickLine={false} axisLine={false} tickFormatter={(value) => number(value, 0)} />
                        <RechartsTooltip contentStyle={{ background: tooltipBackground, borderColor: tooltipBorder, color: axisColor, borderRadius: 12, fontSize: 14 }} formatter={(value: any, name: string) => [`${number(value)} kg`, name]} />
                        <Legend wrapperStyle={{ fontSize: 14, paddingTop: 8 }} />
                        <Area type="monotone" dataKey="estimated_scrap_kg" name="Estimado" stroke={isDark ? '#fbbf24' : '#92400e'} strokeWidth={3} fill={isDark ? '#fbbf24' : '#f59e0b'} fillOpacity={0.12} isAnimationActive={false} />
                        <Area type="monotone" dataKey="actual_scrap_kg" name="Real" stroke={isDark ? '#f87171' : '#b91c1c'} strokeWidth={3} fill={isDark ? '#f87171' : '#ef4444'} fillOpacity={0.14} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>}
              </div>
            </Card>

            {canViewFinancials && <Card className="border-border shadow-sm">
              <div className="border-b border-border p-4 sm:p-5"><h3 className="text-lg font-black">Distribución del valor WIP</h3><p className="mt-1 text-sm text-muted-foreground">Mezclas en cola, en extrusoras y PTI en racks.</p></div>
              <div className="p-3 sm:p-4">
                {loadingValuation || valuationError || wipValueSlices.every((slice) => slice.value <= 0) ? <p className="flex min-h-64 items-center justify-center text-center text-base text-muted-foreground">{loadingValuation ? 'Cargando valuación…' : valuationError ? 'No se pudo consultar la valuación.' : 'Sin valor WIP disponible para distribuir.'}</p>
                  : <div role="img" aria-label="Gráfica de pastel con la distribución del valor WIP entre mezclas en cola, mezclas en extrusoras y PTI en racks">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Pie data={wipValueSlices} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={58} outerRadius={94} paddingAngle={4} isAnimationActive={false}>
                          {wipValueSlices.map((slice) => <Cell key={slice.name} fill={slice.color} stroke="transparent" />)}
                        </Pie>
                        <Legend verticalAlign="bottom" height={42} iconType="circle" wrapperStyle={{ fontSize: 14 }} />
                        <RechartsTooltip contentStyle={{ background: tooltipBackground, borderColor: tooltipBorder, color: axisColor, borderRadius: 12, fontSize: 14 }} formatter={(value: any) => [currency(value), 'Valor']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>}
              </div>
            </Card>}
          </div>
        </section>

        <section aria-labelledby="extrusion-floor-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="extrusion-floor-title" className="text-xl font-black text-foreground">Extrusoras en piso</h2>
              <p className="mt-1 text-base text-muted-foreground">Estado, mezcla activa y carga pendiente por máquina.</p>
            </div>
            <Link to="/extrusion/board" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-bold hover:bg-muted">Abrir tablero de colas</Link>
          </div>
          <div>
            {queuesError ? <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-base text-danger">No se pudo consultar el estado de las extrusoras.</p>
              : loadingQueues ? <p role="status" className="rounded-xl border border-border bg-card p-5 text-base text-muted-foreground">Cargando estado de piso…</p>
                : machines.length === 0 ? <p className="rounded-xl border border-dashed border-border bg-card p-5 text-base text-muted-foreground">No hay extrusoras activas registradas.</p>
                  : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {machines.map((machine) => {
                      const isRunning = Boolean(machine.active);
                      const isPaused = machine.paused.length > 0;
                      const stateLabel = isRunning ? 'EN PRODUCCIÓN' : isPaused ? 'PAUSADA' : machine.waiting.length ? 'CON COLA' : 'DISPONIBLE';
                      const stateTone = isRunning ? 'border-success/40 bg-success/10 text-success' : isPaused ? 'border-warning/40 bg-warning/10 text-warning' : machine.waiting.length ? 'border-info/40 bg-info/10 text-info' : 'border-border bg-muted/50 text-muted-foreground';
                      const activeFormula = machine.active_formula_group?.formula_name || machine.active?.formula?.name || machine.active?.formula_name;
                      return <Card key={machine.machine?.id || machine.machine?.code} className="border-border shadow-sm">
                        <CardContent className="space-y-3 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="text-sm font-semibold text-muted-foreground">{machine.machine?.code || 'Extrusora'}</p><h3 className="text-lg font-black">{machine.machine?.name || machine.machine?.code}</h3></div>
                            <span className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-bold ${stateTone}`}>{stateLabel}</span>
                          </div>
                          <div className="min-h-14 rounded-lg bg-muted/40 p-3">
                            <p className="text-sm font-semibold text-muted-foreground">Mezcla activa</p>
                            <p className="mt-1 line-clamp-2 text-base font-bold">{activeFormula || (isPaused ? 'Sin mezcla en proceso' : 'Sin mezcla activa')}</p>
                            {machine.active_formula_group?.output_pti_color && <p className="text-sm text-muted-foreground">Color: {machine.active_formula_group.output_pti_color}</p>}
                            {machine.active_formula_group && <p className="mt-1 text-sm font-semibold text-foreground">Saldo del grupo: {number(machine.active_formula_group.quantity_kg)} kg</p>}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm font-semibold">
                            {machine.active_formula_group && <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">{number(machine.active_formula_group.batch_count, 0)} contenedor(es)</span>}
                            <span className="rounded-md bg-muted px-2.5 py-1">{number(machine.waiting.length, 0)} en espera</span>
                            <span className="rounded-md bg-muted px-2.5 py-1">{number(machine.paused.length, 0)} pausada(s)</span>
                          </div>
                        </CardContent>
                      </Card>;
                    })}
                  </div>}
          </div>
        </section>

        <details className="group rounded-xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 text-base font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>Ver otros indicadores y datos de inventario</span>
            <Icon name="expand_more" size={22} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-5 border-t border-border p-4 sm:p-5">
            <section aria-label="Indicadores complementarios" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {supportingKpis.map((kpi) => (
                <Card key={kpi.label} className="border-border bg-muted/20 shadow-none">
                  <CardContent className="flex min-h-28 items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-foreground">{kpi.label}</p>
                      <p className="mt-2 break-words text-xl font-black tabular-nums text-foreground">{kpi.value}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{kpi.helper}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"><Icon name={kpi.icon} size={20} /></span>
                  </CardContent>
                </Card>
              ))}
            </section>

            {canViewFinancials && <section aria-labelledby="silo-valuation-title" className="rounded-xl border border-border">
              <div className="border-b border-border p-4 sm:p-5"><h2 id="silo-valuation-title" className="text-lg font-black text-foreground">Materiales en silos</h2><p className="mt-1 text-sm text-muted-foreground">Inventario de materia prima con costo registrado.</p></div>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
                  <div><p className="font-semibold text-muted-foreground">Existencia disponible</p><p className="mt-1 text-sm text-muted-foreground">{number(valuation?.silos_valuation?.total_stock_kg)} kg</p></div>
                  <strong className="text-xl font-black text-foreground">{loadingValuation ? 'Cargando…' : valuationError ? '—' : currency(valuation?.silos_valuation?.total_value)}</strong>
                </div>
              </div>
            </section>}
          </div>
        </details>

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
  const isGlobalAdmin = isAdminUser(user);
  if (isExtrusionAdmin || isExtrusionSupervisor || isGlobalAdmin) {
    return <ExtrusionAdminDashboard user={user} canViewFinancials={canViewCosts(user)} />;
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
