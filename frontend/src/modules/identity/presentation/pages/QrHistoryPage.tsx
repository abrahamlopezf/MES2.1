import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { QrCode, Search, History, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../../design-system';

const fetchInactiveQrs = async () => {
  const response = await axiosClient.get('/qr/codes', {
    params: {
      limit: 100, // Podemos agregar paginación luego
      // Nota: El backend acepta status, pero como queremos CONSUMED y DISPOSED, 
      // pediremos todos o los filtraremos aquí temporalmente hasta agregar soporte múltiple.
    }
  });
  const data = response.data.data || response.data;
  
  // Filtramos inactivos o con estatus CONSUMED/DISPOSED
  return data.items.filter((item: any) => 
    !item.is_active || item.status === 'CONSUMED' || item.status === 'DISPOSED'
  );
};

export function QrHistoryPage() {
  const { data: qrs, isLoading } = useQuery({
    queryKey: ['qrcodes', 'history'],
    queryFn: fetchInactiveQrs
  });

  return (
    <div className="flex flex-col h-full bg-background overflow-x-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs bg-secondary/50 font-mono text-muted-foreground">
                  Centro de Identidad
                </Badge>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                <History className="text-primary" size={32} />
                Historial de QRs (Inactivos)
              </h1>
              <p className="text-muted-foreground font-semibold mt-1">
                Registro de códigos QR que ya cumplieron su ciclo de vida (Baja o Consumo Total).
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="font-semibold">Cargando historial de QRs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Código QR</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Lote/Batch</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Área Origen</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha Baja</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Trazabilidad</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {(!qrs || qrs.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <QrCode className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="font-semibold">No hay códigos QR inactivos registrados aún.</p>
                      </td>
                    </tr>
                  ) : (
                    qrs.map((qr: any) => (
                      <tr key={qr.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-foreground font-mono">
                          {qr.qr_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-muted-foreground">
                          {qr.batch ? qr.batch.batch_code : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-[11px] font-black rounded-md uppercase tracking-wider border ${
                            qr.status === 'CONSUMED' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                              : qr.status === 'DISPOSED'
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {qr.status === 'DISPOSED' ? 'BAJA/SCRAP' : qr.status === 'CONSUMED' ? 'CONSUMIDO' : qr.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                          {qr.assigned_area?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                          {new Date(qr.updated_at || qr.createdAt || Date.now()).toLocaleDateString('es-MX', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            to={`/traceability/genealogy?qr=${encodeURIComponent(qr.qr_code)}`}
                            className="text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-2 transition-colors"
                          >
                            <History size={14} /> Ver Árbol
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
