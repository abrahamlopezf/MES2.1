import React from 'react';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Legend 
} from 'recharts';
import { Card } from '../../../../design-system';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../core/api/apiClient';
import { useThemeStore } from '../../../../store/themeStore';

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
            <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="70%" outerRadius="100%" dataKey="value" stroke="none" cornerRadius={4} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 text-2xl font-black">{Number(value).toFixed(2)} %</div>
      </div>
    </Card>
  );
};

export const ProductionDashboard = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const axisColor = isDark ? '#e4e4e7' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';

  const { data: opData, isLoading } = useQuery({
    queryKey: ['dashboard', 'operations'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/dashboard/operations');
        return response.data?.data || response.data || {};
      } catch (e) {
        return {};
      }
    }
  });

  if (isLoading) return <div className="p-8 animate-pulse text-center">Cargando Dashboard de Producción...</div>;

  const kpisOp = opData?.kpis || {};
  const mixedChartData = (opData?.charts?.yieldData || []).map(d => ({
    name: d.date || '',
    produccion: d.output || 0,
    planificacion: d.input || 0,
    capacidad: (d.output || 0) * 1.2
  }));

  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const totalScrapAmount = opData?.charts?.scrapData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 1;
  const donutData = (opData?.charts?.scrapData || []).map((d, index) => ({
    name: d.area || 'Desconocido',
    value: Number(((d.amount / totalScrapAmount) * 100).toFixed(2)),
    fill: colors[index % colors.length]
  }));

  if (mixedChartData.length === 0) mixedChartData.push({ name: 'Sin Datos', produccion: 0, planificacion: 0, capacidad: 0 });
  if (donutData.length === 0) donutData.push({ name: 'Sin Mermas', value: 100, fill: '#27272a' });

  const yieldReal = Number(kpisOp?.yield?.value) || 0;
  const calidadReal = Number(kpisOp?.calidad?.value) || 0;
  const disponibilidadReal = Number(kpisOp?.disponibilidad?.value) || 0;
  const oeeReal = Number(kpisOp?.oee?.value) || 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground opacity-70 mb-6 uppercase tracking-wider text-center">Producción vs Planificación vs Capacidad</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mixedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="produccion" name="PRODUCCIÓN" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="planificacion" name="PLANIFICACIÓN" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="capacidad" name="CAPACIDAD" stroke="#ef4444" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground opacity-70 mb-2 uppercase tracking-wider text-center">Motivo No Conformidades</h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" stroke={tooltipBg} strokeWidth={2}>
                  {donutData.map((entry, index) => <Cell key={cell-} fill={entry.fill} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: isDark ? '#fff' : '#000' }} formatter={(value) => ${value}%} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        <GaugeChart title="Calidad" value={calidadReal} color="#3b82f6" />
        <GaugeChart title="Disponibilidad" value={disponibilidadReal} color="#10b981" />
        <GaugeChart title="Rendimiento" value={yieldReal} color="#f59e0b" />
        <GaugeChart title="Índice OEE" value={oeeReal} color="#8b5cf6" />
      </div>
    </div>
  );
};
