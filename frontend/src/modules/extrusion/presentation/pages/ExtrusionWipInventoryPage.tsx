import React, { useMemo, useState } from 'react';
import { Badge, Button, Icon, Input } from '@/design-system';
import axiosClient from '../../../../api/axiosClient';
import { useExtrusionWipQuery } from '../../hooks/useExtrusionFloorQueries';

const formatKg = (value: unknown) => `${Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 })} kg`;
const formatDateTime = (value: unknown) => {
  if (!value) return 'Sin registro';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'Sin registro' : date.toLocaleString('es-MX');
};
const safeFileName = (value: unknown) => String(value || 'qr-wip').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
const downloadWipQrPdf = async (uuids: string[], fileName: string) => {
  const response = await axiosClient.post('/extrusion/wip/qr-labels/pdf', { uuids }, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const ExtrusionWipInventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wip' | 'mixtures'>('wip');
  const [search, setSearch] = useState('');
  const [onlyWithoutQr, setOnlyWithoutQr] = useState(false);
  const [expandedWipId, setExpandedWipId] = useState<number | null>(null);
  const [selectedWipIds, setSelectedWipIds] = useState<Set<number>>(() => new Set());
  const [qrDownloadError, setQrDownloadError] = useState('');
  const [selectedMixStatus, setSelectedMixStatus] = useState('TODOS');
  const { data, isLoading, isError, isFetching, refetch } = useExtrusionWipQuery();

  const materialItems = useMemo(() => {
    const items = (data?.items || []).filter((item: any) => Number(item.amount_kg || 0) > 0.0005);
    const query = search.trim().toLocaleLowerCase('es-MX');
    return items.filter((item: any) => {
      const hasScannableQr = Boolean(item.has_scannable_qr);
      if (onlyWithoutQr && hasScannableQr) return false;
      if (!query) return true;
      return [
        item.material?.name,
        item.material?.internal_code,
        item.lote?.folio,
        item.qr_code,
        item.qr_code_status,
      ].some((value) => String(value || '').toLocaleLowerCase('es-MX').includes(query));
    });
  }, [data?.items, onlyWithoutQr, search]);

  const mixtures = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-MX');
    return (data?.mixtures || []).filter((mix: any) => {
      if (selectedMixStatus !== 'TODOS' && String(mix.status || 'SIN ESTADO').toUpperCase() !== selectedMixStatus) return false;
      if (!query) return true;
      return [mix.folio, mix.formula, mix.status, ...(mix.qr_codes || []).map((qr: any) => qr.qr_code)]
        .some((value) => String(value || '').toLocaleLowerCase('es-MX').includes(query));
    });
  }, [data?.mixtures, search, selectedMixStatus]);

  const mixStatuses = useMemo(() => {
    const present = new Set((data?.mixtures || []).map((mix: any) => String(mix.status || 'SIN ESTADO').toUpperCase()));
    const common = ['ACTIVA', 'PAUSADA', 'EN_ESPERA', 'PREPARADA', 'CANCELADA', 'COMPLETADA'];
    return ['TODOS', ...common, ...[...present].filter((status) => !common.includes(status)).sort()];
  }, [data?.mixtures]);

  const mixStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: data?.mixtures?.length || 0 };
    for (const mix of data?.mixtures || []) {
      const status = String(mix.status || 'SIN ESTADO').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [data?.mixtures]);

  const mixturesByStatus = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const mix of mixtures) {
      const status = String(mix.status || 'SIN ESTADO').toUpperCase();
      groups.set(status, [...(groups.get(status) || []), mix]);
    }
    const order = ['PREPARADA', 'ACTIVA', 'EN_ESPERA', 'PAUSADA', 'SOLICITADA', 'COMPLETADA', 'CANCELADA'];
    return [...groups.entries()].sort(([a], [b]) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
      return a.localeCompare(b, 'es-MX');
    });
  }, [mixtures]);

  const items = data?.items || [];
  const activeItems = items.filter((item: any) => Number(item.amount_kg || 0) > 0.0005);
  const noQrItems = activeItems.filter((item: any) => !item.has_scannable_qr);
  const noQrKg = noQrItems.reduce((sum: number, item: any) => sum + Number(item.amount_kg || 0), 0);
  const downloadableItems = items.filter((item: any) => item.has_scannable_qr && item.qr_code && item.qr_uuid);
  const selectedQrItems = downloadableItems.filter((item: any) => selectedWipIds.has(item.id));
  const visibleQrItems = materialItems.filter((item: any) => item.has_scannable_qr && item.qr_code);
  const allVisibleQrSelected = visibleQrItems.length > 0 && visibleQrItems.every((item: any) => selectedWipIds.has(item.id));

  const toggleWipSelection = (id: number) => setSelectedWipIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleVisibleSelection = () => setSelectedWipIds((current) => {
    const next = new Set(current);
    if (allVisibleQrSelected) visibleQrItems.forEach((item: any) => next.delete(item.id));
    else visibleQrItems.forEach((item: any) => next.add(item.id));
    return next;
  });
  const handleDownloadQrPdf = async (qrItems: any[]) => {
    if (!qrItems.length) return;
    setQrDownloadError('');
    const uuids = qrItems.map((item) => item.qr_uuid).filter(Boolean);
    if (uuids.length !== qrItems.length) {
      setQrDownloadError('Uno o más materiales no tienen un QR activo para descargar. Actualiza la lista e inténtalo de nuevo.');
      return;
    }
    const fileName = qrItems.length === 1
      ? `QR-${safeFileName(qrItems[0].qr_code)}-WIP.pdf`
      : `QR-seleccion-WIP-Extrusion-${qrItems.length}.pdf`;
    try {
      await downloadWipQrPdf(uuids, fileName);
    } catch {
      setQrDownloadError('No se pudo generar el PDF. Actualiza el WIP y vuelve a intentarlo.');
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 pb-24 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Icon name="inventory_2" size={25} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Extrusión · Consulta de piso</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">WIP de Extrusión</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Busca material por nombre, código o lote aunque no tengas el QR a la mano. El saldo escaneable se identifica por separado.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-11 shrink-0 gap-2">
          <Icon name="refresh" size={17} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Actualizando…' : 'Actualizar WIP'}
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de WIP">
        <SummaryCard label="Materiales en WIP" value={formatKg(data?.total_kg)} icon="scale" tone="blue" />
        <SummaryCard label="Partidas registradas" value={String(activeItems.length)} icon="inventory" tone="violet" />
        <SummaryCard label="Saldo sin QR escaneable" value={formatKg(noQrKg)} icon="qr_code_2" tone={noQrKg > 0 ? 'amber' : 'green'} />
        <SummaryCard label="Mezclas disponibles" value={formatKg(data?.mixtures_total_kg)} icon="blender" tone="green" />
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-2" aria-label="Secciones de WIP de Extrusión">
        <button
          type="button"
          onClick={() => setActiveTab('wip')}
          aria-current={activeTab === 'wip' ? 'page' : undefined}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === 'wip' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Icon name="inventory_2" size={18} /> WIP de materiales
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">{activeItems.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mixtures')}
          aria-current={activeTab === 'mixtures' ? 'page' : undefined}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === 'mixtures' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Icon name="blender" size={18} /> Mezclas preparadas
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">{data?.mixtures?.length || 0}</span>
        </button>
      </nav>

      {activeTab === 'wip' && <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Materiales y lotes</h2>
            <p className="text-sm text-muted-foreground">El saldo sin QR se puede localizar por material y folio de lote; esta pantalla no modifica existencias.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Material, código, lote o QR"
                aria-label="Buscar WIP de Extrusión"
                className="min-h-11 pl-10"
              />
            </div>
            <Button
              type="button"
              variant={onlyWithoutQr ? 'default' : 'outline'}
              className="min-h-11 gap-2"
              aria-pressed={onlyWithoutQr}
              onClick={() => setOnlyWithoutQr((current) => !current)}
            >
              <Icon name="qr_code_2" size={17} />
              {onlyWithoutQr ? 'Ver todo el WIP' : 'Solo sin QR'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedQrItems.length > 0 ? `${selectedQrItems.length} QR seleccionado(s)` : 'Selecciona los QR que quieras descargar.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" disabled={visibleQrItems.length === 0} onClick={toggleVisibleSelection}>
              <Icon name={allVisibleQrSelected ? 'deselect' : 'select_all'} size={17} />
              {allVisibleQrSelected ? 'Quitar selección visible' : `Seleccionar QR visibles (${visibleQrItems.length})`}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-2" disabled={selectedQrItems.length === 0} onClick={() => setSelectedWipIds(new Set())}>
              <Icon name="close" size={17} />
              Limpiar
            </Button>
            <Button type="button" size="sm" className="min-h-11 gap-2" disabled={selectedQrItems.length === 0} onClick={() => handleDownloadQrPdf(selectedQrItems)}>
              <Icon name="picture_as_pdf" size={17} />
              Descargar PDF{selectedQrItems.length ? ` (${selectedQrItems.length})` : ''}
            </Button>
          </div>
        </div>
        {qrDownloadError && <p role="alert" className="border-b border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{qrDownloadError}</p>}

        {isError ? (
          <EmptyState title="No se pudo cargar el WIP" detail="Revisa tu conexión y vuelve a actualizar." />
        ) : isLoading ? (
          <EmptyState title="Cargando existencias…" detail="Consultando materiales y lotes de Extrusión." />
        ) : materialItems.length === 0 ? (
          <EmptyState title={onlyWithoutQr ? 'No hay partidas sin QR escaneable' : 'No hay existencias que coincidan'} detail="Prueba con otro texto o quita el filtro de QR." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleQrSelected}
                      disabled={visibleQrItems.length === 0}
                      onChange={toggleVisibleSelection}
                      aria-label="Seleccionar todos los QR visibles"
                      title="Seleccionar todos los QR visibles"
                      className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Lote / referencia</th>
                  <th className="px-4 py-3">QR</th>
                  <th className="px-4 py-3 text-right">Saldo disponible</th>
                  <th className="px-4 py-3">Estado de identificación</th>
                  <th className="px-4 py-3">Actualizado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materialItems.map((item: any) => (
                  <React.Fragment key={item.id}>
                    <tr className="align-middle hover:bg-muted/20">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedWipIds.has(item.id)}
                          disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid}
                          onChange={() => toggleWipSelection(item.id)}
                          aria-label={`Seleccionar QR de ${item.material?.name || 'material WIP'}`}
                          className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{item.material?.name || 'Material sin catálogo'}</div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{item.material?.internal_code || 'Sin código interno'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{item.lote?.folio || 'Sin folio de lote'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.qr_code || 'No asociado'}</td>
                      <td className="px-4 py-3 text-right font-mono text-base font-black tabular-nums text-foreground">{formatKg(item.amount_kg)}</td>
                      <td className="px-4 py-3">
                        {item.has_scannable_qr ? (
                          <Badge variant="success">QR hijo disponible</Badge>
                        ) : (
                          <Badge variant="warning">Sin QR hijo escaneable</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(item.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" className="min-h-10 gap-2" disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid} onClick={() => handleDownloadQrPdf([item])} title={item.has_scannable_qr ? 'Descargar etiqueta PDF individual' : 'Este material no tiene un QR hijo disponible'}>
                            <Icon name="picture_as_pdf" size={17} />
                            PDF
                          </Button>
                          <Button
                            type="button"
                            variant={expandedWipId === item.id ? 'secondary' : 'outline'}
                            size="sm"
                            className="min-h-10 gap-2"
                            aria-expanded={expandedWipId === item.id}
                            aria-controls={`wip-detail-${item.id}`}
                            onClick={() => setExpandedWipId((current) => current === item.id ? null : item.id)}
                          >
                            <Icon name={expandedWipId === item.id ? 'expand_less' : 'info'} size={17} />
                            {expandedWipId === item.id ? 'Ocultar' : 'Detalles'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedWipId === item.id && (
                      <tr id={`wip-detail-${item.id}`}>
                        <td colSpan={8} className="bg-muted/15 px-4 py-4 sm:px-6">
                          <section aria-label={`Detalle de ${item.material?.name || 'material WIP'}`} className="rounded-xl border border-border bg-background/60 p-4">
                            <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h3 className="font-bold text-foreground">Detalle de material en WIP</h3>
                                <p className="mt-0.5 text-sm text-muted-foreground">{item.material?.name || 'Material sin catálogo'} · {item.material?.internal_code || 'Sin código interno'}</p>
                              </div>
                              <span className="max-w-full break-all rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">QR: {item.qr_code || 'No asociado'}</span>
                            </div>
                            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                              <DetailField label="Cantidad disponible en WIP" value={formatKg(item.amount_kg)} />
                              <DetailField label="Ingreso a WIP" value={formatDateTime(item.entered_wip_at || item.wip_created_at)} />
                              <DetailField label="Solicitado por" value={item.consumption_order?.requested_by?.name || 'No registrado en el origen histórico'} />
                              <DetailField label="Orden de consumo" value={item.consumption_order?.number || 'Sin ODC vinculada'} />
                              <DetailField label="Área solicitante" value={item.consumption_order?.requesting_area || 'No registrada'} />
                              <DetailField label="Surtido por" value={item.consumption_order?.fulfilled_by?.name || item.entered_wip_by?.name || 'No registrado'} />
                              <DetailField label="Lote de origen" value={item.source?.lot_folio || item.lote?.folio || 'Sin folio'} />
                              <DetailField label="Ubicación de origen" value={item.source?.warehouse_location ? `${item.source.warehouse_location.name} (${item.source.warehouse_location.code})` : 'No registrada'} />
                              <DetailField label="QR padre" value={item.source?.parent_qr_code || 'No disponible'} mono />
                              <DetailField label="Fecha de recepción del lote" value={formatDateTime(item.source?.lot_received_at)} />
                              <DetailField label="Fecha del registro WIP" value={formatDateTime(item.wip_created_at)} />
                              <DetailField label="Fuente de fecha de ingreso" value={item.ingress_date_source === 'TRACEABILITY_MOVEMENT' ? 'Movimiento de trazabilidad' : 'Alta histórica del registro WIP'} />
                            </dl>
                          </section>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>}

      {activeTab === 'mixtures' && <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Mezclas preparadas por estado</h2>
            <p className="text-sm text-muted-foreground">Consulta por folio o fórmula; los grupos separan la etapa operativa de cada mezcla.</p>
          </div>
          <div className="relative min-w-0 sm:w-80">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Folio, fórmula o QR de mezcla"
              aria-label="Buscar mezclas preparadas"
              className="min-h-11 pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3" role="group" aria-label="Filtrar mezclas por estado">
          {mixStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedMixStatus(status)}
              aria-pressed={selectedMixStatus === status}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMixStatus === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <span>{status === 'TODOS' ? 'Todos' : statusLabel(status)}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${selectedMixStatus === status ? 'bg-background/20' : 'bg-muted'}`}>
                {mixStatusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>
        {isError ? (
          <EmptyState title="No se pudieron cargar las mezclas" detail="Revisa tu conexión y vuelve a actualizar." />
        ) : isLoading ? (
          <EmptyState title="Cargando mezclas…" detail="Consultando saldos por estado." />
        ) : mixtures.length === 0 ? (
          <EmptyState title="No hay mezclas disponibles" detail="Las mezclas con saldo aparecerán aquí después de prepararse." />
        ) : (
          <div className="space-y-3 p-4">
            {mixturesByStatus.map(([status, statusMixtures]) => (
              <section key={status} className="overflow-hidden rounded-xl border border-border">
                <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/35 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={status === 'PAUSADA' ? 'warning' : status === 'COMPLETADA' || status === 'CANCELADA' ? 'outline' : 'success'}>
                      {statusLabel(status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{statusMixtures.length} mezcla(s)</span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {formatKg(statusMixtures.reduce((sum: number, mix: any) => sum + Number(mix.remaining_kg || 0), 0))}
                  </span>
                </header>
                <div className="divide-y divide-border">
                  {statusMixtures.map((mix: any) => (
                    <article key={mix.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-primary">{mix.folio}</span>
                        <p className="mt-1 font-semibold text-foreground">{mix.formula || 'Fórmula sin nombre'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{mix.qr_codes?.length ? `${mix.qr_codes.length} contenedor(es) vinculados` : 'Sin QR de contenedor registrado'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {(mix.qr_codes || []).map((qr: any, index: number) => (
                          <span key={`${qr.qr_code || index}`} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                            <span className="block font-mono font-semibold text-foreground">{qr.qr_code || 'QR no asociado'}</span>
                            <span className="mt-0.5 block text-muted-foreground">{formatKg(qr.remaining_kg)} restantes</span>
                          </span>
                        ))}
                        <div className="border-l border-border pl-3 text-right">
                          <span className="block text-xs text-muted-foreground">Saldo de mezcla</span>
                          <span className="font-mono text-lg font-black tabular-nums text-foreground">{formatKg(mix.remaining_kg)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>}

    </main>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: string; tone: 'blue' | 'violet' | 'amber' | 'green' }> = ({ label, value, icon, tone }) => {
  const tones = {
    blue: 'border-sky-500/30 bg-sky-500/5 text-sky-500',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-500',
    amber: 'border-amber-500/40 bg-amber-500/5 text-amber-500',
    green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500',
  };
  return (
    <article className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon name={icon} size={19} />
      </div>
      <div className="mt-3 font-mono text-2xl font-black tabular-nums text-foreground">{value}</div>
    </article>
  );
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex min-h-32 flex-col items-center justify-center px-5 py-8 text-center">
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
  </div>
);

const DetailField: React.FC<{ label: string; value: unknown; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className={`mt-1 break-words font-medium text-foreground ${mono ? 'font-mono text-xs' : ''}`}>
      {String(value || 'No registrado')}
    </dd>
  </div>
);

const STATUS_LABELS: Record<string, string> = {
  PREPARADA: 'Preparadas',
  ACTIVA: 'Activas',
  EN_ESPERA: 'En espera',
  PAUSADA: 'Pausadas',
  SOLICITADA: 'Solicitada',
  COMPLETADA: 'Completadas',
  CANCELADA: 'Canceladas',
  'SIN ESTADO': 'Sin estado',
};

const statusLabel = (status: string) => STATUS_LABELS[status] || status.replaceAll('_', ' ').toLocaleLowerCase('es-MX');
