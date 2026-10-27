import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { useAuthStore } from '../../../../store/authStore';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Calendar, 
  DollarSign, 
  Package, 
  RotateCcw, 
  Download, 
  Filter, 
  ShieldAlert, 
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

export const WarehouseReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const allowedRoles = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_ALM', 'ADMIN_ALMACEN'];
  const userRole = user?.role?.code || '';
  const hasAccess = allowedRoles.includes(userRole);

  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'SUPPLIERS' | 'MERMA_SCRAP'>('MONTHLY');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedBajaType, setSelectedBajaType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.info('Generando documento PDF oficial...');

      let endpoint = '';
      let filename = '';
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());
      if (selectedMonth !== 'all') params.append('month', selectedMonth);

      if (activeTab === 'MONTHLY') {
        endpoint = '/warehouse/reports/monthly/pdf';
        filename = `Reporte-Mensual-Almacen-${selectedYear}-${selectedMonth}.pdf`;
      } else if (activeTab === 'SUPPLIERS') {
        endpoint = '/warehouse/reports/suppliers/pdf';
        filename = `Reporte-Proveedores-MP-${selectedYear}-${selectedMonth}.pdf`;
      } else if (activeTab === 'MERMA_SCRAP') {
        endpoint = '/warehouse/reports/merma-scrap-devoluciones/pdf';
        if (selectedBajaType !== 'ALL') params.append('type', selectedBajaType);
        filename = `Reporte-Bajas-Merma-Scrap-Devoluciones-${selectedYear}-${selectedMonth}.pdf`;
      }

      const response = await axiosClient.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Reporte PDF descargado exitosamente.');
    } catch (error: any) {
      console.error('Error al generar PDF del reporte:', error);
      toast.error('Ocurrió un error al generar el PDF del reporte.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // 1. Query Reporte Mensual
  const { data: monthlyData, isLoading: loadingMonthly } = useQuery({
    queryKey: ['warehouse', 'reports', 'monthly', selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      const res = await axiosClient.get(`/warehouse/reports/monthly?${params.toString()}`);
      return res.data?.data;
    },
    enabled: hasAccess && activeTab === 'MONTHLY'
  });

  // 2. Query Reporte Proveedores de MP
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['warehouse', 'reports', 'suppliers', selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      const res = await axiosClient.get(`/warehouse/reports/suppliers?${params.toString()}`);
      return res.data?.data;
    },
    enabled: hasAccess && activeTab === 'SUPPLIERS'
  });

  // 3. Query Reporte Bajas, Merma, Scrap y Devoluciones
  const { data: mermaScrapData, isLoading: loadingMermaScrap } = useQuery({
    queryKey: ['warehouse', 'reports', 'merma-scrap-devoluciones', selectedYear, selectedMonth, selectedBajaType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      if (selectedBajaType !== 'ALL') params.append('type', selectedBajaType);
      const res = await axiosClient.get(`/warehouse/reports/merma-scrap-devoluciones?${params.toString()}`);
      return res.data?.data;
    },
    enabled: hasAccess && activeTab === 'MERMA_SCRAP'
  });

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acceso Restringido a Reportes Ejecutivos</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Este módulo de análisis gerencial está reservado exclusivamente para los roles de Administración y Jefatura de Almacén (Admin, Superadmin y Admin_ALM).
        </p>
      </div>
    );
  }

  const filteredRecentMovements = (monthlyData?.recentMovements || [])
    .filter((movement: any) =>
      !searchTerm ||
      movement.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.internalCode?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 20);

  // Paleta de colores ejecutiva (Design System tokens)
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-32 sm:pb-16 bg-background overflow-x-hidden">
      
      {/* Header Ejecutivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Reportes Ejecutivos de Almacén</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Análisis estratégico de compras de materia prima, balance mensual, tendencias y control de bajas/devoluciones.
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Herramientas y Filtro de Período */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {/* Cápsula de Selección de Período */}
          <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-xl shadow-xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted-foreground bg-muted/40 rounded-lg">
                <Calendar size={14} className="text-primary shrink-0" />
                <span>Período:</span>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-8 px-2.5 text-xs sm:text-sm font-bold bg-background text-foreground border border-border/80 rounded-lg outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 px-2.5 text-xs sm:text-sm font-semibold bg-background text-foreground border border-border/80 rounded-lg outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/50 transition-colors"
              >
                <option value="all">Todo el año</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>

            {/* Botón Imprimir / Exportar Reporte PDF Formateado */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="h-10 px-3.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer hover:border-primary/50 active:scale-95 shrink-0 disabled:opacity-60"
              title="Descargar Reporte Ejecutivo en PDF Formateado"
            >
              {isExportingPdf ? (
                <Loader2 size={15} className="text-primary animate-spin" />
              ) : (
                <Printer size={15} className="text-primary" />
              )}
              <span>{isExportingPdf ? 'Generando PDF...' : 'Imprimir PDF'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegación de Vistas de Reportes */}
        <div className="border-b border-border">
          <nav className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6 pb-3 lg:pb-0" aria-label="Vistas de reportes">
            <button
              onClick={() => setActiveTab('MONTHLY')}
              className={`group w-full lg:w-auto flex items-center text-left lg:text-center gap-3 py-3 px-3 lg:py-3.5 text-base font-bold border-l-4 lg:border-l-0 lg:border-b-2 transition-colors cursor-pointer ${
                activeTab === 'MONTHLY'
                  ? 'border-primary bg-primary/5 text-primary lg:bg-transparent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
                <div className={`p-2 rounded-lg transition-colors ${
                activeTab === 'MONTHLY' ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
              }`}>
                <Layers size={20} />
              </div>
              <span>Reporte Mensual y Balances</span>
            </button>

            <button
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`group w-full lg:w-auto flex items-center text-left lg:text-center gap-3 py-3 px-3 lg:py-3.5 text-base font-bold border-l-4 lg:border-l-0 lg:border-b-2 transition-colors cursor-pointer ${
                activeTab === 'SUPPLIERS'
                  ? 'border-primary bg-primary/5 text-primary lg:bg-transparent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
                <div className={`p-2 rounded-lg transition-colors ${
                activeTab === 'SUPPLIERS' ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
              }`}>
                <Truck size={20} />
              </div>
              <span>Proveedores de Materia Prima (MP)</span>
            </button>

            <button
              onClick={() => setActiveTab('MERMA_SCRAP')}
              className={`group w-full lg:w-auto flex items-center text-left lg:text-center gap-3 py-3 px-3 lg:py-3.5 text-base font-bold border-l-4 lg:border-l-0 lg:border-b-2 transition-colors cursor-pointer ${
                activeTab === 'MERMA_SCRAP'
                  ? 'border-primary bg-primary/5 text-primary lg:bg-transparent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
                <div className={`p-2 rounded-lg transition-colors ${
                activeTab === 'MERMA_SCRAP' ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
              }`}>
                <RotateCcw size={20} />
              </div>
              <span>Bajas, Merma, Scrap y Devoluciones</span>
            </button>
          </nav>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: REPORTE MENSUAL EJECUTIVO                                          */}
        {/* ========================================================================= */}
        {activeTab === 'MONTHLY' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-sm sm:text-base font-bold text-foreground">Ingresos / Compras</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums break-words">
                    {formatCurrency(monthlyData?.kpis?.totalIncomeCost || 0)}
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground mt-2">
                    Volumen recibido: <strong className="text-foreground">{formatNumber(monthlyData?.kpis?.totalIncomeQty || 0)}</strong> uds/kg
                  </p>
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-sm sm:text-base font-bold text-foreground">Consumos Operativos</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Package size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums break-words">
                    {formatCurrency(monthlyData?.kpis?.totalConsumptionCost || 0)}
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground mt-2">
                    Material consumido: <strong className="text-foreground">{formatNumber(monthlyData?.kpis?.totalConsumptionQty || 0)}</strong> uds/kg
                  </p>
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-sm sm:text-base font-bold text-foreground">Pérdidas (Merma + Scrap)</span>
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                    <TrendingDown size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums break-words">
                    {formatCurrency(monthlyData?.kpis?.totalWasteCost || 0)}
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground mt-2">
                    Merma/Scrap/Bajas: <strong className="text-foreground">{formatNumber(monthlyData?.kpis?.totalWasteQty || 0)}</strong> uds/kg
                  </p>
                </div>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-sm sm:text-base font-bold text-foreground">Devoluciones a Proveedor</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <RotateCcw size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-black text-foreground tabular-nums break-words">
                    {formatCurrency(monthlyData?.kpis?.devolucionCost || 0)}
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground mt-2">
                    Devuelto al proveedor: <strong className="text-foreground">{formatNumber(monthlyData?.kpis?.devolucionQty || 0)}</strong> uds/kg
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfica de Tendencia Mensual */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Tendencia Mensual de Movimientos ({selectedYear})</h3>
                  <p className="text-xs text-muted-foreground">Comparativa de compras vs consumos vs pérdidas y devoluciones</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Ingresos</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Consumos</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Pérdidas</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Devolución</span>
                </div>
              </div>

              <div className="h-[320px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData?.monthlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="monthName" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                    />
                    <RechartsTooltip 
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{ backgroundColor: 'var(--card, #1e293b)', borderColor: 'var(--border, #334155)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="entriesCost" name="Ingresos ($)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="consumptionsCost" name="Consumos ($)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="wasteCost" name="Pérdidas ($)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="devolucionCost" name="Devoluciones ($)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribución por Categoría de Material */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                <h3 className="text-base font-bold text-foreground">Inversión por Clasificación de Material</h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyData?.rankingDistribution || []}
                        dataKey="totalPurchasesCost"
                        nameKey="rankingName"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {(monthlyData?.rankingDistribution || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Balance Neto y Rotación */}
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Diagnóstico de Rotación de Almacén</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Indicador ejecutivo de absorción del inventario por la planta de producción.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 my-auto">
                  <div className="p-4 rounded-xl bg-muted/20 border border-border">
                    <span className="text-sm text-muted-foreground font-semibold">Tasa de Consumo s/ Ingreso</span>
                    <div className="text-3xl font-black text-primary mt-2">
                      {monthlyData?.kpis?.turnoverRatePct || 0}%
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground mt-2">De lo comprado ha sido consumido en producción</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border">
                    <span className="text-sm text-muted-foreground font-semibold">Balance Financiero Neto</span>
                    <div className="text-2xl font-black text-foreground mt-2">
                      {formatCurrency(monthlyData?.kpis?.netBalanceCost || 0)}
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground mt-2">Valor retenido en almacén en el período</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>Los datos reflejan movimientos validados por lotes físicos y órdenes de consumo cerradas.</span>
                </div>
              </div>
            </div>

            {/* Tabla de Movimientos Recientes del Período */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-base text-foreground">Detalle de Movimientos en el Período</h3>
                  <p className="text-xs text-muted-foreground">Últimas transacciones registradas de almacén</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Filtrar por material o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-background rounded-xl border border-border outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="md:hidden divide-y divide-border">
                {filteredRecentMovements.length === 0 ? (
                  <p className="px-4 py-8 text-center text-base text-muted-foreground">
                    No hay movimientos registrados en este período.
                  </p>
                ) : (
                  filteredRecentMovements.map((row: any) => (
                    <article key={row.id} className="p-4 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {new Date(row.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                          <h4 className="mt-1 text-base leading-snug font-bold text-foreground break-words">{row.materialName}</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">{row.internalCode}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs leading-snug font-bold uppercase shrink-0 ${
                          row.type === 'MANUAL_ENTRY' || row.type === 'RECEPTION' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          row.type === 'CONSUMPTION' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          row.type === 'DEVOLUCION' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {row.type}
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Cantidad</dt>
                          <dd className="mt-0.5 font-bold text-foreground">{formatNumber(row.quantity)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Costo unitario</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">{formatCurrency(row.unitCost)}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Costo total</dt>
                          <dd className="mt-0.5 text-base font-bold text-foreground">{formatCurrency(row.totalCost)}</dd>
                        </div>
                      </dl>

                      <div className="border-t border-border pt-3 text-sm">
                        <p className="font-semibold text-foreground break-words">{row.performedBy}</p>
                        {row.notes && <p className="mt-1 leading-snug text-muted-foreground break-words">{row.notes}</p>}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4 text-right">Costo Unitario</th>
                      <th className="py-3 px-4 text-right">Costo Total</th>
                      <th className="py-3 px-4">Responsable / Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRecentMovements.map((row: any) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {new Date(row.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              row.type === 'MANUAL_ENTRY' || row.type === 'RECEPTION' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              row.type === 'CONSUMPTION' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              row.type === 'DEVOLUCION' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">{row.materialName}</div>
                            <div className="text-[10px] text-muted-foreground">{row.internalCode}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground">
                            {formatNumber(row.quantity)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {formatCurrency(row.unitCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground">
                            {formatCurrency(row.totalCost)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="font-semibold text-foreground/90">{row.performedBy}</div>
                            <div className="text-[10px] truncate max-w-xs">{row.notes}</div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REPORTE DE PROVEEDORES DE MATERIA PRIMA (MP)                        */}
        {/* ========================================================================= */}
        {activeTab === 'SUPPLIERS' && (
          <div className="space-y-6">
            {/* Aviso directivo */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Truck className="text-primary shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Proveedores Exclusivos de Materia Prima (MP)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clasificados estrictamente de <strong>mayor a menor en importe de compra</strong> acumulado durante el período seleccionado ({selectedYear}).
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex text-xs font-bold px-3 py-1 bg-background text-primary rounded-xl border border-primary/20 shrink-0">
                Ranking Pareto 80/20
              </div>
            </div>

            {/* KPI Cards de Proveedores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Compras en MP</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatCurrency(suppliersData?.kpis?.totalMpPurchasesCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Inversión acumulada en materia prima</p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Volumen Total MP</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatNumber(suppliersData?.kpis?.totalMpQuantity || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Kilos y unidades surtidas</p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedor Principal</span>
                <div className="text-lg font-black text-primary truncate mt-2" title={suppliersData?.kpis?.topSupplierName}>
                  {suppliersData?.kpis?.topSupplierName || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Concentra el <strong className="text-foreground">{suppliersData?.kpis?.topSupplierShare || 0}%</strong> de las compras
                </p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proveedores Activos MP</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {suppliersData?.kpis?.totalActiveSuppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En {suppliersData?.kpis?.totalLotsReceived || 0} lotes recibidos
                </p>
              </div>
            </div>

            {/* Gráfica 1: Ranking de Proveedores de Mayor a Menor (Compras) */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-foreground">Clasificación de Compras a Proveedores de MP</h3>
                  <p className="text-xs text-muted-foreground">Ordenados de mayor a menor según inversión económica ($)</p>
                </div>
              </div>

              <div className="h-[320px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={(suppliersData?.suppliers || []).slice(0, 10)} 
                    layout="vertical" 
                    margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis 
                      type="number" 
                      stroke="#888888" 
                      fontSize={11} 
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                    />
                    <YAxis 
                      type="category" 
                      dataKey="supplierName" 
                      stroke="#888888" 
                      fontSize={11} 
                      width={120} 
                      tickFormatter={(name) => name.length > 16 ? `${name.substring(0, 16)}...` : name}
                    />
                    <RechartsTooltip 
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Total Compras']}
                      contentStyle={{ backgroundColor: 'var(--card, #1e293b)', borderColor: 'var(--border, #334155)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="totalPurchasesCost" fill="#2563eb" radius={[0, 6, 6, 0]}>
                      {(suppliersData?.suppliers || []).slice(0, 10).map((_: any, index: number) => (
                        <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 2: Tendencias Mensuales de los Principales Proveedores de MP */}
            {suppliersData?.topSuppliersTrend?.length > 0 && (
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Tendencia Mensual de Abastecimiento por Proveedor</h3>
                  <p className="text-xs text-muted-foreground">Evolución del volumen de compra a lo largo del año ({selectedYear})</p>
                </div>

                <div className="h-[280px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={suppliersData.topSuppliersTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="monthName" stroke="#888888" fontSize={12} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                      <RechartsTooltip 
                        formatter={(val: any) => formatCurrency(Number(val))}
                        contentStyle={{ backgroundColor: 'var(--card, #1e293b)', borderColor: 'var(--border, #334155)', borderRadius: '12px' }}
                      />
                      <Legend />
                      {(suppliersData.suppliers || []).slice(0, 4).map((s: any, idx: number) => (
                        <Line 
                          key={s.supplierId} 
                          type="monotone" 
                          dataKey={s.supplierName} 
                          stroke={COLORS[idx % COLORS.length]} 
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tabla Ejecutiva de Proveedores de MP */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-foreground">Directorio Clasificado de Proveedores de MP</h3>
                  <p className="text-xs text-muted-foreground">De mayor a menor volumen monetario y porcentaje de participación</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4 text-center">Rank</th>
                      <th className="py-3 px-4">Código / RFC</th>
                      <th className="py-3 px-4">Proveedor / Razón Social</th>
                      <th className="py-3 px-4">Materiales Surtidos</th>
                      <th className="py-3 px-4 text-right">Lotes</th>
                      <th className="py-3 px-4 text-right">Volumen (uds/kg)</th>
                      <th className="py-3 px-4 text-right">Total Compras ($)</th>
                      <th className="py-3 px-4 text-right">% Participación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(suppliersData?.suppliers || []).map((sup: any) => (
                      <tr key={sup.supplierId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            sup.rank === 1 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                            sup.rank === 2 ? 'bg-slate-300/20 text-foreground border border-slate-400/30' :
                            sup.rank === 3 ? 'bg-amber-700/20 text-amber-700 border border-amber-700/30' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            #{sup.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-primary">{sup.supplierCode}</div>
                          <div className="text-[10px] text-muted-foreground">{sup.taxId || 'Sin RFC'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground text-sm">{sup.supplierName}</div>
                          {sup.commercialName && sup.commercialName !== sup.supplierName && (
                            <div className="text-[11px] text-muted-foreground">{sup.commercialName}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {sup.phone || sup.email || 'Sin contacto directo'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {sup.materialsSupplied.slice(0, 3).map((mat: string, idx: number) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] text-foreground/80 border border-border/40 truncate">
                                {mat}
                              </span>
                            ))}
                            {sup.materialsSupplied.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                +{sup.materialsSupplied.length - 3} más
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          {sup.totalLots}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          {formatNumber(sup.totalQuantityReceived)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-foreground text-sm">
                          {formatCurrency(sup.totalPurchasesCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-primary">{sup.percentageShare}%</div>
                          <div className="w-16 h-1.5 bg-muted rounded-full ml-auto mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.min(100, sup.percentageShare)}%` }} 
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BAJAS, MERMA, SCRAP Y DEVOLUCIONES                                 */}
        {/* ========================================================================= */}
        {activeTab === 'MERMA_SCRAP' && (
          <div className="space-y-6">
            {/* Filtros de Tipo de Baja */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Filtrar por Clasificación:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'Todos los Tipos' },
                  { id: 'MERMA', label: 'Merma de Proceso' },
                  { id: 'SCRAP', label: 'Scrap y Dañados' },
                  { id: 'BAJA', label: 'Bajas Administrativas' },
                  { id: 'DEVOLUCION', label: 'Devolución a Proveedor' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedBajaType(type.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedBajaType === type.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards de Bajas y Devoluciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Merma en Proceso</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatCurrency(mermaScrapData?.kpis?.totalMermaCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad: <strong className="text-foreground">{formatNumber(mermaScrapData?.kpis?.totalMermaQty || 0)}</strong> kg/uds
                </p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scrap Generado</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatCurrency(mermaScrapData?.kpis?.totalScrapCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad: <strong className="text-foreground">{formatNumber(mermaScrapData?.kpis?.totalScrapQty || 0)}</strong> kg/uds
                </p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bajas de Almacén</span>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatCurrency(mermaScrapData?.kpis?.totalBajaCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Daños/Caducidad: <strong className="text-foreground">{formatNumber(mermaScrapData?.kpis?.totalBajaQty || 0)}</strong> uds
                </p>
              </div>

              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Devolución Proveedor</span>
                  <RotateCcw size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-black text-foreground mt-2">
                  {formatCurrency(mermaScrapData?.kpis?.totalDevolucionCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Descontado: <strong className="text-foreground">{formatNumber(mermaScrapData?.kpis?.totalDevolucionQty || 0)}</strong> uds devueltas
                </p>
              </div>
            </div>

            {/* Gráfica de Tendencia de Bajas, Mermas y Devoluciones */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-foreground">Evolución de Pérdidas y Devoluciones ({selectedYear})</h3>
                  <p className="text-xs text-muted-foreground">Comportamiento mensual de mermas, scrap y devoluciones al proveedor</p>
                </div>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mermaScrapData?.trends || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMerma" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDevolucion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="monthName" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{ backgroundColor: 'var(--card, #1e293b)', borderColor: 'var(--border, #334155)', borderRadius: '12px' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="mermaCost" name="Merma ($)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMerma)" />
                    <Area type="monotone" dataKey="scrapCost" name="Scrap ($)" stroke="#ef4444" fillOpacity={1} fill="url(#colorScrap)" />
                    <Area type="monotone" dataKey="devolucionCost" name="Devolución ($)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDevolucion)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla por Material */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-foreground">Desglose por Material Afectado</h3>
                  <p className="text-xs text-muted-foreground">Distribución acumulada de costos por merma, scrap y devoluciones</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4 text-right">Merma ($)</th>
                      <th className="py-3 px-4 text-right">Scrap ($)</th>
                      <th className="py-3 px-4 text-right">Baja ($)</th>
                      <th className="py-3 px-4 text-right">Devolución ($)</th>
                      <th className="py-3 px-4 text-right">Impacto Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(mermaScrapData?.materials || []).map((m: any) => (
                      <tr key={m.materialId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {m.internalCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground text-sm">{m.materialName}</div>
                          {m.materialDescription && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{m.materialDescription}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          {formatCurrency(m.mermaCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-destructive">
                          {formatCurrency(m.scrapCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          {formatCurrency(m.bajaCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-500">
                          {formatCurrency(m.devolucionCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-foreground text-sm">
                          {formatCurrency(m.totalCost)}
                        </td>
                      </tr>
                    ))}
                    {(mermaScrapData?.materials || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground font-semibold">
                          No se registraron bajas o mermas con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Detallada de Transacciones de Bajas / Devoluciones */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-base text-foreground">Bitácora Detallada de Transacciones</h3>
                <p className="text-xs text-muted-foreground">Registro cronológico con motivos, responsables y notas operativas</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4 text-right">Cantidad</th>
                      <th className="py-3 px-4 text-right">Total ($)</th>
                      <th className="py-3 px-4">Motivo / Notas de la Salida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(mermaScrapData?.movements || []).slice(0, 30).map((mov: any) => (
                      <tr key={mov.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {new Date(mov.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            mov.type === 'DEVOLUCION' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            mov.type === 'MERMA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            mov.type === 'SCRAP' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}>
                            {mov.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{mov.materialName}</div>
                          <div className="text-[10px] text-muted-foreground">{mov.internalCode}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatNumber(mov.quantity)} {mov.unitCode}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatCurrency(mov.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div className="font-semibold text-foreground/90">{mov.performedBy}</div>
                          <div className="text-[11px] text-foreground/80">{mov.notes}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
  );
};

export default WarehouseReportsPage;
