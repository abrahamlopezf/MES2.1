import React, { useState } from 'react';
import { useViajeroDetailsQuery } from '../../hooks/useTelaresQueries';
import { ViajeroLabelModal } from '../components/ViajeroLabelModal';
import { Button, Badge } from '@/design-system';
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
} from 'lucide-react';

export const ViajeroTrackerPage: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 space-y-6">
      {/* 1. Header */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white">
            Rastreador de QR Viajero
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            Trazabilidad Genética y Ruteo Dinámico de Rollos de Tela
          </p>
        </div>
      </div>

      {/* 2. Barra de Búsqueda */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-3">
        <label className="text-xs font-black uppercase tracking-wider text-slate-300 block">
          Buscar por Código QR Viajero o Folio de Rollo:
        </label>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ej. VIAJERO-TEL-053264-7902..."
            className="flex-1 h-14 rounded-2xl bg-slate-900 border-2 border-slate-600 px-4 text-lg font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
          />
          <Button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2"
          >
            <Search className="h-5 w-5" />
            {isLoading ? 'Buscando...' : 'Consultar'}
          </Button>
        </form>
      </div>

      {/* 3. Resultado de la Consulta */}
      {roll && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card Resumen del Rollo */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  CÓDIGO DE ROLLO VIAJERO
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{roll.roll_code}</h2>
                <p className="font-mono text-sm text-blue-400 font-bold">{roll.qr_code}</p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsLabelModalOpen(true)}
                  className="h-12 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Etiqueta
                </Button>
                <Badge className="bg-emerald-600 text-white font-black text-sm px-3 py-1.5 rounded-lg">
                  {roll.status}
                </Badge>
              </div>
            </div>

            {/* Métricas del Rollo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Metros</span>
                <span className="text-2xl font-black text-blue-400">{roll.meters} m</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Peso Neto</span>
                <span className="text-2xl font-black text-emerald-400">{roll.weight_kg} kg</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Ancho</span>
                <span className="text-2xl font-black text-white">{roll.width_cm} cm</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase block">Gramaje</span>
                <span className="text-2xl font-black text-amber-400">
                  {Number(roll.grammage_g_per_m).toFixed(1)} g/m
                </span>
              </div>
            </div>

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
                            ? 'bg-blue-600 text-white border-blue-700'
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
          </div>

          {/* Card Consumos de Backflushing (PTI Extrusión) */}
          <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <Layers className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-black uppercase text-white">
                Deducciones de Backflushing N a N (Extrusión PTI)
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
                      <span className="text-xs text-slate-400">Rack Maestro: {c.rack?.rack_code || 'N/A'}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-right">
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Kg Deducidos</span>
                        <span className="text-base font-black text-white">{Number(c.theoretical_kg).toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Bobinas Rack</span>
                        <span className="text-base font-black text-emerald-400">{c.spools_consumed} u</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Saldo Rack</span>
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
                        <span>{new Date(log.created_at).toLocaleString()}</span>
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
