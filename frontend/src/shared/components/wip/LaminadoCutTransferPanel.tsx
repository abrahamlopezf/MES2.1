import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, RefreshCw, Truck } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { QrScannerButton } from '../scan/QrScannerButton';
import axiosClient from '../../../api/axiosClient';

type TransferItem = {
  id: number;
  status: string;
  dispatched_at?: string | null;
  received_at?: string | null;
  roll?: { id: number; roll_code: string; qr_code: string; meters: number; weight_kg: number } | null;
};
type TransferOrder = { id: number; order_number: string; status: string; items: TransferItem[] };

interface Props { mode: 'dispatch' | 'receive'; onChanged?: () => void; }

export const LaminadoCutTransferPanel: React.FC<Props> = ({ mode, onChanged }) => {
  const [qr, setQr] = useState('');
  const queryClient = useQueryClient();
  const dispatchMode = mode === 'dispatch';
  const query = useQuery({
    queryKey: ['laminado-cut-output-transfers'],
    queryFn: async (): Promise<TransferOrder[]> => (await axiosClient.get('/corte/laminado-output-transfers')).data?.data || [],
    refetchInterval: 10000,
  });
  const mutation = useMutation({
    mutationFn: async (qr_code: string) => (await axiosClient.post(
      dispatchMode ? '/corte/laminado-output-dispatch-scan' : '/corte/laminado-output-receive-scan',
      { qr_code },
    )).data?.data,
    onSuccess: async () => {
      setQr('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['laminado-cut-output-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['laminado-corte-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['laminado-wip-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['corte-laminado-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['corte-laminado-output-wip'] }),
      ]);
      onChanged?.();
    },
  });
  const queuedItems = useMemo(() => (query.data || []).flatMap((order) => order.items
    .filter((item) => item.status === (dispatchMode ? 'AWAITING_DISPATCH' : 'IN_TRANSIT'))
    .map((item) => ({ ...item, order_number: order.order_number }))), [query.data, dispatchMode]);
  const submit = (value = qr) => {
    const clean = value.trim();
    if (clean && !mutation.isPending) mutation.mutate(clean);
  };

  return (
    <section aria-label={dispatchMode ? 'Despacho de Laminado a Corte' : 'Recepción de Laminado en Corte'} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
            {dispatchMode ? <Truck className="h-5 w-5 text-amber-300" /> : <CheckCircle2 className="h-5 w-5 text-emerald-300" />}
            {dispatchMode ? 'Salida confirmada hacia Corte' : 'Recepción de rollos en Corte'}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            {dispatchMode
              ? 'Al entregar físicamente el rollo, escanea su QR para registrar la salida. Corte deberá escanear el mismo código para aceptar la recepción.'
              : 'Confirma la recepción únicamente cuando el rollo haya llegado físicamente. El escaneo mueve su custodia al WIP de Corte.'}
          </p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Actualizar
        </Button>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <label className="text-sm font-semibold text-slate-200">{dispatchMode ? 'QR del rollo que sale de Laminado' : 'QR del rollo que recibe Corte'}
          <Input value={qr} onChange={(event) => setQr(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }} autoComplete="off" placeholder="Escanea o captura el QR viajero" className="mt-1 min-h-12 font-mono" />
        </label>
        <QrScannerButton title="Escanear QR de transferencia Laminado a Corte" onScan={(value) => submit(value)} />
        <Button type="button" className="min-h-12" disabled={!qr.trim() || mutation.isPending} onClick={() => submit()}>
          {mutation.isPending ? 'Confirmando…' : dispatchMode ? 'Confirmar salida' : 'Confirmar recepción'}
        </Button>
      </div>
      {mutation.error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{mutation.error instanceof Error ? mutation.error.message : 'No se pudo confirmar la transferencia.'}</div>}
      {mutation.data?.message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200">{mutation.data.message}</div>}
      {query.error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">No se pudo consultar el estado de los rollos pendientes.</div>}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-100">{dispatchMode ? 'Pendientes de salida' : 'En tránsito · pendiente de recepción'}</h3><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">{queuedItems.length}</span></div>
        {query.isLoading ? <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">Consultando transferencias…</p> : queuedItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">{dispatchMode ? 'No hay rollos laminados pendientes de despacho a Corte.' : 'No hay rollos en tránsito pendientes de recepción.'}</p>
        ) : <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 px-3">{queuedItems.map((item) => <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0"><strong className="block break-all font-mono text-slate-100">{item.roll?.roll_code || 'Rollo'}</strong><span className="break-all text-xs text-slate-400">QR: {item.roll?.qr_code || '—'} · Orden {item.order_number}</span></div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-300"><span>{item.roll?.meters ?? '—'} m · {item.roll?.weight_kg ?? '—'} kg</span><ArrowRight className="h-4 w-4 text-slate-500" /><span className={dispatchMode ? 'text-amber-200' : 'text-blue-200'}>{dispatchMode ? 'Listo para salir' : 'Esperando Corte'}</span></div>
        </li>)}</ul>}
      </div>
    </section>
  );
};
