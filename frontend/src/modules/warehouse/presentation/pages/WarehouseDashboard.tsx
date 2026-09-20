import React, { useState } from 'react';
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
import { LowStockReportModal } from '../components/LowStockReportModal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// KPI Card para la cabecera
const ExecutiveKpiCard = ({ title, value, unit = '', isCurrency, colorClass, onClick, cursor = 'default' }) => {
  return (
    <Card 
      onClick={onClick}
      className={`flex flex-col justify-center px-6 py-4 shadow-sm border-b-4 ${colorClass} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      style={{ cursor }}
    >
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
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  
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
        return response.data?.data || response.data || {};
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
    inventoryValue: metrics?.financial?.inventoryValue || 0,
    lossValue: metrics?.financial?.lossValue || 0,
  };

  const chartData = metrics?.chartData || [];
  const mermaData = metrics?.mermaData || [];

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background overflow-x-hidden">
      
      {/* HEADER GREETING */}
      <div className="flex flex-col gap-1 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Monitor de Almacén <span className="text-primary opacity-80 text-xl ml-2 font-normal">| Hola, {userName}</span>
        </h1>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-primary/10 p-4 rounded-xl border border-primary/20 items-end">
        <div className="md:col-span-1">
          <h2 className="text-lg font-black tracking-tight text-primary flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Filtros Operativos
          </h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Vista de Almacén</p>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Año</label>
          <TFSelect 
            value="2026"
            options={[{value: '2026', label: '2026'}]}
            onChange={() => {}}
            className="h-10"
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Periodo</label>
          <TFSelect 
            value="current"
            options={[{value: 'current', label: 'Mes Actual'}]}
            onChange={() => {}}
            className="h-10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Familia</label>
          <TFSelect 
            value="all"
            options={[{value: 'all', label: 'Todas las Familias'}]}
            onChange={() => {}}
            className="h-10"
          />
        </div>
      </div>

      {/* EXECUTIVE SUMMARY KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveKpiCard 
          title="COSTO TOTAL ALMACÉN"
          value={kpis.inventoryValue}
          isCurrency={true}
          colorClass="border-blue-500 bg-blue-500/5"
        />
        <ExecutiveKpiCard 
          title="COSTO TOTAL SCRAP/MERMA"
          value={kpis.lossValue}
          isCurrency={true}
          colorClass="border-red-500 bg-red-500/5"
        />
        <ExecutiveKpiCard 
          title="TOTAL INGRESOS (LOTES)"
          value={kpis.entradas}
          isCurrency={false}
          colorClass="border-emerald-500 bg-emerald-500/5"
        />
        <ExecutiveKpiCard 
          title="STOCKS BAJOS (CRÍTICO/ALERTA)"
          value={kpis.stockBajo}
          unit="items"
          isCurrency={false}
          colorClass="border-amber-500 bg-amber-500/5"
          onClick={() => setIsLowStockModalOpen(true)}
          cursor="pointer"
        />
      </div>

      <LowStockReportModal 
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-6 pb-20">

        {/* MIDDLE CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* Bar Chart: Transacciones */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              Inventario vs Scrap/Merma
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
                  <Bar dataKey="entradas" name="ENTRADAS (Lotes)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="bajas" name="SALIDAS (Mermas/Bajas)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Area Chart: Merma */}
          <Card className="p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              Consumos
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
                  <Area type="monotone" dataKey="merma" name="CONSUMOS Y MERMAS" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorMermaExec)" />
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
