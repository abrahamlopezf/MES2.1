import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck } from '@/design-system/components/Icon/googleIconCompat';
import { QrScannerButton } from '../scan/QrScannerButton';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import axiosClient from '../../../api/axiosClient';

interface Props { area: 'LAMINADO' | 'GLOBO'; onReceived?: () => void; }
interface Order { id: number; order_number: string; status: string; destination_area_code: string; is_urgent: boolean; urgent_reason?: string; requested_at: string; requester: string; requested_roll_count: number; pending_pickup_count: number; target_specification?: { output_pti_code?: string; code?: string; output_product_name?: string } | null; }

export const CorteProcessPickupPanel: React.FC<Props> = ({ area, onReceived }) => {
  const [qr, setQr] = useState('');
  const [recent, setRecent] = useState<Array<{ roll_code: string; order_number: string; at: string }>>([]);
  const ordersQuery = useQuery({
    queryKey: ['corte-process-orders', area],
    queryFn: async () => (await axiosClient.get('/corte/process-orders', { params: { destination_area_code: area } })).data?.data || [],
    refetchInterval: 10000,
  });
  const pickup = useMutation({
    mutationFn: async (qr_code: string) => (await axiosClient.post('/corte/process-pickup-scan', { qr_code })).data?.data,
    onSuccess: (data) => {
      setRecent((current) => [{ roll_code: data.roll?.roll_code || 'Rollo recibido', order_number: data.order_number, at: new Date().toLocaleTimeString() }, ...current].slice(0, 12));
      setQr('');
      toast.success(data.message || `Rollo recibido en ${area}.`);
      ordersQuery.refetch();
      onReceived?.();
    },
  });
  const orders: Order[] = ordersQuery.data || [];
  const pending = orders.filter((order) => ['REQUESTED', 'PARTIALLY_PICKED'].includes(order.status));
  const submit = (value = qr) => {
    const clean = value.trim();
    if (!clean || pickup.isPending) return;
    pickup.mutate(clean);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-blue-500/30 bg-slate-900 p-4 sm:p-5" aria-label={`Recogida FIFO para ${area}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Recoger rollos de Telares · FIFO</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">Escanea en una sola vuelta los rollos de las órdenes pendientes. Cada QR se asigna a la orden compatible más antigua; recogerlo lo mueve al WIP de {area}, pero no inicia ni consume el proceso.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />Actualizar cola
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <label className="text-sm font-semibold text-slate-200">Escanea QR de un rollo asignado a una orden de {area}
          <Input value={qr} onChange={(event) => setQr(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }} autoComplete="off" placeholder="Escanea el QR viajero en Telares" className="mt-1 min-h-12 font-mono" />
        </label>
        <QrScannerButton title="Escanear QR de rollo en Telares" onScan={(value) => submit(value)} />
        <Button type="button" className="min-h-12" disabled={!qr.trim() || pickup.isPending} onClick={() => submit()}>{pickup.isPending ? 'Validando FIFO…' : 'Confirmar recogida'}</Button>
      </div>
      {pickup.error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{pickup.error instanceof Error ? pickup.error.message : 'El QR no pudo asignarse a una orden compatible.'}</div>}
      {ordersQuery.error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">No se pudo cargar la cola de órdenes de Corte.</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Órdenes pendientes</h3><span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200">{pending.length}</span></div>
          {ordersQuery.isLoading ? <p className="p-4 text-sm text-slate-400">Cargando cola…</p> : pending.length === 0 ? <p className="p-4 text-sm text-slate-400">No hay órdenes pendientes de recogida.</p> : <ol className="space-y-2">{pending.map((order, index) => <li key={order.id} className="flex gap-3 rounded-lg border border-slate-800 p-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${order.is_urgent ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'}`}>{order.is_urgent ? '!' : index + 1}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-blue-200">{order.order_number}</strong>{order.is_urgent && <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-rose-200">Urgente</span>}</div><p className="mt-1 text-sm text-slate-200">{order.target_specification?.output_pti_code || order.target_specification?.code || 'PTI'} · {order.target_specification?.output_product_name || area}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />{new Date(order.requested_at).toLocaleString()} · faltan {order.pending_pickup_count} / {order.requested_roll_count}</p>{order.is_urgent && order.urgent_reason && <p className="mt-1 text-xs text-rose-200">Motivo: {order.urgent_reason}</p>}</div>
          </li>)}</ol>}
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3">
          <div className="mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><h3 className="font-bold">Rollos recogidos en esta vuelta</h3></div>
          {recent.length === 0 ? <p className="p-4 text-sm text-slate-400">Los QR confirmados aparecerán aquí.</p> : <ul className="divide-y divide-emerald-900/60">{recent.map((item, index) => <li key={`${item.roll_code}-${index}`} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0"><strong className="block truncate font-mono text-emerald-100">{item.roll_code}</strong><span className="text-xs text-slate-400">{item.order_number} · {item.at}</span></span><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /></li>)}</ul>}
        </div>
      </div>
    </section>
  );
};
