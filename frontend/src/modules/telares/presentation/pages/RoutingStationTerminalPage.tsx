import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useValidateViajeroMutation,
  useProcessViajeroMutation,
} from '../../hooks/useTelaresQueries';
import { ValidateViajeroScanResponse } from '../../types/telares.types';
import { CreateConsumptionOrderModal } from '../../../warehouse/presentation/components/CreateConsumptionOrderModal';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { Button, Badge } from '@/design-system';
import { toast } from 'sonner';
import {
  QrCode,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Flame,
  Scissors,
  PackagePlus,
  ClipboardList,
} from 'lucide-react';
import { getCdmxTimeString } from '@/utils/date';

interface RoutingStationProps {
  stationNameOverride?: string;
}

export const RoutingStationTerminalPage: React.FC<RoutingStationProps> = ({
  stationNameOverride,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determinar la estación según la ruta o prop
  const currentStation = (
    stationNameOverride ||
    (location.pathname.includes('globo')
      ? 'GLOBO'
      : location.pathname.includes('laminado')
      ? 'LAMINADO'
      : location.pathname.includes('corte')
      ? 'CORTE'
      : 'LAMINADO')
  ).toUpperCase();

  // Mapear ID de área para ODCs de estación
  const areaId = currentStation === 'GLOBO' ? 5 : currentStation === 'CORTE' ? 6 : 4;

  const stationIcons: Record<string, React.ReactNode> = {
    LAMINADO: <Layers className="h-8 w-8 text-amber-400" />,
    GLOBO: <Flame className="h-8 w-8 text-orange-400" />,
    CORTE: <Scissors className="h-8 w-8 text-blue-400" />,
  };

  const validateMutation = useValidateViajeroMutation();
  const processMutation = useProcessViajeroMutation();

  const [scannedCode, setScannedCode] = useState('');
  const [validationResult, setValidationResult] = useState<ValidateViajeroScanResponse | null>(null);
  const [metersOutInput, setMetersOutInput] = useState<string>('');
  const [weightOutInput, setWeightOutInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [processedHistory, setProcessedHistory] = useState<any[]>([]);
  const [isOdcModalOpen, setIsOdcModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus en el escáner
  useEffect(() => {
    inputRef.current?.focus();
  }, [validationResult]);

  // Manejar escaneo
  const validateQrCode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    try {
      const res = await validateMutation.mutateAsync({
        qr_code: clean,
        area_name: currentStation,
      });

      setValidationResult(res);
      if (res.is_allowed && res.roll) {
        setMetersOutInput(res.roll.meters ? String(res.roll.meters) : '');
        setWeightOutInput(res.roll.weight_kg ? String(res.roll.weight_kg) : '');
        toast.success(`Rollo ${res.roll.roll_code} verificado y autorizado`);
      } else {
        toast.error(res.message || 'Escaneo bloqueado');
      }
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al validar escaneo');
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateQrCode(scannedCode);
  };

  // Manejar confirmación de proceso
  const handleConfirmProcess = async () => {
    if (!validationResult?.roll) return;

    const qr = validationResult.roll.qr_code;
    try {
      const res = await processMutation.mutateAsync({
        qr_code: qr,
        target_stage: currentStation,
        meters_out: metersOutInput ? Number(metersOutInput) : undefined,
        weight_out_kg: weightOutInput ? Number(weightOutInput) : undefined,
        notes: notesInput || undefined,
      });

      toast.success(res.message || `Etapa ${currentStation} finalizada con éxito.`);

      setProcessedHistory((prev) => [
        {
          roll_code: validationResult.roll?.roll_code,
          qr_code: qr,
          next_stage: res.roll.next_allowed_stage,
          time: `${getCdmxTimeString()} CST`,
        },
        ...prev,
      ]);

      // Limpiar para el siguiente rollo
      setScannedCode('');
      setValidationResult(null);
      setNotesInput('');
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al procesar etapa');
    }
  };

  const handleReset = () => {
    setScannedCode('');
    setValidationResult(null);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-6 space-y-6">
      {/* 1. Header de Estación */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 border-2 border-slate-700 shadow-md">
            {stationIcons[currentStation] || <Layers className="h-8 w-8 text-blue-400" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-black uppercase tracking-tight text-white sm:text-3xl">
                Estación de {currentStation}
              </h1>
              <Badge className="max-w-full whitespace-normal bg-emerald-600 text-xs font-bold leading-tight text-white">ENRUTAMIENTO ACTIVO</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Validación Estricta de QR Viajero y Enrutamiento Secuencial
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-center flex-1 sm:flex-initial">
            <span className="block text-[11px] font-bold text-slate-400 uppercase">Rollos Procesados Turno</span>
            <span className="text-2xl font-black text-emerald-400">{processedHistory.length}</span>
          </div>

          {/* Acciones Rápidas de ODC para esta estación */}
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={() => setIsOdcModalOpen(true)}
              className="flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 sm:w-auto sm:flex-initial"
            >
              <PackagePlus className="h-4 w-4" />
              Solicitar ODC {currentStation}
            </Button>
            <Button
              onClick={() => navigate(`/warehouse/orders?area_id=${areaId}&area_name=${currentStation}`)}
              variant="outline"
              className="flex h-11 w-full flex-1 items-center justify-center gap-1.5 rounded-xl border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-300 hover:bg-slate-800 sm:w-auto sm:flex-initial"
            >
              <ClipboardList className="h-4 w-4 text-blue-400" />
              Ver ODCs
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Campo de Escaneo Gigante Accesible */}
      <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6 text-blue-400" />
          <h2 className="text-lg font-black uppercase text-white">
            Escanear Código QR Viajero del Rollo
          </h2>
        </div>

        <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-3">
          <QrScannerButton
            title={`Escanear QR Viajero en ${currentStation}`}
            onScan={(code) => {
              setScannedCode(code);
              void validateQrCode(code);
            }}
          />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              placeholder="Escanea con la pistola lectora o escribe el código (ej. VIAJERO-TEL-...)"
              className="w-full h-16 rounded-2xl bg-slate-900 border-4 border-slate-600 px-5 text-xl sm:text-2xl font-black text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <Button
            type="submit"
            disabled={validateMutation.isPending || !scannedCode.trim()}
            className="h-16 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg uppercase rounded-2xl shadow-lg flex items-center justify-center gap-2"
          >
            {validateMutation.isPending ? 'Verificando...' : 'Verificar Ruteo'}
          </Button>
        </form>
      </div>

      {/* 3. Panel de Resultados de Validación */}
      {validationResult && (
        <div>
          {/* CASO A: BLOQUEO ESTRICTO (Error de Ruteo o Fuera de Secuencia) */}
          {!validationResult.is_allowed ? (
            <div className="rounded-2xl bg-rose-950/80 border-4 border-rose-600 p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg">
                  <ShieldAlert className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
                    ⛔ ACCESO DENEGADO / ESCANEO BLOQUEADO
                  </h3>
                  <p className="text-base font-bold text-rose-200">
                    {validationResult.error_code === 'AREA_NOT_IN_ROUTE'
                      ? 'ESTA ÁREA NO FORMA PARTE DEL RUTEO DE ESTE ROLLO'
                      : 'SECUENCIA OPERATIVA INVÁLIDA (SALTO DE ESTACIÓN NO PERMITIDO)'}
                  </p>
                </div>
              </div>

              {/* Mensaje Claro y Directo para el Operador */}
              <div className="rounded-xl bg-slate-900/90 border-2 border-rose-500/50 p-5 space-y-2">
                <p className="text-lg font-bold text-white">{validationResult.message}</p>
                {validationResult.roll && (
                  <div className="pt-2 text-sm text-slate-300 space-y-1">
                    <p>
                      <strong className="text-slate-400">Rollo Identificado:</strong>{' '}
                      <span className="text-white font-mono font-bold">{validationResult.roll.roll_code}</span>
                    </p>
                    <p>
                      <strong className="text-slate-400">Etapa Actual Registrada:</strong>{' '}
                      <span className="text-amber-400 font-bold">{validationResult.roll.current_stage}</span>
                    </p>
                    <p>
                      <strong className="text-slate-400">Estación Requerida Inmediata:</strong>{' '}
                      <span className="text-emerald-400 font-bold text-base">
                        {validationResult.roll.next_allowed_stage}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Ruta Oficial del Rollo */}
              {validationResult.roll?.route && (
                <div className="rounded-xl bg-slate-900/70 p-4 border border-slate-700">
                  <span className="text-xs font-black uppercase text-slate-400 block mb-2">
                    Ruta Oficial Autorizada para este Rollo:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {validationResult.roll.route.map((st, i, arr) => (
                      <React.Fragment key={st}>
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${
                            st === currentStation
                              ? 'bg-rose-600 text-white border-rose-500 font-bold'
                              : st === validationResult.roll?.next_allowed_stage
                              ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {st}
                        </span>
                        {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleReset}
                className="w-full sm:w-auto h-14 px-8 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base rounded-xl border border-slate-600 flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                Limpiar y Escanear Otro Rollo
              </Button>
            </div>
          ) : (
            /* CASO B: AUTORIZADO (Ruteo Válido) */
            <div className="rounded-2xl bg-emerald-950/70 border-4 border-emerald-600 p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
                    ✔ ROLLO AUTORIZADO EN {currentStation}
                  </h3>
                  <p className="text-base font-bold text-emerald-200">
                    Secuencia confirmada por el backend. Puedes proceder con la operación.
                  </p>
                </div>
              </div>

              {/* Detalles del Rollo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3.5">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Código de Rollo</span>
                  <span className="text-lg font-black text-white">{validationResult.roll?.roll_code}</span>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3.5">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Metros Entrada</span>
                  <span className="text-2xl font-black text-blue-400">{validationResult.roll?.meters} m</span>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3.5">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Peso Entrada</span>
                  <span className="text-2xl font-black text-emerald-400">{validationResult.roll?.weight_kg} kg</span>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3.5">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Ancho Tela</span>
                  <span className="text-lg font-black text-white">{validationResult.roll?.width_cm} cm</span>
                </div>
              </div>

              {/* Formulario de salida / confirmación */}
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Datos de Salida de la Estación (Opcional si no hubo merma o variación):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-400">Metros de Salida (m):</label>
                    <input
                      type="number"
                      step="any"
                      value={metersOutInput}
                      onChange={(e) => setMetersOutInput(e.target.value)}
                      className="w-full h-12 rounded-xl bg-slate-800 border-2 border-slate-600 px-3 text-lg font-black text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-400">Peso Salida (kg):</label>
                    <input
                      type="number"
                      step="any"
                      value={weightOutInput}
                      onChange={(e) => setWeightOutInput(e.target.value)}
                      className="w-full h-12 rounded-xl bg-slate-800 border-2 border-slate-600 px-3 text-lg font-black text-emerald-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-400">Notas de Estación:</label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Ej. Recubrimiento estándar aplicado, bobina en buen estado..."
                    className="w-full h-11 rounded-xl bg-slate-800 border-2 border-slate-600 px-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botón Gigante de Acción */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleConfirmProcess}
                  disabled={processMutation.isPending}
                  className="flex-1 h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg sm:text-xl uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
                >
                  <CheckCircle className="h-7 w-7" />
                  {processMutation.isPending
                    ? 'Actualizando Enrutamiento...'
                    : `CONFIRMAR ${currentStation} Y AVANZAR RUTA`}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="sm:w-36 h-16 border-2 border-slate-600 text-slate-300 font-bold text-base rounded-2xl"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Historial Reciente de la Estación */}
      {processedHistory.length > 0 && (
        <div className="rounded-2xl bg-slate-800 border-2 border-slate-700 p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-black uppercase text-slate-400">
            Rollos Procesados en este Turno ({currentStation})
          </h3>
          <div className="space-y-2">
            {processedHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="font-mono font-black text-white">{item.roll_code}</span>
                    <span className="text-xs text-slate-400 block font-mono">{item.qr_code}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-400">Siguiente: {item.next_stage}</span>
                  <span className="text-[11px] text-slate-500 block">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Solicitar ODC de la estación */}
      <CreateConsumptionOrderModal
        isOpen={isOdcModalOpen}
        initialAreaId={areaId}
        onClose={() => setIsOdcModalOpen(false)}
      />
    </div>
  );
};
export default RoutingStationTerminalPage;
