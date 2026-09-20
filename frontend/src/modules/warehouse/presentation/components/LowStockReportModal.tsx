import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, AlertTriangle, FileText, X } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';
import { 
  TFDialog as Dialog, 
  TFDialogContent as DialogContent, 
  TFDialogHeader as DialogHeader, 
  TFDialogTitle as DialogTitle, 
  TFDialogDescription as DialogDescription,
  TFDialogClose as DialogClose
} from '../../../../components/tf-ui';
import { apiClient } from '../../../../core/api/apiClient';

interface LowStockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LowStockReportModal: React.FC<LowStockReportModalProps> = ({ isOpen, onClose }) => {
  const { data: reportData, isLoading } = useQuery({
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent showClose={false} className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-border">
        
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between shrink-0 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground tracking-tight">Reporte de Stocks Bajos</DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
                Materiales en alerta amarilla (punto de reorden) o roja (crítico)
              </DialogDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="default" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-9 gap-2"
              onClick={downloadCSV}
              disabled={isLoading || !reportData || reportData.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>

            {/* Botón de cerrar usando DialogClose */}
            <DialogClose asChild>
              <div 
                onClick={(e) => {
                  e.stopPropagation(); // Evita que el clic se propague a otros elementos
                  onClose();
                }}
                className="h-10 w-10 bg-red-600 hover:bg-red-700 flex items-center justify-center rounded-xl cursor-pointer shadow-md transition-colors"
                title="Cerrar"
              >
                <X className="h-6 w-6 text-white" strokeWidth={3} />
              </div>
            </DialogClose>
          </div>
          
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="font-bold">Generando reporte...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 opacity-20 mb-4" />
              <p className="font-bold">No hay materiales con stock bajo actualmente.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-bold">Familia + Artículo</th>
                    <th className="px-4 py-3 font-bold">Descripción</th>
                    <th className="px-4 py-3 font-bold">Tipo</th>
                    <th className="px-4 py-3 font-bold">Marca</th>
                    <th className="px-4 py-3 font-bold text-right">Stock Actual</th>
                    <th className="px-4 py-3 font-bold text-center">Estado</th>
                    <th className="px-4 py-3 font-bold text-right text-primary">Sugerido (Mes)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item: any) => (
                    <tr key={item.material_id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{item.familia_articulo}</td>
                      <td className="px-4 py-3">{item.descripcion}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.tipo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.marca}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{item.stock_actual}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={item.estado.includes('Rojo') ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}>
                          {item.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-primary text-base">
                        {item.cantidad_a_comprar}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
