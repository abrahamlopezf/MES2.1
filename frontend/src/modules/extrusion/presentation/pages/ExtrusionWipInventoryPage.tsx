import React, { useMemo, useState } from 'react';
import { Badge, Button, Icon, Input } from '@/design-system';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import axiosClient from '../../../../api/axiosClient';
import { useExtrusionWipQuery, useScrapWipMixtureMutation } from '../../hooks/useExtrusionFloorQueries';

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
  const [activeTab, setActiveTab] = useState<'wip' | 'remnants' | 'mixtures'>('wip');
  const [search, setSearch] = useState('');
  const [onlyWithoutQr, setOnlyWithoutQr] = useState(false);
  const [expandedWipId, setExpandedWipId] = useState<number | null>(null);
  const [qrSelectionMode, setQrSelectionMode] = useState(false);
  const [selectedWipIds, setSelectedWipIds] = useState<Set<number>>(() => new Set());
  const [qrDownloadError, setQrDownloadError] = useState('');
  const [selectedMixStatus, setSelectedMixStatus] = useState('TODOS');
  const [scrapTarget, setScrapTarget] = useState<any | null>(null);
  const canScrapWip = useAuthStore((state) => {
    const roleCode = String(
      typeof state.user?.role === 'string'
        ? state.user.role
        : (state.user?.role?.code || state.user?.role?.name || '')
    ).toUpperCase();
    return ['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION'].includes(roleCode)
      || state.hasPermission('scrap.create');
  });
  const { data, isLoading, isError, isFetching, refetch } = useExtrusionWipQuery();
  const scrapWipMutation = useScrapWipMixtureMutation();
  const tabOrder = ['wip', 'remnants', 'mixtures'] as const;
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: (typeof tabOrder)[number]) => {
    const currentIndex = tabOrder.indexOf(currentTab);
    let nextTab: (typeof tabOrder)[number] | undefined;
    if (event.key === 'Home') nextTab = tabOrder[0];
    else if (event.key === 'End') nextTab = tabOrder[tabOrder.length - 1];
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextTab = tabOrder[(currentIndex + 1) % tabOrder.length];
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextTab = tabOrder[(currentIndex - 1 + tabOrder.length) % tabOrder.length];
    if (!nextTab) return;
    event.preventDefault();
    setActiveTab(nextTab);
    setSelectedMixStatus('TODOS');
    document.getElementById(`wip-tab-${nextTab}`)?.focus();
  };

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

  const allMixtures = data?.mixtures || [];
  const remnantMixtures = useMemo(() => allMixtures.filter((mix: any) => String(mix.status || '').toUpperCase() === 'DISPONIBLE_WIP'), [allMixtures]);
  const processMixtures = useMemo(() => allMixtures.filter((mix: any) => String(mix.status || '').toUpperCase() !== 'DISPONIBLE_WIP'), [allMixtures]);
  const mixtures = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-MX');
    const source = activeTab === 'remnants' ? remnantMixtures : processMixtures;
    return source.filter((mix: any) => {
      if (activeTab === 'mixtures' && selectedMixStatus !== 'TODOS' && String(mix.status || 'SIN ESTADO').toUpperCase() !== selectedMixStatus) return false;
      if (!query) return true;
      return [mix.folio, mix.formula, mix.status, ...(mix.qr_codes || []).map((qr: any) => qr.qr_code)]
        .some((value) => String(value || '').toLocaleLowerCase('es-MX').includes(query));
    });
  }, [activeTab, processMixtures, remnantMixtures, search, selectedMixStatus]);

  const mixStatuses = useMemo(() => {
    const present = new Set(processMixtures.map((mix: any) => String(mix.status || 'SIN ESTADO').toUpperCase()));
    const common = ['ACTIVA', 'EN_ESPERA', 'PAUSADA'];
    return ['TODOS', ...common.filter((status) => present.has(status)), ...[...present].filter((status) => !common.includes(status)).sort()];
  }, [processMixtures]);

  const mixStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: processMixtures.length };
    for (const mix of processMixtures) {
      const status = String(mix.status || 'SIN ESTADO').toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [processMixtures]);

  const mixturesByStatus = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const mix of mixtures) {
      const status = String(mix.status || 'SIN ESTADO').toUpperCase();
      groups.set(status, [...(groups.get(status) || []), mix]);
    }
    const order = ['ACTIVA', 'EN_ESPERA', 'PAUSADA'];
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
  const visibleQrItems = materialItems.filter((item: any) => item.has_scannable_qr && item.qr_code && item.qr_uuid);
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
  const toggleQrSelectionMode = () => {
    setSelectedWipIds(new Set());
    setQrDownloadError('');
    setQrSelectionMode((current) => !current);
  };
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
  const handleConfirmScrap = async () => {
    if (!scrapTarget) return;
    try {
      const result = await scrapWipMutation.mutateAsync(Number(scrapTarget.id));
      toast.success(`${formatKg(result.discarded_kg)} registrados como scrap especial.`);
      setScrapTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo enviar el saldo a scrap. Actualiza el WIP e inténtalo de nuevo.');
    }
  };

  return (
    <main className="extrusion-workspace mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 pb-24 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 sm:justify-start sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary sm:flex">
            <Icon name="inventory_2" size={25} />
          </div>
          <div>
            <p className="hidden text-xs font-bold tracking-wide text-primary sm:block">Consulta de inventario</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">WIP de Extrusión</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Busca por nombre, código o lote.
            </p>
          </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-11 w-11 shrink-0 gap-2 p-0 sm:hidden" aria-label={isFetching ? 'Actualizando WIP' : 'Actualizar WIP'}>
            <Icon name="refresh" size={19} className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="hidden min-h-11 shrink-0 gap-2 self-start sm:flex sm:self-auto">
          <Icon name="refresh" size={17} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Actualizando…' : 'Actualizar WIP'}
        </Button>
      </header>

      <section aria-label="Resumen de inventario interno" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Partidas activas</p>
          <p className="mt-1.5 text-xl font-black tabular-nums text-foreground">{activeItems.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Materiales</p>
          <p className="mt-1.5 text-lg font-black tabular-nums text-foreground">{formatKg(data?.total_kg)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mezclas</p>
          <p className="mt-1.5 text-lg font-black tabular-nums text-foreground">{formatKg(data?.mixtures_total_kg)}</p>
        </div>
        <div className={`rounded-xl border p-3.5 sm:p-4 ${noQrKg > 0 ? 'border-warning/40 bg-warning/10' : 'border-success/30 bg-success/10'}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Material sin QR</p>
          <p className={`mt-1.5 text-lg font-black tabular-nums ${noQrKg > 0 ? 'text-warning' : 'text-success'}`}>
            {noQrKg > 0 ? formatKg(noQrKg) : 'Todo etiquetado'}
          </p>
        </div>
      </section>

      <div role="tablist" aria-label="Secciones de WIP de Extrusión" className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/30 p-2">
        <button
          type="button"
          role="tab"
          id="wip-tab-wip"
          aria-selected={activeTab === 'wip'}
          aria-controls="wip-panel-wip"
          tabIndex={activeTab === 'wip' ? 0 : -1}
          onClick={() => { setActiveTab('wip'); setSelectedMixStatus('TODOS'); }}
          onKeyDown={(event) => handleTabKeyDown(event, 'wip')}
          className={`flex !min-h-16 min-w-0 flex-col items-center justify-center gap-0 rounded-xl !px-1 !py-1 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:!min-h-14 sm:flex-row sm:gap-2 sm:!px-3 sm:text-base ${activeTab === 'wip' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <span className="hidden shrink-0 sm:inline-flex"><Icon name="inventory_2" size={18} /></span>
          <span className="sm:hidden">Materiales</span>
          <span className="hidden sm:inline">Materiales</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-sm tabular-nums sm:px-2">{activeItems.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="wip-tab-remnants"
          aria-selected={activeTab === 'remnants'}
          aria-controls="wip-panel-remnants"
          tabIndex={activeTab === 'remnants' ? 0 : -1}
          onClick={() => { setActiveTab('remnants'); setSelectedMixStatus('TODOS'); }}
          onKeyDown={(event) => handleTabKeyDown(event, 'remnants')}
          className={`flex !min-h-16 min-w-0 flex-col items-center justify-center gap-0 rounded-xl !px-1 !py-1 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:!min-h-14 sm:flex-row sm:gap-2 sm:!px-3 sm:text-base ${activeTab === 'remnants' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <span className="hidden shrink-0 sm:inline-flex"><Icon name="inventory" size={18} /></span>
          <span className="sm:hidden">Saldos</span>
          <span className="hidden sm:inline">Restantes de mezcla</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-sm tabular-nums sm:px-2">{remnantMixtures.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="wip-tab-mixtures"
          aria-selected={activeTab === 'mixtures'}
          aria-controls="wip-panel-mixtures"
          tabIndex={activeTab === 'mixtures' ? 0 : -1}
          onClick={() => { setActiveTab('mixtures'); setSelectedMixStatus('TODOS'); }}
          onKeyDown={(event) => handleTabKeyDown(event, 'mixtures')}
          className={`flex !min-h-16 min-w-0 flex-col items-center justify-center gap-0 rounded-xl !px-1 !py-1 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:!min-h-14 sm:flex-row sm:gap-2 sm:!px-3 sm:text-base ${activeTab === 'mixtures' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <span className="hidden shrink-0 sm:inline-flex"><Icon name="blender" size={18} /></span>
          <span className="sm:hidden">Proceso</span>
          <span className="hidden sm:inline">Mezclas en extrusión</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-sm tabular-nums sm:px-2">{processMixtures.length}</span>
        </button>
      </div>

      <section role="tabpanel" id="wip-panel-wip" aria-labelledby="wip-tab-wip" tabIndex={0} hidden={activeTab !== 'wip'} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 sm:pr-20 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Materiales y lotes</h2>
            <p className="text-sm text-muted-foreground">Busca por material, código o lote. Solo consulta; no cambia existencias.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-80">
              <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Material, código, lote o QR"
                aria-label="Buscar WIP de Extrusión"
                className="min-h-11 !pl-10"
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
              {onlyWithoutQr ? 'Ver todo el material' : 'Solo material sin QR'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-start sm:gap-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {qrSelectionMode
                ? selectedQrItems.length > 0 ? `${selectedQrItems.length} QR seleccionado(s)` : 'Marca los QR que necesitas descargar.'
                : 'Selecciona QR solo cuando quieras descargar varias etiquetas.'}
            </p>
            {qrSelectionMode && (
              <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0 gap-2 px-3" onClick={toggleQrSelectionMode}>
                <Icon name="close" size={17} />
                Cancelar
              </Button>
            )}
          </div>
          {qrSelectionMode ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
              <Button type="button" variant="outline" size="sm" className="min-h-11 min-w-0 justify-center gap-2" disabled={visibleQrItems.length === 0} onClick={toggleVisibleSelection} aria-label={allVisibleQrSelected ? 'Quitar selección visible' : `Seleccionar QR visibles (${visibleQrItems.length})`}>
                <Icon name={allVisibleQrSelected ? 'deselect' : 'select_all'} size={17} />
                <span className="sm:hidden">{allVisibleQrSelected ? 'Quitar selección' : `Seleccionar todos (${visibleQrItems.length})`}</span>
                <span className="hidden sm:inline">{allVisibleQrSelected ? 'Quitar selección visible' : `Seleccionar todos los QR visibles (${visibleQrItems.length})`}</span>
              </Button>
              <Button type="button" variant="ghost" size="sm" className="min-h-11 justify-center gap-2 px-3" disabled={selectedQrItems.length === 0} onClick={() => setSelectedWipIds(new Set())}>
                <Icon name="close" size={17} />
                Limpiar
              </Button>
              <Button type="button" size="sm" className="col-span-2 min-h-11 justify-center gap-2 sm:col-span-1" disabled={selectedQrItems.length === 0} onClick={() => handleDownloadQrPdf(selectedQrItems)}>
                <Icon name="picture_as_pdf" size={17} />
                Descargar etiquetas PDF{selectedQrItems.length ? ` (${selectedQrItems.length})` : ''}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2 self-start sm:self-auto" disabled={visibleQrItems.length === 0} onClick={toggleQrSelectionMode}>
              <Icon name="select_all" size={17} />
              Seleccionar QR
            </Button>
          )}
        </div>
        {qrDownloadError && <p role="alert" className="border-b border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{qrDownloadError}</p>}

        {isError ? (
          <EmptyState title="No se pudo cargar el WIP" detail="Revisa tu conexión y vuelve a actualizar." />
        ) : isLoading ? (
          <EmptyState title="Cargando existencias…" detail="Consultando materiales y lotes de Extrusión." />
        ) : materialItems.length === 0 ? (
          <EmptyState title={onlyWithoutQr ? 'No hay partidas sin QR escaneable' : 'No hay existencias que coincidan'} detail="Prueba con otro texto o quita el filtro de QR." />
        ) : (
          <>
          <div className="grid grid-cols-1 gap-3 bg-secondary/5 p-3 sm:p-4 lg:grid-cols-2 xl:hidden">
            {materialItems.map((item: any) => (
              <article key={`mobile-${item.id}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {qrSelectionMode && (
                    <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-ring" title="Seleccionar QR para descargar">
                      <input
                        type="checkbox"
                        checked={selectedWipIds.has(item.id)}
                        disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid}
                        onChange={() => toggleWipSelection(item.id)}
                        aria-label={`Seleccionar QR de ${item.material?.name || 'material WIP'}`}
                        className="h-6 w-6 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </label>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-bold text-foreground">{item.material?.name || 'Material sin catálogo'}</h3>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">{item.material?.internal_code || 'Sin código interno'}</p>
                    <div className="mt-2">
                      {item.has_scannable_qr ? <Badge variant="success">QR listo</Badge> : <Badge variant="warning">Sin etiqueta QR</Badge>}
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                  <div className="min-w-0 rounded-lg bg-secondary/30 p-3"><dt className="font-semibold text-muted-foreground">Lote</dt><dd className="mt-1 break-words font-mono font-bold text-foreground">{item.lote?.folio || 'Sin folio'}</dd></div>
                  <div className="min-w-0 rounded-lg bg-secondary/30 p-3"><dt className="font-semibold text-muted-foreground">Saldo disponible</dt><dd className="mt-1 break-words font-mono text-lg font-black tabular-nums text-primary">{formatKg(item.amount_kg)}</dd></div>
                  <div className="col-span-2 min-w-0"><dt className="font-semibold text-muted-foreground">QR</dt><dd className="mt-1 break-words font-mono text-sm text-foreground">{item.qr_code || 'No asociado'}</dd></div>
                  <div className="col-span-2"><dt className="font-semibold text-muted-foreground">Actualizado</dt><dd className="mt-1 text-foreground">{formatDateTime(item.updated_at)}</dd></div>
                </dl>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid} onClick={() => handleDownloadQrPdf([item])} title={item.has_scannable_qr ? 'Descargar etiqueta PDF individual' : 'Este material no tiene etiqueta QR disponible'} aria-label={`Descargar etiqueta PDF de ${item.material?.name || 'material WIP'}`}>
                    <Icon name="picture_as_pdf" size={17} /> Descargar PDF
                  </Button>
                  <Button
                    type="button"
                    variant={expandedWipId === item.id ? 'secondary' : 'outline'}
                    className="min-h-11 gap-2"
                    aria-expanded={expandedWipId === item.id}
                    aria-controls={`wip-detail-mobile-${item.id}`}
                    onClick={() => setExpandedWipId((current) => current === item.id ? null : item.id)}
                  >
                    <Icon name={expandedWipId === item.id ? 'expand_less' : 'info'} size={17} />
                    {expandedWipId === item.id ? 'Ocultar' : 'Detalles'}
                  </Button>
                </div>
                {expandedWipId === item.id && (
                  <section id={`wip-detail-mobile-${item.id}`} aria-label={`Detalle de ${item.material?.name || 'material WIP'}`} className="mt-4 border-t border-border pt-4">
                    <h4 className="font-bold text-foreground">Trazabilidad del material</h4>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
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
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table aria-label="Existencias WIP de Extrusión" className="w-full min-w-[1150px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {qrSelectionMode && (
                    <th scope="col" className="w-12 border-b border-border bg-secondary px-4 py-3 text-center font-black uppercase tracking-wider text-secondary-foreground">
                      <label className="mx-auto flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-ring" title="Seleccionar todos los QR visibles">
                        <input
                          type="checkbox"
                          checked={allVisibleQrSelected}
                          disabled={visibleQrItems.length === 0}
                          onChange={toggleVisibleSelection}
                          aria-label="Seleccionar todos los QR visibles"
                          className="h-6 w-6 cursor-pointer accent-primary disabled:cursor-not-allowed"
                        />
                      </label>
                    </th>
                  )}
                  <th scope="col" className="w-[190px] border-b border-border bg-secondary px-4 py-4 text-left font-black uppercase tracking-wider text-secondary-foreground">Material</th>
                  <th scope="col" className="w-[145px] border-b border-border bg-secondary px-4 py-4 text-left font-black uppercase tracking-wider text-secondary-foreground">Lote / referencia</th>
                  <th scope="col" className="w-[150px] border-b border-border bg-secondary px-4 py-4 text-left font-black uppercase tracking-wider text-secondary-foreground">QR</th>
                  <th scope="col" className="w-[135px] border-b border-border bg-secondary px-4 py-4 text-right font-black uppercase tracking-wider text-secondary-foreground">Saldo disponible</th>
                  <th scope="col" className="w-[140px] border-b border-border bg-secondary px-4 py-4 text-left font-black uppercase tracking-wider text-secondary-foreground">Etiqueta QR</th>
                  <th scope="col" className="w-[150px] border-b border-border bg-secondary px-4 py-4 text-left font-black uppercase tracking-wider text-secondary-foreground">Actualizado</th>
                  <th scope="col" className="w-[190px] border-b border-border bg-secondary px-3 py-4 text-right font-black uppercase tracking-wider text-secondary-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materialItems.map((item: any) => (
                  <React.Fragment key={item.id}>
                    <tr className="group align-middle transition-colors hover:bg-muted/20">
                      {qrSelectionMode && (
                        <td className="border-b border-border/50 px-4 py-3 text-center">
                          <label className="mx-auto flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-ring" title="Seleccionar QR para descargar">
                            <input
                              type="checkbox"
                              checked={selectedWipIds.has(item.id)}
                              disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid}
                              onChange={() => toggleWipSelection(item.id)}
                              aria-label={`Seleccionar QR de ${item.material?.name || 'material WIP'}`}
                              className="h-6 w-6 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </label>
                        </td>
                      )}
                        <td className="break-words border-b border-border/50 px-4 py-4">
                        <div className="font-bold text-foreground">{item.material?.name || 'Material sin catálogo'}</div>
                          <div className="mt-0.5 break-all font-mono text-sm text-muted-foreground">{item.material?.internal_code || 'Sin código interno'}</div>
                      </td>
                        <td className="break-all border-b border-border/50 px-4 py-4 font-mono text-sm text-foreground">{item.lote?.folio || 'Sin folio de lote'}</td>
                        <td className="break-all border-b border-border/50 px-4 py-4 font-mono text-sm text-muted-foreground">{item.qr_code || 'No asociado'}</td>
                        <td className="border-b border-border/50 px-4 py-4 text-right font-mono text-lg font-bold tabular-nums text-primary">{formatKg(item.amount_kg)}</td>
                        <td className="border-b border-border/50 px-4 py-4">
                        {item.has_scannable_qr ? (
                          <Badge variant="success">QR listo</Badge>
                        ) : (
                          <Badge variant="warning">Sin etiqueta QR</Badge>
                        )}
                      </td>
                        <td className="border-b border-border/50 px-4 py-4 text-sm text-muted-foreground">{formatDateTime(item.updated_at)}</td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1 px-3" disabled={!item.has_scannable_qr || !item.qr_code || !item.qr_uuid} onClick={() => handleDownloadQrPdf([item])} title={item.has_scannable_qr ? 'Descargar etiqueta PDF individual' : 'Este material no tiene etiqueta QR disponible'} aria-label={`Descargar etiqueta PDF de ${item.material?.name || 'material WIP'}`}>
                            <Icon name="picture_as_pdf" size={17} />
                            PDF
                          </Button>
                          <Button
                            type="button"
                            variant={expandedWipId === item.id ? 'secondary' : 'outline'}
                            size="sm"
                            className="min-h-11 gap-1 px-3"
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
                        <td colSpan={qrSelectionMode ? 8 : 7} className="bg-muted/15 px-4 py-4 sm:px-6">
                          <section aria-label={`Detalle de ${item.material?.name || 'material WIP'}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
          </>
        )}
      </section>

      <section role="tabpanel" id={activeTab === 'remnants' ? 'wip-panel-remnants' : 'wip-panel-mixtures'} aria-labelledby={activeTab === 'remnants' ? 'wip-tab-remnants' : 'wip-tab-mixtures'} tabIndex={0} hidden={activeTab === 'wip'} className="order-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm 2xl:order-none">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{activeTab === 'remnants' ? 'Saldos de mezcla en WIP' : 'Mezclas en extrusión'}</h2>
            <p className="hidden text-sm text-muted-foreground sm:block">{activeTab === 'remnants' ? 'Saldos liberados que todavía se pueden reutilizar o enviar a scrap.' : 'Busca por folio o fórmula y filtra por etapa.'}</p>
          </div>
          <div className="relative min-w-0 sm:w-80">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Folio, fórmula o QR"
              aria-label={activeTab === 'remnants' ? 'Buscar saldos de mezcla' : 'Buscar mezclas en extrusión'}
              className="min-h-11 !pl-10"
            />
          </div>
        </div>
        {activeTab === 'mixtures' && <div className="border-b border-border px-4 py-2 lg:hidden">
          <label className="sr-only" htmlFor="mix-status-filter">Filtrar mezclas por etapa</label>
          <select
            id="mix-status-filter"
            value={selectedMixStatus}
            onChange={(event) => setSelectedMixStatus(event.target.value)}
            className="min-h-12 w-full rounded-xl border-2 border-input bg-background px-4 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            {mixStatuses.map((status) => (
              <option key={status} value={status}>
                {status === 'TODOS' ? 'Todas las etapas' : statusLabel(status)} ({mixStatusCounts[status] || 0})
              </option>
            ))}
          </select>
        </div>}
        {activeTab === 'mixtures' && <div className="hidden flex-wrap gap-2 border-b border-border px-4 py-3 lg:flex" role="group" aria-label="Filtrar mezclas por etapa">
          {mixStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedMixStatus(status)}
              aria-pressed={selectedMixStatus === status}
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMixStatus === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <span>{status === 'TODOS' ? 'Todos' : statusLabel(status)}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${selectedMixStatus === status ? 'bg-background/20' : 'bg-muted'}`}>
                {mixStatusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>}
        {isError ? (
          <EmptyState title="No se pudieron cargar las mezclas" detail="Revisa tu conexión y vuelve a actualizar." />
        ) : isLoading ? (
          <EmptyState title="Cargando mezclas…" detail="Consultando saldos por estado." />
        ) : mixtures.length === 0 ? (
          <EmptyState
            title={activeTab === 'remnants' ? 'No hay saldos guardados' : 'No hay mezclas en extrusión'}
            detail={activeTab === 'remnants' ? 'Los saldos liberados para reutilizar aparecerán aquí.' : 'Las mezclas activas, en espera o pausadas aparecerán aquí.'}
          />
        ) : (
          <div className="space-y-3 p-4">
            {mixturesByStatus.map(([status, statusMixtures]) => (
              <section key={status} className="overflow-hidden rounded-xl border border-border">
                <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/35 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={status === 'PAUSADA' ? 'warning' : status === 'COMPLETADA' || status === 'CANCELADA' ? 'outline' : 'success'}>
                      {statusLabel(status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{statusMixtures.length} {statusMixtures.length === 1 ? 'mezcla' : 'mezclas'}</span>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {formatKg(statusMixtures.reduce((sum: number, mix: any) => sum + Number(mix.remaining_kg || 0), 0))}
                  </span>
                </header>
                <div className="divide-y divide-border">
                  {statusMixtures.map((mix: any) => (
                    <article key={mix.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <span className="font-mono text-base font-bold text-primary">{mix.folio}</span>
                        <p className="mt-1 font-semibold text-foreground">{mix.formula || 'Fórmula sin nombre'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{mix.qr_codes?.length ? `${mix.qr_codes.length} ${mix.qr_codes.length === 1 ? 'contenedor' : 'contenedores'}` : 'Sin etiqueta QR de contenedor'}</p>
                        {activeTab === 'remnants' && canScrapWip && <>
                          <Button type="button" variant="destructive" className="mt-3 min-h-12 w-full gap-2 sm:w-auto" onClick={() => setScrapTarget(mix)}>
                            <Icon name="delete" size={18} />Enviar saldo a merma / scrap
                          </Button>
                        </>}
                      </div>
                      <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                        {(mix.qr_codes || []).map((qr: any, index: number) => (
                          <span key={`${qr.qr_code || index}`} className="min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                            <span className="block break-all font-mono font-semibold text-foreground">{qr.qr_code || 'QR no asociado'}</span>
                            <span className="mt-0.5 block text-muted-foreground">{formatKg(qr.remaining_kg)} disponibles</span>
                          </span>
                        ))}
                        <div className="border-t border-border pt-2 text-left lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 lg:text-right">
                          <span className="block text-sm text-muted-foreground">Total disponible</span>
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
      </section>

      <Dialog open={Boolean(scrapTarget)} onOpenChange={(open) => { if (!open && !scrapWipMutation.isPending) setScrapTarget(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-xl font-black">Enviar saldo a merma / scrap</DialogTitle>
            <DialogDescription className="text-base">Confirma el descarte del saldo completo de esta preparación.</DialogDescription>
          </DialogHeader>
          {scrapTarget && <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-base">
            <p><span className="font-semibold">Folio:</span> <span className="font-mono">{scrapTarget.folio}</span></p>
            <p><span className="font-semibold">Fórmula:</span> {scrapTarget.formula || 'Sin nombre'}</p>
            <p><span className="font-semibold">Saldo a descontar:</span> <span className="font-mono font-bold">{formatKg(scrapTarget.remaining_kg)}</span></p>
            <p><span className="font-semibold">Contenedores:</span> {scrapTarget.qr_codes?.length || 0}</p>
          </div>}
          <p className="text-sm text-muted-foreground">El saldo se quitará del WIP y se registrará como scrap especial. El peso quedará estimado y pendiente de conciliación.</p>
          <DialogFooter className="gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="min-h-12" disabled={scrapWipMutation.isPending} onClick={() => setScrapTarget(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" className="min-h-12" disabled={scrapWipMutation.isPending} onClick={handleConfirmScrap}>
              {scrapWipMutation.isPending ? 'Registrando…' : 'Confirmar scrap'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
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
    <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
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
  DISPONIBLE_WIP: 'Disponible en WIP',
  SOLICITADA: 'Solicitada',
  COMPLETADA: 'Completadas',
  CANCELADA: 'Canceladas',
  'SIN ESTADO': 'Sin estado',
};

const statusLabel = (status: string) => STATUS_LABELS[status] || status.replaceAll('_', ' ').toLocaleLowerCase('es-MX');
