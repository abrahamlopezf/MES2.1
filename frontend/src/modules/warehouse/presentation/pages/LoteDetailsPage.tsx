import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Package, MapPin, Calendar, User } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { GlobalErrorBoundary } from '../../../../core/error/GlobalErrorBoundary';

const LoteDetailsPageContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lote-details', id],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/lotes/${id}`);
      return response.data.data;
    }
  });

  if (isLoading) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>Ocurrió un error al cargar los detalles del lote.</p>
        </div>
      </div>
    );
  }

  const { lote, events } = data;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a lotes
        </Button>
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Lote #{lote.id}</h1>
          {(!lote.is_active || lote.is_active === 0) && (
            <Badge variant="destructive" className="text-sm">Dado de Baja</Badge>
          )}
        </div>
        <hr className="border-t-2 border-primary/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Material</span>
            <span className="text-lg font-bold">{lote.material?.internal_code}</span>
            <span className="text-sm">{lote.material?.name}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">QR</span>
            <span className="text-lg font-mono font-medium">{lote.qr_code?.qr_code || 'N/A'}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Cantidad Actual</span>
            <span className="text-2xl font-bold text-primary">{Number(lote.amount).toFixed(2)} kg</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex gap-3 items-start">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Fecha de Recepción</span>
              <span className="font-medium">{new Date(lote.date_received).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex gap-3 items-start">
            <User className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Recibido Por</span>
              <span className="font-medium">{lote.user?.first_name} {lote.user?.last_name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex gap-3 items-start">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Localidad</span>
              <span className="font-medium">{lote.location?.code || 'Sin asignar'}</span>
              <span className="text-xs text-muted-foreground">{lote.location?.name}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h3 className="text-xl font-bold mb-6">Trazabilidad del Lote</h3>
        
        {(() => {
          const displayEvents = [...(events || [])];
          
          const translateEventType = (type: string) => {
            const map: Record<string, string> = {
              'RECEPTION': 'Recepción',
              'ASSIGNED': 'Asignación',
              'DISPOSE': 'Baja',
              'MOVE': 'Movimiento',
              'CONSUME': 'Consumo'
            };
            return map[type] || type.replace(/_/g, ' ').toLowerCase();
          };

          if (!lote.is_active && !displayEvents.some((e: any) => e.event_type === 'DISPOSE')) {
            displayEvents.push({
              id: 'synthetic-dispose',
              event_type: 'DISPOSE',
              createdAt: lote.updated_at || lote.updatedAt,
              user: lote.user, // Utilizamos el usuario del lote como fallback
              notes: 'Lote dado de baja (Registro anterior a la mejora de trazabilidad)'
            });
          }
          
          if (displayEvents.length === 0) {
            return (
              <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">No hay eventos de trazabilidad registrados para este lote.</p>
              </div>
            );
          }

          return (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {displayEvents.map((event: any) => (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-3 h-3 rounded-full bg-current" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground capitalize">{translateEventType(event.event_type)}</span>
                    <time className="text-xs font-medium text-muted-foreground">{new Date(event.createdAt || event.created_at).toLocaleString()}</time>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    {event.user && <p>Usuario: {event.user.first_name} {event.user.last_name}</p>}
                    {event.notes && <p className="italic bg-muted/50 p-2 rounded mt-2 border-l-2 border-primary/50 text-xs">{event.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
              </div>
            );
          })()}
      </div>
    </div>
  );
};

export const LoteDetailsPage = () => (
  <GlobalErrorBoundary>
    <LoteDetailsPageContent />
  </GlobalErrorBoundary>
);
