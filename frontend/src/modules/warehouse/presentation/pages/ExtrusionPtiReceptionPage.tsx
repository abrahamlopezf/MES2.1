import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, RefreshCw, ShieldCheck } from '@/design-system/components/Icon/googleIconCompat';
import { toast } from 'sonner';
import axiosClient from '../../../../api/axiosClient';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Transfer = {
  id: number;
  transfer_code: string;
  quantity_pieces: number | string;
  quantity_kg: number | string;
  material_quantity: number | string;
  material_unit_code: string;
  unit_cost: number | string;
  total_cost: number | string;
  material?: { name?: string; description?: string; default_location_id?: number | null };
  sourceRack?: { rack_code?: string };
  ptiProduct?: { code?: string; name?: string; color?: string };
};

export const ExtrusionPtiReceptionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = React.useState('');
  const [selectedLocationId, setSelectedLocationId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lastResult, setLastResult] = React.useState<any>(null);

  const { data: transfers = [], isLoading, refetch, isFetching } = useQuery<Transfer[]>({
    queryKey: ['warehouse', 'pti-extrusion-transfers', 'pending'],
    queryFn: async () => (await axiosClient.get('/warehouse/pti-extrusion-transfers/pending')).data.data,
    refetchInterval: 5000,
  });
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['materials', 'locations'],
    queryFn: async () => (await axiosClient.get('/locations?pageSize=all')).data.data,
  });
  const receiveMutation = useMutation({
    mutationFn: async () => (await axiosClient.post('/warehouse/pti-extrusion-transfers/receive', {
      qr_code: qrCode.trim(),
      location_id: selectedLocationId ? Number(selectedLocationId) : undefined,
      notes: notes.trim() || undefined,
    })).data.data,
    onSuccess: (result) => {
      setLastResult(result);
      setQrCode('');
      setNotes('');
      toast.success(`Transferencia ${result.transfer_code} recibida y registrada en inventario.`);
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'pti-extrusion-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'No se pudo confirmar la recepción.'),
  });

  const matchingTransfer = transfers.find((item) => item.transfer_code.toUpperCase() === qrCode.trim().toUpperCase());
  React.useEffect(() => {
    setSelectedLocationId(String(matchingTransfer?.material?.default_location_id || ''));
  }, [matchingTransfer?.id]);
  const getMaterialLabel = (transfer: Transfer) => transfer.material?.name || transfer.material?.description || transfer.ptiProduct?.name || 'PTI sin descripción';

  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
      <div><p className="text-xs font-black uppercase tracking-widest text-primary">Almacén · Recepción entre áreas</p><h1 className="mt-1 text-2xl font-black">Recepción de PTI de Extrusión</h1><p className="mt-1 text-sm text-muted-foreground">Escanea el QR de transferencia y confirma la cantidad y costo enviados por Extrusión.</p></div>
      <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Actualizar</Button>
    </header>

    {lastResult && <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200"><b>Recepción confirmada:</b> {lastResult.transfer_code} · {lastResult.material_quantity} {lastResult.unit} · Lote #{lastResult.lote_id} · inventario actualizado.</section>}

    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-black">Confirmar QR de transferencia</h2></div>
        <p className="text-sm text-muted-foreground">La recepción agrega un lote y registra el movimiento de inventario dentro de una sola transacción. Un QR ya recibido no puede volver a sumarse.</p>
        <div className="flex gap-2"><Input value={qrCode} onChange={(event) => setQrCode(event.target.value.toUpperCase())} placeholder="EXT-ALM-…" className="font-mono"/><QrScannerButton title="Escanear QR de transferencia de Extrusión" onScan={(value) => setQrCode(value.trim().toUpperCase())} disabled={receiveMutation.isPending} /></div>
        {matchingTransfer && <div className="space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"><div className="font-black">{getMaterialLabel(matchingTransfer)} · {matchingTransfer.ptiProduct?.code}</div><div>Origen: {matchingTransfer.sourceRack?.rack_code} · Color: {matchingTransfer.ptiProduct?.color || 's/d'}</div><div>Transferido: <b>{matchingTransfer.quantity_pieces} piezas / {matchingTransfer.quantity_kg} kg</b></div><div>Entrada de inventario: <b>{matchingTransfer.material_quantity} {matchingTransfer.material_unit_code}</b></div><div>Folio: {matchingTransfer.transfer_code}</div></div>}
        <div className="space-y-1"><label className="text-sm font-bold">Ubicación de Almacén</label><select className="h-11 w-full rounded-md border border-input bg-background px-3" value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}><option value="">Usar ubicación predeterminada del material</option>{locations.map((location: any) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></div>
        <div className="space-y-1"><label className="text-sm font-bold">Observaciones (opcional)</label><Input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></div>
        <Button className="w-full" onClick={() => receiveMutation.mutate()} disabled={!qrCode.trim() || receiveMutation.isPending}><ArrowDownToLine className="mr-2 h-4 w-4" />{receiveMutation.isPending ? 'Confirmando…' : 'Confirmar recepción en Almacén'}</Button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Pendientes de recepción</h2><span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-200">{transfers.length}</span></div>{isLoading ? <p className="text-sm text-muted-foreground">Cargando transferencias…</p> : transfers.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No hay PTI pendiente de recibir.</p> : <div className="max-h-[32rem] space-y-3 overflow-y-auto">{transfers.map((transfer) => <button key={transfer.id} type="button" onClick={() => { setQrCode(transfer.transfer_code); setSelectedLocationId(String(transfer.material?.default_location_id || '')); }} className="w-full rounded-xl border border-border p-4 text-left transition hover:border-primary/60"><div className="flex justify-between gap-2"><b>{getMaterialLabel(transfer)}</b><span className="text-xs text-amber-300">PENDIENTE</span></div><div className="mt-1 text-xs text-muted-foreground">{transfer.transfer_code} · {transfer.sourceRack?.rack_code}</div><div className="mt-2 text-sm font-semibold">{transfer.quantity_pieces} pzas · {transfer.quantity_kg} kg</div></button>)}</div>}</div>
    </section>
  </main>;
};

export default ExtrusionPtiReceptionPage;
