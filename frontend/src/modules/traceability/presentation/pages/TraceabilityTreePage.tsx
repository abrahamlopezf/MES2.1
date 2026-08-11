import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import axiosClient from '../../../../api/axiosClient';

export function TraceabilityTreePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get('tokenId');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['traceability', tokenId],
    queryFn: async () => {
      const response = await axiosClient.get(`/traceability/scan/${tokenId}`);
      return response.data.message;
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

      <div className="bg-card p-8 rounded-lg shadow-sm border border-border">
        <div className="flex items-center gap-4 border-b border-border pb-6 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <FileSearch size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Árbol de Trazabilidad</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{tokenId}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p>Consultando historial del token...</p>
          </div>
        ) : isError ? (
          <div className="py-8 px-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold">Error al consultar el QR</h3>
              <p className="text-sm mt-1 opacity-90">
                {(error as any)?.response?.data?.message || 'El código QR no existe o hubo un error en la conexión.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pl-8 border-l-2 border-primary/20 space-y-8 py-4">
            
            {/* Nodo 1: Identidad Generada */}
            <div className="relative">
              <div className="absolute -left-10 w-4 h-4 bg-primary rounded-full ring-4 ring-background mt-1"></div>
              <div className="bg-muted/30 border border-border rounded-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">Identidad Generada</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(data?.qr?.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                    {data?.qr?.status || 'VIRGIN'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  El código industrial fue generado exitosamente.
                </p>
              </div>
            </div>

            {/* Eventos de Trazabilidad */}
            {data?.traceability_events?.map((evt: any) => (
              <div key={evt.id} className="relative">
                <div className="absolute -left-10 w-4 h-4 bg-primary rounded-full ring-4 ring-background mt-1"></div>
                <div className="bg-card border border-border rounded-md p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{evt.event_type}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                      COMPLETADO
                    </span>
                  </div>
                  {evt.notes && (
                    <p className="text-sm text-foreground mt-2">{evt.notes}</p>
                  )}
                  {evt.performed_by && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>Registrado por: <strong>{evt.performed_by.name || evt.performed_by.username}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Movimientos */}
            {data?.movements?.map((mov: any) => (
              <div key={mov.id} className="relative">
                <div className="absolute -left-10 w-4 h-4 bg-primary rounded-full ring-4 ring-background mt-1"></div>
                <div className="bg-card border border-border rounded-md p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{mov.movement_type}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mov.performed_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                      {mov.quantity} {mov.unit}
                    </span>
                  </div>
                  {mov.notes && (
                    <p className="text-sm text-foreground mt-2">{mov.notes}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {mov.from_area && (
                      <div>
                        <span className="block opacity-70">Origen:</span>
                        <span className="font-medium text-foreground">{mov.from_area.name}</span>
                      </div>
                    )}
                    {mov.to_area && (
                      <div>
                        <span className="block opacity-70">Destino:</span>
                        <span className="font-medium text-foreground">{mov.to_area.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!data?.traceability_events?.length && !data?.movements?.length) && (
              <div className="relative opacity-50">
                <div className="absolute -left-10 w-4 h-4 bg-muted-foreground/30 rounded-full ring-4 ring-background mt-1"></div>
                <div className="bg-muted/10 border border-dashed border-border rounded-md p-4">
                  <h3 className="font-semibold text-muted-foreground">Asignación Física (Pendiente)</h3>
                  <p className="text-xs text-muted-foreground/70 mt-1">Esperando primer escaneo operativo...</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
