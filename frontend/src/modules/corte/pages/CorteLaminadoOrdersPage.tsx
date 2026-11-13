import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, RefreshCw, Search, X } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import axiosClient from '../../../api/axiosClient';

type EligibleRoll = {
  id: number; roll_code: string; qr_code: string; meters: number; weight_kg: number;
  route: string[]; loom?: { code: string; name: string } | null; bom?: { code: string; name: string } | null;
};
type Order = { id: number; order_number: string; status: string; requested_at: string; requester: string; items: Array<{ id: number; status: string; roll: EligibleRoll | null }> };

const api = {
  eligible: async (): Promise<EligibleRoll[]> => (await axiosClient.get('/corte/laminado-eligible-rolls')).data?.data ?? [],
  orders: async (): Promise<Order[]> => (await axiosClient.get('/corte/laminado-orders?include_closed=true')).data?.data ?? [],
  create: async (roll_ids: number[]) => (await axiosClient.post('/corte/laminado-orders', { roll_ids })).data?.data,
  cancel: async (id: number) => (await axiosClient.post(`/corte/laminado-orders/${id}/cancel`)).data?.data,
};

export default function CorteLaminadoOrdersPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const eligibleQuery = useQuery({ queryKey: ['corte-laminado-eligible'], queryFn: api.eligible, refetchInterval: 12000 });
  const ordersQuery = useQuery({ queryKey: ['corte-laminado-orders'], queryFn: api.orders, refetchInterval: 12000 });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['corte-laminado-eligible'] }),
    queryClient.invalidateQueries({ queryKey: ['corte-laminado-orders'] }),
  ]);
  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { setSelected([]); refresh(); } });
  const cancelMutation = useMutation({ mutationFn: api.cancel, onSuccess: refresh });
  const eligible = eligibleQuery.data || [];
  const orders = ordersQuery.data || [];
  const filtered = useMemo(() => eligible.filter((roll) => `${roll.roll_code} ${roll.qr_code} ${roll.loom?.code || ''} ${roll.bom?.name || ''}`.toLowerCase().includes(search.toLowerCase())), [eligible, search]);
  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  const error = createMutation.error || cancelMutation.error || eligibleQuery.error || ordersQuery.error;
  const errorMessage = error instanceof Error ? error.message : '';

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><ClipboardList className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-bold">Solicitudes de Corte a Laminado</h1><p className="mt-1 max-w-2xl text-sm text-slate-300">Corte selecciona los rollos autorizados. La orden reserva sus QRs; Laminado confirma la recogida física en Telares.</p></div>
        </div>
        <Button variant="outline" className="min-h-11" onClick={() => { eligibleQuery.refetch(); ordersQuery.refetch(); }} disabled={eligibleQuery.isFetching || ordersQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${eligibleQuery.isFetching || ordersQuery.isFetching ? 'animate-spin' : ''}`} />Actualizar
        </Button>
      </header>

      {errorMessage && <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>}
      {createMutation.data?.order_number && <div role="status" className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">Orden {createMutation.data.order_number} creada. Laminado ya puede verla en su cola de recogida.</div>}

      <section className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold">Rollos disponibles para solicitar</h2><p className="mt-1 text-sm text-slate-300">Solo aparecen rollos en Telares con Laminado en su ruta y sin otra orden abierta.</p></div>
          <div className="flex w-full gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-64"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar QR, rollo o telar" className="min-h-11 pl-9" /></label>
            <Button className="min-h-11 shrink-0" onClick={() => createMutation.mutate(selected)} disabled={!selected.length || createMutation.isPending}>
              {createMutation.isPending ? 'Creando…' : `Solicitar ${selected.length || ''} rollo${selected.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
        {eligibleQuery.isLoading ? <p className="p-8 text-center text-slate-400">Consultando rollos de Telares…</p> : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">No hay rollos disponibles para solicitar. Revisa la ficha técnica y el estado de las órdenes existentes.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-800 text-xs uppercase text-slate-300"><tr><th className="p-3">Elegir</th><th className="p-3">Rollo / QR</th><th className="p-3">Telar</th><th className="p-3">Producto</th><th className="p-3">Cantidad</th><th className="p-3">Ruta</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{filtered.map((roll) => <tr key={roll.id} className="hover:bg-slate-800/50">
                <td className="p-3"><input aria-label={`Seleccionar ${roll.roll_code}`} type="checkbox" checked={selected.includes(roll.id)} onChange={() => toggle(roll.id)} className="h-5 w-5 accent-blue-500" /></td>
                <td className="p-3"><strong className="block font-mono">{roll.roll_code}</strong><span className="text-xs text-slate-400">{roll.qr_code}</span></td>
                <td className="p-3">{roll.loom?.code || '—'}</td><td className="p-3">{roll.bom?.name || roll.bom?.code || '—'}</td>
                <td className="p-3 font-mono">{roll.meters} m · {roll.weight_kg} kg</td><td className="p-3 text-slate-300">{roll.route?.join(' → ')}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-bold">Órdenes y seguimiento</h2><p className="mb-4 text-sm text-slate-300">Consulta solicitudes abiertas y recogidas anteriores. Las órdenes pendientes reservan sus rollos para evitar duplicados.</p>
        {ordersQuery.isLoading ? <p className="p-8 text-center text-slate-400">Cargando órdenes…</p> : orders.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">Todavía no hay solicitudes a Laminado.</div> : <div className="space-y-3">
          {orders.map((order) => <article key={order.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-mono font-bold text-blue-300">{order.order_number}</h3><p className="text-xs text-slate-400">Solicitó {order.requester} · {new Date(order.requested_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'PICKED' ? 'bg-emerald-500/15 text-emerald-200' : order.status.includes('CANCELLED') ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/15 text-amber-200'}`}>{({ REQUESTED: 'Solicitada', PARTIALLY_PICKED: 'Recogida parcial', PICKED: 'Recogida completa', CANCELLED: 'Cancelada', PARTIALLY_CANCELLED: 'Pendientes cancelados' } as Record<string, string>)[order.status] || order.status}</span></div>
            <ul className="mt-3 divide-y divide-slate-800">{order.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><strong>{item.roll?.roll_code || 'Rollo'}</strong><span className="ml-2 text-xs text-slate-400">{item.roll?.qr_code}</span></span><span className={item.status === 'PICKED' || item.status === 'PROCESSED' ? 'text-emerald-300' : item.status === 'CANCELLED' ? 'text-slate-400' : 'text-amber-200'}>{({ REQUESTED: 'Pendiente de recogida', PICKED: 'Recogido por Laminado', PROCESSED: 'Procesado en Laminado', CANCELLED: 'Cancelado · permanece en Telares' } as Record<string, string>)[item.status] || item.status}</span></li>)}</ul>
            {['REQUESTED', 'PARTIALLY_PICKED'].includes(order.status) && <Button variant="outline" size="sm" className="mt-3 min-h-10 text-rose-200" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(order.id)}><X className="mr-1 h-4 w-4" />Cancelar rollos pendientes</Button>}
          </article>)}
        </div>}
      </section>
    </main>
  );
}
