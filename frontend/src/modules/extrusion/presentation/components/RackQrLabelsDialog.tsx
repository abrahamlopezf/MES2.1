import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PtiRack } from '../../types/extrusion.types';

interface RackQrLabelsDialogProps {
  racks: PtiRack[];
  onOpenChange: (open: boolean) => void;
}

export const RackQrLabelsDialog: React.FC<RackQrLabelsDialogProps> = ({ racks, onOpenChange }) => {
  const open = racks.length > 0;

  const downloadSingleSvg = () => {
    if (racks.length !== 1) return;
    const rack = racks[0];
    const svg = document.getElementById(`rack-qr-svg-${rack.id}`);
    if (!(svg instanceof SVGSVGElement)) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', '800');
    copy.setAttribute('height', '800');
    const content = new XMLSerializer().serializeToString(copy);
    const url = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${rack.rack_code}-QR.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onOpenChange(false); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-border bg-card text-foreground sm:max-w-3xl print:!fixed print:!inset-0 print:!z-[9999] print:!m-0 print:!h-auto print:!max-h-none print:!w-full print:!max-w-none print:!translate-x-0 print:!translate-y-0 print:!overflow-visible print:!rounded-none print:!border-0 print:!bg-white print:!p-0 print:!shadow-none">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <QrCode className="h-5 w-5 text-primary" />
            {racks.length === 1 ? 'QR del rack' : `QRS de racks seleccionados (${racks.length})`}
          </DialogTitle>
          <DialogDescription>Coloca esta etiqueta en el rack físico y escanéala para registrar el ingreso de PTI.</DialogDescription>
        </DialogHeader>

        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #rack-qr-print-sheet, #rack-qr-print-sheet * { visibility: visible !important; }
            #rack-qr-print-sheet { position: absolute !important; inset: 0 !important; width: 100% !important; padding: 10mm !important; background: #fff !important; color: #111 !important; }
            .rack-qr-label { break-inside: avoid; page-break-inside: avoid; border: 1px solid #bbb !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div id="rack-qr-print-sheet" className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
          {racks.map((rack) => (
            <article key={rack.id} className="rack-qr-label flex flex-col items-center rounded-xl border border-border bg-background p-5 text-center print:rounded-none print:border-gray-400 print:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-gray-600">Rack de PTI</p>
              <h2 className="mt-1 text-xl font-black text-foreground print:text-black">{rack.rack_code}</h2>
              <div className="mt-4 rounded-lg bg-white p-3">
                <QRCodeSVG id={`rack-qr-svg-${rack.id}`} value={rack.qr_code || rack.rack_code} size={190} level="H" includeMargin />
              </div>
              <p className="mt-3 break-all font-mono text-xs font-semibold text-foreground print:text-black">{rack.qr_code || rack.rack_code}</p>
              <p className="mt-1 text-xs text-muted-foreground print:text-gray-600">Capacidad: {rack.max_capacity} piezas</p>
            </article>
          ))}
        </div>

        <DialogFooter className="no-print flex-col gap-2 sm:flex-row">
          {racks.length === 1 && (
            <Button type="button" variant="outline" className="gap-2" onClick={downloadSingleSvg}>
              <Download className="h-4 w-4" /> Descargar QR SVG
            </Button>
          )}
          <Button type="button" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir / guardar PDF
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
