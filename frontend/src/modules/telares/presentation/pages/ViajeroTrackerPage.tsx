import React, { useState } from 'react';
import { useViajeroDetailsQuery } from '../../hooks/useTelaresQueries';
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
} from 'lucide-react';
import { formatDateTimeCdmx } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';

export const ViajeroTrackerPage: React.FC = () => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const [searchInput, setSearchInput] = useState('');
  const [queriedCode, setQueriedCode] = useState('');
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const { data: roll, isLoading, isError } = useViajeroDetailsQuery(queriedCode);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQueriedCode(searchInput.trim());
    }
  };

  const loomNum = roll?.loom_number || roll?.loom?.loom_number || roll?.loom_id;
  const shiftNum = roll?.shift_number || 1;
  const rollSeq = roll?.roll_sequence || 1;
  const opNomina = roll?.operator_nomina || roll?.operator?.numero_nomina || '1200';
  const costComplete = Boolean(roll?.cost_data_complete && roll?.cost_summary?.complete && roll?.cost_summary?.total_roll_cost != null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 space-y-6">
      {/* 1. Header Industrial */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white">
            Rastreador de QR Viajero y Trazabilidad Completa
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            Genealogía de Producción: Desde Ingreso en Almacén hasta Rollo de Tejido / Telares y Costos
          </p>
        </div>
      </div>

      {/* 2. Barra de Búsqueda */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-3">
        <label className="text-xs font-black uppercase tracking-wider text-slate-300 block">
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

      {/* 3. Resultado de la Consulta */}
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
                            <span className="font-black uppercase text-white">{log.action}</span>
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
                        <span>{formatDateTimeCdmx(log.created_at)} (CST)</span>
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

      {/* Modal de Etiqueta */}
      <ViajeroLabelModal roll={isLabelModalOpen ? roll || null : null} onClose={() => setIsLabelModalOpen(false)} />
    </div>
  );
};

export default ViajeroTrackerPage;
