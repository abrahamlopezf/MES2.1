import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, AlertTriangle, FileText, X, Package, ShoppingCart } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';
import { 
  TFDialog as Dialog, 
  TFDialogContent as DialogContent, 
  TFDialogTitle as DialogTitle, 
  TFDialogDescription as DialogDescription
} from '../../../../components/tf-ui';
import { apiClient } from '../../../../core/api/apiClient';

interface LowStockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LowStockReportModal: React.FC<LowStockReportModalProps> = ({ isOpen, onClose }) => {
  const { data: reportData = [], isLoading } = useQuery<any[]>({
    queryKey: ['warehouse', 'low-stock-report'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/warehouse/low-stock-report');
        return response.data?.data || response.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: isOpen,
  });

  const criticalCount = reportData.filter((i: any) => i.estado?.includes('Rojo')).length;
  const warningCount = reportData.filter((i: any) => i.estado?.includes('Amarillo')).length;
  const totalSuggestedToBuy = reportData.reduce((acc: number, i: any) => acc + (Number(i.cantidad_a_comprar) || 0), 0);

  const downloadCSV = () => {
    if (!reportData || reportData.length === 0) return;

    // Headers
    const headers = ['Familia + Articulo', 'Descripción', 'Tipo', 'Marca', 'Stock Actual', 'Estado', 'Cantidad a Comprar'];
    
    // Rows
    const rows = reportData.map((item: any) => [
      `"${item.familia_articulo}"`,
      `"${item.descripcion}"`,
      `"${item.tipo}"`,
      `"${item.marca}"`,
      item.stock_actual,
      `"${item.estado}"`,
      item.cantidad_a_comprar
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Stocks_Bajos_${new Date().toISOString().split('T')[0]}.csv`);
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent showClose={false} className="max-w-5xl w-[95vw] sm:w-[90vw] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-2xl">
        
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight">
                Reporte de Stocks Bajos
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5 leading-tight">
                Materiales en punto de reorden (amarillo) o stock crítico (rojo)
              </DialogDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              style={{ minHeight: 'unset' }}
              className="!min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs h-9 px-4 gap-2 rounded-xl"
              onClick={downloadCSV}
              disabled={isLoading || !reportData || reportData.length === 0}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>

            <button 
              type="button"
              onClick={onClose}
              style={{ minHeight: 'unset', padding: 0 }}
              className="!min-h-0 w-9 h-9 shrink-0 rounded-xl bg-muted hover:bg-destructive hover:text-white transition-colors flex items-center justify-center text-muted-foreground border border-border cursor-pointer"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Resumen KPI Rápido */}
        {!isLoading && reportData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/10 border-b border-border">
            <div className="bg-card p-3 rounded-xl border border-border flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Materiales con Alerta</span>
              <span className="text-xl font-black text-foreground mt-1">{reportData.length}</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-rose-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Nivel Crítico (Rojo)
              </span>
              <span className="text-xl font-black text-rose-500 mt-1">{criticalCount}</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-amber-500/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                En Alerta (Amarillo)
              </span>
              <span className="text-xl font-black text-amber-500 mt-1">{warningCount}</span>
            </div>
            <div className="bg-card p-3 rounded-xl border border-primary/20 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                Sugerido a Comprar
              </span>
              <span className="text-xl font-black text-primary mt-1">+{totalSuggestedToBuy.toLocaleString()} <span className="text-xs font-normal opacity-70">uds</span></span>
            </div>
          </div>
        )}

        {/* Contenido / Tabla */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="font-bold">Generando reporte de stocks...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
              <FileText className="h-12 w-12 opacity-30 mb-3" />
              <p className="font-bold text-foreground">Inventario Saludable</p>
              <p className="text-xs text-muted-foreground mt-1">No hay materiales por debajo del nivel de reorden o stock mínimo.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground border-b border-border text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3 font-bold">Material</th>
                    <th className="px-4 py-3 font-bold">Clasificación</th>
                    <th className="px-4 py-3 font-bold text-right">Stock Actual</th>
                    <th className="px-4 py-3 font-bold text-center">Estado</th>
                    <th className="px-4 py-3 font-bold text-right">Sugerido Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((item: any) => {
                    const isCritical = item.estado?.includes('Rojo');
                    return (
                      <tr key={item.material_id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground leading-snug">{item.descripcion}</div>
                              <div className="text-xs font-mono text-muted-foreground mt-0.5">{item.familia_articulo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs bg-muted/70 px-2 py-0.5 rounded border border-border font-medium text-foreground">
                              {item.marca || 'Genérica'}
                            </span>
                            {item.tipo && item.tipo !== 'N/A' && item.tipo !== 1 && item.tipo !== '1' && (
                              <span className="text-xs text-muted-foreground font-medium">
                                ({item.tipo})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">
                          {item.stock_actual} <span className="text-xs font-normal text-muted-foreground">uds</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge 
                            variant="outline" 
                            className={`font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                              isCritical 
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' 
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                            {isCritical ? 'Crítico (≤ Mínimo)' : 'Alerta (≤ Reorden)'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-black text-primary text-base">
                          +{item.cantidad_a_comprar}{' '}
                          <span className="text-xs font-semibold text-muted-foreground">uds</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
