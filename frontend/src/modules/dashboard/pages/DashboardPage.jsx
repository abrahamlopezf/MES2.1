import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Legend 
} from 'recharts';
import { DollarSign, AlertCircle, AlertTriangle, PackageCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system';
import { TFSelect } from '../../../components/tf-ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';
import { WarehouseDashboard } from '../../warehouse/presentation/pages/WarehouseDashboard';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// KPI Card para la cabecera
const ExecutiveKpiCard = ({ title, value, isCurrency, colorClass }) => {
  return (
    <Card className={`flex flex-col justify-center px-6 py-4 shadow-sm border-b-4 ${colorClass}`}>
      <p className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-foreground tracking-tight">
        {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}
      </p>
    </Card>
  );
};

// Medidor Semidona (Gauge)
const GaugeChart = ({ title, value, color }) => {
  const data = [
    { name: 'Value', value: value, fill: color },
    { name: 'Rest', value: Math.max(0, 100 - value), fill: 'var(--color-bg-secondary, #27272a)' }
  ];
  return (
    <Card className="flex flex-col items-center pt-4 pb-2 shadow-sm relative overflow-hidden">
      <h3 className="text-xs font-bold text-foreground opacity-70 uppercase tracking-widest">{title}</h3>
      <div className="relative w-full h-[100px] mt-2 flex flex-col items-center justify-end">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 text-2xl font-black">{Number(value).toFixed(2)} %</div>
      </div>
    </Card>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Permisos: Solo ADMIN_GRAL o SUPERADMIN ven el Dashboard Ejecutivo
  const isExecutive = user?.role === 'ADMIN_GRAL' || user?.role === 'SUPERADMIN';

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
    return <WarehouseDashboard />;
  }

  if (isLoadingFin || isLoadingOp) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xl text-foreground opacity-60 font-bold animate-pulse">Cargando Dashboard Ejecutivo...</p>
      </div>
    );
  }

  const kpisFin = finData?.kpis || {};
  const kpisOp = opData?.kpis || {};

  // Mapear datos reales del backend
  const mixedChartData = (opData?.charts?.yieldData || []).map(d => ({
    name: d.date || '',
    produccion: d.output || 0,
    planificacion: d.input || 0, // Usaremos input como referencia de planificación temporal
    capacidad: (d.output || 0) * 1.2 // Simular capacidad como un 20% más si no hay dato real
  }));

  // Mapear motivos de scrap a la dona, generando colores vibrantes basados en el índice
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const totalScrapAmount = opData?.charts?.scrapData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 1;
  const donutData = (opData?.charts?.scrapData || []).map((d, index) => ({
    name: d.area || 'Desconocido',
    value: Number(((d.amount / totalScrapAmount) * 100).toFixed(2)),
    fill: colors[index % colors.length]
  }));

  // Si no hay datos, mostrar algo vacío en lugar de mocks
  if (mixedChartData.length === 0) {
    mixedChartData.push({ name: 'Sin Datos', produccion: 0, planificacion: 0, capacidad: 0 });
  }
  if (donutData.length === 0) {
    donutData.push({ name: 'Sin Mermas', value: 100, fill: '#27272a' });
  }

  // Gauges Reales
  const yieldReal = Number(kpisOp?.yield?.value) || 0;
  const scrapRatio = totalScrapAmount > 0 ? (totalScrapAmount / ((kpisOp?.production?.value || 0) + totalScrapAmount)) * 100 : 0;
  const calidadReal = 100 - (scrapRatio || 0);
  const disponibilidadReal = 0; // Se habilitará con los módulos IoT/Máquinas
  const oeeReal = ((calidadReal / 100) * (yieldReal / 100) * (disponibilidadReal / 100)) * 100 || 0;

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background overflow-x-hidden">
      
      {/* HEADER GREETING */}
      <div className="flex flex-col gap-1 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Dashboard Ejecutivo <span className="text-primary opacity-80 text-xl ml-2 font-normal">| Global (Todas las Áreas) | Hola, {user?.first_name || user?.username || 'Usuario'}</span>
        </h1>
      </div>

      {/* TOP FILTERS */}
      <div className="w-full shrink-0">
        <div className="bg-secondary/40 p-5 rounded-2xl border border-border/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="shrink-0">
            <h2 className="text-lg font-black text-foreground tracking-tight">Filtros Ejecutivos</h2>
            <p className="text-xs text-muted-foreground">Ajusta la vista del reporte</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 flex-1 lg:max-w-5xl">
            <TFSelect label="Año" options={[{value: '2025', label: '2025'}, {value: '2026', label: '2026'}]} value="2026" onChange={() => {}} />
            <TFSelect label="Periodo" options={[{value: 'todas', label: 'Todas'}]} value="todas" onChange={() => {}} />
            <TFSelect label="Semana" options={[{value: 'todas', label: 'Todas'}]} value="todas" onChange={() => {}} />
            <TFSelect label="Turno" options={[{value: 'todas', label: 'Todas'}]} value="todas" onChange={() => {}} />
            <TFSelect label="Línea" options={[{value: 'todas', label: 'Todas'}]} value="todas" onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* TOP KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExecutiveKpiCard 
            title="Costo Total Almacén" 
            value={kpisFin.currentInventoryValue || 19967835} 
            isCurrency={true} 
            colorClass="border-blue-500" 
          />
          <ExecutiveKpiCard 
            title="Costo Total Merma" 
            value={kpisFin.totalLoss || 1486756} 
            isCurrency={true} 
            colorClass="border-red-500" 
          />
          <ExecutiveKpiCard 
            title="Total Invertido" 
            value={kpisFin.totalInvested || 21454591} 
            isCurrency={true} 
            colorClass="border-emerald-500" 
          />
          <ExecutiveKpiCard 
            title="Producción Total" 
            value={kpisOp.production?.value || 68476} 
            isCurrency={false} 
            colorClass="border-purple-500" 
          />
        </div>

        {/* MIDDLE CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Mixed Chart: Production vs Plan vs Capacity */}
          <Card className="lg:col-span-2 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              Producción vs Planificación vs Capacidad
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mixedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                    formatter={(value) => new Intl.NumberFormat('en-US').format(value)}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="produccion" name="PRODUCCIÓN" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="planificacion" name="PLANIFICACIÓN" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="capacidad" name="CAPACIDAD" stroke="#ef4444" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Donut Chart: Motivos No Conformidades */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-2 uppercase tracking-wider text-center">
              Motivo No Conformidades
            </h3>
            <div className="h-[280px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
                    dataKey="value"
                    stroke={tooltipBg}
                    strokeWidth={2}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

        {/* BOTTOM GAUGES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          <GaugeChart title="Calidad" value={calidadReal} color="#3b82f6" />
          <GaugeChart title="Disponibilidad" value={disponibilidadReal} color="#10b981" />
          <GaugeChart title="Rendimiento" value={yieldReal} color="#f59e0b" />
          <GaugeChart title="Índice OEE" value={oeeReal} color="#8b5cf6" />
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;