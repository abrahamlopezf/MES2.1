import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button, Icon } from '@/design-system';
import { downloadConsumptionOrderPdf } from '../../utils/pdfUtils';

interface ChildQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const ChildQrPrintModal: React.FC<ChildQrPrintModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  if (!isOpen || !order) return null;

  const areaName = (order.requesting_area?.name || 'EXTRUSIÓN').toUpperCase();
  const areaCode = (order.requesting_area?.code || 'EXTRUSION').toUpperCase();

  // Obtener icono central según el área destino
  const getAreaIconName = (code: string) => {
    switch (code) {
      case 'EXTRUSION':
        return 'blender';
      case 'TELARES':
        return 'grid_view';
      case 'LAMINADO':
        return 'layers';
      default:
        return 'precision_manufacturing';
    }
  };

  const centerIcon = getAreaIconName(areaCode);

  // Filtrar solo items que tienen QR Hijo generado
  const itemsWithChildQr = (order.items || []).filter(
    (item: any) => item.child_qr && item.child_qr.qr_code
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      toast.info('Descargando PDF con etiquetas QR...');
      await downloadConsumptionOrderPdf(order, `ETIQUETAS-QRS-${order.order_number}.pdf`);
      toast.success('PDF descargado exitosamente.');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF de etiquetas.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-child-qr-sheet, #printable-child-qr-sheet * {
              visibility: visible;
            }
            #printable-child-qr-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="qr_code_2" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Etiquetas QR de Mini-Lotes Surtidos (WIP)
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Orden: <strong className="text-foreground">{order.order_number}</strong> • Destino: <strong className="text-primary">{areaName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              className="gap-2 font-bold border-border"
              title="Descargar archivo PDF con las etiquetas QR listas para imprimir"
            >
              <Icon name="download" size={18} />
              <span>Descargar PDF</span>
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Icon name="print" size={18} />
              <span>Imprimir Etiquetas</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-background" id="printable-child-qr-sheet">
          {itemsWithChildQr.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Icon name="inventory_2" size={40} className="mx-auto mb-2 opacity-50" />
              <p className="font-bold text-foreground">No hay etiquetas QR hijas generadas para esta orden.</p>
              <p className="text-xs mt-1">Los QRs hijos se activan automáticamente al surtir órdenes dirigidas a áreas de proceso principal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {itemsWithChildQr.map((item: any, idx: number) => {
                const childQrString = item.child_qr.qr_code;
                const parentFolio = item.lote?.folio || item.lote?.qr_code?.qr_code || 'S/N';
                const qty = Number(item.fulfilled_quantity || item.requested_quantity || 0).toFixed(2);
                const unit = item.unit?.code || item.material?.base_unit?.code || 'KG';

                return (
                  <div
                    key={item.id || idx}
                    className="border-2 border-dashed border-border rounded-xl p-4 bg-card text-foreground flex flex-col justify-between gap-3 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    {/* Top strip */}
                    <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-primary">
                        <Icon name={centerIcon} size={16} />
                        <span>{areaName} — INSUMO WIP</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {order.order_number}
                      </span>
                    </div>

                    {/* Middle: QR with central symbol + Details */}
                    <div className="flex items-center gap-4 py-1">
                      {/* QR Box with centered area icon */}
                      <div className="relative p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 flex items-center justify-center">
                        <QRCodeSVG
                          value={childQrString}
                          size={110}
                          level="H"
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                        {/* Central Area Symbol Overlay */}
                        <div className="absolute inset-0 m-auto w-7 h-7 bg-white rounded-full border-2 border-primary flex items-center justify-center text-primary shadow-sm pointer-events-none">
                          <Icon name={centerIcon} size={16} className="text-primary font-black" />
                        </div>
                      </div>

                      {/* Detail Text */}
                      <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Código QR Hijo (SN)
                          </span>
                          <span className="font-mono font-black text-sm text-foreground break-all">
                            {childQrString}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Material
                          </span>
                          <p className="font-bold text-foreground truncate">
                            {item.material?.name || 'Material'}
                          </p>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {item.material?.material_code || ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Lote Padre
                            </span>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {parentFolio}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Cantidad
                            </span>
                            <span className="font-mono text-base font-black text-primary">
                              {qty} {unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom strip */}
                    <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Surtido: {new Date(order.resolved_at || order.updated_at || Date.now()).toLocaleDateString()}</span>
                      <span className="italic">TraceFlow Industrial MES</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center no-print">
          <span className="text-xs text-muted-foreground font-medium">
            Total de etiquetas a imprimir: <strong className="text-foreground">{itemsWithChildQr.length}</strong>
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="font-bold"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
