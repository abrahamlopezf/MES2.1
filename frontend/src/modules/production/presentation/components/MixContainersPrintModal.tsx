import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Icon, Button } from '@/design-system';
import { toast } from 'sonner';

export interface MixContainerInfo {
  container_number: number;
  total_containers: number;
  qr_code: string;
  capacity_kg: number;
  formula_name: string;
  formula_code?: string;
  folio: string;
  extruder_id?: number | null;
}

export interface MixResultData {
  folio: string;
  formula_name: string;
  formula_code?: string;
  total_quantity: number;
  extruder_id?: number | null;
  containers: MixContainerInfo[];
}

interface MixContainersPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  mixData: MixResultData | null;
  onNavigateToBoard?: () => void;
  autoPrint?: boolean;
}

export const MixContainersPrintModal: React.FC<MixContainersPrintModalProps> = ({
  isOpen,
  onClose,
  mixData,
  onNavigateToBoard,
  autoPrint = true
}) => {
  if (!isOpen || !mixData) return null;

  const containers = mixData.containers || [];
  const extruderName = mixData.extruder_id ? `Extrusora ${mixData.extruder_id}` : 'Piso Extrusión';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Para descarga directa, abrimos la ventana de impresión formateada para guardar como PDF
    toast.info('Generando vista de impresión/guardado en PDF...');
    window.print();
  };

  // Disparo automático de la ventana de impresión para el operador al abrirse el modal
  React.useEffect(() => {
    if (isOpen && mixData && autoPrint && containers.length > 0) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print was blocked or not supported:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mixData, autoPrint, containers.length]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm">
      <style>
        {`
          @media print {
            @page {
              size: auto;
              margin: 8mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-mix-containers-sheet, #printable-mix-containers-sheet * {
              visibility: visible;
            }
            #printable-mix-containers-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            #printable-mix-containers-sheet .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              background: #ffffff !important;
              color: #000000 !important;
              border: 2px dashed #000000 !important;
            }
            #printable-mix-containers-sheet .text-foreground,
            #printable-mix-containers-sheet .text-primary,
            #printable-mix-containers-sheet .text-muted-foreground {
              color: #000000 !important;
            }
            #printable-mix-containers-sheet .bg-card,
            #printable-mix-containers-sheet .bg-muted {
              background-color: #ffffff !important;
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
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <Icon name="inventory_2" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Etiquetas QR de Contenedores de Mezcla</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {containers.length} {containers.length === 1 ? 'Contenedor' : 'Contenedores'}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Folio Mezcla: <strong className="text-foreground">{mixData.folio}</strong> • Destino: <strong className="text-primary">{extruderName}</strong> • Peso Total: <strong className="text-foreground">{Number(mixData.total_quantity).toFixed(2)} Kg</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              className="gap-2 font-bold border-border"
              title="Guardar o Descargar como PDF con las etiquetas QR listas para imprimir"
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
        <div className="p-6 overflow-y-auto flex-1 bg-background" id="printable-mix-containers-sheet">
          {containers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Icon name="inventory_2" size={40} className="mx-auto mb-2 opacity-50" />
              <p className="font-bold text-foreground">No hay contenedores registrados para esta mezcla.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {containers.map((cont, idx) => (
                <div
                  key={cont.qr_code || idx}
                  className="print-card border-2 border-dashed border-border rounded-xl p-4 bg-card text-foreground flex flex-col justify-between gap-3.5 shadow-sm hover:border-primary/50 transition-colors"
                >
                  {/* Top strip */}
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-primary">
                      <Icon name="blender" size={16} />
                      <span>EXTRUSIÓN — CONTENEDOR {cont.container_number} DE {cont.total_containers}</span>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {cont.folio}
                    </span>
                  </div>

                  {/* Middle: QR Code + Details */}
                  <div className="flex items-center gap-4 py-1">
                    {/* QR Box with icon overlay */}
                    <div className="relative p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm shrink-0 flex items-center justify-center">
                      <QRCodeSVG
                        value={cont.qr_code}
                        size={110}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                      <div className="absolute inset-0 m-auto w-7 h-7 bg-white rounded-full border-2 border-primary flex items-center justify-center text-primary shadow-sm pointer-events-none">
                        <Icon name="inventory_2" size={16} className="text-primary font-black" />
                      </div>
                    </div>

                    {/* Detail Text */}
                    <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Código QR de Contenedor
                        </span>
                        <span className="font-mono font-black text-sm text-foreground break-all">
                          {cont.qr_code}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Fórmula / Receta
                        </span>
                        <span className="font-bold text-foreground text-xs line-clamp-1">
                          {cont.formula_code ? `[${cont.formula_code}] ` : ''}{cont.formula_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Peso Contenedor
                          </span>
                          <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {Number(cont.capacity_kg).toFixed(2)} KG
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Destino
                          </span>
                          <span className="font-bold text-xs text-primary">
                            {extruderName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom strip / Cutting guide */}
                  <div className="border-t border-border/60 pt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Icon name="content_cut" size={12} />
                      Rotular en tolva o contenedor físico
                    </span>
                    <span>Trazabilidad 100% activa</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Modal con Acceso al Tablero de Colas */}
        <div className="px-5 py-3 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="check_circle" size={16} className="text-emerald-500 shrink-0" />
            <span>
              La mezcla ha sido encolada al final de la cola de <strong className="text-foreground">{extruderName}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onNavigateToBoard && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToBoard();
                }}
                className="gap-1.5 text-xs font-bold border-border"
              >
                <Icon name="view_kanban" size={16} className="text-primary" />
                <span>Ver Tablero de Colas</span>
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Listo / Finalizar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
