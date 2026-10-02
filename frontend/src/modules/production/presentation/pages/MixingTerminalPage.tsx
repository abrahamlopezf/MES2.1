import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ClipboardList, Beaker, FileText, ArrowRight } from 'lucide-react';
import { apiClient } from '@/core/api/apiClient';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/design-system';
import { MixingTerminalForm } from '../components/MixingTerminalForm';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';

export const MixingTerminalPage: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['extrusion', 'mix-requests'],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/mix-requests?status=SOLICITADA');
      return response.data || [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Mezclado</h1>
          <p className="text-muted-foreground mt-2">Atención a solicitudes de mezcla y ejecución de batch.</p>
        </div>
      </div>

      {!selectedTicket ? (
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="text-primary" size={20} />
              Cola de Solicitudes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center items-center text-muted-foreground">
                <Loader2 size={32} className="animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Beaker size={48} className="mx-auto opacity-20 mb-4" />
                <p className="font-semibold text-lg">No hay solicitudes de mezcla pendientes.</p>
                <p className="text-sm opacity-70">Las extrusoras pueden solicitar mezclas desde la sección de Fórmulas.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket: any) => (
                  <div key={ticket.id} className="p-4 sm:p-6 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="warning">SOLICITADA</Badge>
                        <span className="font-mono text-xs font-bold text-muted-foreground">{ticket.folio}</span>
                      </div>
                      <h3 className="font-bold text-lg text-foreground">{ticket.formula_name}</h3>
                      <p className="text-sm font-semibold text-primary">Solicitada por: {ticket.extruder_name || `Extrusora ${ticket.to_area_id}`}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-medium">
                        <FileText size={14} />
                        Notas: {ticket.notes || 'Ninguna'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-2xl font-black text-foreground">{ticket.total_quantity} {ticket.unit}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">A Preparar</p>
                      </div>
                      <PermissionGate permission="extrusion.mix.create">
                        <Button onClick={() => setSelectedTicket(ticket)} className="w-full sm:w-auto mt-2">
                          Atender Solicitud <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="mb-2">
            &larr; Volver a la cola
          </Button>
          
          <MixingTerminalForm 
            ticket={selectedTicket} 
            onSuccess={() => setSelectedTicket(null)} 
          />
        </div>
      )}
    </div>
  );
};
