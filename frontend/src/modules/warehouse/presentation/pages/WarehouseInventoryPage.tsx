import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { MapPin, Loader2, RefreshCw, QrCode, ShieldAlert, FilterX, Info, X } from 'lucide-react';
import { Badge, Input, Button, TopBar } from '../../../../design-system';
import { CameraScanner } from '../../../../design-system/components/scanner-overlay/CameraScanner';

export const WarehouseInventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const pageSize = 50; // Internal pagination size

  // Escuchar el escáner si está activo
  const handleScan = (code: string) => {
    setIsScannerActive(false);
    setSearch(code);
    setPage(1);
  };

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
      
      {/* Real Camera Scanner (Solo se monta si está activo) */}
      {isScannerActive && (
        <CameraScanner 
          onScan={handleScan}
          onClose={() => setIsScannerActive(false)}
        />
      )}

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
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Lote (QR)</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Cantidad</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Locación</th>
                  <th className="bg-secondary/50 px-4 py-3 text-left font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">Fecha</th>
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
                    <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                      <td className="border-b border-border/50 px-4 py-3 align-middle font-bold text-foreground">
                        {item.material?.name || '---'}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-muted-foreground">
                        {item.material?.internal_code || '---'}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle font-mono text-xs">
                        <Badge variant={item.status === 'AVAILABLE' ? 'success' : 'default'} className="mb-1 block w-max">
                          {item.status}
                        </Badge>
                        {item.qr_code_value}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle">
                        <span className="font-bold text-lg text-primary">{Number(item.available_quantity).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit?.code}</span>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle">
                        <div className="flex items-center text-foreground font-medium">
                          <MapPin size={16} className="text-primary/70 mr-1" />
                          {item.location}
                        </div>
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                        {new Date(item.received_at).toLocaleDateString()}
                      </td>
                      <td className="border-b border-border/50 px-4 py-3 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            className="whitespace-nowrap"
                          >
                            <Info size={16} className="mr-1" /> Info
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={true}
                            className="opacity-50 cursor-not-allowed whitespace-nowrap"
                          >
                            <ShieldAlert size={16} className="mr-1" /> Baja
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
                <div key={item.id} className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate" title={item.material?.name}>
                        {item.material?.name || '---'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.material?.internal_code || '---'}</p>
                    </div>
                    <Badge variant={item.status === 'AVAILABLE' ? 'success' : 'default'} className="whitespace-nowrap shrink-0 text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/30 p-2.5 rounded-lg flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Lote (QR)</span>
                      <span className="font-mono text-xs break-all leading-tight">{item.qr_code_value}</span>
                    </div>
                    <div className="bg-secondary/30 p-2.5 rounded-lg flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Cantidad</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-primary text-base leading-none">{Number(item.available_quantity).toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground leading-none">{item.unit?.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-foreground font-medium bg-secondary/20 p-2.5 rounded-lg border border-border/50">
                    <MapPin size={14} className="text-primary/70 mr-1.5 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>

                  <div className="flex justify-between items-center mt-1 border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {new Date(item.received_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="h-8 px-3" onClick={() => setSelectedItem(item)}>
                        <Info size={14} className="mr-1" /> Info
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8 px-3 opacity-50 cursor-not-allowed" disabled={true}>
                        <ShieldAlert size={14} className="mr-1" /> Baja
                      </Button>
                    </div>
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

      {/* Floating Scanner Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <Button 
          onClick={() => setIsScannerActive(true)}
          className="h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-transform hover:scale-105"
        >
          <QrCode size={32} />
        </Button>
      </div>

      {/* Info Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <h3 className="font-bold text-lg text-foreground">Información del Lote</h3>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Material</p>
                <p className="text-foreground font-medium">{selectedItem.material?.name || '---'}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.material?.internal_code || '---'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Cantidad</p>
                  <p className="text-lg font-bold text-primary">
                    {Number(selectedItem.available_quantity).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{selectedItem.unit?.code}</span>
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Estado</p>
                  <Badge variant={selectedItem.status === 'AVAILABLE' ? 'success' : 'default'}>
                    {selectedItem.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Locación</p>
                <div className="flex items-center text-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                  <MapPin size={16} className="text-primary mr-2" />
                  {selectedItem.location}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Lote (QR)</p>
                <p className="font-mono text-sm bg-muted/50 p-2 rounded border border-border inline-block">
                  {selectedItem.qr_code_value}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">UUID de Sistema</p>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {selectedItem.uuid}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Fecha de Recepción</p>
                <p className="text-sm text-foreground">
                  {new Date(selectedItem.received_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Recepcionado por</p>
                <div className="text-sm text-foreground font-medium flex items-center">
                  <Badge variant="secondary" className="mr-2">USUARIO</Badge>
                  {selectedItem.received_by || 'Sistema / Desconocido'}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
