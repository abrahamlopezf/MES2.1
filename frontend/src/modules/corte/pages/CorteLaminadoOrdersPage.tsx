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
type DemandOption = { id: number; code: string; name: string; output_pti_code?: string; output_product_name: string; eligible_rolls: EligibleRoll[] };
type CorteWipRoll = { id: number; roll_code: string; qr_code: string; output_pti_code?: string | null; product_name?: string | null; meters: number; weight_kg: number; loom?: { code: string } | null; bom?: { name: string; code: string } | null; next_allowed_stage: string };
type Order = { id: number; order_number: string; status: string; requested_at: string; requester: string; target_specification?: DemandOption | null; requested_roll_count?: number; pending_pickup_count?: number; compatible_available_rolls?: EligibleRoll[]; items: Array<{ id: number; status: string; roll: EligibleRoll | null }> };

const api = {
  options: async (): Promise<DemandOption[]> => (await axiosClient.get('/corte/laminado-demand-options')).data?.data ?? [],
  orders: async (): Promise<Order[]> => (await axiosClient.get('/corte/laminado-orders?include_closed=true')).data?.data ?? [],
  wip: async (): Promise<CorteWipRoll[]> => (await axiosClient.get('/corte/laminado-wip')).data?.data ?? [],
  create: async (payload: { specification_id: number; requested_roll_count: number }) => (await axiosClient.post('/corte/laminado-orders', payload)).data?.data,
  cancel: async (id: number) => (await axiosClient.post(`/corte/laminado-orders/${id}/cancel`)).data?.data,
};

export default function CorteLaminadoOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedSpecId, setSelectedSpecId] = useState<number | ''>('');
  const [requestedCount, setRequestedCount] = useState('');
  const [search, setSearch] = useState('');
  const optionsQuery = useQuery({ queryKey: ['corte-laminado-demand-options'], queryFn: api.options, refetchInterval: 12000 });
  const ordersQuery = useQuery({ queryKey: ['corte-laminado-orders'], queryFn: api.orders, refetchInterval: 12000 });
  const wipQuery = useQuery({ queryKey: ['corte-laminado-output-wip'], queryFn: api.wip, refetchInterval: 12000 });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['corte-laminado-demand-options'] }),
    queryClient.invalidateQueries({ queryKey: ['corte-laminado-orders'] }),
  ]);
  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { setRequestedCount(''); refresh(); } });
  const cancelMutation = useMutation({ mutationFn: api.cancel, onSuccess: refresh });
  const options = optionsQuery.data || [];
  const selectedSpec = options.find((spec) => spec.id === Number(selectedSpecId));
  const eligible = selectedSpec?.eligible_rolls || [];
  const orders = ordersQuery.data || [];
  const filtered = useMemo(() => eligible.filter((roll) => `${roll.roll_code} ${roll.qr_code} ${roll.loom?.code || ''} ${roll.bom?.name || ''}`.toLowerCase().includes(search.toLowerCase())), [eligible, search]);
  const error = createMutation.error || cancelMutation.error || optionsQuery.error || ordersQuery.error || wipQuery.error;
  const errorMessage = error instanceof Error ? error.message : '';

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><ClipboardList className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-bold">Solicitudes de PTI a Laminado</h1><p className="mt-1 max-w-2xl text-sm text-slate-300">Corte elige el producto y cuántos rollos necesita. El sistema propone rollos compatibles y Laminado confirma cada QR al recogerlos.</p></div>
        </div>
        <Button variant="outline" className="min-h-11" onClick={() => { optionsQuery.refetch(); ordersQuery.refetch(); }} disabled={optionsQuery.isFetching || ordersQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${optionsQuery.isFetching || ordersQuery.isFetching ? 'animate-spin' : ''}`} />Actualizar
        </Button>
      </header>

      {errorMessage && <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>}
      {createMutation.data?.order_number && <div role="status" className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">Orden {createMutation.data.order_number} creada para {createMutation.data.specification?.output_pti_code || 'el PTI seleccionado'}. Laminado ya puede consultarla.</div>}

      <section className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold">1. Solicita producto y cantidad</h2><p className="mt-1 text-sm text-slate-300">Laminado buscará los rollos compatibles en Telares y asociará cada uno al escanearlo. Puedes solicitar más de los disponibles hoy.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-200">PTI de Laminado<select value={selectedSpecId} onChange={(event) => { setSelectedSpecId(event.target.value ? Number(event.target.value) : ''); setRequestedCount(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3"><option value="">Selecciona producto</option>{options.map((spec) => <option key={spec.id} value={spec.id}>{spec.output_pti_code || spec.code} · {spec.output_product_name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-200">Rollos requeridos<Input type="number" min={1} max={500} value={requestedCount} onChange={(event) => setRequestedCount(event.target.value)} placeholder="N rollos" className="mt-1 min-h-11" /></label>
          <Button className="min-h-11" onClick={() => selectedSpecId && createMutation.mutate({ specification_id: Number(selectedSpecId), requested_roll_count: Number(requestedCount) })} disabled={!selectedSpecId || !Number.isInteger(Number(requestedCount)) || Number(requestedCount) < 1 || Number(requestedCount) > 500 || createMutation.isPending}>{createMutation.isPending ? 'Creando…' : `Crear solicitud${requestedCount ? ` · ${requestedCount}` : ''}`}</Button>
        </div>
        {optionsQuery.isLoading ? <p className="p-8 text-center text-slate-400">Consultando catálogo y rollos compatibles…</p> : !selectedSpecId ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">Selecciona un PTI para consultar disponibilidad compatible.</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">No hay rollos compatibles disponibles ahora. Puedes crear la solicitud; Laminado la atenderá cuando localice disponibilidad.</div>
        ) : (
          <>
          <div className="mt-4 mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold text-slate-200">Disponibilidad compatible</h3><span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-bold text-blue-200">{eligible.length} rollo(s) localizado(s)</span></div>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-800 text-xs uppercase text-slate-300"><tr><th className="p-3">Ubicación disponible</th><th className="p-3">Rollo / QR</th><th className="p-3">Telar</th><th className="p-3">Producto base</th><th className="p-3">Cantidad</th><th className="p-3">Ruta</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{filtered.map((roll) => <tr key={roll.id} className="hover:bg-slate-800/50">
                <td className="p-3 text-emerald-200">Telares · {roll.loom?.code || 'Telar por confirmar'}</td>
                <td className="p-3"><strong className="block font-mono">{roll.roll_code}</strong><span className="text-xs text-slate-400">{roll.qr_code}</span></td>
                <td className="p-3">{roll.loom?.code || '—'}</td><td className="p-3">{roll.bom?.name || roll.bom?.code || '—'}</td>
                <td className="p-3 font-mono">{roll.meters} m · {roll.weight_kg} kg</td><td className="p-3 text-slate-300">{roll.route?.join(' → ')}</td>
              </tr>)}</tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <h2 className="mb-1 text-lg font-bold">Órdenes y seguimiento</h2><p className="mb-4 text-sm text-slate-300">Consulta solicitudes y recogidas anteriores. La orden registra la demanda; Laminado asigna cada rollo y transfiere su custodia al escanear el QR.</p>
        {ordersQuery.isLoading ? <p className="p-8 text-center text-slate-400">Cargando órdenes…</p> : orders.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">Todavía no hay solicitudes a Laminado.</div> : <div className="space-y-3">
          {orders.map((order) => <article key={order.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-mono font-bold text-blue-300">{order.order_number}</h3><p className="text-xs text-slate-400">Solicitó {order.requester} · {new Date(order.requested_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${['PICKED', 'PROCESSED'].includes(order.status) ? 'bg-emerald-500/15 text-emerald-200' : order.status.includes('CANCELLED') ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/15 text-amber-200'}`}>{({ REQUESTED: 'Solicitada', PARTIALLY_PICKED: 'Recogida parcial', PICKED: 'Recogida completa', PROCESSED: 'Completada · entregada a Corte', CANCELLED: 'Cancelada', PARTIALLY_CANCELLED: 'Pendientes cancelados' } as Record<string, string>)[order.status] || order.status}</span></div>
            {order.target_specification && <p className="mt-2 text-sm text-slate-300">PTI: <strong>{order.target_specification.output_pti_code || order.target_specification.code}</strong> · {order.requested_roll_count || order.items.length} rollo(s)</p>}
            <ul className="mt-3 divide-y divide-slate-800">{order.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><strong>{item.roll?.roll_code || 'Rollo por asignar al escanear'}</strong><span className="ml-2 text-xs text-slate-400">{item.roll?.qr_code}</span></span><span className={item.status === 'PICKED' || item.status === 'PROCESSED' ? 'text-emerald-300' : item.status === 'CANCELLED' ? 'text-slate-400' : 'text-amber-200'}>{({ REQUESTED: 'Pendiente de recogida', PICKED: 'Recogido por Laminado', PROCESSED: 'Procesado en Laminado', CANCELLED: 'Cancelado · permanece en Telares' } as Record<string, string>)[item.status] || item.status}</span></li>)}</ul>
            {['REQUESTED', 'PARTIALLY_PICKED'].includes(order.status) && <Button variant="outline" size="sm" className="mt-3 min-h-10 text-rose-200" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(order.id)}><X className="mr-1 h-4 w-4" />Cancelar rollos pendientes</Button>}
          </article>)}
        </div>}
      </section>

      <section className="mt-7 rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 sm:p-5">
        <h2 className="text-lg font-bold">WIP recibido de Laminado</h2>
        <p className="mb-4 text-sm text-slate-300">Los rollos aparecen aquí después de terminar Laminado y transferir su QR a la custodia de Corte.</p>
        {wipQuery.isLoading ? <p className="p-6 text-center text-slate-400">Consultando WIP de Corte…</p> : (wipQuery.data || []).length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-300">Todavía no hay rollos laminados recibidos por Corte.</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{wipQuery.data?.map((roll) => <article key={roll.id} className="rounded-xl border border-emerald-500/20 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-mono font-bold text-emerald-200">{roll.roll_code}</p><p className="mt-1 break-all text-xs text-slate-400">QR: {roll.qr_code}</p></div><span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">En Corte</span></div><p className="mt-3 text-sm font-semibold">{roll.output_pti_code || roll.product_name || roll.bom?.name || 'PTI laminado'}</p><p className="mt-1 text-xs text-slate-300">Origen: Telar {roll.loom?.code || '—'}</p><p className="mt-2 font-mono text-sm text-slate-200">{roll.meters} m · {roll.weight_kg} kg</p></article>)}</div>}
      </section>
    </main>
  );
}
