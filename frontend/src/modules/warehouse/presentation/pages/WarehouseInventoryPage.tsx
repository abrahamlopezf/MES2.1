import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../../api/axiosClient';
import { MapPin, Loader2, RefreshCw, QrCode, ShieldAlert, FilterX, Info, X, Layers, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge, Input, Button, TopBar } from '../../../../design-system';
import { BajaBottomSheet } from '../components/BajaBottomSheet.container';
import { InfoBottomSheet } from '../components/InfoBottomSheet.container';
import { ConsumoBottomSheet } from '../components/ConsumoBottomSheet.container';
import { ManualEntryBottomSheet } from '../components/ManualEntryBottomSheet.container';
import { useAuthStore } from '../../../../store/authStore';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

export const WarehouseInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBajaItem, setSelectedBajaItem] = useState<any>(null);
  const [resolutionRequestId, setResolutionRequestId] = useState<string | null>(searchParams.get('waste_request_id'));
  const [selectedInfoItem, setSelectedInfoItem] = useState<any>(null);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isConsumoModalOpen, setIsConsumoModalOpen] = useState(false);
  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const pageSize = 50; // Internal pagination size

  useEffect(() => {
    if (searchParams.has('waste_request_id')) {
      searchParams.delete('waste_request_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warehouse', 'inventory', debouncedSearch, page],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/inventory', {
        params: { search: debouncedSearch, limit: pageSize, offset: (page - 1) * pageSize }
      });
      return response.data.data;
    },
    placeholderData: keepPreviousData
  });

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col h-full bg-background relative overflow-x-hidden">

      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Header (Mismo diseño que MaterialModuleHeader) */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-0 w-full">
            <div className="flex-1 w-full min-w-[250px]">
              <h1 className="text-3xl font-black text-foreground tracking-tight">Inventario de Almacén</h1>
              <p className="text-muted-foreground font-semibold mt-1">Gestión y consulta de existencias físicas en tiempo real.</p>
              
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border">
                  <span>{total} Total en Stock</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 w-full md:w-auto gap-2 sm:gap-3 shrink-0">
              <Button 
                variant="secondary"
                size="lg" 
                onClick={() => refetch()} 
                disabled={isRefetching}
                className="font-bold shadow-sm w-full justify-center h-12 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="truncate">Actualizar</span>
              </Button>
              {(hasPermission('warehouse.consume') || hasPermission('warehouse.manual_entry') || hasPermission('warehouse.waste') || hasPermission('warehouse.dispose')) && (
                <>
                  {(hasPermission('warehouse.waste') || hasPermission('warehouse.dispose')) && (
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => setIsBajaModalOpen(true)}
                      className="font-bold shadow-sm w-full justify-center bg-red-600 hover:bg-red-700 text-white h-12 text-xs sm:text-sm"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Baja</span>
                    </Button>
                  )}
                  {hasPermission('warehouse.consume') && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setIsConsumoModalOpen(true)}
                      className="font-bold shadow-sm w-full justify-center bg-blue-600 hover:bg-blue-700 text-white border-blue-600 h-12 text-xs sm:text-sm"
                    >
                      <QrCode className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Consumo</span>
                    </Button>
                  )}
                  {hasPermission('warehouse.manual_entry') && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setIsManualEntryModalOpen(true)}
                      className="font-bold shadow-sm w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 h-12 text-xs sm:text-sm"
                    >
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Ingreso</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Filters Panel (Mismo diseño que SubcatalogFiltersPanel) */}
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-lg">Búsqueda</h3>
              <p className="text-sm text-muted-foreground font-semibold">Encuentra existencias por QR o código de material.</p>
            </div>
            {search && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }} className="text-muted-foreground hover:text-foreground font-bold w-full sm:w-auto justify-center sm:justify-start">
                <FilterX className="w-4 h-4 mr-2 shrink-0" />
                <span>Limpiar Búsqueda</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="relative w-full">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código QR, lote o material..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="!pl-10 font-medium w-full"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Material</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Código</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Ranking</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Cantidad</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Valor (Total)</th>
                  <th className="bg-secondary/50 px-4 py-3 text-right font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                      Cargando inventario...
                    </td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No se encontraron unidades en stock.
                    </td>
                  </tr>
                ) : (
                  data?.items?.map((item: any) => (
                    <tr key={item.material_id} className="group hover:bg-muted/20 transition-colors">
                      <td className="border-b border-border/50 px-4 py-3 align-middle font-bold text-foreground">
                        {item.material?.name || '---'}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-muted-foreground">
                        {item.material?.internal_code || '---'}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle">
                        <Badge variant="secondary">
                          {item.material?.ranking?.nomenclature || '---'}
                        </Badge>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle">
                        <span className="font-bold text-lg text-primary">{Number(item.amount).toFixed(2)} <span className="text-sm text-muted-foreground">{item.material?.base_unit?.code || ''}</span></span>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle">
                        <span className="font-bold text-lg text-emerald-500">${Number(item.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            onClick={() => setSelectedInfoItem(item)}
                            title="Ver detalles"
                          >
                            <Info size={16} />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setSelectedBajaItem(item)}
                            className="whitespace-nowrap"
                          >
                            <ShieldAlert size={16} className="mr-1" /> {hasPermission('warehouse.dispose') || hasPermission('warehouse.waste') ? 'Dar de baja' : 'Solicitar baja'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-3 p-3 bg-secondary/5">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                Cargando inventario...
              </div>
            ) : data?.items?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
                No se encontraron unidades en stock.
              </div>
            ) : (
              data?.items?.map((item: any) => (
                <div key={item.material_id} className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate" title={item.material?.name}>
                        {item.material?.name || '---'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.material?.internal_code || '---'}</p>
                    </div>
                    <Badge variant="secondary" className="whitespace-nowrap shrink-0 text-[10px]">
                      {item.material?.ranking?.nomenclature || '---'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/30 p-2.5 rounded-lg flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Cantidad Total</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-foreground text-base leading-none">{Number(item.amount).toFixed(2)} <span className="text-xs text-muted-foreground ml-0.5">{item.material?.base_unit?.code || ''}</span></span>
                      </div>
                    </div>
                    <div className="bg-secondary/30 p-2.5 rounded-lg flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Valor Total</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-emerald-500 text-base leading-none">${Number(item.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col mt-1 border-t border-border pt-1 gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary/20 flex justify-between items-center px-2 py-1.5 h-auto"
                      onClick={() => setExpandedCardId(expandedCardId === item.material_id ? null : item.material_id)}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">Acciones</span>
                      {expandedCardId === item.material_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    
                    {expandedCardId === item.material_id && (
                      <div className="flex flex-col gap-2 pb-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Button variant="outline" size="sm" className="w-full justify-start h-10 bg-secondary/5" onClick={() => navigate(`/warehouse/materials/${item.material_id}/lotes`)}>
                          <Layers size={16} className="mr-2 text-muted-foreground" /> Ver lotes
                        </Button>
                        <Button variant="secondary" size="sm" className="w-full justify-start h-10" onClick={() => setSelectedInfoItem(item)}>
                          <Info size={16} className="mr-2 text-muted-foreground" /> Detalles
                        </Button>
                        <Button variant="destructive" size="sm" className="w-full justify-start h-10 bg-red-600 hover:bg-red-700 text-white" onClick={() => setSelectedBajaItem(item)}>
                          <ShieldAlert size={16} className="mr-2" /> {hasPermission('warehouse.dispose') || hasPermission('warehouse.waste') ? 'Dar de baja' : 'Solicitar baja'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
              <span className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {(selectedBajaItem || resolutionRequestId || isBajaModalOpen) && (
        <BajaBottomSheet 
          item={selectedBajaItem} 
          resolutionRequestId={resolutionRequestId}
          isOpen={!!(selectedBajaItem || resolutionRequestId || isBajaModalOpen)}
          onClose={() => {
            setSelectedBajaItem(null);
            setResolutionRequestId(null);
            setIsBajaModalOpen(false);
          }}
          onSuccess={() => refetch()}
        />
      )}
      {selectedInfoItem && (
        <InfoBottomSheet 
          item={selectedInfoItem} 
          isOpen={!!selectedInfoItem}
          onClose={() => setSelectedInfoItem(null)} 
        />
      )}
      {isConsumoModalOpen && (
        <ConsumoBottomSheet 
          isOpen={isConsumoModalOpen}
          onClose={() => setIsConsumoModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
      {isManualEntryModalOpen && (
        <ManualEntryBottomSheet 
          isOpen={isManualEntryModalOpen}
          onClose={() => setIsManualEntryModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
