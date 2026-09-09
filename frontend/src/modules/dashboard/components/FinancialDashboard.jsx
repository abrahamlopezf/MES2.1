import React from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, AlertCircle, TrendingDown, PackageCheck, Wallet } from 'lucide-react';
import { apiClient } from '../../../core/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system';
import { useThemeStore } from '../../../store/themeStore';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const StatCard = ({ title, value, icon: Icon, colorClass, delay }) => {
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
        </CardHeader>
        
        <CardContent>
          <CardTitle className="text-foreground opacity-70 text-sm font-bold uppercase tracking-wider mb-1">{title}</CardTitle>
          <p className="text-3xl font-black text-foreground tracking-tight break-words">
            {formatCurrency(value)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const FinancialDashboard = () => {
  const { theme } = useThemeStore();
  
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e4e4e7' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'financial'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/financial');
      return response.data?.data || response.data || {};
    },
    refetchInterval: 30000, 
  });

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <p className="text-lg text-foreground opacity-60 font-bold animate-pulse">Cargando Métricas Financieras...</p>
      </div>
    );
  }

  if (error) {
    return null;
  }

  const kpis = data?.kpis || {};
  const inventoryByArea = data?.charts?.inventoryByArea || [];
  const investmentVsLoss = data?.charts?.investmentVsLoss || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3 mb-2">
        <Wallet size={24} className="text-primary" />
        <h2 className="text-2xl font-black text-foreground tracking-tight m-0">Panel Financiero Ejecutivo</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Total Invertido" 
          value={kpis.totalInvested || 0} 
          icon={DollarSign} 
          colorClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
          delay={0.1}
        />
        <StatCard 
          title="Inventario Actual (Valor)" 
          value={kpis.currentInventoryValue || 0} 
          icon={PackageCheck} 
          colorClass="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          delay={0.2}
        />
        <StatCard 
          title="Pérdidas por Merma" 
          value={kpis.totalLostMerma || 0} 
          icon={TrendingDown} 
          colorClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
          delay={0.3}
        />
        <StatCard 
          title="Pérdidas por Scrap" 
          value={kpis.totalLostScrap || 0} 
          icon={AlertCircle} 
          colorClass="bg-red-500/10 text-red-500 border border-red-500/20"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-[400px] shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg font-bold">Valor de Inventario por Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 pb-4 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryByArea}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {inventoryByArea.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', fontWeight: 'bold' }}
                    itemStyle={{ color: axisColor }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="h-[400px] shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg font-bold">Inversión vs Pérdidas</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 pb-4 pt-4 pr-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investmentVsLoss} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke={axisColor} 
                    fontSize={12} 
                    tickFormatter={(value) => `$${value/1000}k`}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    cursor={{ fill: gridColor, opacity: 0.4 }}
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', fontWeight: 'bold' }}
                    itemStyle={{ color: axisColor }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {investmentVsLoss.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <div className="w-full h-px bg-border/80 my-2"></div>
    </div>
  );
};
