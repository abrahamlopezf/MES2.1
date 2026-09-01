import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Calendar, User, PackageOpen, FileText } from 'lucide-react';
import { Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';

interface Props {
  materialId: number;
  onClose: () => void;
}

export const MermaScrapDetallesModal: React.FC<Props> = ({ materialId, onClose }) => {
  const { data: details = [], isLoading } = useQuery({
    queryKey: ['warehouse', 'merma-scrap-details', materialId],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/reports/merma-scrap/${materialId}`);
      return response.data.data;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-3xl max-h-[90dvh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <PackageOpen size={20} className="text-primary" />
              Historial de Merma y Scrap
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Registros de bajas asociados a este material.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="font-medium">Cargando detalles...</span>
            </div>
          ) : details.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-medium border border-dashed border-border rounded-xl">
              No hay registros detallados disponibles.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border/50 space-y-6">
              {details.map((movement: any) => (
                <div key={movement.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-card ${
                    movement.type === 'MERMA' ? 'bg-warning' : 'bg-destructive'
                  }`} />
                  
                  <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-bold ${movement.type === 'MERMA' ? 'text-warning border-warning/30 bg-warning/5' : 'text-destructive border-destructive/30 bg-destructive/5'}`}>
                          {movement.type}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {Math.abs(Number(movement.quantity_change)).toFixed(2)} unidades
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={14} />
                        <span>{new Date(movement.created_at || movement.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-col gap-2">
                      {(() => {
                        const notes = movement.notes || '';
                        const facturasMatch = notes.match(/Facturas afectadas: (.*?)\. Motivo:/);
                        const motivoMatch = notes.match(/Motivo: (.*?)\. Notas:/);
                        const notasMatch = notes.match(/Notas: (.*)/);

                        if (facturasMatch && motivoMatch) {
                          const facturas = facturasMatch[1].split(',').map((f: string) => f.trim()).filter(Boolean);
                          const userNotes = notasMatch ? notasMatch[1].trim() : '';
                          return (
                            <div className="flex flex-col gap-3">
                              {userNotes && (
                                <div className="flex items-start gap-2 text-sm">
                                  <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground italic">{userNotes}</span>
                                </div>
                              )}
                                <div className="flex flex-col gap-2 mt-2">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Facturas afectadas</span>
                                  <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-muted-foreground/40">
                                    {facturas.map((fac: string, idx: number) => (
                                      <li key={idx}>
                                        <Badge variant="outline" className="font-mono text-xs bg-background/50 border-border/80 px-2 py-0.5">
                                          {fac}
                                        </Badge>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-muted-foreground italic">
                              {notes || 'Sin descripción'}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <User size={16} className="text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">
                          {movement.user ? `${movement.user.first_name} ${movement.user.last_name}` : 'Sistema'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
