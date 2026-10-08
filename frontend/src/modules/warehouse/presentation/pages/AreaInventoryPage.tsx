import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, ChevronRight, FilterX, QrCode, FileText, CheckCircle2, X, Package, Search, Loader2
} from 'lucide-react';
import { Input, Button } from '../../../../design-system';
import { ConsumptionOrderDetailsModal } from '../components/ConsumptionOrderDetailsModal';
import { AreaItemDetailsModal } from './components/AreaItemDetailsModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axiosClient from '../../../../api/axiosClient';

import { useAuthStore } from '../../../../store/authStore';
import { useActiveTagsQuery, useMaterialFamiliesQuery, useRankingsQuery } from '../../../materials/hooks/useMaterialsQueries';
import { TFSelect } from '../../../../components/tf-ui';

export function AreaInventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [family, setFamily] = useState('');
  const [ranking, setRanking] = useState('');
  const [activeTab, setActiveTab] = useState<'existencias' | 'ordenes'>('existencias');
  const [selectedOrderUuid, setSelectedOrderUuid] = useState<string | null>(null);
  const [selectedAreaItem, setSelectedAreaItem] = useState<any>(null);

  const isGlobalAdmin = ['SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_ALM'].includes(user?.role?.code);

  const tagsQuery = useActiveTagsQuery();
  const activeTags = tagsQuery.data || [];
  const familiesQuery = useMaterialFamiliesQuery({ pageSize: 'all', status: 'active' });
  const families = familiesQuery.data?.items || [];
  const rankingsQuery = useRankingsQuery();
  const rankings = rankingsQuery.data?.items || [];

  const hasFilters = Boolean(search || tag || family || ranking);
  const clearFilters = () => { setSearch(''); setTag(''); setFamily(''); setRanking(''); };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['area-inventory', search, tag, family, ranking],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/area-inventory', {
        params: { search, tag, family, ranking }
      });
      return response.data;
    }
  });

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['area-orders', user?.area_id],
    queryFn: async () => {
      const url = user?.area_id && !isGlobalAdmin ? `/warehouse/consumption-orders?area_id=${user.area_id}` : `/warehouse/consumption-orders`;
      const response = await axiosClient.get(url);
      return response.data;
    },
    enabled: activeTab === 'ordenes'
  });

  const inventoryItems = data?.items || data?.data?.items || [];
  const areaOrders = ordersData || [];

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item: any) => {
      const s = search.toLowerCase();
      const materialName = item.material?.name?.toLowerCase() || '';
      const materialCode = item.material?.internal_code?.toLowerCase() || '';
      const folio = item.lote?.folio?.toLowerCase() || '';
      return materialName.includes(s) || materialCode.includes(s) || folio.includes(s);
    });
  }, [inventoryItems, search]);

  const filteredOrders = useMemo(() => {
    return areaOrders.filter((order: any) => {
      const s = search.toLowerCase();
      return order.order_number?.toLowerCase().includes(s) || order.status?.toLowerCase().includes(s);
    });
  }, [areaOrders, search]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'PENDIENTE': return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Pendiente' };
      case 'PREPARANDO': return { color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', label: 'Preparando' };
      case 'SURTIDA': return { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', label: 'Surtida' };
      case 'CANCELADA': return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'Cancelada' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-muted/20', label: status };
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-x-hidden">
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Header */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-0 w-full">
            <div className="flex-1 w-full min-w-[250px]">
              <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                <Package className="text-primary" size={32} />
                Inventario Interno de Área
              </h1>
              <p className="text-sm text-muted-foreground font-semibold mt-1">
                Materiales asignados y en custodia para tu área ({user?.area?.name || 'Área no asignada'}).
              </p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('existencias')}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'existencias' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Existencias en Custodia
          </button>
          <button
            onClick={() => setActiveTab('ordenes')}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'ordenes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Órdenes de Ingreso
          </button>
        </div>

        {/* Filters Panel */}
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
              <p className="text-sm text-muted-foreground font-semibold">Encuentra {activeTab === 'existencias' ? 'materiales por código, lote, familia, ranking o etiquetas' : 'órdenes por folio o estado'}.</p>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground font-bold w-full sm:w-auto justify-center sm:justify-start">
                <FilterX className="w-4 h-4 mr-2 shrink-0" />
                <span>Limpiar Búsqueda</span>
              </Button>
            )}
          </div>

          <div className={`grid gap-4 ${activeTab === 'existencias' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1'}`}>
            <div className="relative w-full">
              {activeTab === 'existencias' ? <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
              <Input 
                placeholder={activeTab === 'existencias' ? "Buscar por material, código o lote..." : "Buscar por folio de orden..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="!pl-10 font-medium w-full h-14 rounded-xl"
              />
            </div>
            {activeTab === 'existencias' && (
              <>
                <div className="relative w-full">
                  <TFSelect
                    placeholder="Filtrar por familia"
                    value={family ? family.split(',') : []}
                    onChange={(e: any) => setFamily(e.target.value.join(','))}
                    options={families.map((f: any) => ({ value: String(f.uuid), label: f.code ? `${f.code} - ${f.name}` : f.name }))}
                    isMulti={true}
                    containerClassName="!gap-0 h-14"
                  />
                </div>
                <div className="relative w-full">
                  <TFSelect
                    placeholder="Filtrar por ranking"
                    value={ranking ? ranking.split(',') : []}
                    onChange={(e: any) => setRanking(e.target.value.join(','))}
                    options={rankings.map((r: any) => ({ value: String(r.id), label: `${r.nomenclature} - ${r.name}` }))}
                    isMulti={true}
                    containerClassName="!gap-0 h-14"
                  />
                </div>
                <div className="relative w-full">
                  <TFSelect
                    placeholder="Filtrar por etiquetas"
                    value={tag ? tag.split(',') : []}
                    onChange={(e: any) => setTag(e.target.value.join(','))}
                    options={activeTags.map((opt: any) => ({ value: String(opt.uuid || opt.id), label: opt.name }))}
                    isMulti={true}
                    containerClassName="!gap-0 h-14"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">

          {activeTab === 'existencias' && (
            <>
              {/* List */}
              {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-card rounded-xl border border-border shadow-sm">
              <Loader2 className="animate-spin mb-4" size={40} />
              <span className="font-bold">Cargando inventario de área...</span>
            </div>
          ) : isError ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl shadow-sm text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
              <h3 className="text-red-600 font-bold mb-1">Error de Búsqueda</h3>
              <p className="text-sm font-semibold text-red-800">
                {(error as any)?.response?.data?.message || 'Error al obtener el inventario del área.'}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 bg-card border border-border rounded-xl shadow-sm text-center flex flex-col items-center">
              <Package size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">No hay materiales</h3>
              <p className="text-sm text-muted-foreground">Tu área no tiene materiales asignados actualmente en su custodia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  {/* Color strip */}
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary group-hover:bg-primary/80 transition-colors" />
                  
                  <div className="pl-2">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-foreground text-sm line-clamp-2" title={item.material?.name}>
                          {item.material?.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {item.material?.internal_code}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-3 rounded-lg border border-border mb-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Stock Actual</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-primary">{Number(item.amount).toFixed(2)}</span>
                            <span className="text-sm font-bold text-muted-foreground">{item.material?.base_unit?.code || 'Pza'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lote origen:</span>
                        <span className="font-mono font-medium text-foreground">{item.lote?.folio || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Código QR:</span>
                        <button 
                          onClick={() => navigate(`/traceability/genealogy?tokenId=${item.qr_code?.qr_code}`)}
                          className="font-mono font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {item.qr_code?.qr_code} <ChevronRight size={12} />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última act.:</span>
                        <span className="font-medium text-foreground">{new Date(item.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 border-t border-border pt-4 pr-3">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full text-xs font-bold"
                        onClick={() => setSelectedAreaItem(item)}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {activeTab === 'ordenes' && (
            <>
              {isLoadingOrders ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-card rounded-xl border border-border shadow-sm">
                  <Loader2 className="animate-spin mb-4" size={40} />
                  <span className="font-bold">Cargando órdenes de ingreso...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 bg-card border border-border rounded-xl shadow-sm text-center flex flex-col items-center">
                  <FileText size={48} className="text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No hay órdenes</h3>
                  <p className="text-sm text-muted-foreground">No se encontraron órdenes de consumo para esta área.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredOrders.map((order: any) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                      <div key={order.uuid} className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${statusConfig.bg.replace('/10', '')} group-hover:brightness-110`} />
                        <div className="pl-2">
                          <div className="flex justify-between items-start gap-2 mb-4">
                            <div>
                              <h3 className="font-bold text-foreground text-sm tracking-tight">{order.order_number}</h3>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.requesting_area?.name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Solicitante:</span>
                              <span className="text-foreground font-semibold truncate max-w-[120px]">{order.requester?.first_name} {order.requester?.last_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Fecha:</span>
                              <span className="text-foreground font-semibold">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Estado:</span>
                              <div className="flex items-center gap-1 font-semibold">
                                {order.status === 'SURTIDA' && <CheckCircle2 size={12} className="text-success" />}
                                {order.status === 'CANCELADA' && <X size={12} className="text-destructive" />}
                                <span className={statusConfig.color}>{statusConfig.label}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pl-2 mt-auto pt-4 border-t border-border">
                          <Button 
                            variant="secondary" 
                            className="w-full text-xs font-bold"
                            onClick={() => setSelectedOrderUuid(order.uuid)}
                          >
                            <FileText size={14} className="mr-2" />
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {selectedOrderUuid && (
        <ConsumptionOrderDetailsModal
          isOpen={true}
          orderUuid={selectedOrderUuid}
          onClose={() => setSelectedOrderUuid(null)}
        />
      )}

      <AreaItemDetailsModal
        isOpen={!!selectedAreaItem}
        onClose={() => setSelectedAreaItem(null)}
        item={selectedAreaItem}
      />
    </div>
  );
}
