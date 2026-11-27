import React, { useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download, AlertCircle, Loader2 } from '@/design-system/components/Icon/googleIconCompat';
import axiosClient from '../../../../api/axiosClient';

export type ThermalQrPrintTarget =
  | { kind: 'batch'; id: string; title: string }
  | { kind: 'single'; uuid: string; title: string }
  | { kind: 'multiple'; uuids: string[]; title: string };

export type ThermalLabelSize = '62x45' | '62x55' | '62x62';

type PreviewResponse = {
  summary: {
    quantity: number;
    width_mm: number;
    label_length_mm: number;
    qr_size_mm: number;
    label_format: string;
    theoretical_paper_consumption_mm: number;
    theoretical_paper_consumption_m: number;
    nominal_roll_length_mm: number;
    theoretical_labels_per_roll: number;
    excludes_advance_gap_and_calibration: boolean;
    roll_yield_is_guaranteed: boolean;
  };
  preview: { qr_code: string; encoded_payload: string; status: string };
};

const requestConfig = { timeout: 180_000 };

const getEndpoints = (target: ThermalQrPrintTarget) => {
  if (target.kind === 'batch') {
    return {
      preview: `/qr/batches/${target.id}/print-preview`,
      print: `/qr/batches/${target.id}/print`,
      body: (label_size: ThermalLabelSize) => ({ label_size }),
    };
  }
  if (target.kind === 'single') {
    return {
      preview: `/qr/${target.uuid}/print-preview`,
      print: `/qr/${target.uuid}/print`,
      body: (label_size: ThermalLabelSize) => ({ label_size }),
    };
  }
  return {
    preview: '/qr/print-preview',
    print: '/qr/print-multiple',
    body: (label_size: ThermalLabelSize) => ({ uuids: target.uuids, label_size }),
  };
};

const errorMessage = (error: any) => {
  const data = error?.response?.data;
  if (data instanceof Blob) return 'No se pudo generar el PDF. Intenta con un grupo más pequeño.';
  return data?.message || error?.friendlyMessage || error?.message || 'No se pudo preparar la impresión.';
};

const downloadPdf = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export function ThermalQrPrintDialog({
  target,
  onClose,
  initialSize = '62x55',
}: {
  target: ThermalQrPrintTarget | null;
  onClose: () => void;
  initialSize?: ThermalLabelSize;
}) {
  const [labelSize, setLabelSize] = React.useState<ThermalLabelSize>(initialSize);
  const endpoints = useMemo(() => target ? getEndpoints(target) : null, [target]);
  const preview = useMutation({
    mutationFn: async () => {
      if (!endpoints) throw new Error('Selecciona un lote o códigos QR.');
      const response = await axiosClient.post(endpoints.preview, endpoints.body(labelSize), requestConfig);
      return response.data.data as PreviewResponse;
    },
  });
  const generatePdf = useMutation({
    mutationFn: async () => {
      if (!endpoints) throw new Error('Selecciona un lote o códigos QR.');
      const response = await axiosClient.post(endpoints.print, endpoints.body(labelSize), {
        ...requestConfig,
        responseType: 'blob',
      });
      return response.data as Blob;
    },
    onSuccess: (blob) => {
      const safeTitle = (target?.title || 'qr-seleccion').replace(/[^A-Za-z0-9_-]/g, '-');
      downloadPdf(blob, `${safeTitle}-DK2205-${labelSize}.pdf`);
    },
  });
  const requestPreview = preview.mutate;

  useEffect(() => {
    if (!target || !endpoints) return;
    requestPreview();
  }, [target, labelSize, requestPreview, endpoints]);

  if (!target) return null;
  const data = preview.data;
  const pageHeight = Number(labelSize.split('x')[1]);
  const summary = data?.summary;
  const estimatedMeters = summary ? summary.theoretical_paper_consumption_m.toFixed(2) : '—';

  return (
    <div className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="thermal-qr-title"
        className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="thermal-qr-title" className="text-lg font-black text-foreground">Impresión Brother DK-2205</h2>
            <p className="truncate text-sm font-medium text-muted-foreground">{target.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar impresión" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted">
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(230px,0.8fr)]">
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm font-bold text-foreground">
                Formato de etiqueta
                <select
                  value={labelSize}
                  onChange={(event) => setLabelSize(event.target.value as ThermalLabelSize)}
                  className="min-h-12 rounded-lg border border-border bg-background px-3 text-base font-semibold"
                >
                  <option value="62x45">Compacto · 62 × 45 mm</option>
                  <option value="62x55">Estándar · 62 × 55 mm (predeterminado)</option>
                  <option value="62x62">Cuadrado · 62 × 62 mm</option>
                </select>
              </label>

              {preview.isPending && !data && (
                <div className="flex min-h-24 items-center gap-3 rounded-lg border border-border bg-background p-4 text-muted-foreground" role="status">
                  <Loader2 className="animate-spin" size={20} /> Preparando vista previa…
                </div>
              )}
              {preview.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 size-5 shrink-0" />
                  <span>{errorMessage(preview.error)}</span>
                </div>
              )}

              {summary && (
                <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                  <div><dt className="text-muted-foreground">Etiquetas</dt><dd className="font-black text-foreground">{summary.quantity}</dd></div>
                  <div><dt className="text-muted-foreground">Ancho de papel</dt><dd className="font-black text-foreground">{summary.width_mm} mm</dd></div>
                  <div><dt className="text-muted-foreground">Avance teórico</dt><dd className="font-black text-foreground">{estimatedMeters} m</dd></div>
                  <div><dt className="text-muted-foreground">Rollo nominal</dt><dd className="font-black text-foreground">{(summary.nominal_roll_length_mm / 1000).toFixed(1)} m</dd></div>
                  <div className="col-span-2"><dt className="text-muted-foreground">Etiquetas teóricas por rollo</dt><dd className="font-black text-foreground">{summary.theoretical_labels_per_roll}</dd></div>
                  <p className="col-span-2 border-t border-border pt-2 text-xs font-medium text-muted-foreground">
                    Estimación teórica: no incluye avances, calibración ni desperdicio del controlador y no garantiza el rendimiento real.
                  </p>
                </dl>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-bold text-foreground">Vista previa · {pageHeight} mm</p>
              {data ? (
                <div className="flex w-full max-w-[234px] flex-col items-center justify-between overflow-hidden bg-white px-[3mm] py-[1.7mm] text-black" style={{ aspectRatio: `62 / ${pageHeight}` }}>
                  <div className="text-center leading-none">
                    <p className="text-[9px] font-black">INTERPLAS MÉXICO</p>
                    <p className="mt-1 text-[7px] font-bold">TRACEFLOW MES</p>
                  </div>
                  <QRCodeSVG
                    value={data.preview.encoded_payload}
                    level="Q"
                    marginSize={4}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ width: `${(summary.qr_size_mm / summary.width_mm) * 100}%`, height: 'auto' }}
                  />
                  <p className="w-full break-all text-center font-mono text-[7px] font-bold leading-tight">{data.preview.qr_code}</p>
                </div>
              ) : (
                <div className="flex w-full max-w-[234px] items-center justify-center bg-white text-xs font-semibold text-slate-500" style={{ aspectRatio: `62 / ${pageHeight}` }}>
                  Se mostrará la etiqueta
                </div>
              )}
              <p className="text-center text-xs font-medium text-muted-foreground">La etiqueta queda negra sobre blanco; no cambia con el tema de la aplicación.</p>
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border bg-card p-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className="min-h-12 rounded-lg border border-border px-5 font-bold text-foreground hover:bg-muted">Cancelar</button>
          <button
            type="button"
            onClick={() => generatePdf.mutate()}
            disabled={!data || preview.isPending || preview.isError || generatePdf.isPending}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={18} />
            {generatePdf.isPending ? 'Generando PDF…' : <><Download size={17} /> Descargar PDF térmico</>}
          </button>
          {generatePdf.isError && <p role="alert" className="basis-full text-sm font-bold text-destructive">{errorMessage(generatePdf.error)}</p>}
        </footer>
      </section>
    </div>
  );
}
