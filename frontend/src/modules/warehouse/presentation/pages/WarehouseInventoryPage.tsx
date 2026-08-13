import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../../../api/axiosClient';
import { MapPin, Loader2, RefreshCw, QrCode, ShieldAlert, FilterX, Info, X, Layers } from 'lucide-react';
import { Badge, Input, Button, TopBar } from '../../../../design-system';
import { BajaModal } from '../components/BajaModal';
import { InfoModal } from '../components/InfoModal';

export const WarehouseInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBajaItem, setSelectedBajaItem] = useState<any>(null);
  const [selectedInfoItem, setSelectedInfoItem] = useState<any>(null);
  const pageSize = 50; // Internal pagination size


  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warehouse', 'inventory', search, page],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/inventory', {
        params: { search, limit: pageSize, offset: (page - 1) * pageSize }
      });
      return response.data.data;
    },
    keepPreviousData: true
  });

  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col h-full bg-background relative pb-28 overflow-x-hidden">

      <TopBar title="Inventario de Almacén" />

      <div className="p-4 sm:p-6 bg-background/50 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input 
            placeholder="Buscar por QR o Material..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 items-center">
          {search && (
            <Button variant="secondary" onClick={() => { setSearch(''); setPage(1); }}>
              <FilterX className="mr-2" size={16} /> Limpiar
            </Button>
          )}
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => refetch()} 
            title="Refrescar"
            className="shrink-0 aspect-square"
          >
            <RefreshCw className={isRefetching ? "animate-spin" : ""} size={20} />
          </Button>
        </div>
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
                        <span className="font-bold text-lg text-primary">{Number(item.amount).toFixed(2)}</span>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setSelectedInfoItem(item)}
                            className="whitespace-nowrap px-2"
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
                            <ShieldAlert size={16} className="mr-1" /> Dar de baja
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
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-secondary/30 p-2.5 rounded-lg flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Cantidad Total</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-primary text-base leading-none">{Number(item.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-1 border-t border-border pt-3 gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => navigate(`/warehouse/materials/${item.material_id}/lotes`)}>
                      <Layers size={14} className="mr-1" /> Ver lotes
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 px-3" onClick={() => setSelectedInfoItem(item)}>
                      <Info size={14} className="mr-1" /> Detalles
                    </Button>
                    <Button variant="destructive" size="sm" className="h-8 px-3" onClick={() => setSelectedBajaItem(item)}>
                      <ShieldAlert size={14} className="mr-1" /> Dar de baja
                    </Button>
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
      {selectedBajaItem && (
        <BajaModal 
          item={selectedBajaItem}
          onClose={() => setSelectedBajaItem(null)}
          onSuccess={() => refetch()}
        />
      )}
      {selectedInfoItem && (
        <InfoModal 
          item={selectedInfoItem}
          onClose={() => setSelectedInfoItem(null)}
        />
      )}
    </div>
  );
};
