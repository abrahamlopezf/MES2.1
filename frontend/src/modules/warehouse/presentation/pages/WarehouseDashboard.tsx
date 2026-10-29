import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Boxes, TrendingDown, ArrowDownCircle, AlertTriangle, DollarSign, PackagePlus, ShieldCheck, AlertCircle, Menu } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { useThemeStore } from '../../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../design-system';
import { TFSelect } from '../../../../components/tf-ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../core/api/apiClient';
import { LowStockReportModal } from '../components/LowStockReportModal';
import { canViewCosts } from '../../../../utils/authHelpers';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

interface WarehouseDashboardProps {
  activeTab?: string;
  onSwitchTab?: (tab: 'EXECUTIVE' | 'WAREHOUSE') => void;
}

// KPI Card para la cabecera - Diseño homologado premium
const ExecutiveKpiCard = ({ 
  title, 
  value, 
  unit = '', 
  isCurrency, 
  colorClass, 
  icon,
  contextText,
  subtitle,
  onClick, 
  cursor = 'default' 
}) => {
  return (
    <Card 
      onClick={onClick}
      className={`flex flex-col justify-between p-5 shadow-sm border-b-4 ${colorClass} ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''} min-h-[160px] overflow-hidden`}
      style={{ cursor }}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
            {title}
          </p>
          {icon && (
            <div className="text-muted-foreground opacity-80 shrink-0">
              {icon}
            </div>
          )}
        </div>

        {/* Slot superior con idéntica altura y ritmo visual que el switch */}
        <div className="flex items-center gap-2 bg-muted/80 p-1 rounded-lg border border-border/50 h-8 px-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground truncate flex items-center gap-1.5">
            {contextText}
          </span>
        </div>
      </div>

      <div className="my-1">
        <p className="text-3xl font-black text-foreground tracking-tight">
          {isCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-US').format(value)}{' '}
          {unit && !isCurrency && <span className="text-xl opacity-60 font-medium">{unit}</span>}
        </p>
      </div>

      <p className="text-[11px] font-medium text-muted-foreground truncate">
        {subtitle}
      </p>
    </Card>
  );
};

// KPI Card Dinámico para Pérdidas (Total / Merma / Scrap)
const DynamicLossKpiCard = ({ kpis, activeTab, onTabChange, allowCosts = true }) => {
  let title = allowCosts ? 'COSTO TOTAL PÉRDIDAS' : 'TOTAL PÉRDIDAS OPERATIVAS';
  let value = allowCosts ? kpis.lossValue : kpis.totalLossQty;
  let subtitle = `${new Intl.NumberFormat('en-US').format(kpis.totalLossQty)} uds en total (Merma, Scrap y Bajas)`;
  let colorClass = 'border-red-500 bg-red-500/5';

  if (activeTab === 'MERMA') {
    title = allowCosts ? 'COSTO TOTAL MERMA' : 'TOTAL MERMA OPERATIVA';
    value = allowCosts ? kpis.mermaLoss : kpis.mermaQty;
    subtitle = `${new Intl.NumberFormat('en-US').format(kpis.mermaQty)} uds registradas en merma`;
    colorClass = 'border-amber-500 bg-amber-500/5';
  } else if (activeTab === 'SCRAP') {
    title = allowCosts ? 'COSTO TOTAL SCRAP' : 'TOTAL SCRAP OPERATIVO';
    value = allowCosts ? kpis.scrapLoss : kpis.scrapQty;
    subtitle = allowCosts 
      ? `${new Intl.NumberFormat('en-US').format(kpis.scrapQty)} uds en scrap · ${formatCurrency(kpis.bajaLoss)} en bajas`
      : `${new Intl.NumberFormat('en-US').format(kpis.scrapQty)} uds en scrap · bajas registradas`;
    colorClass = 'border-rose-600 bg-rose-600/5';
  }

  const btnBaseStyle = { minHeight: 'unset', padding: '2px 4px' };

  return (
    <Card className={`flex flex-col justify-between p-5 shadow-sm border-b-4 ${colorClass} transition-colors min-h-[160px] overflow-hidden`}>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="text-muted-foreground opacity-80 shrink-0">
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        {/* Switch adaptativo de 3 pestañas con espacio suficiente para que ningún texto se corte */}
        <div className="grid grid-cols-3 gap-1 bg-muted/80 p-1 rounded-lg border border-border/50 w-full items-center h-8">
          <button
            type="button"
            style={btnBaseStyle}
            onClick={() => onTabChange('ALL')}
            className={`!min-h-0 !py-1 !px-1 text-[11px] font-bold rounded-md text-center transition-all truncate cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-card text-foreground shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Total
          </button>
          <button
            type="button"
            style={btnBaseStyle}
            onClick={() => onTabChange('MERMA')}
            className={`!min-h-0 !py-1 !px-1 text-[11px] font-bold rounded-md text-center transition-all truncate cursor-pointer ${
              activeTab === 'MERMA'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Merma
          </button>
          <button
            type="button"
            style={btnBaseStyle}
            onClick={() => onTabChange('SCRAP')}
            className={`!min-h-0 !py-1 !px-1 text-[11px] font-bold rounded-md text-center transition-all truncate cursor-pointer ${
              activeTab === 'SCRAP'
                ? 'bg-rose-600 text-white shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scrap
          </button>
        </div>
      </div>

      <div className="my-1">
        <p className="text-3xl font-black text-foreground tracking-tight">
          {allowCosts ? formatCurrency(value) : `${new Intl.NumberFormat('en-US').format(value)} uds`}
        </p>
      </div>

      <p className="text-[11px] font-medium text-muted-foreground truncate">
        {subtitle}
      </p>
    </Card>
  );
};

export const WarehouseDashboard: React.FC<WarehouseDashboardProps> = ({ activeTab = 'WAREHOUSE', onSwitchTab }) => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const { theme } = useThemeStore();

  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [lossTab, setLossTab] = useState<'ALL' | 'MERMA' | 'SCRAP'>('ALL');
  
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
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false
  });

  const userName = user?.first_name || user?.username || 'Usuario';

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
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
    materialsWithStockCount: metrics?.materialsWithStockCount || 0,
    silosValue: metrics?.financial?.silosValue || 0,
    silosStockKg: metrics?.financial?.silosStockKg || 0,
    lossValue: metrics?.financial?.lossValue || 0,
    mermaLoss: metrics?.financial?.mermaLoss || 0,
    scrapLoss: metrics?.financial?.scrapLoss || 0,
    bajaLoss: metrics?.financial?.bajaLoss || 0,
    mermaQty: metrics?.financial?.mermaQty || 0,
    scrapQty: metrics?.financial?.scrapQty || 0,
    bajaQty: metrics?.financial?.bajaQty || 0,
    totalLossQty: metrics?.financial?.totalLossQty || 0,
  };

  const chartData = metrics?.chartData || [];
  const mermaData = metrics?.mermaData || [];
  const pieData = metrics?.pieData || [];
  
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-32 sm:pb-16 bg-background overflow-x-hidden w-full">
      
      {/* HEADER GREETING & VIEW TOGGLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-sidebar'))}
            className="lg:hidden p-2 rounded-xl bg-secondary/80 border border-border text-foreground hover:text-primary transition-colors shrink-0 flex items-center justify-center h-10 w-10 cursor-pointer"
            aria-label="Abrir Menú Principal"
            title="Menú"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1 flex flex-col gap-0.5 pr-12 sm:pr-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex flex-wrap items-baseline gap-x-2">
              Monitor de Almacén <span className="text-primary opacity-80 text-lg sm:text-xl font-normal">| Operaciones y Stock</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              Hola, <span className="text-foreground font-bold">{userName}</span>
            </p>
          </div>
        </div>

        {onSwitchTab && (
          <div className="flex items-center gap-2 bg-secondary/60 p-1.5 rounded-xl border border-border shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onSwitchTab('EXECUTIVE')}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Visión Global Ejecutiva
            </button>
            <button
              onClick={() => onSwitchTab('WAREHOUSE')}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-background text-foreground shadow-xs cursor-pointer"
            >
              <Boxes className="size-3.5" />
              Monitor de Almacén
            </button>
          </div>
        )}
      </div>

      {/* FILTER BAR SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-primary/10 p-4 rounded-xl border border-primary/20 items-end">
        <div className="col-span-2 md:col-span-1">
          <h2 className="text-lg font-black tracking-tight text-primary flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Filtros Operativos
          </h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Vista de Almacén</p>
        </div>
        
        <div className="col-span-1 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Año</label>
          <TFSelect 
            value="2026"
            options={[{value: '2026', label: '2026'}]}
            onChange={() => {}}
            className="h-10"
          />
        </div>
        
        <div className="col-span-1 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Periodo</label>
          <TFSelect 
            value="current"
            options={[{value: 'current', label: 'Mes Actual'}]}
            onChange={() => {}}
            className="h-10"
          />
        </div>

        <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <ExecutiveKpiCard 
          title={allowCosts ? "COSTO TOTAL ALMACÉN + SILOS" : "MATERIALES CON EXISTENCIA"}
          value={allowCosts ? kpis.inventoryValue : kpis.materialsWithStockCount}
          unit={allowCosts ? "" : "materiales"}
          isCurrency={allowCosts}
          colorClass="border-blue-500 bg-blue-500/5"
          icon={allowCosts ? <DollarSign className="w-4 h-4 text-blue-500" /> : <Boxes className="w-4 h-4 text-blue-500" />}
          contextText={<><ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {allowCosts ? "Lotes de almacén + inventario en silos" : "Materiales con lotes o silos activos"}</>}
          subtitle={allowCosts ? "Valor de Almacén y silos de Extrusión" : "Conteo de materiales activos"}
        />
        <ExecutiveKpiCard
          title={allowCosts ? "VALOR EN SILOS" : "STOCK EN SILOS"}
          value={allowCosts ? kpis.silosValue : kpis.silosStockKg}
          unit={allowCosts ? "" : "kg"}
          isCurrency={allowCosts}
          colorClass="border-cyan-500 bg-cyan-500/5"
          icon={<Boxes className="w-4 h-4 text-cyan-500" />}
          contextText={<><ShieldCheck className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> {allowCosts ? "Incluido en el costo consolidado" : "Materia prima disponible"}</>}
          subtitle={allowCosts ? "Valorización actual de silos" : "Existencia física compartida con Extrusión"}
        />
        <DynamicLossKpiCard 
          kpis={kpis}
          activeTab={lossTab}
          onTabChange={setLossTab}
          allowCosts={allowCosts}
        />
        <ExecutiveKpiCard 
          title="TOTAL INGRESOS (LOTES)"
          value={kpis.entradas}
          isCurrency={false}
          colorClass="border-emerald-500 bg-emerald-500/5"
          icon={<PackagePlus className="w-4 h-4 text-emerald-500" />}
          contextText={<><Boxes className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Recepciones registradas</>}
          subtitle="Total de lotes dados de alta"
        />
        <ExecutiveKpiCard 
          title="STOCKS BAJOS"
          value={kpis.stockBajo}
          unit="items"
          isCurrency={false}
          colorClass="border-amber-500 bg-amber-500/5"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          contextText={<><AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Mínimos y puntos de reorden</>}
          subtitle="Click para ver reporte de compras"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
          
          {/* Bar Chart: Transacciones */}
          <Card className="p-5 shadow-sm lg:col-span-1">
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
          <Card className="p-5 shadow-sm lg:col-span-1">
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

          {/* Pie Chart: Inventory Value by Family */}
          <Card className="p-5 shadow-sm lg:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">
              {allowCosts ? "Valor de Inventario por Familia" : "Materiales con Stock por Familia"}
            </h3>
            <div className="h-[300px] w-full">
              {pieData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sin datos de inventario
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <RechartsTooltip 
                      formatter={(value) => allowCosts ? formatCurrency(value) : `${value} materiales`}
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }}
                      itemStyle={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
                      labelStyle={{ display: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default WarehouseDashboard;
