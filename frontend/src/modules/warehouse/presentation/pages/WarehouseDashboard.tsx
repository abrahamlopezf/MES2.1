import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, Legend 
} from 'recharts';
import { Boxes, TrendingDown, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { useThemeStore } from '../../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../design-system';
import { TFSelect } from '../../../../components/tf-ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../core/api/apiClient';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// KPI Card para la cabecera
const ExecutiveKpiCard = ({ title, value, unit = '', isCurrency, colorClass }) => {
  return (
    <Card className={`flex flex-col justify-center px-6 py-4 shadow-sm border-b-4 ${colorClass}`}>
      <p className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-foreground tracking-tight">
        {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)} {unit && !isCurrency && <span className="text-xl opacity-60 font-medium">{unit}</span>}
      </p>
    </Card>
  );
};

export const WarehouseDashboard = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e4e4e7' : '#18181b'; 
  const gridColor = isDark ? '#27272a' : '#e4e4e7'; 
  const tooltipBg = isDark ? '#18181b' : '#ffffff'; 
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7'; 

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['warehouse', 'dashboard-metrics'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/warehouse/dashboard-metrics');
        return response.data;
      } catch (e) {
        return {};
      }
    }
  });

  const userName = user?.first_name || user?.username || 'Usuario';

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xl text-foreground opacity-60 font-bold animate-pulse">Cargando Dashboard de Almacén...</p>
      </div>
    );
  }

  const kpis = {
    entradas: metrics?.totalEntradas || 0,
    bajas: metrics?.bajasRegistradas || 0,
    stockBajo: metrics?.materialesStockBajo || 0,
    merma: metrics?.mermaRegistrada || 0,
  };

  const chartData = metrics?.chartData || [
    { date: 'Lun', entradas: 45, bajas: 30 },
    { date: 'Mar', entradas: 52, bajas: 38 },
    { date: 'Mié', entradas: 38, bajas: 42 },
    { date: 'Jue', entradas: 65, bajas: 45 },
    { date: 'Vie', entradas: 48, bajas: 50 },
  ];

  const mermaData = metrics?.mermaData || [
    { date: 'Sem 1', merma: 120 },
    { date: 'Sem 2', merma: 150 },
    { date: 'Sem 3', merma: 90 },
    { date: 'Sem 4', merma: 110 },
  ];

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background overflow-x-hidden">
      
      {/* HEADER GREETING */}
      <div className="flex flex-col gap-1 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Monitor de Almacén <span className="text-primary opacity-80 text-xl ml-2 font-normal">| Hola, {userName}</span>
        </h1>
      </div>

      {/* TOP FILTERS */}
      <div className="w-full shrink-0">
        <div className="bg-secondary/40 p-5 rounded-2xl border border-border/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="shrink-0">
            <h2 className="text-lg font-black text-foreground tracking-tight">Filtros Operativos</h2>
            <p className="text-xs text-muted-foreground">Vista de Almacén</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 lg:max-w-4xl">
            <TFSelect label="Año" options={[{value: '2025', label: '2025'}, {value: '2026', label: '2026'}]} value="2026" onChange={() => {}} />
            <TFSelect label="Periodo" options={[{value: 'mes', label: 'Mes Actual'}]} value="mes" onChange={() => {}} />
            <TFSelect label="Familia" options={[{value: 'todas', label: 'Todas las Familias'}]} value="todas" onChange={() => {}} />
            <TFSelect label="Ubicación" options={[{value: 'todas', label: 'Todas las Ubicaciones'}]} value="todas" onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-6 pb-20">
        
        {/* TOP KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExecutiveKpiCard 
            title="Costo Total Almacén" 
            value={metrics?.financial?.inventoryValue || 19967835} 
            isCurrency={true}
            colorClass="border-blue-500" 
          />
          <ExecutiveKpiCard 
            title="Costo Total Merma" 
            value={metrics?.financial?.lossValue || 1486756} 
            isCurrency={true}
            colorClass="border-red-500" 
          />
          <ExecutiveKpiCard 
            title="Total Entradas" 
            value={kpis.entradas} 
            colorClass="border-emerald-500" 
          />
          <ExecutiveKpiCard 
            title="Merma Operativa" 
            value={kpis.merma} 
            unit="kg"
            colorClass="border-amber-500" 
          />
        </div>

        {/* MIDDLE CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* Bar Chart: Transacciones */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              Transacciones (Entradas vs Salidas)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="entradas" name="ENTRADAS" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="bajas" name="SALIDAS" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Area Chart: Merma */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              Tendencia de Merma (kg)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mermaData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMermaExec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                  />
                  <Area type="monotone" dataKey="merma" name="MERMA" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorMermaExec)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default WarehouseDashboard;
