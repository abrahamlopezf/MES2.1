import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TopBar, Button, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { ArrowLeft, Package, Trash2, TrendingDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MermaScrapDetallesBottomSheet } from '../components/MermaScrapDetallesBottomSheet.container';

export const MermaScrapPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);

  const { data: report = [], isLoading } = useQuery({
    queryKey: ['warehouse', 'merma-scrap-report'],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/reports/merma-scrap');
      return response.data.data;
    },
    refetchInterval: 5000 // Actualización en tiempo real cada 5 segundos
  });

  const topMerma = [...report].sort((a, b) => b.merma - a.merma).slice(0, 5);
  const topScrap = [...report].sort((a, b) => b.scrap - a.scrap).slice(0, 5);
  const topBaja = [...report].sort((a, b) => (b.baja || 0) - (a.baja || 0)).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <TopBar
        title="Control de Merma y Scrap"
        leftAction={
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={20} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="text-warning" size={20} />
              Top 5 - Merma
            </h3>
            <div className="h-64 w-full">
              {topMerma.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMerma} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={100} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }} />
                    <Bar dataKey="merma" name="Merma" fill="var(--warning)" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos de merma</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Trash2 className="text-destructive" size={20} />
              Top 5 - Scrap
            </h3>
            <div className="h-64 w-full">
              {topScrap.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topScrap} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={100} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }} />
                    <Bar dataKey="scrap" name="Scrap" fill="var(--danger)" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos de scrap</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Package className="text-info" size={20} />
              Top 5 - Otras Bajas
            </h3>
            <div className="h-64 w-full">
              {topBaja.length > 0 && topBaja.some(b => b.baja > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBaja} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={100} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }} />
                    <Bar dataKey="baja" name="Otras Bajas" fill="var(--info)" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sin datos de bajas</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Materiales */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <h3 className="font-bold text-foreground">Listado General</h3>
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="font-medium">Cargando reporte...</span>
              </div>
            ) : report.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-medium">
                No hay registros de Merma o Scrap.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total Merma</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total Scrap</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Otras Bajas</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.map((item: any) => (
                    <tr key={item.material_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="text-primary" size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.internal_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-bold text-warning">{Number(item.merma).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-bold text-destructive">{Number(item.scrap).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-bold text-info">{Number(item.baja || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Button variant="outline" size="sm" className="font-bold bg-background" onClick={() => setSelectedMaterialId(item.material_id)}>
                          Detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {selectedMaterialId && (
        <MermaScrapDetallesBottomSheet
          isOpen={!!selectedMaterialId}
          materialId={selectedMaterialId}
          onClose={() => setSelectedMaterialId(null)}
        />
      )}
    </div>
  );
};
