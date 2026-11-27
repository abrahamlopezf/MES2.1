import React, { useMemo, useState } from 'react';
import { getUserAreaCode } from '../../../../utils/authHelpers';
import { useAuthStore } from '../../../../store/authStore';
import {
  AvailableQrCode,
  QrIdentityRequest,
  useAvailableQrCodesQuery,
  useCreateIdentityRequestMutation,
  useFulfillIdentityRequestMutation,
  useIdentityRequestsQuery,
} from '../hooks/useIdentityRequests';

const roleCodeOf = (user: any) => String(typeof user?.role === 'string' ? user.role : user?.role?.code || '').toUpperCase();
const globalRoles = ['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL'];
const roleAreas: Record<string, string> = {
  ADMIN_ALM: 'ALMACEN', ADMIN_ALMACEN: 'ALMACEN', SUPERVISOR_ALMACEN: 'ALMACEN', WAREHOUSEMAN: 'ALMACEN', SUPERVISOR: 'ALMACEN',
  ADMIN_EXT: 'EXTRUSION', ADMIN_EXTRUSION: 'EXTRUSION', SUPERVISOR_EXTRUSION: 'EXTRUSION', OPERADOR_EXTRUSION: 'EXTRUSION',
  ADMIN_TELARES: 'TELARES', ADMIN_TEL: 'TELARES', SUPERVISOR_TELARES: 'TELARES', OPERADOR_TELARES: 'TELARES',
  ADMIN_LAMINADO: 'LAMINADO', SUPERVISOR_LAMINADO: 'LAMINADO', OPERADOR_LAMINADO: 'LAMINADO',
  ADMIN_GLOBO: 'GLOBO', SUPERVISOR_GLOBO: 'GLOBO', OPERADOR_GLOBO: 'GLOBO',
  ADMIN_CORTE: 'CORTE', SUPERVISOR_CORTE: 'CORTE', OPERADOR_CORTE: 'CORTE',
};
const warehouseRoles = new Set(['ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERVISOR_ALMACEN', 'WAREHOUSEMAN', 'SUPERVISOR']);

export function IdentityRequestsPage() {
  const user = useAuthStore((state: any) => state.user);
  const areaCode = getUserAreaCode(user);
  const roleCode = roleCodeOf(user);
  const expectedRoleArea = roleAreas[roleCode];
  const claimArea = String(user?.area?.code || user?.role?.area?.code || '').toUpperCase();
  const claimAreaId = Number(user?.area?.id || user?.areaId || user?.role?.area?.id || user?.role?.area_id || 0) || null;
  const expectedAreaId: Record<string, number> = { ALMACEN: 1, EXTRUSION: 2, TELARES: 3, LAMINADO: 4, GLOBO: 5, CORTE: 6 };
  const roleAreaMatches = Boolean(expectedRoleArea && (claimArea || claimAreaId) && (!claimArea || claimArea === expectedRoleArea) && (!claimAreaId || claimAreaId === expectedAreaId[expectedRoleArea]));
  const isWarehouse = roleAreaMatches && warehouseRoles.has(roleCode) && expectedRoleArea === 'ALMACEN';
  const canRequest = roleAreaMatches && expectedRoleArea !== 'ALMACEN' && !globalRoles.includes(roleCode);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [selectionByRequest, setSelectionByRequest] = useState<Record<number, number[]>>({});
  const [codeFilter, setCodeFilter] = useState('');
  const [codeOffset, setCodeOffset] = useState(0);
  const requestsQuery = useIdentityRequestsQuery(canRequest || isWarehouse);
  const availableQuery = useAvailableQrCodesQuery(isWarehouse, codeOffset);
  const createMutation = useCreateIdentityRequestMutation();
  const fulfillMutation = useFulfillIdentityRequestMutation();
  const requests = requestsQuery.data || [];
  const codes = availableQuery.data?.items || [];
  const filteredCodes = useMemo(() => {
    const term = codeFilter.trim().toLowerCase();
    return term ? codes.filter((code) => code.qr_code.toLowerCase().includes(term)) : codes;
  }, [codes, codeFilter]);

  const toggleCode = (request: QrIdentityRequest, code: AvailableQrCode) => {
    setSelectionByRequest((previous) => {
      const selected = previous[request.id] || [];
      const next = selected.includes(code.id)
        ? selected.filter((id) => id !== code.id)
        : selected.length < request.requested_quantity ? [...selected, code.id] : selected;
      return { ...previous, [request.id]: next };
    });
  };

  const submitRequest = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50000) return;
    createMutation.mutate({ requested_quantity: parsed, notes: notes.trim() || undefined }, {
      onSuccess: () => { setQuantity(''); setNotes(''); },
    });
  };

  const error = requestsQuery.error || availableQuery.error || createMutation.error || fulfillMutation.error;
  const errorMessage = error instanceof Error ? error.message : '';

  if (!canRequest && !isWarehouse) {
    return <main className="mx-auto max-w-3xl p-6" role="alert"><h1 className="text-2xl font-bold text-foreground">Solicitudes de QR</h1><p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-base text-foreground">La cuenta autenticada no pertenece a un área operativa autorizada para solicitar o surtir QR.</p></main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 text-foreground sm:p-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Solicitud y entrega de QR vírgenes</h1>
        <p className="mt-2 text-base text-muted-foreground">Cada solicitud queda registrada. Almacén entrega códigos individuales disponibles y el sistema conserva la asignación y su historial.</p>
      </header>

      {errorMessage && <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-base font-semibold text-danger">{errorMessage}</div>}

      {canRequest && (
        <form onSubmit={submitRequest} className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end sm:p-6">
          <label className="text-base font-semibold">Cantidad de QR
            <input aria-label="Cantidad de QR" type="number" min="1" max="50000" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3 text-lg" />
          </label>
          <label className="text-base font-semibold">Notas para Almacén
            <input aria-label="Notas para Almacén" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Proceso o uso previsto (opcional)" className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3 text-base" />
          </label>
          <button type="submit" disabled={createMutation.isPending || !quantity} className="min-h-12 rounded-md bg-primary px-5 text-base font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {createMutation.isPending ? 'Registrando…' : `Solicitar para ${areaCode}`}
          </button>
        </form>
      )}

      {isWarehouse && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">QR vírgenes disponibles</h2><p className="mt-1 text-sm text-muted-foreground">Se muestran códigos sin asignación activa. La entrega se confirma para la cantidad exacta solicitada.</p></div>
            <label className="text-sm font-semibold">Buscar QR
              <input value={codeFilter} onChange={(event) => setCodeFilter(event.target.value)} className="mt-1 min-h-11 rounded-md border border-input bg-background px-3" placeholder="Código QR" />
            </label>
          </div>
          {availableQuery.isLoading ? <p className="mt-4">Consultando códigos disponibles…</p> : <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>Mostrando {codes.length ? codeOffset + 1 : 0}–{codeOffset + codes.length} de {availableQuery.data?.total || 0} códigos.</p><div className="flex gap-2"><button type="button" disabled={codeOffset === 0 || availableQuery.isFetching} onClick={() => setCodeOffset(Math.max(0, codeOffset - 500))} className="min-h-10 rounded-md border border-border px-3 font-semibold disabled:opacity-50">Anterior</button><button type="button" disabled={codeOffset + codes.length >= (availableQuery.data?.total || 0) || availableQuery.isFetching} onClick={() => setCodeOffset(codeOffset + 500)} className="min-h-10 rounded-md border border-border px-3 font-semibold disabled:opacity-50">Siguiente</button></div></div>}
        </section>
      )}

      <section aria-live="polite" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{isWarehouse ? 'Solicitudes recibidas' : 'Solicitudes de mi área'}</h2><button type="button" onClick={() => { requestsQuery.refetch(); if (isWarehouse) availableQuery.refetch(); }} className="min-h-11 rounded-md border border-border px-4 font-semibold">Actualizar</button></div>
        {requestsQuery.isLoading && <p role="status" className="rounded-lg bg-secondary p-4">Cargando solicitudes…</p>}
        {!requestsQuery.isLoading && requests.length === 0 && <p className="rounded-lg border border-border bg-card p-6 text-base text-muted-foreground">No hay solicitudes registradas.</p>}
        {requests.map((request) => {
          const selectedIds = selectionByRequest[request.id] || [];
          const pending = request.status === 'PENDING';
          const requestCodes = filteredCodes.filter((code) => {
            const qrAreaId = Number(code.assigned_area_id || 0) || null;
            const batchAreaId = Number(code.batch_assigned_area_id || 0) || null;
            return (!qrAreaId || qrAreaId === request.area_id) && (!batchAreaId || batchAreaId === request.area_id);
          });
          return (
            <article key={request.id} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-semibold uppercase text-muted-foreground">Solicitud #{request.id} · {request.area?.name || request.area?.code || `Área ${request.area_id}`}</p><p className="mt-1 text-lg font-bold">{request.requested_quantity} QR solicitados · {request.delivered_quantity} entregados</p><p className="mt-1 text-sm text-muted-foreground">Creada {new Date(request.requested_at).toLocaleString()} {request.notes ? `· ${request.notes}` : ''}</p></div>
                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${pending ? 'border-warning/40 bg-warning/10 text-warning' : 'border-success/40 bg-success/10 text-success'}`}>{pending ? 'PENDIENTE' : 'SURTIDA'}</span>
              </div>

              {isWarehouse && pending && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-sm font-semibold">Selecciona {request.requested_quantity} códigos · {selectedIds.length} seleccionados</p>
                  <div className="grid max-h-64 gap-2 overflow-auto rounded-md border border-border p-2 sm:grid-cols-2 lg:grid-cols-3">
                    {requestCodes.map((code) => <label key={code.id} className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-secondary"><input aria-label={`Seleccionar ${code.qr_code}`} type="checkbox" checked={selectedIds.includes(code.id)} onChange={() => toggleCode(request, code)} disabled={!selectedIds.includes(code.id) && selectedIds.length >= request.requested_quantity || fulfillMutation.isPending} className="h-5 w-5" /><span className="font-mono text-sm">{code.qr_code}</span><span className="ml-auto text-xs text-muted-foreground">Lote {code.batch_id}</span></label>)}
                    {requestCodes.length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay QR vírgenes compatibles con el área de esta solicitud.</p>}
                  </div>
                  <button type="button" disabled={selectedIds.length !== request.requested_quantity || fulfillMutation.isPending} onClick={() => fulfillMutation.mutate({ requestId: request.id, qrCodeIds: selectedIds }, { onSuccess: () => setSelectionByRequest((previous) => ({ ...previous, [request.id]: [] })) })} className="min-h-12 rounded-md bg-primary px-5 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
                    {fulfillMutation.isPending ? 'Confirmando entrega…' : 'Confirmar entrega de QR'}
                  </button>
                </div>
              )}

              {request.items?.length > 0 && <div className="border-t border-border pt-4"><h3 className="font-bold">QR asignados</h3><ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{request.items.map((item) => <li key={item.id} className="rounded-md bg-secondary px-3 py-2 font-mono text-sm">{item.qr_code?.qr_code || `QR #${item.qr_code_id}`}</li>)}</ul></div>}
            </article>
          );
        })}
      </section>
    </main>
  );
}
