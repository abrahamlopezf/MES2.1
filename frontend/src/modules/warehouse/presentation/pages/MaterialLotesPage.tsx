import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Boxes, AlertCircle } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { GlobalErrorBoundary } from '../../../../core/error/GlobalErrorBoundary';
import { ChangeLocationModal } from '../components/ChangeLocationModal';

const MaterialLotesPageContent = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const [locationLote, setLocationLote] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['material-lotes', materialId],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${materialId}/lotes`);
      return response.data.data; // Array of lotes
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
          <p>Ocurrió un error al cargar los lotes del material.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/warehouse/inventory')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lotes del Material</h1>
          <p className="text-muted-foreground">ID Material: {materialId}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            Lotes Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Localidad</th>
                  <th className="px-4 py-3 font-medium">Fecha Recepción</th>
                  <th className="px-4 py-3 font-medium">Recibido Por</th>
                  <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay lotes activos para este material.
                    </td>
                  </tr>
                ) : (
                  data.map((lote: any) => {
                    const isInactive = lote.is_active === false || lote.is_active === 0;
                    return (
                    <tr key={lote.id} className={`border-b border-border last:border-0 hover:bg-muted/50 ${isInactive ? 'opacity-60 bg-secondary/20' : ''}`}>
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        #{lote.id}
                        {isInactive && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">Dado de Baja</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lote.location ? (
                          <Badge variant="outline">{lote.location.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{new Date(lote.date_received).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{lote.user?.first_name} {lote.user?.last_name}</td>
                      <td className="px-4 py-3 text-right font-mono">{Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/warehouse/lotes/${lote.id}`)}>
                          Ver Detalle
                        </Button>
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => setLocationLote(lote)} disabled={isInactive}>
                          Cambiar Loc.
                        </Button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {locationLote && (
        <ChangeLocationModal 
          lote={locationLote}
          onClose={() => setLocationLote(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};

export const MaterialLotesPage = () => (
  <GlobalErrorBoundary>
    <MaterialLotesPageContent />
  </GlobalErrorBoundary>
);
