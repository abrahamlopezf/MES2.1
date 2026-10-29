import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Scale, Layers, CheckCircle2, AlertTriangle, 
  RefreshCw, Search, ArrowRight, ShieldAlert, 
  DollarSign, Activity, Truck, Filter
} from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { useThemeStore } from '../../../../store/themeStore';
import { canViewCosts, isAdminUser } from '../../../../utils/authHelpers';
import { telaresApi } from '../../services/telaresApi';
import { LoomWipItem, AvailableCart } from '../../types/telares.types';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

export const TelaresDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const queryClient = useQueryClient();

  const isDark = theme === 'dark';
  const allowCosts = canViewCosts(user);
  const roleCode = String(typeof user?.role === 'string' ? user.role : user?.role?.code || user?.role?.name || '').toUpperCase();
  const canChangeTransferMode = isAdminUser(user);

  // Tab filter: 'ALL' | 'CIRCULAR' | 'BANDA' | 'LOADED'
  const [filterType, setFilterType] = useState<'ALL' | 'CIRCULAR' | 'BANDA' | 'LOADED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWipLoomId, setSelectedWipLoomId] = useState<'ALL' | number>('ALL');

  // Modal de Transferencia Atómica de Carrito
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedLoomId, setSelectedLoomId] = useState<number | ''>('');
  const [selectedCartId, setSelectedCartId] = useState<number | ''>('');
  const [spoolsToLoad, setSpoolsToLoad] = useState('');
  const [cartQrInput, setCartQrInput] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [modeUpdateError, setModeUpdateError] = useState<string | null>(null);

  // Consulta de WIP consolidado
  const { 
    data: wipData, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['telares-wip-summary'],
    queryFn: () => telaresApi.getWipSummary(),
    refetchInterval: 15000,
  });

  const macro = wipData?.macro;
  const transferMode = wipData?.transfer_mode || 'RACK_PARTIAL';
  const looms = wipData?.looms || [];
  const availableCarts = wipData?.available_carts || [];
  const selectedWipLoom = looms.find((loom) => loom.id === Number(selectedWipLoomId));
  const isBandLoom = (loom: LoomWipItem) => /banda/i.test(loom.subarea?.name || '') || loom.type === 'BANDA';

  // Mutación para Transferencia Atómica
  const transferMutation = useMutation({
    mutationFn: telaresApi.transferCart,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['telares-wip-summary'] });
      queryClient.invalidateQueries({ queryKey: ['telares', 'pti-racks'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'racks'] });
      setTransferSuccess(data.message || 'Transferencia atómica completada exitosamente.');
      setTransferError(null);
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setTransferSuccess(null);
        setSelectedCartId('');
        setSpoolsToLoad('');
        setCartQrInput('');
      }, 1800);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Error al transferir carrito.';
      setTransferError(msg);
      setTransferSuccess(null);
    },
  });

  const transferModeMutation = useMutation({
    mutationFn: telaresApi.updatePtiTransferMode,
    onSuccess: async () => {
      setModeUpdateError(null);
      await queryClient.invalidateQueries({ queryKey: ['telares-wip-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['telares', 'pti-transfer-mode'] });
    },
    onError: (err: any) => {
      setModeUpdateError(err.response?.data?.message || err.message || 'No fue posible cambiar el modo.');
    },
  });

  // Filtrado de telares
  const filteredLooms = looms.filter((loom) => {
    // Filtro por tipo o carga
    if (filterType === 'CIRCULAR' && isBandLoom(loom)) return false;
    if (filterType === 'BANDA' && !isBandLoom(loom)) return false;
    if (filterType === 'LOADED' && loom.current_spools_count <= 0) return false;

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = loom.name.toLowerCase().includes(q);
      const matchCode = loom.code.toLowerCase().includes(q);
      const matchNum = String(loom.loom_number).includes(q);
      const matchPti = loom.pti_inventory?.some((item) => `${item.code} ${item.name} ${item.color} ${item.denier || ''} ${item.tape_width_mm || ''}`.toLowerCase().includes(q));
      return matchName || matchCode || matchNum || matchPti;
    }
    return true;
  });

  // Carrito seleccionado en el modal
  const activeModalCart: AvailableCart | undefined = availableCarts.find(
    (c) => c.id === Number(selectedCartId) || (cartQrInput.trim() && (c.qr_code === cartQrInput.trim() || c.rack_code === cartQrInput.trim()))
  );

  // Telar seleccionado en el modal
  const activeModalLoom: LoomWipItem | undefined = looms.find((l) => l.id === Number(selectedLoomId));

  // Capacidad libre en fileta del telar seleccionado
  const freeSpoolsInTarget = activeModalLoom 
    ? Math.max(0, activeModalLoom.creel_capacity_spools - activeModalLoom.current_spools_count) 
    : 0;

  const requestedSpools = Number(spoolsToLoad);
  const transferQuantity = transferMode === 'CART_FULL' ? Number(activeModalCart?.current_quantity || 0) : requestedSpools;
  const isCartTooBig = activeModalCart && activeModalLoom
    ? transferQuantity > freeSpoolsInTarget
    : false;

  const handleOpenTransferModal = (preselectedLoomId?: number) => {
    setSelectedLoomId(preselectedLoomId ?? (looms[0]?.id || ''));
    setSelectedCartId(availableCarts[0]?.id || '');
    setSpoolsToLoad('');
    setCartQrInput('');
    setTransferError(null);
    setTransferSuccess(null);
    setIsTransferModalOpen(true);
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoomId) {
      setTransferError('Seleccione un telar de destino.');
      return;
    }
    if (!selectedCartId && !cartQrInput.trim()) {
      setTransferError('Seleccione o escanee un carrito de transporte.');
      return;
    }
    if (transferMode === 'RACK_PARTIAL' && (!Number.isFinite(requestedSpools) || requestedSpools <= 0)) {
      setTransferError('Indique cuántas bobinas se transfieren desde el rack.');
      return;
    }
    setTransferError(null);
    transferMutation.mutate({
      loom_id: Number(selectedLoomId),
      rack_id: selectedCartId ? Number(selectedCartId) : undefined,
      cart_qr: cartQrInput.trim() || undefined,
      spools_to_load: transferMode === 'RACK_PARTIAL' ? requestedSpools : undefined,
    });
  };

  const handleToggleTransferMode = () => {
    if (!canChangeTransferMode || transferModeMutation.isPending) return;
    const nextMode = transferMode === 'RACK_PARTIAL' ? 'CART_FULL' : 'RACK_PARTIAL';
    const action = nextMode === 'CART_FULL'
      ? 'activar transferencia de carritos completos y bloquear traspasos parciales'
      : 'regresar a traspasos parciales desde rack';
    if (window.confirm(`¿Deseas ${action}? El cambio afecta a todas las transferencias de PTI a Telares.`)) {
      transferModeMutation.mutate(nextMode);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-6 bg-background text-foreground overflow-x-hidden">
      
      {/* HEADER DE CONTROL OPERATIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                WIP Consolidado & Filetas de Telares
                {isFetching && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Monitoreo por telar, tipo de banda, color y ancho de PTI; incluye circulares y Telares Banda.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL DE ASIGNACIÓN ATÓMICA DE CARRITO */}
        <div className="flex flex-wrap items-center gap-2">
          {canChangeTransferMode && (
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleTransferMode}
              disabled={transferModeMutation.isPending || isLoading}
              title="Solo administradores globales pueden cambiar la política de transferencia de PTI"
              className="h-11 px-3 border-amber-500/50 font-bold text-xs"
            >
              <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-600" />
              {transferModeMutation.isPending ? 'Guardando modo…' : `Modo: ${transferMode === 'RACK_PARTIAL' ? 'Rack parcial' : 'Carrito completo'} · Cambiar`}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-11 px-3 border-border font-bold text-xs"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => handleOpenTransferModal()}
            className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md flex items-center gap-2"
          >
            <Truck className="h-5 w-5" />
            <span>{transferMode === 'RACK_PARTIAL' ? 'Traspasar desde rack' : 'Asignar carrito completo'}</span>
          </Button>
        </div>
      </div>
      {modeUpdateError && canChangeTransferMode && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {modeUpdateError}
        </div>
      )}

      {/* MACRO KPIS GLOBALES DE WIP (CONSOLIDADO GENERAL) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* TOTAL WIP EN KG */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-blue-500">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-black uppercase tracking-wider">Hilo en Filetas (WIP)</span>
            <Scale className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
            {macro?.total_wip_kg != null ? macro.total_wip_kg.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0.0'}{' '}
            <span className="text-sm font-semibold opacity-60">kg</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Saldo en telares 1–21</span>
        </div>

        {/* TOTAL BOBINAS MONTADAS */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-amber-500">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-black uppercase tracking-wider">Bobinas Montadas</span>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
            {macro?.total_spools != null ? macro.total_spools.toLocaleString('es-MX') : '0'}{' '}
            <span className="text-sm font-semibold opacity-60">pzas</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Cap. total: {macro?.total_creel_capacity_spools?.toLocaleString('es-MX') ?? '—'} bobinas</span>
        </div>

        {/* OCUPACIÓN PROMEDIO DE CREEL */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-500">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-black uppercase tracking-wider">Ocupación Filetas</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
            {macro?.avg_creel_utilization_pct != null ? `${macro.avg_creel_utilization_pct}%` : '0%'}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Promedio de utilización</span>
        </div>

        {/* TELARES OPERATIVOS */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-indigo-500">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-black uppercase tracking-wider">Telares Tejiendo</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
            {macro?.total_looms_active != null ? `${macro.total_looms_active} / ${macro.total_looms_count || 21}` : '—'}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Con corrida en proceso</span>
        </div>

        {/* CARROTOS LISTOS EN PISO EXTRUSIÓN */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-violet-500">
          <div className="flex items-center justify-between opacity-80">
            <span className="text-[11px] font-black uppercase tracking-wider">{transferMode === 'RACK_PARTIAL' ? 'Racks con PTI' : 'Carritos con PTI'}</span>
            <Truck className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
            {macro?.active_carts_in_floor != null ? macro.active_carts_in_floor : 0}{' '}
            <span className="text-sm font-semibold opacity-60">uds</span>
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">En custodia de Extrusión</span>
        </div>

        {/* VALUACIÓN MONETARIA O CUSTODIA (CONDICIONAL SEGÚN REGLA DE COSTOS) */}
        {allowCosts ? macro?.total_valuation_mxn != null ? (
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-600 bg-emerald-500/5">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="text-[11px] font-black uppercase tracking-wider">Valuación WIP Tejido</span>
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-emerald-700 dark:text-emerald-300 font-mono">
              ${Number(macro.total_valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-600/80 font-bold mt-1">Costo transformado (MXN)</span>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 shadow-sm flex flex-col justify-between border-b-4 border-b-amber-500">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold">
              <span className="text-[11px] font-black uppercase tracking-wider">Valuación WIP pendiente</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm font-bold mt-2 text-amber-800 dark:text-amber-200">Hay saldo sin costo rastreable</p>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-semibold mt-1">No se presenta un total parcial como si fuera el valor completo.</span>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between border-b-4 border-b-slate-500">
            <div className="flex items-center justify-between opacity-80">
              <span className="text-[11px] font-black uppercase tracking-wider">Espacio Libre Creel</span>
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-foreground font-mono">
              {macro?.free_creel_capacity_spools != null ? macro.free_creel_capacity_spools.toLocaleString('es-MX') : '—'}{' '}
              <span className="text-sm font-semibold opacity-60">bobinas</span>
            </p>
            <span className="text-[10px] text-muted-foreground mt-1">Capacidad para recepción</span>
          </div>
        )}
      </div>

      {/* WIP POR TELAR: inventario específico y vista consolidada */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground">WIP de Telares</h2>
            <p className="mt-1 text-xs text-muted-foreground">Consulta el material de una fileta o conserva la vista general del área.</p>
          </div>
          <label className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <span>Detalle por telar</span>
            <select value={selectedWipLoomId} onChange={(event) => setSelectedWipLoomId(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))} className="h-10 min-w-56 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground">
              <option value="ALL">WIP general · todos los telares</option>
              {looms.map((loom) => <option key={loom.id} value={loom.id}>#{loom.loom_number} · {loom.name}</option>)}
            </select>
          </label>
        </div>
        {selectedWipLoom ? (
          <div className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><strong className="text-foreground">Telar #{selectedWipLoom.loom_number} · {selectedWipLoom.name}</strong><span className="ml-2 text-xs text-muted-foreground">{selectedWipLoom.subarea?.name || 'Subárea pendiente'}</span></div>
              <div className="flex gap-4 font-mono text-xs"><span className="text-blue-600 dark:text-blue-300">{Number(selectedWipLoom.current_wip_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</span><span className="text-amber-600 dark:text-amber-300">{Number(selectedWipLoom.current_spools_count || 0).toLocaleString('es-MX')} bobinas</span>{allowCosts && <span className="text-emerald-600 dark:text-emerald-300">{selectedWipLoom.valuation_mxn == null ? 'Valuación incompleta' : `$${Number(selectedWipLoom.valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</span>}</div>
            </div>
            {selectedWipLoom.pti_inventory.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground"><tr><th className="p-2.5">PTI / Color</th><th className="p-2.5">Denier / Ancho</th><th className="p-2.5 text-right">Bobinas</th><th className="p-2.5 text-right">Peso WIP</th>{allowCosts && <th className="p-2.5 text-right">Valor</th>}</tr></thead><tbody className="divide-y divide-border">{selectedWipLoom.pti_inventory.map((item, index) => <tr key={`${item.pti_product_id || item.code}-${index}`}><td className="p-2.5"><strong>{item.code}</strong><span className="ml-2 text-muted-foreground">{item.name} · {item.color}</span></td><td className="p-2.5 text-muted-foreground">{item.denier ? `D${item.denier}` : '—'} · {item.tape_width_mm ? `${item.tape_width_mm} mm` : '—'}</td><td className="p-2.5 text-right font-mono">{Number(item.quantity_spools).toLocaleString('es-MX')}</td><td className="p-2.5 text-right font-mono">{Number(item.quantity_kg).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</td>{allowCosts && <td className="p-2.5 text-right font-mono">{item.valuation_mxn == null ? '—' : `$${Number(item.valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</td>}</tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Este telar no tiene bobinas registradas en su WIP.</div>}
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-3"><div className="rounded-lg border border-border bg-background p-3"><span className="text-[10px] font-bold uppercase text-muted-foreground">Telares incluidos</span><p className="mt-1 font-mono text-xl font-black">{looms.length}</p></div><div className="rounded-lg border border-border bg-background p-3"><span className="text-[10px] font-bold uppercase text-muted-foreground">Bobinas en fileta</span><p className="mt-1 font-mono text-xl font-black">{Number(macro?.total_spools || 0).toLocaleString('es-MX')}</p></div><div className="rounded-lg border border-border bg-background p-3"><span className="text-[10px] font-bold uppercase text-muted-foreground">Peso WIP</span><p className="mt-1 font-mono text-xl font-black">{Number(macro?.total_wip_kg || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</p>{allowCosts && <span className="text-xs text-emerald-600 dark:text-emerald-300">{macro?.total_valuation_mxn == null ? 'Valuación incompleta' : `$${Number(macro.total_valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</span>}</div></div>
        )}
      </section>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border">
        {/* TABS DE FILTRO */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            size="sm"
            variant={filterType === 'ALL' ? 'default' : 'ghost'}
            onClick={() => setFilterType('ALL')}
            className="text-xs font-bold h-9 px-3 rounded-lg"
          >
            Todos ({looms.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === 'CIRCULAR' ? 'default' : 'ghost'}
            onClick={() => setFilterType('CIRCULAR')}
            className="text-xs font-bold h-9 px-3 rounded-lg"
          >
            Rollo ({looms.filter((l) => !isBandLoom(l)).length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === 'BANDA' ? 'default' : 'ghost'}
            onClick={() => setFilterType('BANDA')}
            className="text-xs font-bold h-9 px-3 rounded-lg"
          >
            Banda ({looms.filter(isBandLoom).length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterType === 'LOADED' ? 'default' : 'ghost'}
            onClick={() => setFilterType('LOADED')}
            className="text-xs font-bold h-9 px-3 rounded-lg text-emerald-600 dark:text-emerald-400"
          >
            Con Hilo WIP ({looms.filter((l) => l.current_spools_count > 0).length})
          </Button>
        </div>

        {/* INPUT DE BÚSQUEDA */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar telar, color o PTI..."
            className="pl-9 h-9 text-xs bg-background border-border font-medium rounded-lg"
          />
        </div>
      </div>

      {/* GRID INTERACTIVO DE LOS 21 TELARES */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-bold">Cargando estado individual de {looms.length || 21} telares...</p>
        </div>

      ) : filteredLooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
          <p className="text-base font-bold">No se encontraron telares con el filtro seleccionado</p>
          <p className="text-xs text-muted-foreground">Pruebe seleccionando otra pestaña o borre el término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLooms.map((loom) => {
            const isBanda = isBandLoom(loom);
            const isProducing = loom.status === 'TEJIENDO' || loom.status === 'EN_PRODUCCION';
            const pct = loom.creel_utilization_pct;

            // Color del gauge según ocupación
            const gaugeColor = pct >= 50 ? 'bg-emerald-500' : pct >= 20 ? 'bg-amber-500' : 'bg-rose-500';
            const gaugeText = pct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

            return (
              <motion.div
                key={loom.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col justify-between p-4 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
                  isProducing ? 'border-emerald-500/50' : 'border-border'
                }`}
              >
                <div>
                  {/* CABECERA DEL TELAR */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-lg text-foreground">
                          #{loom.loom_number < 10 ? `0${loom.loom_number}` : loom.loom_number}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground truncate max-w-[130px]">
                          {loom.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isBanda ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {loom.type}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                          {loom.rpm} RPM
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                        {loom.model}{loom.subarea?.name ? ` · ${loom.subarea.name}` : ''}
                      </div>
                    </div>

                    {/* STATUS BADGE */}
                    <span className={`px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide flex items-center gap-1 ${
                      isProducing
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : loom.status === 'MANTENIMIENTO'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isProducing && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                      {loom.status}
                    </span>
                  </div>

                  {/* FILETA CREEL GAUGE */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-muted-foreground flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        Fileta / Creel:
                      </span>
                      <span className={`font-mono font-black ${gaugeText}`}>
                        {Number(loom.current_spools_count || 0).toLocaleString('es-MX')} / {loom.creel_capacity_spools || 1800} bobinas ({pct}%)
                      </span>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${gaugeColor}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>

                  {/* DETALLES DE WIP Y MATERIAL */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/50">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Peso Hilo (WIP)</span>
                      <span className="font-mono font-black text-sm text-foreground">
                        {Number(loom.current_wip_kg || 0).toFixed(1)} <span className="text-xs font-semibold opacity-60">kg</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Espacio Libre</span>
                      <span className="font-mono font-black text-sm text-foreground">
                        {Math.max(0, (loom.creel_capacity_spools || 1800) - Number(loom.current_spools_count || 0)).toLocaleString('es-MX')}{' '}
                        <span className="text-[10px] font-semibold opacity-60">bobinas</span>
                      </span>
                    </div>

                    {/* PTI Y COLOR */}
                    <div className="col-span-2 pt-1 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">PTI / Color Activo</span>
                      {loom.pti_inventory?.length ? (
                        <div className="mt-1 space-y-1.5">
                          {loom.pti_inventory.map((item, index) => (
                            <div key={`${item.pti_product_id || 'legacy'}-${index}`} className="rounded-md bg-background/70 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-foreground truncate">{item.code} · {item.color}</span>
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.quantity_spools.toLocaleString('es-MX')} pzas</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span>{item.denier ? `D${item.denier}` : 'Denier s/d'} · {item.tape_width_mm ? `${item.tape_width_mm} mm` : 'Ancho s/d'}</span>
                                <span>{item.quantity_kg.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kg</span>
                              </div>
                              {allowCosts && item.valuation_mxn != null && (
                                <div className="mt-0.5 text-right font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                                  ${Number(item.valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs font-medium">Sin material cargado</span>
                      )}
                    </div>

                    {/* VALUACIÓN MONETARIA SI ES ADMIN */}
                    {allowCosts && loom.valuation_mxn != null && loom.valuation_mxn > 0 && (
                      <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] font-bold uppercase">Valuación WIP:</span>
                        <span className="font-mono font-bold text-xs">
                          ${Number(loom.valuation_mxn || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {allowCosts && loom.valuation_mxn == null && Number(loom.current_wip_kg || 0) > 0 && (
                      <div className="col-span-2 pt-1 border-t border-border/40 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        Valuación incompleta: WIP histórico o PTI sin costo asociado.
                      </div>
                    )}
                  </div>

                  {/* CORRIDA ACTIVA (SI ESTÁ PRODUCIENDO) */}
                  {loom.active_run && (
                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                      <div className="flex items-center justify-between font-bold text-blue-700 dark:text-blue-300">
                        <span className="truncate max-w-[160px]">{loom.active_run.bom_code}</span>
                        <span>{loom.active_run.meters_produced || 0} m</span>
                      </div>
                      {loom.active_run.operator_name && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          Op: {loom.active_run.operator_name} ({loom.active_run.shift})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* BOTÓN DE ACCIÓN RÁPIDA: ASIGNAR CARRITO DIRECTO */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenTransferModal(loom.id)}
                    className="w-full h-9 rounded-lg font-bold text-xs bg-muted/40 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>{transferMode === 'RACK_PARTIAL' ? 'Traspasar desde rack' : 'Cargar carrito completo'}</span>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL DE TRANSFERENCIA ATÓMICA DE CARRITO (EXTRUSIÓN -> TELAR) */}
      {isTransferModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          style={{ isolation: 'isolate' }}
        >
          <div className="bg-slate-900 border-2 border-slate-700 text-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 my-auto">
            {/* TÍTULO DEL MODAL */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    {transferMode === 'RACK_PARTIAL' ? 'Traspaso parcial desde rack PTI' : 'Transferencia de carrito PTI completo'}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    Custodia de Extrusión a Fileta de Telar (1 a 21)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

              {/* BANNER DE REGLA OPERACIONAL ATÓMICA */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-100 text-sm">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>{transferMode === 'RACK_PARTIAL' ? 'MODO ACTUAL: RACK CON TRASPASO PARCIAL' : 'MODO ACTUAL: CARRITO COMPLETO'}</span>
                </div>
                <p className="leading-relaxed">
                  {transferMode === 'RACK_PARTIAL'
                    ? <>Indica las bobinas que salen del rack. Esa cantidad se descuenta de Extrusión y entra al WIP individual del telar seleccionado; el saldo permanece en el rack de origen.</>
                    : <>La transferencia mueve <strong>todo el contenido del carrito</strong>, sin fraccionarlo. El saldo completo sale de Extrusión y entra al WIP individual del telar seleccionado.</>}
                </p>
              </div>

              {/* MENSAJES DE ERROR / ÉXITO */}
              {transferError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTransfer} className="space-y-4">
                
                {/* PASO 1: SELECCIONAR O ESCANEAR CARRITO */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                    <span>1. {transferMode === 'RACK_PARTIAL' ? 'Rack PTI de Extrusión:' : 'Carrito PTI de Extrusión:'}</span>
                    <span className="text-muted-foreground font-semibold">
                      {availableCarts.length} carritos con bobinas
                    </span>
                  </label>

                  <select
                    value={selectedCartId}
                    onChange={(e) => {
                      setSelectedCartId(Number(e.target.value) || '');
                      setCartQrInput('');
                    }}
                    className="w-full h-12 rounded-xl bg-background border-2 border-border px-3 text-sm font-bold text-foreground focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Carrito Disponible --</option>
                    {availableCarts.map((cart) => (
                      <option key={cart.id} value={cart.id}>
                        {cart.rack_code} — {cart.current_quantity} bobinas ({cart.net_weight_kg == null ? 'Peso s/d' : `${cart.net_weight_kg} kg neto`} | Tara {cart.tare_weight_kg == null ? 's/d' : `${cart.tare_weight_kg} kg`}) — {cart.pti_product?.code || 'PTI'} ({cart.pti_product?.color || 'Color'} · D{cart.pti_product?.denier || 's/d'} · {cart.pti_product?.tape_width_mm || 's/d'} mm)
                      </option>
                    ))}
                  </select>

                  {/* INPUT OPCIONAL DE ESCANEO DE QR */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={cartQrInput}
                      onChange={(e) => {
                        setCartQrInput(e.target.value);
                        setSelectedCartId('');
                      }}
                      placeholder="O escanee código QR del carrito..."
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* FICHA TÉCNICA DEL CARRITO SELECCIONADO */}
                {activeModalCart && (
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs space-y-2">
                    <div className="flex items-center justify-between font-black text-sm text-foreground">
                      <span>{activeModalCart.rack_code}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {activeModalCart.container_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Bobinas en Carrito</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {activeModalCart.current_quantity} pzas
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Tara del Carrito</span>
                        <span className="font-mono font-bold text-foreground">
                          {activeModalCart.tare_weight_kg == null ? 'Sin dato' : `${activeModalCart.tare_weight_kg} kg`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Peso Neto Hilo</span>
                        <span className="font-mono font-black text-foreground">
                          {activeModalCart.net_weight_kg == null ? 'Sin dato' : `${activeModalCart.net_weight_kg} kg`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Peso Bruto Total</span>
                        <span className="font-mono font-bold text-foreground">
                          {activeModalCart.gross_weight_kg == null ? 'Sin dato' : `${activeModalCart.gross_weight_kg} kg`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Material & Color</span>
                        <span className="font-bold text-foreground truncate block">
                          {activeModalCart.pti_product?.code || 'PTI'} • {activeModalCart.pti_product?.color || 'Color estándar'} • D{activeModalCart.pti_product?.denier || 's/d'} • {activeModalCart.pti_product?.tape_width_mm || 's/d'} mm
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {transferMode === 'RACK_PARTIAL' && (
                  <div className="space-y-2">
                    <label htmlFor="spools-to-load" className="text-xs font-black uppercase text-foreground">Bobinas a transferir</label>
                    <Input
                      id="spools-to-load"
                      type="number"
                      min="1"
                      max={activeModalCart?.current_quantity}
                      step="1"
                      value={spoolsToLoad}
                      onChange={(e) => setSpoolsToLoad(e.target.value)}
                      placeholder="Cantidad que sale del rack"
                      className="h-11 font-mono"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">Solo esa cantidad cambia de custodia; el resto permanece en Extrusión.</p>
                  </div>
                )}

                {/* PASO 2: SELECCIONAR TELAR DESTINO (1 AL 21) */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                    <span>2. Telar Destino (Asignación Directa 1–21):</span>
                    {activeModalLoom && (
                      <span className="text-xs font-bold text-muted-foreground">
                        Espacio libre: <strong className="text-foreground">{freeSpoolsInTarget} bobinas</strong>
                      </span>
                    )}
                  </label>

                  <select
                    value={selectedLoomId}
                    onChange={(e) => setSelectedLoomId(Number(e.target.value) || '')}
                    required
                    className="w-full h-12 rounded-xl bg-background border-2 border-border px-3 text-sm font-bold text-foreground focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Telar Destino --</option>
                    {looms.map((loom) => {
                      const free = Math.max(0, loom.creel_capacity_spools - loom.current_spools_count);
                      return (
                        <option key={loom.id} value={loom.id}>
                          Telar #{loom.loom_number < 10 ? `0${loom.loom_number}` : loom.loom_number} — {loom.name} ({loom.type}) — Ocupación: {loom.current_spools_count} / {loom.creel_capacity_spools} (Libre: {free})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* ADVERTENCIA DE CAPACIDAD EXCEDIDA */}
                {isCartTooBig && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>
                      Capacidad insuficiente: La transferencia ({transferQuantity} bobinas) excede el espacio libre de la fileta del {activeModalLoom?.name} ({freeSpoolsInTarget} bobinas libres).
                    </span>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-3 pt-3 border-t border-border">
                  <Button
                    type="submit"
                    disabled={transferMutation.isPending || isCartTooBig || !selectedLoomId || (!selectedCartId && !cartQrInput.trim()) || (transferMode === 'RACK_PARTIAL' && (!spoolsToLoad || requestedSpools <= 0))}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {transferMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Transfiriendo Carrito...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span>{transferMode === 'RACK_PARTIAL' ? `Transferir ${requestedSpools || ''} bobinas al telar` : 'Transferir carrito completo al telar'} #{activeModalLoom?.loom_number || ''}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="h-12 px-5 rounded-xl font-bold text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};

export default TelaresDashboard;
