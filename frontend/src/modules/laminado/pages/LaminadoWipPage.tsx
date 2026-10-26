import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  RefreshCw,
  Package,
  ArrowRight,
  Clock,
  ShieldCheck,
  Plus,
  Coins,
  QrCode as QrIcon,
  Search,
  CheckCircle2,
  Calendar,
  User,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { canViewCosts } from '../../../utils/authHelpers';
import { laminadoApi } from '../services/laminadoApi';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { PrepareRollMaterialsModal } from '../../../shared/components/wip/PrepareRollMaterialsModal';
import { ScanAndTransformModal } from '../../../shared/components/wip/ScanAndTransformModal';

export const LaminadoWipPage: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const allowCosts = canViewCosts(user);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'rolls' | 'warehouse' | 'incoming' | 'history'>('rolls');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRollForPreparation, setSelectedRollForPreparation] = useState<any | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInitialQr, setScanInitialQr] = useState('');

  const { data: wipData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['laminado-wip-summary'],
    queryFn: () => laminadoApi.getWipSummary(),
    refetchInterval: 15000,
  });

  const macro = wipData?.macro;
  const rollsInFloor = wipData?.rolls_in_floor || [];
  const rollsIncoming = wipData?.rolls_incoming || [];
  const warehouseMaterials = wipData?.warehouse_materials || [];
  const recentTransformed = wipData?.recent_transformed || [];

  const filteredRolls = rollsInFloor.filter(
    (r) =>
      r.roll_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.loom?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bom?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWarehouse = warehouseMaterials.filter(
    (w) =>
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.internal_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.folio_lote?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-4 md:p-6 min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
              <Layers className="h-6 w-6" />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              WIP Interno & Piso de Laminado
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Custodia operativa de rollos en espera de recubrimiento, resinas PEBD en piso y PTIs laminados terminados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => navigate('/warehouse/orders?area_id=4&area_name=Laminado')}
            variant="outline"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
          >
            <Plus className="h-4 w-4" />
            Solicitar Resinas ODC
          </Button>

          <Button
            onClick={() => {
              setScanInitialQr('');
              setIsScanModalOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
          >
            <QrIcon className="h-4 w-4" />
            Escanear QR y Recibir Rollo
          </Button>
        </div>
      </div>

      {/* Macro KPIs Strip */}
      <div className={`grid grid-cols-2 ${allowCosts ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3.5 mb-6`}>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Rollos en Piso</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-black mt-1 text-amber-500">
            {macro?.total_rolls_in_floor || 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {macro?.total_meters_in_floor?.toLocaleString() || 0} metros tela
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Kilos Tela WIP</span>
            <Scale className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl md:text-3xl font-black mt-1 text-blue-500">
            {macro?.total_weight_fabric_kg?.toLocaleString() || 0} <span className="text-sm font-bold text-slate-400">KG</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Tejido recibido para laminar</p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Resinas e Insumos</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl md:text-3xl font-black mt-1 text-purple-500">
            {macro?.total_warehouse_materials_kg?.toLocaleString() || 0} <span className="text-sm font-bold text-slate-400">KG</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">PEBD, BOPP y masterbatch</p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">En Tránsito (Telares/Globo)</span>
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl md:text-3xl font-black mt-1 text-orange-500">
            {macro?.total_rolls_incoming || 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Próximos a llegar</p>
        </div>

        {allowCosts && (
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm col-span-2 lg:col-span-1`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Valuación WIP Laminado</span>
              <Coins className="h-4 w-4 text-emerald-500" />
            </div>
            {macro?.total_valuation_mxn != null ? (
              <>
                <p className="text-2xl font-black mt-1 text-emerald-500">
                  ${Number(macro.total_valuation_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Tela + Resinas en custodia</p>
              </>
            ) : <p className="text-xs text-slate-400 mt-2">Sin valuación disponible</p>}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('rolls')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'rolls'
                ? 'bg-amber-600 text-white shadow-md'
                : isDark
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border'
            }`}
          >
            <Layers className="h-4 w-4" />
            Rollos en Piso Laminado ({rollsInFloor.length})
          </button>

          <button
            onClick={() => setActiveTab('warehouse')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'warehouse'
                ? 'bg-purple-600 text-white shadow-md'
                : isDark
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border'
            }`}
          >
            <Package className="h-4 w-4" />
            Resinas e Insumos en Piso ({warehouseMaterials.length})
          </button>

          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'incoming'
                ? 'bg-orange-600 text-white shadow-md'
                : isDark
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border'
            }`}
          >
            <Clock className="h-4 w-4" />
            En Tránsito hacia Laminado ({rollsIncoming.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md'
                : isDark
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-100 border'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            PTIs Laminados Recientes ({recentTransformed.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-9 text-xs bg-transparent"
          />
        </div>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando inventario WIP de Laminado...</div>
      ) : activeTab === 'rolls' ? (
        /* TAB 1: Rollos en Piso Laminado */
        filteredRolls.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 text-slate-400 bg-white/5">
            No hay rollos físicos en custodia de Laminado en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRolls.map((roll) => (
              <div
                key={roll.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200'
                } shadow-sm`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <span className="font-mono text-sm font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {roll.roll_code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 block mt-1">
                      QR: {roll.qr_code}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    EN LAMINADO
                  </span>
                </div>

                <div className="text-xs space-y-1 my-3 p-2.5 rounded bg-slate-100 dark:bg-slate-800/60">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telar Origen:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {roll.loom ? `${roll.loom.code} (${roll.loom.name})` : 'N/A'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BOM Tela:</span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {roll.bom?.name || 'Estándar'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metros / Peso:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {roll.meters} m | {roll.weight_kg} kg
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ancho / Gramaje:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {roll.width_cm} cm | {roll.grammage_g_per_m} g/m
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Siguiente Etapa:</span>
                    <strong className="text-blue-400">{roll.next_allowed_stage}</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {roll.operator}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/production/laminado?qr=${roll.qr_code}`)}
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Laminar Rollo
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'warehouse' ? (
        /* TAB 2: Resinas e Insumos en Piso */
        filteredWarehouse.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 text-slate-400 bg-white/5">
            No hay resinas o insumos registrados en el piso de Laminado. Solicite una ODC desde Almacén.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWarehouse.map((w) => (
              <div
                key={w.id}
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                } shadow-sm`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-400">{w.internal_code}</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.name}</h4>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                    WIP PISO
                  </span>
                </div>

                <div className="text-xs space-y-1 my-3 p-2.5 rounded bg-slate-100 dark:bg-slate-800/60">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Folio Lote:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{w.folio_lote}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">QR Bulto/Contenedor:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{w.qr_code}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Stock en Piso:</span>
                    <span className="text-base font-black text-purple-500 font-mono">{w.amount_kg} KG</span>
                  </div>
                  {allowCosts && w.total_cost_mxn != null && (
                    <div className="flex justify-between items-center text-emerald-500 pt-1">
                      <span>Valuación:</span>
                      <strong className="font-mono">${w.total_cost_mxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Recibido: {new Date(w.received_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'incoming' ? (
        /* TAB 3: En Tránsito hacia Laminado */
        rollsIncoming.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 text-slate-400 bg-white/5">
            No hay rollos en tránsito programados hacia Laminado en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rollsIncoming.map((roll) => (
              <div
                key={roll.id}
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                } shadow-sm`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-mono text-sm font-black text-amber-500">{roll.roll_code}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    PRÓXIMO A LAMINADO
                  </span>
                </div>
                <div className="text-xs space-y-1 my-3 p-2.5 rounded bg-slate-100 dark:bg-slate-800/60">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telar Origen:</span>
                    <strong>{roll.loom?.code || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metros / Peso:</span>
                    <strong>{roll.meters} m | {roll.weight_kg} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ruta Programada:</span>
                    <strong className="text-orange-400">{roll.route?.join(' → ')}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRollForPreparation(roll)}
                    className="flex-1 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold"
                  >
                    🔍 Verificar WIP
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setScanInitialQr(roll.qr_code);
                      setIsScanModalOpen(true);
                    }}
                    className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    📷 Recibir Rollo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 4: PTIs Laminados Recientes */
        recentTransformed.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 text-slate-400 bg-white/5">
            Aún no hay rollos registrados como finalizados en la etapa Laminado el día de hoy.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Rollo / QR</th>
                  <th className="p-3">BOM Base</th>
                  <th className="p-3">Metros Salida</th>
                  <th className="p-3">Peso Salida</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Fecha Término</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentTransformed.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-amber-500">{item.roll_code}</td>
                    <td className="p-3">{item.bom_name}</td>
                    <td className="p-3 font-mono">{item.meters_out} m</td>
                    <td className="p-3 font-mono">{item.weight_out_kg} kg</td>
                    <td className="p-3">{item.operator}</td>
                    <td className="p-3 text-slate-400">{new Date(item.finished_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal para Preparar Materiales / ODC */}
      <PrepareRollMaterialsModal
        isOpen={Boolean(selectedRollForPreparation)}
        onClose={() => setSelectedRollForPreparation(null)}
        area="LAMINADO"
        roll={selectedRollForPreparation}
        api={laminadoApi}
        onOdcCreated={() => refetch()}
      />

      {/* Modal para Escanear QR y Transformar Rollo */}
      <ScanAndTransformModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          setScanInitialQr('');
        }}
        area="LAMINADO"
        initialQr={scanInitialQr}
        api={laminadoApi}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
export default LaminadoWipPage;
