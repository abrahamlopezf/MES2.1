import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Activity, Package, Layers, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 flex flex-col justify-between"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 shadow-[0_0_15px_rgba(0,0,0,0.1)] backdrop-blur-md`}>
        <Icon size={24} className="text-primary-foreground" />
      </div>
    </div>
    <div>
      <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: async () => {
      const response = await axiosClient.get('/dashboard/operations');
      return response.data.message;
    },
    refetchInterval: 60000, // Recarga cada 1 minuto
  });

  // Data from API or fallbacks
  const stats = {
    rawMaterial: apiData?.kpis?.production?.value ? `${apiData.kpis.production.value} kg` : '0 kg',
    yieldRate: apiData?.kpis?.yield?.value ? `${apiData.kpis.yield.value}%` : '---',
    activeRolls: apiData?.active_runs?.length || '0',
    monthlyScrap: apiData?.kpis?.scrap?.value ? `${apiData.kpis.scrap.value} kg` : '0 kg'
  };

  const yieldData = [
    { name: 'Lun', entradas: 400, salidas: 380 },
    { name: 'Mar', entradas: 300, salidas: 290 },
    { name: 'Mie', entradas: 550, salidas: 510 },
    { name: 'Jue', entradas: 200, salidas: 195 },
    { name: 'Vie', entradas: 450, salidas: 420 },
    { name: 'Sab', entradas: 250, salidas: 240 },
  ];

  const scrapData = [
    { area: 'Mezclado', kg: 15 },
    { area: 'Extrusión', kg: 25 },
    { area: 'Telares', kg: 5 },
  ];

  if (isLoading && !apiData) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-muted-foreground">Cargando datos en tiempo real...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground">Resumen en tiempo real del ciclo productivo.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Última actualización: {apiData?.last_update ? new Date(apiData.last_update).toLocaleTimeString() : '---'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard delay={0.1} title="Producción Actual" value={stats.rawMaterial} icon={Package} color="bg-blue-500" />
        <StatCard delay={0.2} title="Rendimiento (Yield)" value={stats.yieldRate} icon={Activity} color="bg-green-500" />
        <StatCard delay={0.3} title="Corridas Activas" value={stats.activeRolls} icon={Layers} color="bg-purple-500" />
        <StatCard delay={0.4} title="Scrap Generado" value={stats.monthlyScrap} icon={AlertTriangle} color="bg-red-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Yield Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> 
            Rendimiento Semanal (Entradas vs Salidas)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldData}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} />
                <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Area type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" dataKey="salidas" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSalidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Scrap Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            Merma por Área (Kg)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scrapData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="area" stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} />
                <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="kg" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;
