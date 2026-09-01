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
import { Card, CardContent, CardHeader, CardTitle, TopBar } from '../../../../design-system';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../core/api/apiClient';

const StatCard = ({ title, value, unit = '', icon: Icon, colorClass, delay, status = 'DEFAULT' }) => {
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
          <p className="text-4xl font-black text-foreground tracking-tight">
            {value} <span className="text-xl font-medium opacity-60">{unit}</span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
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
      const response = await apiClient.get('/warehouse/dashboard-metrics');
      return response.data;
    }
  });

  const userName = user?.first_name || user?.username || 'Usuario';

  return (
    <div className="flex flex-col h-full bg-background relative pb-28 overflow-x-hidden">
      <TopBar title="Dashboard de Almacén" />

      <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 mt-4">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            ¡Hola, <span className="text-primary">{userName}</span>! 👋
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Aquí está el resumen del almacén hoy.</p>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Entradas"
            value={isLoading ? '-' : (metrics?.totalEntradas || 0)}
            icon={ArrowDownCircle}
            colorClass="bg-primary/20 text-primary"
            delay={0.1}
          />
          
          <StatCard
            title="Bajas y Consumos"
            value={isLoading ? '-' : (metrics?.bajasRegistradas || 0)}
            icon={TrendingDown}
            colorClass="bg-destructive/20 text-destructive"
            delay={0.2}
          />
          
          <StatCard
            title="Stock Bajo"
            value={isLoading ? '-' : (metrics?.materialesStockBajo || 0)}
            icon={AlertTriangle}
            colorClass="bg-warning/20 text-warning"
            delay={0.3}
          />
          
          <StatCard
            title="Merma / Scrap"
            value={isLoading ? '-' : (metrics?.mermaRegistrada || 0)}
            icon={Boxes}
            colorClass="bg-secondary text-secondary-foreground"
            delay={0.4}
            unit="kg"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="w-full"
          >
            <Card className="h-[400px] flex flex-col">
              <CardHeader>
                <CardTitle>Transacciones (Últimos 7 días)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {isLoading ? (
                   <div className="h-full flex items-center justify-center opacity-50">Cargando datos...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics?.chartData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="date" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas (Trx)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bajas" name="Salidas (Trx)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="w-full"
          >
            <Card className="h-[400px] flex flex-col">
              <CardHeader>
                <CardTitle>Tendencia de Merma (kg)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {isLoading ? (
                   <div className="h-full flex items-center justify-center opacity-50">Cargando datos...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.mermaData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorMerma" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="date" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="merma" name="Merma" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorMerma)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
};
