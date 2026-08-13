import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Activity, Package, Layers, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';

const StatCard = ({ title, value, unit = '', icon: Icon, colorClass, delay, status = 'DEFAULT' }) => {
  // Opcional: Podríamos usar el 'status' para mostrar un semáforo (ej. GOOD, WARNING, CRITICAL)
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card className="flex flex-col justify-between h-full shadow-sm">
        <CardHeader className="flex flex-row justify-between items-start pb-2">
          <div className={`p-3 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon size={26} />
          </div>
          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border border-border">
            <TrendingUp size={14} className={status === 'CRITICAL' ? 'text-danger' : 'text-success'} />
            <span className="text-foreground text-xs font-bold">{status}</span>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardTitle className="text-foreground opacity-70 text-sm font-bold uppercase tracking-wider mb-1">{title}</CardTitle>
          <p className="text-4xl font-black text-foreground tracking-tight">
            {value} <span className="text-xl font-medium opacity-60">{unit}</span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const userName = user?.first_name || user?.username || 'Usuario';

  // Configuración de colores estrictos para Recharts
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e4e4e7' : '#18181b'; // zinc-200 : zinc-900
  const gridColor = isDark ? '#27272a' : '#e4e4e7'; // zinc-800 : zinc-200
  const tooltipBg = isDark ? '#18181b' : '#ffffff'; // card bg
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7'; // border

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/operations');
      const responseData = response.data || response;
      return responseData.data || responseData;
    },
    refetchInterval: 60000, // Recarga cada 60 segundos
  });

  // Extraemos KPIs del payload
  const kpis = dashboardData?.kpis || {};
  const activeRuns = dashboardData?.active_runs || [];
  const activeRollsCount = activeRuns.length; // Simplificamos usando la cuenta de active runs como active rolls por ahora
  
  const stats = {
    rawMaterial: kpis.production?.value || 0,
    rawMaterialUnit: kpis.production?.unit || 'kg',
    yieldRate: kpis.yield?.value || '---',
    yieldRateUnit: kpis.yield?.unit || '%',
    activeRolls: activeRollsCount,
    monthlyScrap: kpis.scrap?.value || 0,
    monthlyScrapUnit: kpis.scrap?.unit || 'kg',
  };

  const yieldData = dashboardData?.charts?.yieldData || [];
  const scrapData = dashboardData?.charts?.scrapData || [];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xl text-foreground opacity-60 font-bold animate-pulse">Cargando Dashboard en Tiempo Real...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8 px-4 sm:px-6 md:px-8 pb-32 sm:pb-12 overflow-x-hidden">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Zap size={24} className="text-primary" />
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Hola, <span className="text-primary">{userName}</span>
          </h1>
        </div>
        <p className="text-foreground opacity-70 text-lg font-medium mt-1 ml-12">
          Monitor de <span className="font-bold text-foreground">Producción y Rendimiento</span> en Tiempo Real.
        </p>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard delay={0.1} title="Materia Prima" value={stats.rawMaterial} unit={stats.rawMaterialUnit} status={kpis.production?.status} icon={Package} colorClass="bg-primary text-primary-foreground" />
        <StatCard delay={0.2} title="Rendimiento Global" value={stats.yieldRate} unit={stats.yieldRateUnit} status={kpis.yield?.status} icon={Activity} colorClass="bg-success text-success-foreground" />
        <StatCard delay={0.3} title="Rollos Activos" value={stats.activeRolls} unit="" status="GOOD" icon={Layers} colorClass="bg-secondary text-secondary-foreground" />
        <StatCard delay={0.4} title="Merma Acumulada" value={stats.monthlyScrap} unit={stats.monthlyScrapUnit} status={kpis.scrap?.status} icon={AlertTriangle} colorClass="bg-danger text-danger-foreground" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Yield Area Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2"
        >
          <Card className="h-full shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-8">
              <div className="p-3 bg-muted border border-border rounded-lg shadow-sm"><Activity size={22} className="text-primary" /></div>
              <div>
                <CardTitle className="text-2xl font-black text-foreground tracking-tight">Análisis de Rendimiento</CardTitle>
                <p className="text-sm font-semibold text-foreground opacity-70">Comparativa de Entradas vs Salidas (kg)</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[320px] lg:h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" stroke={axisColor} tick={{fill: axisColor, fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} dy={15} />
                    <YAxis stroke={axisColor} tick={{fill: axisColor, fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: axisColor, padding: '12px' }}
                      itemStyle={{ color: axisColor, fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={40} wrapperStyle={{ paddingBottom: '24px', fontWeight: 700, color: 'var(--foreground)' }} iconType="circle" />
                    <Area type="monotone" name="Entradas Acumuladas" dataKey="entradas" stroke="var(--primary)" strokeWidth={4} fill="var(--primary)" fillOpacity={0.1} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }} />
                    <Area type="monotone" name="Salidas Reales" dataKey="salidas" stroke="var(--secondary)" strokeWidth={4} fill="var(--secondary)" fillOpacity={0.1} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--secondary)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Scrap Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="h-full shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-8">
              <div className="p-3 bg-muted border border-border rounded-lg shadow-sm"><AlertTriangle size={22} className="text-danger" /></div>
              <div>
                <CardTitle className="text-2xl font-black text-foreground tracking-tight">Merma Operativa</CardTitle>
                <p className="text-sm font-semibold text-foreground opacity-70">Impacto por Área de Trabajo</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[320px] lg:h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scrapData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="area" stroke={axisColor} tick={{fill: axisColor, fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} dy={15} />
                    <YAxis stroke={axisColor} tick={{fill: axisColor, fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{fill: gridColor, opacity: 0.5}}
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: axisColor }}
                      itemStyle={{ color: 'var(--danger)', fontWeight: 'bold' }}
                    />
                    <Bar name="Merma Registrada (kg)" dataKey="kg" fill="var(--danger)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
};

export default DashboardPage;