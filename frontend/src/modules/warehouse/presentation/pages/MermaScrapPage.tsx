import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { ArrowLeft, Package, Trash2, TrendingDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
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
    <div className="flex flex-col h-full bg-background overflow-x-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs bg-secondary/50 font-mono">
                  Módulo de Almacén
                </Badge>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Control de Merma y Scrap
              </h1>
              <p className="text-muted-foreground font-semibold mt-1">
                Monitoreo general de mermas, scrap y otras bajas registradas.
              </p>
            </div>
          </div>
        </section>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:border-primary/50 transition-colors">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <TrendingDown className="text-warning" size={20} />
              Top 5 - Merma
            </h3>
            <div className="h-64 w-full">
              {topMerma.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={topMerma} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorMerma" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                    <YAxis hide type="number" domain={[0, 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="merma" name="Merma" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorMerma)" activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }}>
                      <LabelList dataKey="merma" position="top" fill="#f8fafc" fontSize={12} fontWeight="bold" formatter={(val: number) => val.toFixed(2)} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-semibold border-2 border-dashed rounded-xl border-border bg-muted/20">Sin datos de merma</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:border-primary/50 transition-colors">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Trash2 className="text-destructive" size={20} />
              Top 5 - Scrap
            </h3>
            <div className="h-64 w-full">
              {topScrap.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={topScrap} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                    <YAxis hide type="number" domain={[0, 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="scrap" name="Scrap" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorScrap)" activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 0 }}>
                      <LabelList dataKey="scrap" position="top" fill="#f8fafc" fontSize={12} fontWeight="bold" formatter={(val: number) => val.toFixed(2)} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-semibold border-2 border-dashed rounded-xl border-border bg-muted/20">Sin datos de scrap</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:border-primary/50 transition-colors">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Package className="text-info" size={20} />
              Top 5 - Otras Bajas
            </h3>
            <div className="h-64 w-full">
              {topBaja.length > 0 && topBaja.some(b => b.baja > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={topBaja} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBaja" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                    <YAxis hide type="number" domain={[0, 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="baja" name="Otras Bajas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBaja)" activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}>
                      <LabelList dataKey="baja" position="top" fill="#f8fafc" fontSize={12} fontWeight="bold" formatter={(val: number) => val.toFixed(2)} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-semibold border-2 border-dashed rounded-xl border-border bg-muted/20">Sin datos de bajas</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Materiales */}
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-foreground text-lg tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Listado General
              </h3>
              <p className="text-sm text-muted-foreground font-semibold mt-1">
                Desglose detallado de todos los materiales con registros de bajas.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border text-sm font-bold text-foreground">
                {report.length} registros
              </div>
            </div>
          </div>
          
          <div className="p-5 pt-0">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="font-medium">Cargando reporte...</span>
              </div>
            ) : report.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-medium border-2 border-dashed rounded-xl border-border bg-muted/20 mt-4">
                No hay registros de Merma o Scrap.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-primary text-primary-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 font-bold tracking-tight">Material</th>
                      <th className="px-5 py-3.5 font-bold tracking-tight text-right">Total Merma</th>
                      <th className="px-5 py-3.5 font-bold tracking-tight text-right">Total Scrap</th>
                      <th className="px-5 py-3.5 font-bold tracking-tight text-right">Otras Bajas</th>
                      <th className="px-5 py-3.5 font-bold tracking-tight text-center">Acciones</th>
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
            </div>
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
