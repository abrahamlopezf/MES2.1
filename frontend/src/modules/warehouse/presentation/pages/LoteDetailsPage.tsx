import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, MapPin, Calendar, User } from 'lucide-react';
import { Button, Badge, Card, CardContent, TopBar } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { GlobalErrorBoundary } from '../../../../core/error/GlobalErrorBoundary';

const EVENT_TYPE_LABELS: Record<string, string> = {
  RECEPTION: 'Recepción',
  ASSIGNED: 'Asignación',
  DISPOSE: 'Baja',
  MOVE: 'Movimiento',
  CONSUME: 'Consumo',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  RECEPTION: 'bg-success/10 text-success border-success/30',
  ASSIGNED:  'bg-primary/10 text-primary border-primary/30',
  DISPOSE:   'bg-destructive/10 text-destructive border-destructive/30',
  MOVE:      'bg-warning/10 text-warning border-warning/30',
  CONSUME:   'bg-info/10 text-info border-info/30',
};

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

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      className="p-1 rounded-lg hover:bg-muted transition-colors text-foreground"
      aria-label="Volver"
    >
      <ArrowLeft size={20} />
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Detalle de Lote" leftAction={backButton} />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Detalle de Lote" leftAction={backButton} />
        <div className="p-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Ocurrió un error al cargar los detalles del lote.</p>
          </div>
        </div>
      </div>
    );
  }

  const { lote, events } = data;

  const displayEvents = [...(events || [])];
  if (!lote.is_active && !displayEvents.some((e: any) => e.event_type === 'DISPOSE')) {
    displayEvents.push({
      id: 'synthetic-dispose',
      event_type: 'DISPOSE',
      createdAt: lote.updated_at || lote.updatedAt,
      user: lote.user,
      notes: 'Lote dado de baja (Registro anterior a la mejora de trazabilidad)',
    });
  }

  return (
    <div className="flex flex-col h-full bg-background">

      <TopBar
        title={`Lote #${lote.id}`}
        leftAction={backButton}
        rightAction={
          (!lote.is_active || lote.is_active === 0) ? (
            <Badge variant="destructive" className="text-xs">Baja</Badge>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">

        {/* === Tarjetas de información === */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Material */}
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-4 flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Material</span>
              <span className="font-bold text-foreground">{lote.material?.internal_code}</span>
              <span className="text-sm text-muted-foreground leading-snug">{lote.material?.name}</span>
            </CardContent>
          </Card>

          {/* Cantidad */}
          <Card>
            <CardContent className="pt-4 pb-4 flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Cantidad actual</span>
              <span className="text-2xl font-bold text-primary leading-none mt-1">
                {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
              </span>
            </CardContent>
          </Card>

          {/* QR */}
          <Card>
            <CardContent className="pt-4 pb-4 flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">QR</span>
              <span className="font-mono text-sm font-medium break-all">{lote.qr_code?.qr_code || 'N/A'}</span>
            </CardContent>
          </Card>

          {/* Localidad */}
          <Card>
            <CardContent className="pt-4 pb-4 flex gap-2 items-start">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Localidad</span>
                <span className="font-medium text-sm">{lote.location?.code || 'Sin asignar'}</span>
                {lote.location?.name && <span className="text-xs text-muted-foreground">{lote.location.name}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Fecha recepción */}
          <Card>
            <CardContent className="pt-4 pb-4 flex gap-2 items-start">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Fecha de Recepción</span>
                <span className="font-medium text-sm">{new Date(lote.date_received).toLocaleDateString()}</span>
                <span className="text-xs text-muted-foreground">{new Date(lote.date_received).toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recibido por */}
          <Card>
            <CardContent className="pt-4 pb-4 flex gap-2 items-start">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Recibido Por</span>
                <span className="font-medium text-sm">{lote.user?.first_name} {lote.user?.last_name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === Trazabilidad === */}
        <div>
          <h2 className="text-base font-bold mb-3 text-foreground px-0.5">Trazabilidad del Lote</h2>

          {displayEvents.length === 0 ? (
            <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">No hay eventos de trazabilidad registrados.</p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-0">
              {/* Línea vertical */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {displayEvents.map((event: any, idx: number) => {
                const label = EVENT_TYPE_LABELS[event.event_type] || event.event_type.replace(/_/g, ' ').toLowerCase();
                const colorClass = EVENT_TYPE_COLORS[event.event_type] || 'bg-secondary/30 text-foreground border-border';
                return (
                  <div key={event.id || idx} className="relative flex gap-4 pb-4 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-card ${colorClass}`}>
                      <div className="h-2 w-2 rounded-full bg-current" />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 rounded-xl border p-3 shadow-sm ${colorClass} bg-opacity-5`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-sm capitalize">{label}</span>
                        <time className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(event.createdAt || event.created_at).toLocaleDateString()}
                          {' · '}
                          {new Date(event.createdAt || event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      {event.user && (
                        <p className="text-xs text-muted-foreground">
                          {event.user.first_name} {event.user.last_name}
                        </p>
                      )}
                      {event.notes && (
                        <p className="italic text-xs bg-background/60 p-2 rounded mt-2 border-l-2 border-current/40">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export const LoteDetailsPage = () => (
  <GlobalErrorBoundary>
    <LoteDetailsPageContent />
  </GlobalErrorBoundary>
);
