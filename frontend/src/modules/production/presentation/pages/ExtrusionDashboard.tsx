import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Gauge, TrendingDown, Layers } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { useThemeStore } from '../../../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../design-system';

const ExecutiveKpiCard = ({ title, value, unit = '', colorClass }) => {
  return (
    <Card 
      className={`flex flex-col justify-center px-6 py-4 shadow-sm border-b-4 ${colorClass}`}
    >
      <p className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-foreground tracking-tight">
        {new Intl.NumberFormat('en-US').format(value)} {unit && <span className="text-xl opacity-60 font-medium">{unit}</span>}
      </p>
    </Card>
  );
};

export const ExtrusionDashboard = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e4e4e7' : '#18181b'; 
  const gridColor = isDark ? '#27272a' : '#e4e4e7'; 
  const tooltipBg = isDark ? '#18181b' : '#ffffff'; 
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7'; 

  // Mock data for Extrusion metrics
  const productionTrend = [
    { hour: '06:00', yield: 450, scrap: 15 },
    { hour: '08:00', yield: 520, scrap: 20 },
    { hour: '10:00', yield: 610, scrap: 12 },
    { hour: '12:00', yield: 590, scrap: 18 },
    { hour: '14:00', yield: 640, scrap: 10 },
    { hour: '16:00', yield: 680, scrap: 22 },
  ];

  const oeeData = [
    { name: 'Disponibilidad', value: 92, fill: '#3b82f6' },
    { name: 'Rendimiento', value: 85, fill: '#8b5cf6' },
    { name: 'Calidad', value: 96, fill: '#10b981' },
  ];

  const activeMachines = [
    { id: 'EXT-01', status: 'RUNNING', output: '45 kg/h', operator: 'Juan Pérez' },
    { id: 'EXT-02', status: 'STOPPED', output: '0 kg/h', operator: 'N/A' },
    { id: 'EXT-03', status: 'RUNNING', output: '52 kg/h', operator: 'María García' },
    { id: 'EXT-04', status: 'SETUP', output: '0 kg/h', operator: 'Carlos López' },
  ];

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background overflow-x-hidden">
      
      {/* HEADER GREETING */}
      <div className="flex flex-col gap-1 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Módulo de Extrusión
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium">
          Hola, {user?.name || 'Usuario'} — aquí tienes el estado de las líneas de extrusión.
        </p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ExecutiveKpiCard 
            title="Producción del Turno" 
            value={3500} 
            unit="kg"
            colorClass="border-blue-500" 
          />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ExecutiveKpiCard 
            title="OEE Promedio" 
            value={89.5} 
            unit="%"
            colorClass="border-emerald-500" 
          />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <ExecutiveKpiCard 
            title="Merma / Scrap" 
            value={97} 
            unit="kg"
            colorClass="border-red-500" 
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ExecutiveKpiCard 
            title="Líneas Activas" 
            value={2} 
            unit="/ 4"
            colorClass="border-purple-500" 
          />
        </motion.div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TENDENCIA DE PRODUCCIÓN */}
        <Card className="lg:col-span-2 shadow-sm border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-muted-foreground" />
              Tendencia de Producción vs Scrap
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} opacity={0.5} />
                <XAxis dataKey="hour" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: axisColor }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="yield" name="Rendimiento (kg)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                <Area type="monotone" dataKey="scrap" name="Scrap (kg)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorScrap)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MÉTRICAS OEE */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Gauge className="w-5 h-5 text-muted-foreground" />
              Desglose OEE
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oeeData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} opacity={0.5} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke={axisColor} fontSize={12} width={80} />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: axisColor }}
                    formatter={(value) => [`${value}%`, '']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {oeeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* BOTTOM SECTION: MACHINE STATUS */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Estado de Líneas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-md">Línea</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Velocidad / Salida</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-md">Operador</th>
                </tr>
              </thead>
              <tbody>
                {activeMachines.map((machine, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">{machine.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        machine.status === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-500' :
                        machine.status === 'STOPPED' ? 'bg-red-500/10 text-red-500' :
                        'bg-orange-500/10 text-orange-500'
                      }`}>
                        {machine.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{machine.output}</td>
                    <td className="px-4 py-3 text-muted-foreground">{machine.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
