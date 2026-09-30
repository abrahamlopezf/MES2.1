import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Legend, AreaChart, Area
} from 'recharts';
import { AlertCircle, PackageCheck, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system';
import { TFSelect } from '../../../components/tf-ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';
import { WarehouseDashboard } from '../../warehouse/presentation/pages/WarehouseDashboard';
import { ExtrusionDashboard } from '../../production/presentation/pages/ExtrusionDashboard';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// KPI Card para la cabecera
const ExecutiveKpiCard = ({ title, value, isCurrency, colorClass, icon: Icon }) => {
  return (
    <Card className={`flex flex-col justify-center p-4 shadow-sm border-b-4 ${colorClass} relative overflow-hidden`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
        {Icon && <Icon className="w-24 h-24" />}
      </div>
      <p className="text-foreground opacity-70 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 relative z-10 line-clamp-2 min-h-[2.5rem]">{title}</p>
      <p className="text-2xl 2xl:text-3xl font-black text-foreground tracking-tight relative z-10 truncate" title={isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}>
        {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}
      </p>
    </Card>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [showFilters, setShowFilters] = React.useState(false);

  const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name);
  const isExecutive = roleCode === 'ADMIN_GRAL' || roleCode === 'SUPERADMIN';

  const axisColor = isDark ? '#e4e4e7' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';

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

  const { data: opData, isLoading: isLoadingOp } = useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/dashboard/operations');
        return response.data?.data || response.data || {};
      } catch (e) {
        return {};
      }
    },
    enabled: isExecutive,
    refetchInterval: 30000,
  });

  if (!isExecutive) {
    if (roleCode === 'ADMIN_EXT') {
      return <ExtrusionDashboard />;
    }
    return <WarehouseDashboard />;
  }

  if (isLoadingFin || isLoadingOp) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xl text-foreground opacity-60 font-bold animate-pulse">Cargando Visión Ejecutiva...</p>
      </div>
    );
  }

  const kpisFin = finData?.kpis || {};
  const kpisOp = opData?.kpis || {};

  // Mocking Data for Global Financial Overview since we only have warehouse data right now
  const globalFinancialData = [
    { mes: 'Ene', inventario: 18500000, merma: 1200000, operativo: 5000000 },
    { mes: 'Feb', inventario: 18900000, merma: 1100000, operativo: 5200000 },
    { mes: 'Mar', inventario: 19500000, merma: 1300000, operativo: 5100000 },
    { mes: 'Abr', inventario: 19100000, merma: 1050000, operativo: 5400000 },
    { mes: 'May', inventario: 19800000, merma: 1250000, operativo: 5600000 },
    { mes: 'Jun', inventario: kpisFin.currentInventoryValue || 19967835, merma: kpisFin.totalLoss || 1486756, operativo: 5800000 },
  ];

  const distributionData = [
    { name: 'Costo Almacén', value: kpisFin.currentInventoryValue || 19967835, fill: '#3b82f6' },
    { name: 'Merma Consolidada', value: kpisFin.totalLoss || 1486756, fill: '#ef4444' },
    { name: 'Producción (Estimado)', value: 8500000, fill: '#8b5cf6' },
  ];

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background overflow-x-hidden">
      
      {/* HEADER GREETING */}
      <div className="flex flex-col gap-1 w-full pr-14 md:pr-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-2">
          Visión Global <span className="text-primary opacity-80 text-xl font-normal">| Estado del Sistema</span>
        </h1>
        <p className="text-lg text-primary font-medium mb-4">Hola, {user?.first_name || user?.username || 'Usuario'}</p>
      </div>

      {/* TOP FILTERS */}
      <div className="w-full shrink-0">
        <div className="bg-secondary/40 p-5 rounded-2xl border border-border/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="shrink-0 flex justify-between items-center w-full lg:w-auto">
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight">Filtros Globales</h2>
              <p className="text-xs text-muted-foreground">Perspectiva ejecutiva</p>
            </div>
            <button 
              className="lg:hidden text-primary text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-lg"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 lg:max-w-3xl ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            <TFSelect label="Año Fiscal" options={[{value: '2026', label: '2026'}]} value="2026" onChange={() => {}} />
            <TFSelect label="Trimestre" options={[{value: 'q2', label: 'Q2 (Actual)'}]} value="q2" onChange={() => {}} />
            <TFSelect label="Moneda" options={[{value: 'mxn', label: 'MXN'}]} value="mxn" onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ExecutiveKpiCard 
          title="Valor Total de Inventarios" 
          value={kpisFin.currentInventoryValue || 19967835} 
          isCurrency={true} 
          colorClass="border-blue-500"
          icon={PackageCheck}
        />
        <ExecutiveKpiCard 
          title="Costo de Merma Consolidada" 
          value={kpisFin.totalLoss || 1486756} 
          isCurrency={true} 
          colorClass="border-red-500" 
          icon={AlertCircle}
        />
        <ExecutiveKpiCard 
          title="Capital Total Invertido" 
          value={kpisFin.totalInvested || 21454591} 
          isCurrency={true} 
          colorClass="border-emerald-500" 
          icon={DollarSign}
        />
        <ExecutiveKpiCard 
          title="Índice Global de Eficiencia" 
          value={87.4} 
          isCurrency={false} 
          colorClass="border-purple-500" 
          icon={TrendingUp}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Evolution Chart */}
        <Card className="lg:col-span-2 p-5 shadow-sm border-border/50">
          <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
            Evolución Financiera (Últimos 6 Meses)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={globalFinancialData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="mes" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }}
                  itemStyle={{ color: isDark ? '#f4f4f5' : '#18181b' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="inventario" name="VALOR INVENTARIO" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar yAxisId="left" dataKey="operativo" name="COSTO OPERATIVO" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Line yAxisId="right" type="monotone" dataKey="merma" name="MERMA / SCRAP" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribution Chart */}
        <Card className="p-5 shadow-sm border-border/50">
          <h3 className="text-sm font-bold text-foreground opacity-70 mb-2 uppercase tracking-wider text-center">
            Distribución del Capital
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="80%"
                  dataKey="value"
                  stroke={tooltipBg}
                  strokeWidth={2}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#f4f4f5' : '#18181b' }}
                  itemStyle={{ color: isDark ? '#f4f4f5' : '#18181b' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* AREAS GRID (RESUMEN NETO) */}
      <h3 className="text-sm font-bold text-foreground opacity-70 mt-2 uppercase tracking-wider">Desglose por Áreas de Operación</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* ÁREA: ALMACÉN E INVENTARIOS */}
        <Card className="flex flex-col shadow-sm border-l-4 border-blue-500 overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-4 border-b border-border bg-secondary/20 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground tracking-tight uppercase">Almacén e Inventarios</h2>
              <p className="text-[10px] font-semibold text-muted-foreground">Gestión de activos y mermas</p>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4 bg-card">
            <div>
              <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Costo Total de Almacén</p>
              <p className="text-2xl font-black text-foreground">{formatCurrency(kpisFin.currentInventoryValue || 19967835)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Scrap / Merma Generada</p>
              <p className="text-2xl font-black text-red-500">{formatCurrency(kpisFin.totalLoss || 1486756)}</p>
            </div>
          </div>
        </Card>

        {/* ÁREA: PRODUCCIÓN */}
        <Card className="flex flex-col shadow-sm border-l-4 border-purple-500 overflow-hidden opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
          <div className="p-4 border-b border-border bg-secondary/20 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Activity className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground tracking-tight uppercase">Piso de Producción</h2>
              <p className="text-[10px] font-semibold text-muted-foreground">Módulo en desarrollo (OEE & Calidad)</p>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4 bg-card">
            <div>
              <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Costo Operativo Estimado</p>
              <p className="text-2xl font-black text-foreground">--</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground opacity-70 uppercase tracking-widest mb-1">Eficiencia Global (OEE)</p>
              <p className="text-2xl font-black text-foreground">-- %</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default DashboardPage;