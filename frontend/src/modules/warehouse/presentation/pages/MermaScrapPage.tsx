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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const topMerma = [...report].sort((a, b) => b.merma - a.merma).slice(0, 5);
  const topScrap = [...report].sort((a, b) => b.scrap - a.scrap).slice(0, 5);
  const topBaja = [...report].sort((a, b) => (b.baja || 0) - (a.baja || 0)).slice(0, 5);

  const totalMermaCost = report.reduce((acc: number, item: any) => acc + (Number(item.merma_cost) || 0), 0);
  const totalScrapCost = report.reduce((acc: number, item: any) => acc + (Number(item.scrap_cost) || 0), 0);
  const totalBajaCost = report.reduce((acc: number, item: any) => acc + (Number(item.baja_cost) || 0), 0);
  const totalLossCost = report.reduce((acc: number, item: any) => acc + (Number(item.total_loss_cost) || 0), 0);

  const totalMermaQty = report.reduce((acc: number, item: any) => acc + (Number(item.merma) || 0), 0);
  const totalScrapQty = report.reduce((acc: number, item: any) => acc + (Number(item.scrap) || 0), 0);
  const totalBajaQty = report.reduce((acc: number, item: any) => acc + (Number(item.baja) || 0), 0);
  const totalLossQty = report.reduce((acc: number, item: any) => acc + (Number(item.total_loss_qty) || 0), 0);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-32 sm:pb-16 bg-background overflow-x-hidden">
        
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

        {/* Tarjetas de Resumen Financiero y Operativo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-5 border border-border border-b-4 border-b-red-500 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">COSTO TOTAL PÉRDIDAS</span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{formatCurrency(totalLossCost)}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{totalLossQty.toFixed(2)} uds registradas en total</span>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border border-b-4 border-b-amber-500 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">COSTO TOTAL MERMA</span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-warning tracking-tight">{formatCurrency(totalMermaCost)}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{totalMermaQty.toFixed(2)} uds en merma de proceso</span>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border border-b-4 border-b-rose-600 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">COSTO TOTAL SCRAP</span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-destructive tracking-tight">{formatCurrency(totalScrapCost)}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{totalScrapQty.toFixed(2)} uds en material dañado</span>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border border-b-4 border-b-blue-500 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">COSTO OTRAS BAJAS</span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-info tracking-tight">{formatCurrency(totalBajaCost)}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{totalBajaQty.toFixed(2)} uds en bajas no operativas</span>
          </div>
        </div>

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
              <div className="rounded-xl border border-border overflow-hidden mt-4">
                {/* VISTA MOBILE: Tarjetas táctiles legibles */}
                <div className="md:hidden divide-y divide-border">
                  {report.map((item: any) => (
                    <div 
                      key={item.material_id} 
                      onClick={() => setSelectedMaterialId(item.material_id)}
                      className="p-4 flex flex-col gap-3 bg-card hover:bg-muted/20 active:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="text-primary" size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.internal_code}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-foreground text-sm">{formatCurrency(item.total_loss_cost)}</div>
                          <div className="text-[10px] text-muted-foreground">{Number(item.total_loss_qty || 0).toFixed(2)} uds</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/40 text-center">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Merma</span>
                          <p className="text-xs font-bold text-warning font-mono">{Number(item.merma).toFixed(1)}</p>
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(item.merma_cost)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Scrap</span>
                          <p className="text-xs font-bold text-destructive font-mono">{Number(item.scrap).toFixed(1)}</p>
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(item.scrap_cost)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Otras Bajas</span>
                          <p className="text-xs font-bold text-info font-mono">{Number(item.baja || 0).toFixed(1)}</p>
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(item.baja_cost)}</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full font-bold bg-background h-9 cursor-pointer" 
                        onClick={(e) => { e.stopPropagation(); setSelectedMaterialId(item.material_id); }}
                      >
                        Ver Historial de Bajas
                      </Button>
                    </div>
                  ))}
                </div>

                {/* VISTA DESKTOP: Tabla completa */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-primary text-primary-foreground border-b border-border">
                      <tr>
                        <th className="px-5 py-3.5 font-bold tracking-tight">Material</th>
                        <th className="px-5 py-3.5 font-bold tracking-tight text-right">Total Merma</th>
                        <th className="px-5 py-3.5 font-bold tracking-tight text-right">Total Scrap</th>
                        <th className="px-5 py-3.5 font-bold tracking-tight text-right">Otras Bajas</th>
                        <th className="px-5 py-3.5 font-bold tracking-tight text-right">Costo Total</th>
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
                          <div className="font-mono font-bold text-warning">{Number(item.merma).toFixed(2)}</div>
                          <div className="text-xs font-semibold text-muted-foreground">{formatCurrency(item.merma_cost)}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono font-bold text-destructive">{Number(item.scrap).toFixed(2)}</div>
                          <div className="text-xs font-semibold text-muted-foreground">{formatCurrency(item.scrap_cost)}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono font-bold text-info">{Number(item.baja || 0).toFixed(2)}</div>
                          <div className="text-xs font-semibold text-muted-foreground">{formatCurrency(item.baja_cost)}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono font-black text-foreground">{formatCurrency(item.total_loss_cost)}</div>
                          <div className="text-[11px] font-semibold text-muted-foreground">{Number(item.total_loss_qty || 0).toFixed(2)} uds</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Button variant="outline" size="sm" className="font-bold bg-background cursor-pointer" onClick={() => setSelectedMaterialId(item.material_id)}>
                            Detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
