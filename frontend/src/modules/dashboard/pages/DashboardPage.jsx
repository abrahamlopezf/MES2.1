import { useState } from 'react';
import CollapsibleFilterPanel from '@/components/shared/CollapsibleFilterPanel';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  Cell, ComposedChart, Legend
} from 'recharts';
import { 
  AlertCircle, PackageCheck, DollarSign, Activity, 
  TrendingUp, Settings2, Boxes, ArrowRight,
  Layers, AlertTriangle, Factory, Wind
} from '@/design-system/components/Icon/googleIconCompat';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Card, Badge } from '../../../design-system';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';
import { WarehouseDashboard } from '../../warehouse/presentation/pages/WarehouseDashboard';
import { ExtrusionDashboard } from '../../production/presentation/pages/ExtrusionDashboard';
import { TelaresDashboard } from '../../telares/presentation/pages/TelaresDashboard';
import GloboWipPage from '../../globo/pages/GloboWipPage';
import LaminadoWipPage from '../../laminado/pages/LaminadoWipPage';
import { getUserAreaCode } from '../../../utils/authHelpers';


const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// KPI Card para la cabecera ejecutiva
const ExecutiveKpiCard = ({ title, value, isCurrency, unit = '', colorClass, icon: Icon, subtitle, onClick }) => {
  return (
    <Card 
      onClick={onClick}
      className={`flex flex-col justify-between p-5 shadow-sm border-b-4 ${colorClass} relative overflow-hidden min-h-[156px] ${onClick ? 'cursor-pointer hover:opacity-95 transition-all' : ''}`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
        {Icon && <Icon className="w-24 h-24" />}
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-foreground text-base leading-snug font-bold relative z-10">
            {title}
          </p>
          {Icon && <Icon className="size-4 text-muted-foreground opacity-60 shrink-0" />}
        </div>
        <p className="text-2xl 2xl:text-3xl font-black text-foreground tracking-tight leading-tight tabular-nums relative z-10 break-words" title={isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}>
          {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}
          {unit && !isCurrency && <span className="text-lg font-bold text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>
      {subtitle && (
        <p className="text-sm leading-snug font-semibold text-muted-foreground relative z-10 mt-3">
          {subtitle}
        </p>
      )}
    </Card>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [selectedArea, setSelectedArea] = useState('GENERAL');

  const roleCode = String(typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  const isExecutive = ['ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'SUPERADMIN'].includes(roleCode);

  const axisColor = isDark ? '#e4e4e7' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';

  // 1. Dashboard Financiero (Central para Ejecutivos)
  const { data: finData, isLoading: isLoadingFin } = useQuery({
    queryKey: ['dashboard', 'financial'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/dashboard/financial');
        return response.data?.data || response.data || {};
      } catch (e) {
        return {};
      }
    },
    enabled: isExecutive,
    refetchInterval: 30000,
  });

  const { data: areaOverview, isLoading: isLoadingAreaOverview } = useQuery({
    queryKey: ['dashboard', 'area-overview'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/area-overview');
      return response.data?.data || response.data || {};
    },
    enabled: isExecutive,
    refetchInterval: 30000,
  });

  // Roles operativos y supervisores van a su dashboard operativo correspondiente (sin costos)
  if (!isExecutive) {
    const userArea = getUserAreaCode(user);
    if (userArea === 'EXTRUSION') {
      return <ExtrusionDashboard />;
    }
    if (userArea === 'GLOBO') {
      return <GloboWipPage />;
    }
    if (userArea === 'LAMINADO') {
      return <LaminadoWipPage />;
    }
    if (userArea === 'TELARES') {
      return <TelaresDashboard />;
    }
    return <WarehouseDashboard />;
  }

  if (isLoadingFin || isLoadingAreaOverview) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <p className="text-xl text-foreground opacity-60 font-bold animate-pulse">Cargando Visión Ejecutiva...</p>
      </div>
    );
  }

  const kpisFin = finData?.kpis || {};
  const currentInventoryValue = kpisFin.currentInventoryValue ?? 0;
  const totalLoss = kpisFin.totalLoss ?? ((kpisFin.totalLostScrap || 0) + (kpisFin.totalLostMerma || 0) + (kpisFin.totalLostBaja || 0));
  const totalInvested = kpisFin.totalInvested ?? 0;
  const totalEntradas = kpisFin.totalEntradas ?? 0;
  const bajasRegistradas = kpisFin.bajasRegistradas ?? 0;
  const materialesStockBajo = kpisFin.materialesStockBajo ?? 0;
  const areaInventoryValues = finData?.charts?.inventoryByArea || [];
  const normalizeAreaName = (name) => String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  const getAreaInventoryValue = (areaName) => {
    const expectedName = normalizeAreaName(areaName);
    return Number(areaInventoryValues.find(({ name }) => normalizeAreaName(name) === expectedName)?.value || 0);
  };

  // Datos financieros del área enfocada y etiquetas de áreas planificadas.
  const monthlyFinancialFromBackend = finData?.charts?.monthlyFinancial;
  const scrapSummary = finData?.charts?.scrapSummary || {};
  const scrapByMonth = finData?.charts?.scrapByMonth || [];
  const scrapByArea = finData?.charts?.scrapByArea || [];
  const areaInventoryChart = areaInventoryValues
    .map(({ name, value, has_value }) => ({ name, value: Number(value || 0), has_value }))
    .sort((a, b) => b.value - a.value);
  const hasAreaInventoryData = areaInventoryChart.some(({ value }) => value > 0);
  const hasScrapTrend = scrapByMonth.some(({ actual_kg, estimated_kg }) => Number(actual_kg || 0) > 0 || Number(estimated_kg || 0) > 0);
  const areaCards = [
    {
      key: 'extrusion', title: 'Extrusión', icon: Settings2, tone: 'text-indigo-500 bg-indigo-500/10',
      metrics: (area) => [
        ['Valor registrado', formatCurrency(getAreaInventoryValue('Extrusión'))],
        ['Material en WIP', `${Number(area.wip_kg || 0).toLocaleString('es-MX')} kg`],
        ['Mezclas disponibles', `${area.active_mixtures || 0} · ${Number(area.mixtures_kg || 0).toLocaleString('es-MX')} kg`],
      ],
    },
    {
      key: 'telares', title: 'Telares', icon: Factory, tone: 'text-blue-500 bg-blue-500/10',
      metrics: (area) => [
        ['Valor registrado', formatCurrency(getAreaInventoryValue('Telares'))],
        ['WIP en telares', `${Number(area.total_wip_kg || 0).toLocaleString('es-MX')} kg`],
        ['Telares activos', `${area.total_looms_active || 0} / ${area.total_looms_count || 0}`],
        ['Ocupación de filetas', `${area.avg_creel_utilization_pct || 0}%`],
      ],
    },
    {
      key: 'globo', title: 'Globo', icon: Wind, tone: 'text-orange-500 bg-orange-500/10',
      metrics: (area) => [
        ['Valor registrado', formatCurrency(getAreaInventoryValue('Globo'))],
        ['Rollos en proceso', `${area.rolls_in_floor || 0}`],
        ['Rollos por recibir', `${area.rolls_incoming || 0}`],
        ['Tela en piso', `${Number(area.fabric_kg || 0).toLocaleString('es-MX')} kg · ${Number(area.meters_in_floor || 0).toLocaleString('es-MX')} m`],
        ['Materiales en WIP', `${Number(area.materials_kg || 0).toLocaleString('es-MX')} kg`],
      ],
    },
    {
      key: 'laminado', title: 'Laminado', icon: Layers, tone: 'text-amber-500 bg-amber-500/10',
      metrics: (area) => [
        ['Valor registrado', formatCurrency(getAreaInventoryValue('Laminado'))],
        ['Rollos en proceso', `${area.rolls_in_floor || 0}`],
        ['Rollos por recibir', `${area.rolls_incoming || 0}`],
        ['Tela en piso', `${Number(area.fabric_kg || 0).toLocaleString('es-MX')} kg · ${Number(area.meters_in_floor || 0).toLocaleString('es-MX')} m`],
        ['Materiales en WIP', `${Number(area.materials_kg || 0).toLocaleString('es-MX')} kg`],
      ],
    },
  ];

  const dashboardAreas = [
    { key: 'GENERAL', title: 'General', icon: Activity },
    { key: 'almacen', title: 'Almacén', icon: Boxes },
    ...areaCards.map(({ key, title, icon }) => ({ key, title, icon })),
  ];
  const focusedArea = areaCards.find(({ key }) => key === selectedArea);
  const focusedAreaData = focusedArea ? areaOverview?.[focusedArea.key] : null;
  const focusedAreaAvailable = selectedArea === 'almacen'
    ? Object.keys(kpisFin).length > 0
    : Boolean(focusedAreaData?.available);
  const focusedAreaTitle = selectedArea === 'almacen' ? 'Almacén' : focusedArea?.title;
  const focusedAreaValue = selectedArea === 'almacen'
    ? Number(kpisFin.warehouseCustodyValue ?? currentInventoryValue)
    : getAreaInventoryValue(focusedAreaTitle);
  const focusedAreaKpis = selectedArea === 'almacen'
    ? [
        { label: 'Valor bajo custodia', value: formatCurrency(kpisFin.warehouseCustodyValue ?? currentInventoryValue), context: 'Lotes y silos valorizados' },
        { label: 'Inventario en lotes', value: formatCurrency(kpisFin.warehouseInventoryValue ?? 0), context: 'Existencia disponible en almacén' },
        { label: 'Inventario en silos', value: formatCurrency(kpisFin.silosInventoryValue ?? 0), context: 'Materia prima bajo custodia' },
        { label: 'Materiales bajo mínimo', value: Number(materialesStockBajo).toLocaleString('es-MX'), context: `${Number(totalEntradas).toLocaleString('es-MX')} lotes recibidos` },
      ]
    : selectedArea === 'extrusion'
      ? [
          { label: 'Capital registrado', value: formatCurrency(focusedAreaValue), context: 'Inventario y WIP con costo disponible' },
          { label: 'Materia prima en WIP', value: `${Number(focusedAreaData?.wip_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`, context: `${Number(focusedAreaData?.material_items || 0).toLocaleString('es-MX')} materiales` },
          { label: 'Mezclas con saldo', value: Number(focusedAreaData?.active_mixtures || 0).toLocaleString('es-MX'), context: 'Preparaciones pendientes de consumir' },
          { label: 'Saldo de mezclas', value: `${Number(focusedAreaData?.mixtures_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`, context: 'Producto preparado en proceso' },
        ]
      : selectedArea === 'telares'
        ? [
            { label: 'Capital registrado', value: focusedAreaData?.valuation_complete === false ? 'Parcial' : formatCurrency(focusedAreaValue), context: focusedAreaData?.valuation_complete === false ? 'Valuación pendiente en parte del WIP' : 'Inventario y WIP con costo disponible' },
            { label: 'Hilo en filetas', value: `${Number(focusedAreaData?.total_wip_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`, context: 'WIP en telares activos' },
            { label: 'Telares tejiendo', value: `${Number(focusedAreaData?.total_looms_active || 0).toLocaleString('es-MX')} / ${Number(focusedAreaData?.total_looms_count || 0).toLocaleString('es-MX')}`, context: 'Máquinas con corrida activa' },
            { label: 'Ocupación de filetas', value: `${Number(focusedAreaData?.avg_creel_utilization_pct || 0).toLocaleString('es-MX')}%`, context: 'Promedio de uso de capacidad' },
          ]
        : [
            { label: 'Capital estimado', value: formatCurrency(focusedAreaValue), context: 'Incluye estimación del valor de tela en piso' },
            { label: 'Rollos en proceso', value: Number(focusedAreaData?.rolls_in_floor || 0).toLocaleString('es-MX'), context: `${Number(focusedAreaData?.fabric_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg de tela en piso` },
            { label: 'Rollos por recibir', value: Number(focusedAreaData?.rolls_incoming || 0).toLocaleString('es-MX'), context: 'En tránsito hacia esta área' },
            { label: 'Materiales en WIP', value: `${Number(focusedAreaData?.materials_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`, context: `${Number(focusedAreaData?.meters_in_floor || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })} m de tela en piso` },
          ];
  const focusedAreaOperations = selectedArea === 'almacen'
    ? [
        { name: 'Lotes recibidos', value: Number(totalEntradas), unit: 'lotes' },
        { name: 'Salidas y bajas', value: Number(bajasRegistradas), unit: 'movimientos' },
        { name: 'Materiales bajo mínimo', value: Number(materialesStockBajo), unit: 'materiales' },
      ]
    : selectedArea === 'extrusion'
      ? [
          { name: 'Materia prima en WIP', value: Number(focusedAreaData?.wip_kg || 0), unit: 'kg' },
          { name: 'Mezclas preparadas', value: Number(focusedAreaData?.mixtures_kg || 0), unit: 'kg' },
        ]
      : selectedArea === 'telares'
        ? [
            { name: 'Telares tejiendo', value: Number(focusedAreaData?.total_looms_active || 0), unit: 'telares' },
            { name: 'Telares disponibles', value: Math.max(0, Number(focusedAreaData?.total_looms_count || 0) - Number(focusedAreaData?.total_looms_active || 0)), unit: 'telares' },
          ]
        : [
            { name: 'Rollos en piso', value: Number(focusedAreaData?.rolls_in_floor || 0), unit: 'rollos' },
            { name: 'Rollos por recibir', value: Number(focusedAreaData?.rolls_incoming || 0), unit: 'rollos' },
          ];
  const focusedAreaCostTrend = selectedArea === 'almacen'
    ? (monthlyFinancialFromBackend || []).slice(-6).map((month) => ({
        label: month.mes,
        consumption_cost: Number(month.operativo || 0),
        loss_cost: Number(month.merma || 0),
        entry_cost: Number(month.inventario || 0),
      }))
    : focusedAreaData?.cost_trend || [];
  const capitalByAreaData = areaInventoryValues.map(({ name, value }) => ({
    name,
    value: Number(value || 0),
    selected: normalizeAreaName(name) === normalizeAreaName(focusedAreaTitle),
  }));

  // Nombre y rol del usuario
  const roleLabel = ['ADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL'].includes(roleCode) 
    ? 'Administrador General' 
    : roleCode === 'SUPERADMIN' 
      ? 'Superadministrador' 
      : 'Administrador';

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-32 sm:pb-16 bg-background overflow-x-hidden w-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 pr-12 sm:pr-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-2">
              {selectedArea === 'GENERAL' ? 'Visión Global' : `Dashboard de ${selectedArea === 'almacen' ? 'Almacén' : focusedArea?.title}`} <span className="text-primary opacity-80 text-lg sm:text-xl font-normal">| Estado del Sistema</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Hola, <span className="text-foreground font-bold">{user?.first_name || user?.username || 'Usuario'}</span> · <span className="text-primary font-semibold">{roleLabel}</span>
            </p>
          </div>
        </div>

      </div>

      <CollapsibleFilterPanel
        title="Filtros del tablero"
        description="Selecciona un área o consulta la visión general consolidada."
        summary={`Área actual: ${dashboardAreas.find(({ key }) => key === selectedArea)?.title || 'General'} · Datos actuales en MXN`}
      >
            <p className="mb-3 text-sm text-muted-foreground">Selecciona un área o consulta la visión general consolidada.</p>
            <div role="group" aria-label="Filtrar dashboard por área" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {dashboardAreas.map(({ key, title, icon: AreaIcon }) => {
                const isSelected = selectedArea === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedArea(key)}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                  >
                    <AreaIcon size={19} aria-hidden="true" />
                    {title}
                  </button>
                );
              })}
            </div>
      </CollapsibleFilterPanel>

      {selectedArea !== 'GENERAL' && (
        <section aria-labelledby="focused-area-title" aria-live="polite" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="focused-area-title" className="text-xl font-black text-foreground">Dashboard ejecutivo · {focusedAreaTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Capital bajo control, situación operativa y comparación con las demás áreas.</p>
            </div>
            {areaOverview?.refreshed_at && (
              <span className="text-sm text-muted-foreground">Actualizado {new Date(areaOverview.refreshed_at).toLocaleTimeString('es-MX')}</span>
            )}
          </div>
          {!focusedAreaAvailable ? (
            <div role="status" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 text-base font-semibold text-amber-900 dark:text-amber-100">
              No se pudo consultar el resumen de {focusedAreaTitle}. La vista General sigue disponible; vuelve a intentarlo en unos momentos.
            </div>
          ) : <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {focusedAreaKpis.map(({ label, value, context }, index) => (
                <div key={label} className={`flex min-h-32 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm ${index === 0 ? 'border-t-4 border-t-primary' : ''}`}>
                  <dt className="text-base font-semibold text-muted-foreground">{label}</dt>
                  <dd className="mt-2 break-words text-2xl font-black tabular-nums text-foreground">{value}</dd>
                  <p className="mt-2 text-sm text-muted-foreground">{context}</p>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="min-w-0 p-4 sm:p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground">Capital valorizado por área</h3>
                  <p className="text-sm text-muted-foreground">Valor actual de inventario y WIP disponible{['globo', 'laminado'].includes(selectedArea) ? ' · incluye estimación de tela' : ''} · MXN</p>
                </div>
                {capitalByAreaData.length > 0 ? <>
                  <div role="img" aria-label={`Comparación del capital registrado en las áreas. ${focusedAreaTitle}: ${formatCurrency(focusedAreaValue)}.`} className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={capitalByAreaData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis dataKey="name" stroke={axisColor} fontSize={13} tickLine={false} axisLine={false} />
                        <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)} mil`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }} formatter={(value) => [formatCurrency(value), 'Capital registrado']} />
                        <Bar dataKey="value" name="Capital registrado" radius={[5, 5, 0, 0]} maxBarSize={56}>
                          {capitalByAreaData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.selected ? '#6366f1' : '#64748b'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-muted-foreground">El área seleccionada se resalta en morado para ubicarla rápidamente.</p>
                </> : <p className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">Aún no hay costos registrados para comparar.</p>}
              </Card>

              <Card className="min-w-0 p-4 sm:p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground">Tendencia de costos · últimos 6 meses</h3>
                  <p className="text-sm text-muted-foreground">Movimientos con costo registrado · MXN</p>
                </div>
                {focusedAreaData?.cost_trend_available === false ? (
                  <p role="status" className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">No se pudo consultar la tendencia de costos. Los demás indicadores del área siguen disponibles.</p>
                ) : focusedAreaCostTrend.some((month) => Number(month.consumption_cost || 0) > 0 || Number(month.loss_cost || 0) > 0 || Number(month.entry_cost || 0) > 0) ? <>
                  <div role="img" aria-label={`Tendencia de costos de ${focusedAreaTitle} en los últimos seis meses.`} className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={focusedAreaCostTrend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis dataKey="label" stroke={axisColor} fontSize={13} tickLine={false} axisLine={false} />
                        <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)} mil`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }} formatter={(value) => [formatCurrency(value)]} />
                        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                        {selectedArea === 'almacen' && <Line type="monotone" dataKey="entry_cost" name="Entradas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />}
                        <Line type="monotone" dataKey="consumption_cost" name={selectedArea === 'almacen' ? 'Consumo' : 'Consumo directo'} stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="loss_cost" name="Merma y scrap" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-muted-foreground">Incluye consumos y pérdidas en movimientos de inventario; no incluye la valuación actual del WIP.</p>
                </> : <p className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">Aún no hay movimientos con costo en este periodo.</p>}
              </Card>

              <Card className="min-w-0 p-4 sm:p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground">Situación operativa de {focusedAreaTitle}</h3>
                  <p className="text-sm text-muted-foreground">Indicadores actuales para orientar la revisión del área.</p>
                </div>
                {focusedAreaOperations.some((item) => item.value > 0) ? <>
                  <div role="img" aria-label={`Indicadores operativos de ${focusedAreaTitle}: ${focusedAreaOperations.map((item) => `${item.name}, ${item.value} ${item.unit}`).join('; ')}.`} className="h-64 w-full sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={focusedAreaOperations} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                        <XAxis type="number" stroke={axisColor} fontSize={13} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={138} stroke={axisColor} fontSize={13} tickLine={false} axisLine={false} tick={{ fontSize: 13 }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }} formatter={(value, _name, item) => [`${Number(value).toLocaleString('es-MX')} ${item.payload.unit}`, item.payload.name]} />
                        <Bar dataKey="value" name="Indicador actual" fill="#0ea5e9" radius={[5, 5, 0, 0]} maxBarSize={64} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <dl className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                    {focusedAreaOperations.map((item) => <div key={item.name} className="flex justify-between gap-3 text-sm"><dt className="text-muted-foreground">{item.name}</dt><dd className="font-bold tabular-nums text-foreground">{Number(item.value).toLocaleString('es-MX')} {item.unit}</dd></div>)}
                  </dl>
                </> : <p className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">No hay actividad operativa registrada para mostrar en este momento.</p>}
              </Card>
            </div>

            {selectedArea === 'almacen' && materialesStockBajo > 0 && (
              <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2 text-base font-semibold"><AlertTriangle className="mt-0.5 size-5 shrink-0" />{materialesStockBajo} materiales están por debajo del mínimo.</span>
                <Link to="/warehouse/inventory" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-muted sm:w-auto">Abrir inventario de Almacén <ArrowRight className="size-4" /></Link>
              </div>
            )}
            {['globo', 'laminado'].includes(selectedArea) && (
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">La valuación de tela en piso es estimada; úsala como referencia ejecutiva, no como cierre contable.</p>
            )}
            {selectedArea === 'telares' && focusedAreaData?.valuation_complete === false && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm font-semibold text-amber-900 dark:text-amber-100">Hay WIP sin costo completo. El capital mostrado incluye únicamente costos disponibles.</p>
            )}
            {selectedArea === 'extrusion' && focusedAreaData?.valuation_complete === false && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm font-semibold text-amber-900 dark:text-amber-100">Hay material o mezclas sin valuación completa. El capital mostrado incluye únicamente costos disponibles.</p>
            )}
          </>}
        </section>
      )}

      {/* TOP KPIs - Reflejo Real de Almacén y Finanzas */}
      {selectedArea === 'GENERAL' && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ExecutiveKpiCard
          title="Pérdidas valorizadas"
          value={totalLoss} 
          isCurrency={true} 
          colorClass="border-red-500" 
          icon={AlertCircle}
          subtitle={`${kpisFin.totalLossQty || 0} unidades en movimientos de merma, scrap y bajas`}
        />
        <ExecutiveKpiCard
          title="Valor de inventario y WIP"
          value={currentInventoryValue}
          isCurrency={true}
          colorClass="border-blue-500"
          icon={PackageCheck}
          subtitle="Almacén, silos bajo su custodia y WIP con costo registrado"
        />
        <ExecutiveKpiCard 
          title="Capital Total Invertido" 
          value={totalInvested} 
          isCurrency={true} 
          colorClass="border-emerald-500" 
          icon={DollarSign}
          subtitle={`${totalEntradas} lotes de material recibidos`}
        />
        <ExecutiveKpiCard 
          title="Entradas y Movimientos" 
          value={totalEntradas} 
          unit="Lotes"
          isCurrency={false} 
          colorClass="border-purple-500" 
          icon={TrendingUp}
          subtitle={`${bajasRegistradas} movimientos de salida/baja`}
        />
      </div>}

      {/* RESUMEN EJECUTIVO DE COSTOS Y MERMA */}
      {selectedArea === 'GENERAL' && <section aria-label="Costos y merma consolidados" className="space-y-4">
        <Card className="p-4 sm:p-5 shadow-sm border-border/70">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-foreground">Valor registrado por área</h2>
              <p className="text-sm text-muted-foreground">Inventario, silos bajo custodia de Almacén y WIP con costo registrado · MXN</p>
            </div>
            <Badge variant="outline" className="w-fit text-xs font-bold">Actualización cada 30 s</Badge>
          </div>
          {hasAreaInventoryData ? <div role="img" aria-label="Gráfica de barras del valor registrado de inventario y WIP por área, en pesos mexicanos." className="h-[300px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaInventoryChart} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toLocaleString('es-MX')} mil`} />
                <YAxis type="category" dataKey="name" width={105} stroke={axisColor} fontSize={13} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }} formatter={(value) => [formatCurrency(value), 'Valor registrado']} />
                <Bar dataKey="value" name="Valor registrado" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p role="status" className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">No hay valores de inventario o WIP disponibles para graficar.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Las áreas con $0 no tienen valor contabilizado en inventario/WIP en este momento. El total de la tarjeta superior refleja costos disponibles; bienes sin costo y áreas aún no integradas no se estiman.</p>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="min-w-0 p-4 sm:p-5 shadow-sm border-border/70 xl:col-span-2">
            <div className="mb-3">
              <h2 className="text-lg font-black text-foreground">Merma y scrap de producción</h2>
              <p className="text-sm text-muted-foreground">Registro mensual en kilogramos · últimos 6 meses · consulta cada 30 s</p>
            </div>
            {hasScrapTrend ? <div role="img" aria-label="Tendencia mensual de merma y scrap de producción, separando pesaje real y estimado." className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scrapByMonth} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="month" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toLocaleString('es-MX')} kg`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }} formatter={(value) => [`${Number(value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg`]} />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="actual_kg" name="Pesaje real" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="estimated_kg" name="Estimado" stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div> : <p role="status" className="rounded-lg bg-muted/40 p-5 text-base text-muted-foreground">No hay registros de merma/scrap de producción en los últimos seis meses.</p>}
          </Card>

          <Card className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 shadow-sm border-border/70">
            <div>
              <p className="text-sm font-bold text-muted-foreground">Total histórico registrado en producción</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-foreground">{Number(scrapSummary.total_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} <span className="text-lg text-muted-foreground">kg</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y border-border/70 py-3">
              <div><p className="text-xs text-muted-foreground">Pesado</p><p className="text-lg font-extrabold tabular-nums text-red-500">{Number(scrapSummary.actual_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</p></div>
              <div><p className="text-xs text-muted-foreground">Estimado</p><p className="text-lg font-extrabold tabular-nums text-amber-500">{Number(scrapSummary.estimated_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</p></div>
            </div>
            <ul className="space-y-2" aria-label="Desglose histórico por área">
              {scrapByArea.map((area) => <li key={area.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{area.name}{!area.available && <span className="ml-1 text-xs">(sin consulta)</span>}</span>
                <strong className="tabular-nums text-foreground">{area.available ? `${Number(area.actual_kg + area.estimated_kg).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg` : '—'}</strong>
              </li>)}
            </ul>
            <p className="mt-auto rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">Las pérdidas de Almacén se muestran en MXN arriba. No se suman aquí porque sus movimientos pueden usar unidades distintas a kg.</p>
          </Card>
        </div>
      </section>}

      {selectedArea === 'GENERAL' && <>
      {/* AREAS GRID (RESUMEN NETO CONECTADO A ALMACÉN) */}
      <div className="flex items-center justify-between mt-2">
        <h3 className="text-xs font-bold text-foreground opacity-70 uppercase tracking-wider">
          Desglose por Áreas de Operación
        </h3>
        <span className="text-xs text-muted-foreground font-medium">Actualizado en tiempo real</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* ÁREA: ALMACÉN E INVENTARIOS (TOTALMENTE INTEGRADO CON DATOS REALES) */}
        <Card className="flex flex-col shadow-sm border-l-4 border-blue-500 overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Boxes className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground tracking-tight uppercase">Almacén e Inventarios</h2>
                <p className="text-[10px] font-semibold text-muted-foreground">Gestión de lotes, catálogo y mermas</p>
              </div>
            </div>
            <Link to="/warehouse/inventory" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-primary/30 px-3 text-xs font-bold text-primary hover:bg-primary/10">
              Abrir inventario <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="p-5 flex flex-col gap-4 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border/50">
              <div>
                <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Valor bajo custodia de Almacén</p>
                <p className="text-2xl font-black text-foreground">{formatCurrency(kpisFin.warehouseCustodyValue ?? currentInventoryValue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Lotes {formatCurrency(kpisFin.warehouseInventoryValue ?? 0)} + silos {formatCurrency(kpisFin.silosInventoryValue ?? 0)} · {totalEntradas} lotes recibidos</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Pérdidas Consolidadas</p>
                <p className="text-2xl font-black text-red-500">{formatCurrency(totalLoss)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpisFin.totalLossQty || 0} unidades totales</p>
              </div>
            </div>

            {/* Desglose de Pérdidas y Alertas */}
            <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl border border-border/40">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Merma</span>
                <p className="text-sm font-black text-amber-500">{formatCurrency(kpisFin.totalLostMerma ?? 0)}</p>
                <span className="text-[10px] text-muted-foreground">{kpisFin.mermaQty || 0} uds</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Scrap</span>
                <p className="text-sm font-black text-rose-500">{formatCurrency(kpisFin.totalLostScrap ?? 0)}</p>
                <span className="text-[10px] text-muted-foreground">{kpisFin.scrapQty || 0} uds</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Bajas</span>
                <p className="text-sm font-black text-red-600">{formatCurrency(kpisFin.totalLostBaja ?? 0)}</p>
                <span className="text-[10px] text-muted-foreground">{kpisFin.bajaQty || 0} uds</span>
              </div>
            </div>

            {materialesStockBajo > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" />
                  {materialesStockBajo} material(es) se encuentran por debajo del stock mínimo.
                </span>
                <Link to="/warehouse/inventory" className="text-xs font-black underline hover:opacity-80">Abrir inventario</Link>
              </div>
            )}
          </div>
        </Card>

      </div>

      <section aria-labelledby="area-overview-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="area-overview-title" className="text-base font-black text-foreground">Resumen operativo por área</h3>
            <p className="text-xs text-muted-foreground">Valor con costos registrados por área, más producción y capacidad · actualización cada 30 s</p>
          </div>
          {areaOverview?.refreshed_at && (
            <span className="text-xs text-muted-foreground">Actualizado {new Date(areaOverview.refreshed_at).toLocaleTimeString('es-MX')}</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
          {areaCards.map(({ key, title, icon: AreaIcon, tone, metrics }) => {
            const area = areaOverview?.[key];
            const areaRows = metrics(area || {});
            return (
              <Card key={key} className="p-4 border border-border/70 shadow-sm min-w-0">
                <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                  <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}><AreaIcon size={18} /></span>
                  <h4 className="text-sm font-extrabold text-foreground">{title}</h4>
                  <span className={`ml-auto size-2 rounded-full ${area?.available ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} aria-label={area?.available ? 'Datos disponibles' : 'Datos no disponibles'} />
                </div>
                <>
                  <dl className="pt-2 divide-y divide-border/50">
                    {(area?.available ? areaRows : areaRows.slice(0, 1)).map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-3 py-2">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-right text-xs font-bold tabular-nums text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {!area?.available && <p className="pt-3 text-xs text-muted-foreground">Resumen operativo no disponible en este momento.</p>}
                </>
              </Card>
            );
          })}
        </div>
        <Card className="flex flex-col gap-2 border-dashed border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-foreground">Corte y Confección</h4>
            <p className="text-sm text-muted-foreground">Área contemplada para una siguiente integración. Sus WIP, procesos y costos no forman parte de los totales actuales.</p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-500/40 bg-amber-500/10 text-sm font-bold text-amber-700 dark:text-amber-300">Pendiente de integrar</Badge>
        </Card>
      </section>
      </>}
    </div>
  );
};

export default DashboardPage;
