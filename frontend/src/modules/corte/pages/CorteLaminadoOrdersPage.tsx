import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, RefreshCw, Search, X } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import axiosClient from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/authStore';
import { LaminadoCutTransferPanel } from '../../../shared/components/wip/LaminadoCutTransferPanel';

type EligibleRoll = {
  id: number; roll_code: string; qr_code: string; meters: number; weight_kg: number;
  route: string[]; loom?: { code: string; name: string } | null; bom?: { code: string; name: string } | null;
};
type DemandOption = { id: number; code: string; name: string; output_pti_code?: string; output_product_name: string; eligible_rolls: EligibleRoll[] };
type CorteWipRoll = { id: number; roll_code: string; qr_code: string; output_pti_code?: string | null; product_name?: string | null; meters: number; weight_kg: number; loom?: { code: string } | null; bom?: { name: string; code: string } | null; next_allowed_stage: string };
type Order = { id: number; order_number: string; status: string; requested_at: string; requester: string; target_specification?: DemandOption | null; requested_roll_count?: number; pending_pickup_count?: number; compatible_available_rolls?: EligibleRoll[]; items: Array<{ id: number; status: string; roll: EligibleRoll | null }> };

const api = {
  options: async (destination: string): Promise<DemandOption[]> => (await axiosClient.get('/corte/process-demand-options', { params: { destination_area_code: destination } })).data?.data ?? [],
  orders: async (): Promise<Order[]> => (await axiosClient.get('/corte/process-orders?include_closed=true')).data?.data ?? [],
  wip: async (): Promise<CorteWipRoll[]> => (await axiosClient.get('/corte/laminado-wip')).data?.data ?? [],
  create: async (payload: { destination_area_code: string; specification_id: number; requested_roll_count: number; is_urgent?: boolean; urgent_reason?: string }) => (await axiosClient.post('/corte/process-orders', payload)).data?.data,
  cancel: async (id: number) => (await axiosClient.post(`/corte/laminado-orders/${id}/cancel`)).data?.data,
};

export default function CorteLaminadoOrdersPage() {
  const { user } = useAuthStore();
  const roleCode = String((user as any)?.role?.code || (typeof (user as any)?.role === 'string' ? (user as any).role : '')).toUpperCase();
  const canMarkUrgent = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_CORTE', 'SUPERVISOR_CORTE'].includes(roleCode);
  const queryClient = useQueryClient();
  const [destinationArea, setDestinationArea] = useState<'LAMINADO' | 'GLOBO'>('LAMINADO');
  const [selectedSpecId, setSelectedSpecId] = useState<number | ''>('');
  const [requestedCount, setRequestedCount] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState('');
  const [search, setSearch] = useState('');
  const optionsQuery = useQuery({ queryKey: ['corte-process-demand-options', destinationArea], queryFn: () => api.options(destinationArea), refetchInterval: 12000 });
  const ordersQuery = useQuery({ queryKey: ['corte-laminado-orders'], queryFn: api.orders, refetchInterval: 12000 });
  const wipQuery = useQuery({ queryKey: ['corte-laminado-output-wip'], queryFn: api.wip, refetchInterval: 12000 });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['corte-process-demand-options'] }),
    queryClient.invalidateQueries({ queryKey: ['corte-laminado-orders'] }),
  ]);
  const createMutation = useMutation({ mutationFn: api.create, onSuccess: () => { setRequestedCount(''); setIsUrgent(false); setUrgentReason(''); refresh(); } });
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
          <div><h1 className="text-2xl font-bold">Solicitudes de rollos a procesos</h1><p className="mt-1 max-w-2xl text-sm text-slate-300">Corte solicita rollos a Laminado o Liner/Globo. La recogida se agrupa por viaje y sigue FIFO entre las órdenes pendientes.</p></div>
        </div>
        <Button variant="outline" className="min-h-11" onClick={() => { optionsQuery.refetch(); ordersQuery.refetch(); }} disabled={optionsQuery.isFetching || ordersQuery.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${optionsQuery.isFetching || ordersQuery.isFetching ? 'animate-spin' : ''}`} />Actualizar
        </Button>
      </header>

      {errorMessage && <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-200">{errorMessage}</div>}
      {createMutation.data?.order_number && <div role="status" className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">Orden {createMutation.data.order_number} creada para {createMutation.data.specification?.output_pti_code || 'el PTI seleccionado'} · {createMutation.data.destination_area_code}.</div>}

      <div className="mb-7">
        <LaminadoCutTransferPanel mode="receive" onChanged={() => { ordersQuery.refetch(); wipQuery.refetch(); }} />
      </div>

      <section className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-bold">1. Solicita producto y cantidad</h2><p className="mt-1 text-sm text-slate-300">El proceso receptor recogerá rollos compatibles desde Telares y confirmará su QR. Puedes pedir más de lo disponible hoy.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_180px_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-200">Proceso destino<select value={destinationArea} onChange={(event) => { setDestinationArea(event.target.value as 'LAMINADO' | 'GLOBO'); setSelectedSpecId(''); setRequestedCount(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3"><option value="LAMINADO">Laminado</option><option value="GLOBO">Liner / Globo</option></select></label>
          <label className="text-sm font-semibold text-slate-200">PTI requerido<select value={selectedSpecId} onChange={(event) => { setSelectedSpecId(event.target.value ? Number(event.target.value) : ''); setRequestedCount(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3"><option value="">Selecciona producto</option>{options.map((spec) => <option key={spec.id} value={spec.id}>{spec.output_pti_code || spec.code} · {spec.output_product_name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-200">Rollos requeridos<Input type="number" min={1} max={500} value={requestedCount} onChange={(event) => setRequestedCount(event.target.value)} placeholder="N rollos" className="mt-1 min-h-11" /></label>
          <Button className="min-h-11" onClick={() => selectedSpecId && createMutation.mutate({ destination_area_code: destinationArea, specification_id: Number(selectedSpecId), requested_roll_count: Number(requestedCount), is_urgent: isUrgent, urgent_reason: urgentReason })} disabled={!selectedSpecId || !Number.isInteger(Number(requestedCount)) || Number(requestedCount) < 1 || Number(requestedCount) > 500 || (isUrgent && !urgentReason.trim()) || createMutation.isPending}>{createMutation.isPending ? 'Creando…' : `Crear solicitud${requestedCount ? ` · ${requestedCount}` : ''}`}</Button>
        </div>
        <div className="mt-3 grid gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          {canMarkUrgent && <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={isUrgent} onChange={(event) => setIsUrgent(event.target.checked)} /> Marcar como urgente</label>}
          {canMarkUrgent && isUrgent && <Input value={urgentReason} onChange={(event) => setUrgentReason(event.target.value)} placeholder="Motivo obligatorio para adelantar esta orden" className="min-h-11" />}
          <p className="text-xs text-slate-400 sm:col-span-2">{canMarkUrgent ? 'La prioridad urgente requiere motivo y queda auditada. Las demás órdenes mantienen FIFO y los rollos deben ser compatibles con el PTI.' : 'La orden sigue FIFO y solo admite rollos compatibles con el PTI.'}</p>
        </div>
        {optionsQuery.isLoading ? <p className="p-8 text-center text-slate-400">Consultando catálogo y rollos compatibles…</p> : !selectedSpecId ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">Selecciona un PTI para consultar disponibilidad compatible.</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">No hay rollos compatibles disponibles ahora. Puedes crear la solicitud; el área destino la atenderá cuando haya disponibilidad.</div>
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
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-mono font-bold text-blue-300">{order.order_number}</h3><p className="text-xs text-slate-400">Solicitó {order.requester} · {new Date(order.requested_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${['PICKED', 'PROCESSED'].includes(order.status) ? 'bg-emerald-500/15 text-emerald-200' : order.status.includes('CANCELLED') ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/15 text-amber-200'}`}>{({ REQUESTED: 'Solicitada', PARTIALLY_PICKED: 'Recogida parcial', PICKED: 'Recogida completa', AWAITING_DISPATCH: 'Pendiente de salida a Corte', IN_TRANSIT: 'En tránsito a Corte', PROCESSED: 'Entregada a Corte', CANCELLED: 'Cancelada', PARTIALLY_CANCELLED: 'Pendientes cancelados' } as Record<string, string>)[order.status] || order.status}</span></div>
            {order.target_specification && <p className="mt-2 text-sm text-slate-300">PTI: <strong>{order.target_specification.output_pti_code || order.target_specification.code}</strong> · {order.requested_roll_count || order.items.length} rollo(s)</p>}
            <ul className="mt-3 divide-y divide-slate-800">{order.items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><strong>{item.roll?.roll_code || 'Rollo por asignar al escanear'}</strong><span className="ml-2 text-xs text-slate-400">{item.roll?.qr_code}</span></span><span className={['PICKED', 'PROCESSED', 'RECEIVED'].includes(item.status) ? 'text-emerald-300' : item.status === 'CANCELLED' ? 'text-slate-400' : 'text-amber-200'}>{({ REQUESTED: 'Pendiente de recogida', PICKED: 'Recogido por Laminado', AWAITING_DISPATCH: 'Laminado listo · pendiente confirmar salida', IN_TRANSIT: 'Salida confirmada · pendiente recepción de Corte', RECEIVED: 'Recibido en Corte', PROCESSED: 'Procesado en Laminado', CANCELLED: 'Cancelado · permanece en Telares' } as Record<string, string>)[item.status] || item.status}</span></li>)}</ul>
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
