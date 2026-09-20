import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, ArrowLeft, Loader2, AlertCircle, History, Clock, ArrowRight, User, CheckCircle2, XCircle } from 'lucide-react';
import { lookupQrCodeRequest } from '../../../../modules/qrcodes/services/qrcodesApi';

export function TraceabilityTreePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get('tokenId');

  const { data: qrInfo, isLoading, isError, error } = useQuery({
    queryKey: ['traceability', tokenId],
    queryFn: async () => {
      const response = await lookupQrCodeRequest(tokenId);
      return response.data;
    },
    enabled: !!tokenId,
    retry: false
  });

  if (!tokenId) {
    return (
      <div className="px-4 py-8 sm:p-8 max-w-4xl mx-auto text-center text-muted-foreground">
        No se especificó un ID de token para analizar.
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm mx-auto block"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 pt-4 pb-24 sm:py-8 max-w-4xl mx-auto space-y-8 overflow-x-hidden">
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Regresar
        </button>
      </div>

      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 flex flex-col">
        <h2 className="text-2xl font-black text-foreground mb-6">Detalle del Material</h2>
        
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-background border border-border rounded-lg shadow-inner flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código Físico QR</span>
              <p className="text-xl font-mono text-foreground break-all mt-1 font-bold">{tokenId}</p>
            </div>
            <FileSearch size={32} className="text-primary opacity-20" />
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
              <Loader2 className="animate-spin mb-2" size={32} />
              <span className="font-bold">Buscando información de trazabilidad...</span>
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
              <h3 className="text-red-600 font-bold flex items-center gap-2 mb-2">
                <XCircle size={18} /> Error de Búsqueda
              </h3>
              <p className="text-sm font-semibold text-red-800">
                {(error as any)?.response?.data?.message || 'Error al obtener la información de trazabilidad del código QR.'}
              </p>
            </div>
          ) : qrInfo ? (
            <>
              <div className="p-4 bg-surface border border-primary/30 rounded-lg shadow-sm">
                <h3 className="text-primary font-bold flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} /> Historial de Lote QR
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <span className="font-semibold text-muted-foreground">Estado Actual:</span>
                  <span className="font-bold text-foreground">{qrInfo.qr?.status || qrInfo.status}</span>
                  <span className="font-semibold text-muted-foreground">Área Asignada:</span>
                  <span className="font-bold text-foreground">{qrInfo.qr?.assigned_area?.name || qrInfo.area_name || 'N/A'}</span>
                </div>
              </div>

              {qrInfo.events && qrInfo.events.length > 0 && (
                <div className="mt-4 p-4 bg-background border border-border rounded-lg shadow-sm">
                  <h3 className="text-foreground font-bold flex items-center gap-2 mb-6">
                    <History size={20} className="text-primary" /> Árbol de Trazabilidad
                  </h3>
                  <div className="relative border-l-2 border-border ml-3 pl-6 space-y-6">
                    {qrInfo.events.map((event: any, idx: number) => (
                      <div key={event.id || idx} className="relative">
                        <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-bold text-foreground text-sm uppercase tracking-wide">
                              {event.event_type?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                              <Clock size={12} />
                              {new Date(event.created_at || event.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User size={14} className="opacity-70" />
                              <span className="font-medium text-foreground">
                                {event.performed_by ? `${event.performed_by.first_name} ${event.performed_by.last_name || ''}` : 'Sistema'}
                              </span>
                            </div>
                            
                            {event.from_status && event.to_status && event.from_status !== event.to_status && (
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="px-1.5 py-0.5 bg-secondary/50 rounded text-foreground">{event.from_status}</span>
                                <ArrowRight size={12} />
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">{event.to_status}</span>
                              </div>
                            )}
                          </div>

                          {event.notes && (
                            <p className="text-sm text-foreground/80 bg-secondary/30 p-2 rounded-md mt-1 border border-border/50">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
