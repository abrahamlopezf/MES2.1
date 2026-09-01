import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, History, User, MapPin, Package, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import axiosClient from '../../../../api/axiosClient';
import { Button, Badge } from '../../../../design-system';

interface LoteTraceabilityModalProps {
  loteId: number;
  onClose: () => void;
}

export const LoteTraceabilityModal: React.FC<LoteTraceabilityModalProps> = ({ loteId, onClose }) => {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['lote-details', loteId],
    queryFn: async () => {
      const res = await axiosClient.get(`/warehouse/lotes/${loteId}`);
      return res.data?.data || res.data;
    }
  });

  const lote = response?.lote;
  const qrEvents = response?.events || [];
  const consumptions = response?.consumptions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
      <div className="bg-card w-full sm:max-w-xl max-h-[85dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/5 shrink-0">
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <History size={20} />
            Trazabilidad del Lote
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="text-muted-foreground">Cargando detalles...</span>
            </div>
          ) : isError || !lote ? (
            <div className="flex justify-center py-10">
              <span className="text-destructive font-bold">Ocurrió un error al cargar el lote.</span>
            </div>
          ) : (
            <>
              {/* Lote Info Header */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{lote.material?.name || 'Material Desconocido'}</h4>
                    <p className="text-sm text-muted-foreground">Folio: <span className="font-semibold">{lote.folio}</span></p>
                  </div>
                  <Badge variant={Number(lote.available_amount) > 0 ? 'primary' : 'secondary'} className={Number(lote.available_amount) === 0 ? 'opacity-70' : ''}>
                    {Number(lote.available_amount) > 0 ? 'Activo' : 'Consumido'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Package size={14} /> Inicial: <b>{Number(lote.initial_amount)}</b>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowDownRight size={14} /> Disponible: <b>{Number(lote.available_amount)}</b>
                  </div>
                </div>
              </div>

              {/* Traceability Tree */}
              <div>
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" /> Historial de Movimientos
                </h4>
                
                <div className="relative border-l-2 border-border ml-3 space-y-6">
                  
                  {/* Root Node: Entry */}
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                    <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <ArrowDownRight size={14} className="text-primary" /> 
                          Ingreso {lote.qr_id ? 'vía Escaneo QR' : 'Manual'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(lote.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User size={12} /> {lote.user?.first_name} {lote.user?.last_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} /> {lote.location?.code}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        Cantidad ingresada: <span className="font-bold text-foreground">+{Number(lote.initial_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Child Nodes: Consumptions */}
                  {consumptions.map((consumption: any, idx: number) => {
                    const item = consumption.items?.[0] || consumption; // Depending on how query returns
                    const qty = item.quantity;
                    const date = consumption.created_at || consumption.date;
                    const user = consumption.user;
                    
                    return (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-destructive/80 rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                        <div className="bg-card border border-border rounded-lg p-3 shadow-sm opacity-90">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <ArrowUpRight size={14} className="text-destructive" /> 
                              Consumo de Material
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(date).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User size={12} /> {user?.first_name} {user?.last_name}
                            </div>
                            <div className="flex items-center gap-1 truncate" title={`Orden: ${consumption.order_number || 'N/A'}`}>
                              📋 Orden: {consumption.order_number || 'N/A'}
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            Cantidad consumida: <span className="font-bold text-destructive">-{Number(qty)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {consumptions.length === 0 && (
                    <div className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-muted rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                      <div className="text-sm text-muted-foreground py-1">
                        No se han registrado consumos para este lote aún.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border flex justify-end bg-secondary/10 shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
