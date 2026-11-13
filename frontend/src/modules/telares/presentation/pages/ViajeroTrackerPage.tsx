import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViajeroDetailsQuery, useViajeroRollsQuery } from '../../hooks/useTelaresQueries';
import { ViajeroRoll } from '../../types/telares.types';
import { ViajeroLabelModal } from '../components/ViajeroLabelModal';
import { Button, Badge } from '@/design-system';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import {
  Search,
  Printer,
  History,
  ShieldCheck,
  Factory,
  Layers,
  ArrowRight,
  Clock,
  User,
  AlertTriangle,
  Coins,
  Package,
  CheckCircle2,
  Boxes,
  Flame,
  X,
} from '@/design-system/components/Icon/googleIconCompat';
import { formatDateTimeCdmx } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export const ViajeroTrackerPage: React.FC = () => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get('qr') || '');
  const [queriedCode, setQueriedCode] = useState(() => searchParams.get('qr') || '');
  useEffect(() => {
    const paramQr = searchParams.get('qr')?.trim();
    if (paramQr) {
      setSearchInput(paramQr);
      setQueriedCode(paramQr);
    }
  }, [searchParams]);

  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [modalRollOverride, setModalRollOverride] = useState<ViajeroRoll | null>(null);

  const { data: roll, isLoading, isFetching, isError, error, refetch } = useViajeroDetailsQuery(queriedCode);
  const { data: recentRolls = [], isLoading: isRecentLoading } = useViajeroRollsQuery({ limit: 20 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQueriedCode(searchInput.trim());
    }
  };

  const loomNum = roll?.loom_number || roll?.loom?.loom_number || roll?.loom_id;
  const shiftNum = roll?.shift_number || 1;
  const rollSeq = roll?.roll_sequence || 1;
  const opNomina = roll?.operator_nomina || roll?.operator?.numero_nomina || 'No registrada';
  const costComplete = Boolean(roll?.cost_data_complete && roll?.cost_summary?.complete && roll?.cost_summary?.total_roll_cost != null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 pb-32 sm:p-6 sm:pb-32 lg:pb-8 space-y-6">
      {/* 1. Header Industrial */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white">
            Registros de Telares · Producción y trazabilidad
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            Historial de rollos y bandas, consulta por folio o QR y detalle del proceso registrado.
          </p>
        </div>
      </div>

      {/* 2. Barra de Búsqueda */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-3">
        <label className="text-sm font-bold tracking-wide text-slate-100 block">
          Buscar por Código de Rollo o QR Viajero (Ej. 10-3-24-1200 o escaneo físico):
        </label>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <QrScannerButton
            title="Escanear QR Viajero o folio de rollo"
            onScan={(code) => {
              const clean = code.trim();
              setSearchInput(clean);
              setQueriedCode(clean);
            }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ej. 10-3-24-1200 ó VIAJERO-10-3-24-1200..."
            className="flex-1 h-14 rounded-2xl bg-slate-900 border-2 border-slate-600 px-4 text-lg font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
          />
          <Button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            {isLoading ? 'Rastreando...' : 'Consultar Trazabilidad'}
          </Button>
        </form>
      </div>

      <Dialog open={Boolean(queriedCode)} onOpenChange={(open) => {
        if (!open) {
          setQueriedCode('');
          setSearchInput('');
        }
      }}>
        <DialogPortal>
        <DialogOverlay className="z-[9998] bg-black/75" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:max-h-[90dvh] sm:w-[min(96vw,72rem)] sm:rounded-2xl sm:p-6">
          <DialogHeader className="sticky top-[-0.75rem] z-20 -mx-3 -mt-3 flex flex-row items-start justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3 pb-3 pt-3 text-left sm:top-[-1.5rem] sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl font-black text-white">Genealogía del rollo</DialogTitle>
              <DialogDescription className="break-all text-sm text-slate-300">
                {roll ? `Seguimiento de producción, consumos y ruta de ${roll.roll_code}.` : `Consulta del código ${queriedCode}.`}
              </DialogDescription>
            </div>
            <DialogClose className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label="Cerrar genealogía">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

            {queriedCode && (isLoading || isFetching) && (
              <div className="rounded-xl border border-blue-400/40 bg-blue-950/30 p-4 text-base font-semibold text-blue-100" role="status" aria-live="polite">
                Consultando la genealogía de <span className="font-mono font-bold">{queriedCode}</span>…
              </div>
            )}
            {queriedCode && isError && (
              <div className="flex flex-col gap-3 rounded-xl border border-red-400/50 bg-red-950/30 p-4 text-base text-red-100 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div>
                  <p className="font-bold">No se pudo consultar la genealogía de {queriedCode}.</p>
                  <p className="mt-1 text-sm text-red-200">{(error as any)?.response?.data?.message || (error as any)?.message || 'Ocurrió un error al consultar el rollo.'}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => refetch()} className="min-h-11 border-red-300/50 px-4 text-sm font-bold text-red-100">
                  Reintentar consulta
                </Button>
              </div>
            )}

                  {roll && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card Resumen Principal del Rollo con Nomenclatura Estricta */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  CÓDIGO OFICIAL DEL ROLLO VIAJERO (PDF PÁGINA 2)
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider">
                  {roll.roll_code}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                  <span>Telar: <strong className="text-blue-400 font-mono text-sm">#{loomNum}</strong></span>
                  <span>Turno: <strong className="text-amber-400 font-mono text-sm">{shiftNum}° Turno</strong></span>
                  <span>Rollo Consecutivo: <strong className="text-emerald-400 font-mono text-sm">#{rollSeq}</strong></span>
                  <span>Nómina: <strong className="text-purple-400 font-mono text-sm">{opNomina}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsLabelModalOpen(true)}
                  className="h-12 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Etiqueta Oficial
                </Button>
                <Badge className="bg-emerald-600 text-white font-black text-sm px-3.5 py-1.5 rounded-lg">
                  {roll.status}
                </Badge>
              </div>
            </div>

            {/* Ficha Técnica de la Tela y Métricas */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3">
              <Badge className="bg-cyan-700 text-white font-black">{roll.product_kind || roll.bom?.product_kind || 'ROLLO_TELA'}</Badge>
              <strong className="text-sm text-white">{roll.output_product_name || roll.bom?.output_product_name || roll.bom?.name}</strong>
              {(roll.output_color || roll.bom?.output_color) && <span className="text-xs text-slate-300">Color: {roll.output_color || roll.bom?.output_color}</span>}
              {(roll.output_width_value || roll.bom?.output_width_value) && <span className="text-xs text-slate-300">Ancho: {roll.output_width_value || roll.bom?.output_width_value} {roll.output_width_unit || roll.bom?.output_width_unit || 'cm'}</span>}
              {(roll.output_denier || roll.bom?.output_denier) && <span className="text-xs text-slate-300">Denier: {roll.output_denier || roll.bom?.output_denier}</span>}
              {(roll.tensile_strength_lb || roll.bom?.tensile_strength_lb) && <span className="text-xs text-slate-300">Resistencia: {roll.tensile_strength_lb || roll.bom?.tensile_strength_lb} lb</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Metros Lineales</span>
                <span className="text-2xl font-black text-blue-400 font-mono">{roll.meters} m</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Peso Neto</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">{roll.weight_kg} kg</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Gramaje (Onzas / Peso)</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {roll.ounces_yd2 || roll.bom?.ounces_yd2 ? `${Number(roll.ounces_yd2 || roll.bom?.ounces_yd2).toFixed(1)} oz` : 'Estándar'} · {Number(roll.grammage_g_per_m).toFixed(1)} g/m
                </span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Cinta Identificación</span>
                <span className="text-base font-black text-white">
                  {roll.tape_color || roll.bom?.tape_color || 'N/A'}
                </span>
              </div>
            </div>

            <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3" aria-labelledby="roll-crew-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="roll-crew-heading" className="text-sm font-black uppercase tracking-wide text-white">Responsables del rollo</h3>
                <span className="text-xs text-slate-300">
                  Supervisor: <strong className="text-blue-300">{roll.shiftSupervisor ? `${roll.shiftSupervisor.first_name} ${roll.shiftSupervisor.last_name}`.trim() : 'No registrado'}</strong>
                </span>
              </div>
              {roll.operatorSegments?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                      <tr><th className="pb-2 pr-3">Operador</th><th className="pb-2 pr-3">Turno</th><th className="pb-2 pr-3">Tramo de metros</th><th className="pb-2">Tramo de peso</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {roll.operatorSegments.map((segment) => (
                        <tr key={segment.id}>
                          <td className="py-2 pr-3 font-semibold text-white">
                            {segment.operator ? `${segment.operator.first_name} ${segment.operator.last_name}`.trim() : `Operador #${segment.operator_id}`}
                            {segment.operator?.numero_nomina ? <span className="ml-1 text-slate-400">· {segment.operator.numero_nomina}</span> : null}
                          </td>
                          <td className="py-2 pr-3 text-amber-300">{segment.shift_number}°</td>
                          <td className="py-2 pr-3 font-mono text-blue-300">{Number(segment.meters_start).toFixed(2)}–{Number(segment.meters_end).toFixed(2)} m</td>
                          <td className="py-2 font-mono text-emerald-300">{segment.weight_start_kg != null && segment.weight_end_kg != null ? `${Number(segment.weight_start_kg).toFixed(3)}–${Number(segment.weight_end_kg).toFixed(3)} kg` : 'Sin dato de peso'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-amber-300">Este rollo no tiene tramos de operadores registrados.</p>}
            </section>

            {/* CARD: TRANSFORMACIÓN DE COSTO (Oculto para Supervisores) */}
            {allowCosts && (
              <div className="rounded-xl border-2 border-emerald-500/60 bg-emerald-950/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Transformación de Costo de Tejeduría (Extrusión PTI × Índice de Telares)
                  </h3>
                  <Badge className="bg-emerald-600 text-white font-black text-xs">
                    Índice: x{Number(roll.cost_transformation_index || roll.cost_summary?.cost_transformation_index || 1).toFixed(4)}
                  </Badge>
                </div>

                {costComplete ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Costo Total del Rollo</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      ${Number(roll.cost_summary?.total_roll_cost ?? roll.calculated_roll_cost).toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Costo por Metro Lineal</span>
                    <span className="text-2xl font-black text-white font-mono">
                      ${Number(roll.cost_summary?.cost_per_meter).toFixed(2)} / m
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block">Costo por Kilogramo</span>
                    <span className="text-2xl font-black text-blue-400 font-mono">
                      ${Number(roll.cost_summary?.cost_per_kg).toFixed(2)} / kg
                    </span>
                  </div>
                </div> : <p className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">Valuación pendiente: falta costo real de uno o más materiales de origen. El sistema no muestra un costo parcial como si fuera total.</p>}
              </div>
            )}

            {/* Secuencia y Estado Actual */}
            <div className="rounded-xl bg-slate-900 p-5 border border-slate-700 space-y-3">
              <span className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Ruta Oficial de Procesamiento:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {roll.route.map((stage, idx) => {
                  const isCurrent = stage === roll.current_stage;
                  const isNext = stage === roll.next_allowed_stage;

                  return (
                    <React.Fragment key={stage}>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${
                          isCurrent
                            ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                            : isNext
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {stage}
                      </span>
                      {idx < roll.route.length - 1 && <ArrowRight className="h-4 w-4 text-slate-600" />}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="pt-2 text-xs text-slate-400 flex items-center gap-2">
                <span>
                  Estación Actual: <strong className="text-white">{roll.current_stage}</strong>
                </span>
                <span>•</span>
                <span>
                  Siguiente Estación Permitida:{' '}
                  <strong className="text-amber-400">{roll.next_allowed_stage}</strong>
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-300">Genealogía de Extrusión → Telares</span>
                <Badge className={roll.genealogy_tree?.exact_source_entries ? 'bg-emerald-700 text-white' : 'bg-amber-700 text-white'}>
                  {roll.genealogy_tree?.exact_source_entries ? 'Origen exacto vinculado' : 'Genealogía parcial / sin vínculo exacto'}
                </Badge>
              </div>
              {(roll.genealogy_tree?.raw_materials || []).length ? (roll.genealogy_tree?.raw_materials || []).map((material: any, idx: number) => (
                <div key={`${material.extrusion_entry_id}-${material.material_id}-${idx}`} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2"><strong className="text-white">{material.material_name}</strong><span className="text-slate-300">{Number(material.quantity).toLocaleString()} {material.unit}</span></div>
                  <p className="mt-1 text-slate-400">Origen: {material.source_type}{material.source_lot ? ` · Lote ${material.source_lot.folio}` : ''}{material.source_silo ? ` · Silo ${material.source_silo.code || material.source_silo.name}` : ''}{material.source_qr ? ` · QR ${material.source_qr}` : ''}{material.source_reference ? ` · ${material.source_reference}` : ''}</p>
                  {allowCosts && material.extended_cost_snapshot != null && <p className="mt-1 text-emerald-300">Costo de origen: ${Number(material.extended_cost_snapshot).toFixed(2)} MXN</p>}
                </div>
              )) : <p className="text-xs text-slate-400">No hay materias primas de Extrusión vinculadas al registro de este rollo.</p>}
              {allowCosts && (roll.cost_summary?.stages || []).length > 0 && <div className="rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-xs">
                <strong className="text-emerald-300">Valuación por etapa</strong>
                {(roll.cost_summary?.stages || []).map((stage, idx) => <p key={`${stage.stage}-${idx}`} className="mt-1 text-slate-300">{stage.stage}: {stage.cost_status === 'NO_REGISTRADO' || stage.cost_status === 'INCOMPLETO' ? 'valuación incompleta' : `$${Number(stage.transformed_cost_mxn ?? stage.material_cost_mxn ?? stage.input_cost_mxn).toFixed(2)} MXN`}</p>)}
              </div>}
            </div>
          </div>

          {/* Card Consumos de Backflushing (PTI Extrusión) */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <Layers className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-black uppercase text-white">
                Deducciones de Backflushing N a N (Extrusión PTI y Fileta Creel)
              </h3>
            </div>

            {roll.consumptions && roll.consumptions.length > 0 ? (
              <div className="space-y-3">
                {roll.consumptions.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <span className="font-bold text-blue-400">{c.role}</span>
                      <p className="text-white font-semibold">{c.ptiProduct?.name || 'PTI Extrusión'}</p>
                      <span className="text-xs text-slate-400">Rack Maestro: {c.rack?.rack_code || 'Fileta Creel'}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-right">
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Kg Deducidos</span>
                        <span className="text-base font-black text-white">{Number(c.theoretical_kg).toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Bobinas</span>
                        <span className="text-base font-black text-emerald-400">{c.spools_consumed} u</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Saldo</span>
                        <span className="text-xs font-mono text-slate-300">
                          {c.rack_balance_spools_before} → {c.rack_balance_spools_after}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay registros de backflushing asociados a este rollo.</p>
            )}
          </div>

          {/* Card Historial de Enrutamiento (Kardex) */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <History className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-black uppercase text-white">Kardex de Tránsito y Enrutamiento</h3>
            </div>

            {roll.routingLogs && roll.routingLogs.length > 0 ? (
              <div className="space-y-2">
                {roll.routingLogs.map((log) => {
                  const isBlocked = log.action.includes('BLOQUEO');
                  const eventDate = log.created_at || (log as any).createdAt || (log as any).updated_at || (log as any).updatedAt;
                  const actionLabel = log.action === 'BLOQUEO_RUTEO_INVALIDO'
                    ? 'Intento de salto de etapa bloqueado'
                    : log.action.replace(/_/g, ' ').toLowerCase();
                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm ${
                        isBlocked
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isBlocked ? (
                          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black uppercase text-white">{actionLabel}</span>
                            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">
                              {log.from_stage} → {log.to_stage}
                            </span>
                          </div>
                          {log.notes && <p className="text-xs text-slate-400 mt-0.5">{log.notes}</p>}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-400 shrink-0">
                        {log.operator && (
                          <span className="block font-semibold">
                            {log.operator.first_name} {log.operator.last_name}
                          </span>
                        )}
                        <span>{eventDate ? `${formatDateTimeCdmx(eventDate)} · hora CDMX` : 'Fecha del evento no disponible'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay movimientos registrados.</p>
            )}
          </div>
        </div>
            )}

        </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* 2.5 Listado Rápido de Salidas / Rollos Recientes de Telares */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-black uppercase text-white flex items-center gap-2">
              <History className="h-5 w-5 text-blue-400" />
              Salidas / Rollos Recientes de Telares (Rollo, Banda y Cintilla)
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              Selecciona cualquier registro reciente para inspeccionar su genealogía completa o reimprimir su etiqueta QR Viajera
            </p>
          </div>
          {queriedCode && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setQueriedCode('');
                setSearchInput('');
              }}
              className="border-slate-600 text-slate-200 font-bold text-xs"
            >
              Limpiar selección ({queriedCode})
            </Button>
          )}
        </div>

        {isRecentLoading ? (
          <p className="text-xs text-slate-400 font-semibold">Cargando salidas recientes de Telares...</p>
        ) : recentRolls.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay rollos registrados recientemente.</p>
        ) : (
          <>
          <div className="grid gap-3 2xl:hidden">
            {recentRolls.map((item) => {
              const isSelected = queriedCode === item.roll_code || queriedCode === item.qr_code;
              return (
                <article key={item.id} className={`min-w-0 rounded-xl border p-4 ${isSelected ? 'border-blue-400 bg-blue-950/30' : 'border-slate-700 bg-slate-900'}`}>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-base font-black text-amber-300">{item.roll_code}</p>
                      <p className="mt-1 text-sm font-bold text-white">Telar #{item.loom_number || item.loom?.loom_number || item.loom_id} · Turno {item.shift_number || 1}°</p>
                      <p className="break-words text-sm text-slate-300">{item.output_product_name || item.bom?.name || 'Rollo de Telares'}</p>
                    </div>
                    <Badge variant="outline" className="w-fit shrink-0 border-slate-600 text-slate-200">{item.product_kind || item.bom?.product_kind || 'ROLLO_TELA'}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-800/70 p-3 text-sm">
                    <div className="min-w-0"><dt className="text-xs font-semibold text-slate-400">Producción</dt><dd className="mt-0.5 font-mono font-bold text-emerald-300">{Number(item.meters).toFixed(0)} m · {Number(item.weight_kg).toFixed(1)} kg</dd></div>
                    <div className="min-w-0"><dt className="text-xs font-semibold text-slate-400">Fecha</dt><dd className="mt-0.5 break-words text-slate-200">{formatDateTimeCdmx(item.created_at)}</dd></div>
                    <div className="min-w-0"><dt className="text-xs font-semibold text-slate-400">Nómina</dt><dd className="mt-0.5 break-words text-slate-200">{item.operator_nomina || item.operator?.numero_nomina || 'No registrada'}</dd></div>
                    <div className="min-w-0"><dt className="text-xs font-semibold text-slate-400">Ruta autorizada</dt><dd className="mt-0.5 break-words text-slate-200">{(item.route || []).join(' → ') || 'Sin ruta'}</dd></div>
                  </dl>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      disabled={isFetching && queriedCode === item.roll_code}
                      onClick={() => { setSearchInput(item.roll_code); setQueriedCode(item.roll_code); }}
                      className="min-h-11 w-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-70"
                    >
                      {isFetching && queriedCode === item.roll_code ? 'Consultando…' : 'Ver genealogía'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setModalRollOverride(item); setIsLabelModalOpen(true); }}
                      className="min-h-11 w-full gap-2 border-slate-600 bg-slate-800 text-sm font-bold text-slate-100"
                    >
                      <Printer className="h-4 w-4" /> Imprimir QR
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 2xl:block">
            <table className="w-full min-w-[1100px] text-left text-sm text-slate-200">
              <thead className="border-b border-slate-700 bg-slate-950 font-black uppercase text-slate-400">
                <tr>
                  <th className="p-3">Código Rollo / QR</th>
                  <th className="p-3">Telar / Turno</th>
                  <th className="p-3">Producto / Ficha</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Ruta Autorizada</th>
                  <th className="p-3">Fecha (CDMX)</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-semibold">
                {recentRolls.map((item) => {
                  const isSelected = queriedCode === item.roll_code || queriedCode === item.qr_code;
                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'bg-blue-950/40' : 'hover:bg-slate-800/70'}
                    >
                      <td className="p-3 font-mono font-black text-amber-300 text-sm">
                        {item.roll_code}
                      </td>
                      <td className="p-3">
                        <span className="text-white font-bold">
                          Telar #{item.loom_number || item.loom?.loom_number || item.loom_id}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Turno {item.shift_number || 1}° · Nómina {item.operator_nomina || item.operator?.numero_nomina || 'No registrada'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-white font-bold block">
                          {item.output_product_name || item.bom?.name || 'Rollo de Telares'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.product_kind || item.bom?.product_kind || 'ROLLO_TELA'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-blue-300 font-bold">{Number(item.meters).toFixed(0)} m</span>
                        {' · '}
                        <span className="text-emerald-300 font-bold">{Number(item.weight_kg).toFixed(1)} kg</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        {(item.route || []).join(' ➔ ')}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">
                        {formatDateTimeCdmx(item.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isFetching && queriedCode === item.roll_code}
                            onClick={() => {
                              setSearchInput(item.roll_code);
                              setQueriedCode(item.roll_code);
                            }}
                            className="h-10 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg disabled:opacity-70"
                          >
                            {isFetching && queriedCode === item.roll_code ? 'Consultando…' : 'Ver Genealogía'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setModalRollOverride(item);
                              setIsLabelModalOpen(true);
                            }}
                            className="h-11 px-3 border-slate-600 bg-slate-800 text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            QR
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>



      {/* Modal de Etiqueta */}
      <ViajeroLabelModal
        roll={isLabelModalOpen ? modalRollOverride || roll || null : null}
        onClose={() => {
          setIsLabelModalOpen(false);
          setModalRollOverride(null);
        }}
      />
    </div>
  );
};

export default ViajeroTrackerPage;
