import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Info } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';

export const InfoModal = ({ item, onClose }) => {
  const navigate = useNavigate();
  const { data: lotes, isLoading } = useQuery({
    queryKey: ['warehouse', 'inventory', item.material?.id, 'lotes'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${item.material?.id}/lotes`);
      return response.data.data;
    },
    enabled: !!item?.material?.id
  });

  const lastLotes = lotes ? [...lotes].reverse().slice(0, 3) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 text-foreground">
            <Info size={20} className="text-primary" />
            <h3 className="font-bold text-lg leading-none">Detalles del Inventario</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Material Details Card */}
          <div className="bg-secondary/20 border border-border p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-lg text-foreground leading-tight">
                  {item.material?.internal_code || '---'}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.material?.name || '---'}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs py-1">
                {item.material?.ranking?.nomenclature || '---'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Cantidad Actual</p>
                <p className="font-bold text-xl text-primary">{Number(item.amount).toFixed(2)}</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Clasificación</p>
                <p className="font-bold text-sm text-foreground mt-1">{item.material?.ranking?.name || '---'}</p>
              </div>
            </div>
          </div>

          {/* Lotes List */}
          <div>
            <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
              Últimas Recepciones (Lotes)
            </h4>
            
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-sm">Cargando lotes...</span>
                </div>
              ) : lotes?.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border border-border border-dashed rounded-xl">
                  No hay lotes activos para este material.
                </div>
              ) : (
                lastLotes.map((lote: any, index: number) => {
                  const isInactive = lote.is_active === false || lote.is_active === 0;
                  return (
                  <div 
                    key={lote.id}
                    className={`flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 rounded-lg border bg-background items-start sm:items-center justify-between ${isInactive ? 'opacity-60 bg-secondary/20 border-border/50' : 'border-border'}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          Lote #{lote.id}
                        </span>
                        {isInactive && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">Dado de Baja</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lote.date_received).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-xs text-muted-foreground flex flex-col items-end">
                        <span>Por: <span className="font-semibold text-foreground">{lote.user?.first_name} {lote.user?.last_name}</span></span>
                        {lote.location && (
                          <span className="mt-0.5">Loc: <span className="font-semibold text-foreground">{lote.location.code}</span></span>
                        )}
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${isInactive ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                        {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-5 border-t border-border flex justify-between bg-secondary/10 mt-auto">
          <Button 
            variant="outline" 
            onClick={() => {
              onClose();
              navigate(`/warehouse/materials/${item.material?.id}/lotes`);
            }}
          >
            Ver todos los lotes
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
};
