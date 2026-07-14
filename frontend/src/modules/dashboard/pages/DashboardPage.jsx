import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { Activity, Package, Layers, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const StatCard = ({ title, value, icon: Icon, colorClass, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    className="glass-panel p-6 flex flex-col justify-between"
  >
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={26} />
      </div>
      <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-md border border-border">
        <TrendingUp size={14} className="text-success" style={{ color: 'var(--color-success)' }} />
        <span className="text-text text-xs font-bold" style={{ color: 'var(--color-text)' }}>+12%</span>
      </div>
    </div>
    
    <div>
      <h3 className="text-muted text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>{title}</h3>
      <p className="text-4xl font-black text-text tracking-tight" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  </motion.div>
);

const DashboardPage = () => {
  const { user } = useAuthStore();
  const userName = user?.first_name || user?.username || 'Usuario';

  // Mock data para KPIs
  const stats = {
    rawMaterial: '4,250 kg',
    yieldRate: '92.4%',
    activeRolls: '315',
    monthlyScrap: '142 kg'
  };

  const yieldData = [
    { name: 'Lun', entradas: 800, salidas: 760 },
    { name: 'Mar', entradas: 650, salidas: 610 },
    { name: 'Mie', entradas: 900, salidas: 870 },
    { name: 'Jue', entradas: 400, salidas: 380 },
    { name: 'Vie', entradas: 750, salidas: 710 },
    { name: 'Sab', entradas: 300, salidas: 280 },
  ];

  const scrapData = [
    { area: 'Mezclado', kg: 45 },
    { area: 'Extrusión', kg: 85 },
    { area: 'Telares', kg: 12 },
  ];

  return (
    <div className="h-full flex flex-col gap-8 pb-10">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Zap size={24} className="text-primary" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-4xl font-black text-text tracking-tight" style={{ color: 'var(--color-text)' }}>
            Hola, <span style={{ color: 'var(--color-primary)' }}>{userName}</span>
          </h1>
        </div>
        <p className="text-muted text-lg font-medium mt-1 ml-12" style={{ color: 'var(--color-muted)' }}>
          Monitor de <span className="font-bold text-text" style={{ color: 'var(--color-text)' }}>Producción y Rendimiento</span> en Tiempo Real.
        </p>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard delay={0.1} title="Materia Prima" value={stats.rawMaterial} icon={Package} colorClass="bg-primary text-white" />
        <StatCard delay={0.2} title="Rendimiento Global" value={stats.yieldRate} icon={Activity} colorClass="bg-success text-white" />
        <StatCard delay={0.3} title="Rollos Activos" value={stats.activeRolls} icon={Layers} colorClass="bg-secondary text-white" />
        <StatCard delay={0.4} title="Merma Acumulada" value={stats.monthlyScrap} icon={AlertTriangle} colorClass="bg-danger text-white" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Yield Area Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6 sm:p-8 xl:col-span-2"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-surface border border-border rounded-lg shadow-sm"><Activity size={22} className="text-primary" style={{ color: 'var(--color-primary)' }} /></div>
            <div>
              <h3 className="text-2xl font-black text-text tracking-tight" style={{ color: 'var(--color-text)' }}>Análisis de Rendimiento</h3>
              <p className="text-sm font-semibold text-muted" style={{ color: 'var(--color-muted)' }}>Comparativa de Entradas vs Salidas (kg)</p>
            </div>
          </div>
          
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted)" tick={{fill: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} dy={15} />
                <YAxis stroke="var(--color-muted)" tick={{fill: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', padding: '12px' }}
                  itemStyle={{ color: 'var(--color-text)', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={40} wrapperStyle={{ paddingBottom: '24px', fontWeight: 700, color: 'var(--color-text)' }} iconType="circle" />
                <Area type="monotone" name="Entradas Acumuladas" dataKey="entradas" stroke="var(--color-primary)" strokeWidth={4} fill="var(--color-primary)" fillOpacity={0.1} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }} />
                <Area type="monotone" name="Salidas Reales" dataKey="salidas" stroke="var(--color-secondary)" strokeWidth={4} fill="var(--color-secondary)" fillOpacity={0.1} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-secondary)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Scrap Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-panel p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-surface border border-border rounded-lg shadow-sm"><AlertTriangle size={22} className="text-danger" style={{ color: 'var(--color-danger)' }} /></div>
            <div>
              <h3 className="text-2xl font-black text-text tracking-tight" style={{ color: 'var(--color-text)' }}>Merma Operativa</h3>
              <p className="text-sm font-semibold text-muted" style={{ color: 'var(--color-muted)' }}>Impacto por Área de Trabajo</p>
            </div>
          </div>
          
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scrapData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="area" stroke="var(--color-muted)" tick={{fill: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} dy={15} />
                <YAxis stroke="var(--color-muted)" tick={{fill: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'var(--color-border)', opacity: 0.5}}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-danger)', fontWeight: 'bold' }}
                />
                <Bar name="Merma Registrada (kg)" dataKey="kg" fill="var(--color-danger)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default DashboardPage;