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
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:items-center sm:p-4">
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

      <div role="dialog" aria-modal="true" aria-labelledby="mix-containers-title" className="flex w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="space-y-3 border-b border-border bg-muted/20 px-4 py-4 sm:px-5 no-print">
          <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <Icon name="inventory_2" size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="mix-containers-title" className="text-base font-bold text-foreground sm:text-lg">Etiquetas QR de mezcla</h2>
                <span className="min-h-7 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-sm font-bold text-primary">
                  {containers.length} {containers.length === 1 ? 'contenedor' : 'contenedores'}
                </span>
              </div>
            </div>
          </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar etiquetas QR"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-5">
            <span className="min-w-0 break-all text-muted-foreground">Folio: <strong className="text-foreground">{mixData.folio}</strong></span>
            <span className="text-muted-foreground">Destino: <strong className="text-primary">{extruderName}</strong></span>
            <span className="col-span-2 text-muted-foreground sm:col-span-1">Peso total: <strong className="font-mono text-foreground">{Number(mixData.total_quantity).toFixed(2)} kg</strong></span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              className="min-h-12 w-full gap-2 border-border text-base font-bold sm:w-auto"
              title="Guardar o Descargar como PDF con las etiquetas QR listas para imprimir"
            >
              <Icon name="download" size={18} />
              <span>Guardar PDF</span>
            </Button>
            <Button
              onClick={handlePrint}
              className="min-h-12 w-full gap-2 bg-primary text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto"
            >
              <Icon name="print" size={18} />
              <span>Imprimir Etiquetas</span>
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-3 sm:p-6" id="printable-mix-containers-sheet">
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
                  className="print-card flex min-w-0 flex-col justify-between gap-3.5 rounded-xl border-2 border-dashed border-border bg-card p-3 text-foreground shadow-sm transition-colors hover:border-primary/50 sm:p-4"
                >
                  {/* Top strip */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/80 pb-2.5">
                    <div className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-primary">
                      <Icon name="blender" size={16} />
                      <span>Contenedor {cont.container_number} de {cont.total_containers}</span>
                    </div>
                    <span className="max-w-full break-all rounded bg-muted px-2 py-1 font-mono text-sm font-bold text-foreground">
                      {cont.folio}
                    </span>
                  </div>

                  {/* Middle: QR Code + Details */}
                  <div className="flex flex-col items-stretch gap-4 py-1 sm:flex-row sm:items-center">
                    {/* QR Box with icon overlay */}
                    <div className="relative flex shrink-0 items-center justify-center self-center rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
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
                    <div className="min-w-0 flex-1 space-y-3 text-base">
                      <div>
                        <span className="block text-sm font-semibold text-muted-foreground">
                          Código QR de Contenedor
                        </span>
                        <span className="break-all font-mono text-base font-bold text-foreground">
                          {cont.qr_code}
                        </span>
                      </div>

                      <div>
                        <span className="block text-sm font-semibold text-muted-foreground">
                          Fórmula / Receta
                        </span>
                        <span className="break-words text-base font-bold text-foreground">
                          {cont.formula_code ? `[${cont.formula_code}] ` : ''}{cont.formula_name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2">
                        <div>
                          <span className="block text-sm font-semibold text-muted-foreground">
                            Peso Contenedor
                          </span>
                          <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(cont.capacity_kg).toFixed(2)} KG
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-sm font-semibold text-muted-foreground">
                            Destino
                          </span>
                          <span className="text-base font-bold text-primary">
                            {extruderName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom strip / Cutting guide */}
                  <div className="flex flex-col gap-1 border-t border-border/60 pt-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
        <div className="px-4 py-3 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print sm:px-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="check_circle" size={16} className="text-emerald-500 shrink-0" />
            <span>
              Imprime o guarda las etiquetas y colócalas en los contenedores del destino <strong className="text-foreground">{extruderName}</strong>.
            </span>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            {onNavigateToBoard && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onNavigateToBoard();
                }}
                className="min-h-12 gap-1.5 text-base font-bold border-border"
              >
                <Icon name="view_kanban" size={16} className="text-primary" />
                <span>Ver Tablero de Colas</span>
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="min-h-12 px-4 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
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
