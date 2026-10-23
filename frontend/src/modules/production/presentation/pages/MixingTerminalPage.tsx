import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/apiClient';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Icon, Input } from '@/design-system';
import { MixingTerminalForm } from '../components/MixingTerminalForm';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { MixContainersPrintModal, MixResultData } from '../components/MixContainersPrintModal';
import { useFormulas, usePreparedMixHistory } from '../../../extrusion/hooks/useExtrusionMixing';
import { toast } from 'sonner';

// Control de visibilidad operativa: Ocultar temporalmente cola de solicitudes de mezcla
const SHOW_TICKETS = false;

export const MixingTerminalPage: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isCreatingDirectMix, setIsCreatingDirectMix] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'history'>('history');
  const [historySortOrder, setHistorySortOrder] = useState<'ASC' | 'DESC'>('ASC'); // Predeterminado: De las más antiguas a las más recientes
  const [historyFormulaFilter, setHistoryFormulaFilter] = useState<string>('ALL');
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');

  // Modal para ver / reimprimir etiquetas QR de una mezcla
  const [printModalData, setPrintModalData] = useState<MixResultData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Catálogo de fórmulas para el filtro
  const { data: rawFormulas = [] } = useFormulas();
  const formulaCatalog: any[] = Array.isArray(rawFormulas) ? rawFormulas : [];

  // 1. Solicitudes de mezcla pendientes (Tickets) - Ocultado temporalmente
  const { data: tickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['extrusion', 'mix-requests'],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/mix-requests?status=SOLICITADA');
      return response.data || [];
    },
    enabled: SHOW_TICKETS
  });

  // 2. Historial de mezclas preparadas con sus contenedores (orden predeterminado: de más antigua a más reciente)
  const { data: preparedMixes = [], isLoading: isLoadingHistory, refetch: refetchHistory } = usePreparedMixHistory({
    limit: 200,
    sort: historySortOrder,
    formula_id: historyFormulaFilter !== 'ALL' ? historyFormulaFilter : undefined,
    startDate: historyDateFrom || undefined,
    endDate: historyDateTo || undefined
  });

  const showForm = Boolean(selectedTicket || isCreatingDirectMix);

  // Lista única de fórmulas para el dropdown de filtro
  const availableFormulasForFilter = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    formulaCatalog.forEach((f: any) => {
      if (f.id) {
        map.set(String(f.id), { id: String(f.id), code: f.code || '', name: f.name });
      }
    });
    preparedMixes.forEach((m: any) => {
      if (m.formula_id && !map.has(String(m.formula_id))) {
        map.set(String(m.formula_id), { id: String(m.formula_id), code: m.formula_code || '', name: m.formula_name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [formulaCatalog, preparedMixes]);

  // Filtrado y ordenamiento de historial (orden predeterminado: de más antigua a más reciente)
  const filteredHistory = useMemo(() => {
    let list = [...preparedMixes];

    // 1. Filtrado por fórmula seleccionada
    if (historyFormulaFilter && historyFormulaFilter !== 'ALL') {
      list = list.filter((mix: any) =>
        String(mix.formula_id) === String(historyFormulaFilter) ||
        (mix.formula_code && mix.formula_code.toLowerCase() === historyFormulaFilter.toLowerCase())
      );
    }

    // 2. Filtrado por rango de fechas de creación
    if (historyDateFrom) {
      const [y, m, d] = historyDateFrom.split('-').map(Number);
      const fromTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
      list = list.filter((mix: any) => {
        const t = new Date(mix.prepared_at || mix.createdAt).getTime();
        return !isNaN(t) && t >= fromTime;
      });
    }
    if (historyDateTo) {
      const [y, m, d] = historyDateTo.split('-').map(Number);
      const toTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      list = list.filter((mix: any) => {
        const t = new Date(mix.prepared_at || mix.createdAt).getTime();
        return !isNaN(t) && t <= toTime;
      });
    }

    // 3. Ordenamiento por fecha (Predeterminado: ASC - de la más antigua a la más reciente)
    list.sort((a: any, b: any) => {
      const timeA = new Date(a.prepared_at || a.createdAt).getTime() || 0;
      const timeB = new Date(b.prepared_at || b.createdAt).getTime() || 0;
      return historySortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [preparedMixes, historyFormulaFilter, historyDateFrom, historyDateTo, historySortOrder]);

  const hasActiveFilters = historyFormulaFilter !== 'ALL' || Boolean(historyDateFrom) || Boolean(historyDateTo) || historySortOrder !== 'ASC';

  const handleResetFilters = () => {
    setHistoryFormulaFilter('ALL');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setHistorySortOrder('ASC');
  };

  const handleOpenMixQrs = (mix: any) => {
    setPrintModalData({
      folio: mix.folio,
      formula_name: mix.formula_name,
      formula_code: mix.formula_code,
      total_quantity: Number(mix.total_quantity),
      extruder_id: mix.extruder_id,
      containers: mix.containers || []
    });
    setIsPrintModalOpen(true);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-5 pb-32 lg:pr-24">
      {/* Header Banner Estandarizado */}
      <section className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:px-6 sm:py-4 w-full shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="blender" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary">Módulo de Extrusión</span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground font-semibold">Planta de Producción</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {showForm 
                  ? (selectedTicket ? `Atender Solicitud de Mezcla (${selectedTicket.folio})` : 'Preparación Directa de Mezcla (Batch 500 Kg)')
                  : 'Centro de Mezclado'}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-0.5">
                {showForm
                  ? 'Dosificación y pesaje de materias primas con descuento de inventario en piso (WIP).'
                  : SHOW_TICKETS
                    ? 'Cola de solicitudes, preparación de mezclas y recuperación de etiquetas QR de contenedores.'
                    : 'Preparación de mezclas y consulta de etiquetas QR de contenedores.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {showForm ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTicket(null);
                  setIsCreatingDirectMix(false);
                }}
                className="gap-2 font-bold h-11 px-5 text-sm shadow-sm border border-border"
              >
                <Icon name="arrow_back" size={18} />
                Volver
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (SHOW_TICKETS) refetchTickets();
                    refetchHistory();
                    toast.info('Historial actualizado.');
                  }}
                  className="gap-2 font-bold h-11 px-4 text-sm border border-border"
                  title="Refrescar datos"
                >
                  <Icon name="refresh" size={18} />
                  <span>Actualizar</span>
                </Button>

                <PermissionGate permission="extrusion.mix.create">
                  <Button
                    onClick={() => {
                      setSelectedTicket(null);
                      setIsCreatingDirectMix(true);
                    }}
                    className="gap-2 font-black h-11 px-5 text-sm shadow bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Icon name="add" size={20} />
                    Preparar Nueva Mezcla
                  </Button>
                </PermissionGate>
              </>
            )}
          </div>
        </div>
      </section>

      {!showForm ? (
        <div className="space-y-4">
          {/* Barra de pestañas (Ocultada temporalmente cuando SHOW_TICKETS es false) */}
          {SHOW_TICKETS && (
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card p-3 rounded-2xl border border-border shadow-sm">
              {/* Pestañas Operativas tipo Switcher Industrial */}
              <div className="flex items-center p-1.5 rounded-xl bg-muted/60 border border-border shrink-0 shadow-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className={`flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-black whitespace-nowrap transition-all ${
                    activeTab === 'tickets'
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="format_list_bulleted" size={18} className={activeTab === 'tickets' ? 'text-primary' : 'text-muted-foreground'} />
                  <span>Solicitudes Pendientes</span>
                  <Badge
                    variant={activeTab === 'tickets' ? 'default' : 'secondary'}
                    className={`ml-1.5 text-xs font-mono font-black px-2.5 py-0.5 rounded-md transition-colors ${
                      activeTab === 'tickets'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-background text-foreground border border-border'
                    }`}
                  >
                    {tickets.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-black whitespace-nowrap transition-all ${
                    activeTab === 'history'
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="history" size={18} className={activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'} />
                  <span>Mezclas Preparadas</span>
                  <Badge
                    variant={activeTab === 'history' ? 'default' : 'secondary'}
                    className={`ml-1.5 text-xs font-mono font-black px-2.5 py-0.5 rounded-md transition-colors ${
                      activeTab === 'history'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-background text-foreground border border-border'
                    }`}
                  >
                    {preparedMixes.length}
                  </Badge>
                </button>
              </div>
            </div>
          )}

          {/* VISTA 1: COLA DE SOLICITUDES PENDIENTES (OCULTADO TEMPORALMENTE) */}
          {SHOW_TICKETS && activeTab === 'tickets' && (
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Icon name="format_list_bulleted" className="text-primary" size={20} />
                  <span>Cola de Solicitudes y Batches Pendientes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingTickets ? (
                  <div className="p-12 flex justify-center items-center text-muted-foreground">
                    <Icon name="progress_activity" size={32} className="animate-spin" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="p-4 rounded-2xl bg-muted/40 mb-3 text-primary border border-border/60">
                      <Icon name="blender" size={44} />
                    </div>
                    <p className="font-bold text-lg text-foreground">No hay solicitudes pendientes en cola.</p>
                    <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                      Como supervisor del área, puedes iniciar y registrar una mezcla directamente en cualquier momento seleccionando la fórmula y escaneando los insumos de piso.
                    </p>
                    <PermissionGate permission="extrusion.mix.create">
                      <Button
                        onClick={() => {
                          setSelectedTicket(null);
                          setIsCreatingDirectMix(true);
                        }}
                        className="gap-2 font-bold px-6 shadow-sm"
                      >
                        <Icon name="blender" size={20} />
                        Iniciar Preparación Directa
                      </Button>
                    </PermissionGate>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {tickets.map((ticket: any) => (
                      <div key={ticket.id} className="p-4 sm:p-6 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="warning">SOLICITADA</Badge>
                            <span className="font-mono text-xs font-bold text-muted-foreground">{ticket.folio}</span>
                          </div>
                          <h3 className="font-bold text-lg text-foreground">{ticket.formula_name}</h3>
                          <p className="text-sm font-semibold text-primary">Solicitada por: {ticket.extruder_name || `Extrusora ${ticket.to_area_id}`}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-medium">
                            <Icon name="description" size={14} />
                            Notas: {ticket.notes || 'Ninguna'}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-2xl font-black text-foreground">{ticket.total_quantity} {ticket.unit}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">A Preparar</p>
                          </div>
                          <PermissionGate permission="extrusion.mix.create">
                            <Button
                              onClick={() => {
                                setIsCreatingDirectMix(false);
                                setSelectedTicket(ticket);
                              }}
                              className="w-full sm:w-auto mt-2 gap-1.5"
                            >
                              Atender Solicitud <Icon name="arrow_forward" size={16} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* VISTA 2: HISTORIAL DE MEZCLAS Y RECUPERACIÓN DE ETIQUETAS QR */}
          {(!SHOW_TICKETS || activeTab === 'history') && (
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border pb-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon name="history" size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                        <span>Historial de Mezclas Preparadas</span>
                        <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5 bg-background border border-border">
                          {filteredHistory.length}
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-medium">
                        Mostrando {filteredHistory.length} de {preparedMixes.length} mezclas registradas
                      </p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={handleResetFilters}
                      className="gap-1.5 h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted self-start sm:self-auto border border-border rounded-lg"
                    >
                      <Icon name="filter_alt_off" size={14} />
                      <span>Limpiar Filtros</span>
                    </Button>
                  )}
                </div>

                {/* Barra de Filtros Operativos: Fórmulas, Orden de Fecha y Rango de Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* 1. Filtro por Fórmula */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Icon name="science" size={14} className="text-primary" />
                      <span>Filtrar por Fórmula</span>
                    </label>
                    <div className="relative">
                      <select
                        value={historyFormulaFilter}
                        onChange={(e) => setHistoryFormulaFilter(e.target.value)}
                        className="w-full h-10 bg-background border border-border rounded-xl pl-3 pr-8 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        <option value="ALL">Todas las Fórmulas ({availableFormulasForFilter.length})</option>
                        {availableFormulasForFilter.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.code ? `[${f.code}] ` : ''}{f.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <Icon name="expand_more" size={18} />
                      </div>
                    </div>
                  </div>

                  {/* 2. Orden por Fecha (Predeterminado: Más antigua a más reciente) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Icon name="sort" size={14} className="text-primary" />
                      <span>Orden por Fecha</span>
                    </label>
                    <div className="relative">
                      <select
                        value={historySortOrder}
                        onChange={(e) => setHistorySortOrder(e.target.value as 'ASC' | 'DESC')}
                        className="w-full h-10 bg-background border border-border rounded-xl pl-3 pr-8 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        <option value="ASC">Más antiguas primero (FIFO)</option>
                        <option value="DESC">Recientes primero</option>
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <Icon name="expand_more" size={18} />
                      </div>
                    </div>
                  </div>

                  {/* 3. Filtro por Rango de Fechas (Desde / Hasta) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Icon name="calendar_today" size={14} className="text-primary" />
                      <span>Fecha de Creación</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="date"
                        title="Fecha Desde"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        className="h-10 text-xs font-medium bg-background border border-border px-2 rounded-xl"
                      />
                      <Input
                        type="date"
                        title="Fecha Hasta"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        className="h-10 text-xs font-medium bg-background border border-border px-2 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoadingHistory ? (
                  <div className="p-12 flex justify-center items-center text-muted-foreground">
                    <Icon name="progress_activity" size={32} className="animate-spin" />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Icon name="inventory_2" size={40} className="mx-auto mb-2 opacity-40 text-primary" />
                    <p className="font-bold text-foreground">No se encontraron mezclas preparadas con los criterios seleccionados.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasActiveFilters ? 'Prueba ajustando el filtro de fórmula, rango de fechas o limpiando los filtros.' : 'Las mezclas completadas en la terminal aparecerán aquí.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        onClick={handleResetFilters}
                        className="mt-4 gap-2 font-bold text-xs border border-border rounded-xl"
                      >
                        <Icon name="filter_alt_off" size={15} />
                        Limpiar todos los filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredHistory.map((mix: any) => {
                      const containers = mix.containers || [];
                      const formattedDate = mix.prepared_at
                        ? new Date(mix.prepared_at).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Fecha no registrada';

                      return (
                        <div
                          key={mix.id || mix.folio}
                          className="p-4 sm:p-5 hover:bg-muted/15 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            {/* Folio, Estado y Fecha */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-black text-sm text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                                {mix.folio}
                              </span>
                              <Badge variant="success" className="font-bold text-xs px-2.5 py-0.5">
                                PREPARADA
                              </Badge>
                              <span className="text-xs text-muted-foreground font-medium">
                                • {formattedDate}
                              </span>
                              <span className="text-xs font-bold text-primary">
                                • {mix.extruder_name}
                              </span>
                            </div>

                            {/* Nombre de Fórmula */}
                            <div>
                              <h3 className="font-black text-base text-foreground leading-snug">
                                {mix.formula_code ? `[${mix.formula_code}] ` : ''}{mix.formula_name}
                              </h3>
                              {mix.notes && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">
                                  Nota: {mix.notes}
                                </p>
                              )}
                            </div>

                            {/* Contenedores Generados para esta mezcla */}
                            <div className="pt-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                Contenedores Asignados ({containers.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {containers.map((c: any, cIdx: number) => (
                                  <div
                                    key={c.qr_code || cIdx}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border-2 border-border text-xs font-mono shadow-xs hover:border-primary/50 transition-colors"
                                  >
                                    <Icon name="inventory_2" size={15} className="text-primary shrink-0" />
                                    <span className="font-black text-foreground">
                                      C{c.container_number || (cIdx + 1)}:
                                    </span>
                                    <span className="text-primary font-black">
                                      {c.qr_code}
                                    </span>
                                    <span className="text-muted-foreground font-bold">
                                      ({Number(c.capacity_kg).toFixed(1)} kg)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Botón de Acción Principal para Recuperar / Reimprimir QR */}
                          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
                            <div className="text-left md:text-right">
                              <p className="text-2xl font-black text-foreground font-mono">
                                {Number(mix.total_quantity).toFixed(2)} Kg
                              </p>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {containers.length} {containers.length === 1 ? 'Contenedor' : 'Contenedores'}
                              </p>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleOpenMixQrs(mix)}
                              className="gap-2 font-black shadow bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 text-xs sm:text-sm rounded-xl"
                            >
                              <Icon name="qr_code" size={18} />
                              <span>Ver / Reimprimir QR</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="w-full">
          <MixingTerminalForm 
            ticket={selectedTicket} 
            onSuccess={() => {
              setSelectedTicket(null);
              setIsCreatingDirectMix(false);
              refetchHistory();
              refetchTickets();
            }} 
            onCancel={() => {
              setSelectedTicket(null);
              setIsCreatingDirectMix(false);
            }}
          />
        </div>
      )}

      {/* Modal de Consulta, Visualización y Reimpresión de Etiquetas QR de Contenedores */}
      <MixContainersPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintModalData(null);
        }}
        mixData={printModalData}
        autoPrint={false}
      />
    </div>
  );
};
