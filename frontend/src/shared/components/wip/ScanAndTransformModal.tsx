import React, { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@/design-system';
import {
  QrCode,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Loader2,
  Sparkles,
  Printer,
  Copy,
  DollarSign,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';

interface ScanAndTransformModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: 'GLOBO' | 'LAMINADO';
  initialQr?: string;
  api: {
    verifyScan: (payload: { qr_code: string }) => Promise<any>;
    transformRoll: (payload: {
      roll_id: number;
      specification_id: number;
      meters_out?: number;
      weight_out_kg?: number;
      notes?: string;
    }) => Promise<any>;
  };
  onSuccess?: () => void;
}

export const ScanAndTransformModal: React.FC<ScanAndTransformModalProps> = ({
  isOpen,
  onClose,
  area,
  initialQr = '',
  api,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);

  const [qrInput, setQrInput] = useState(initialQr);
  const [verifying, setVerifying] = useState(false);
  const [transforming, setTransforming] = useState(false);

  // Estados de verificación
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<number | null>(null);

  // Estados de producción editables
  const [metersOut, setMetersOut] = useState<string>('');
  const [weightOut, setWeightOut] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Estado final de éxito
  const [transformedData, setTransformedData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setQrInput(initialQr);
      setVerificationResult(null);
      setTransformedData(null);
      if (initialQr) {
        handleVerify(initialQr);
      }
    } else {
      setQrInput('');
      setVerificationResult(null);
      setTransformedData(null);
    }
  }, [isOpen, initialQr]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || qrInput).trim();
    if (!code) {
      toast.error('Ingresa o escanea el código QR del rollo');
      return;
    }

    setVerifying(true);
    setVerificationResult(null);
    setTransformedData(null);

    try {
      const res = await api.verifyScan({ qr_code: code });
      setVerificationResult(res);
      if (res.is_allowed && res.roll) {
        setMetersOut(String(res.roll.meters || ''));
        setWeightOut(String(res.roll.weight_kg || ''));
        if (res.compatible_specifications?.length > 0) {
          setSelectedSpecId(res.compatible_specifications[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al verificar QR');
    } finally {
      setVerifying(false);
    }
  };

  const handleTransform = async () => {
    if (!verificationResult?.roll || !selectedSpecId) {
      toast.error('Selecciona una especificación válida');
      return;
    }

    setTransforming(true);
    try {
      const res = await api.transformRoll({
        roll_id: verificationResult.roll.id,
        specification_id: selectedSpecId,
        meters_out: metersOut ? Number(metersOut) : undefined,
        weight_out_kg: weightOut ? Number(weightOut) : undefined,
        notes: notes || undefined,
      });

      setTransformedData(res);
      toast.success(res.message || `Rollo transformado exitosamente en ${area}`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.friendlyMessage || err.message || 'Error al transformar rollo');
    } finally {
      setTransforming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código QR copiado al portapapeles');
  };

  if (!isOpen) return null;

  const areaColor = area === 'GLOBO' ? 'cyan' : 'indigo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${areaColor}-600/20 border border-${areaColor}-500/40 text-${areaColor}-400`}>
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                Recepción y Transformación — {area}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Escanea el QR del rollo para validar enrutamiento y preparar su producción
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenido Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* PASO 1: Campo de Escaneo de QR */}
          {!transformedData && (
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-blue-400" />
                Escaneo de Código QR Pegado en el Rollo:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerify();
                  }}
                  placeholder="Escanea o escribe el código (ej. 10-1-1-1200)..."
                  className="w-full h-13 rounded-xl bg-slate-900 border-2 border-slate-700 px-4 text-lg font-mono font-black text-white focus:border-blue-500 focus:outline-none"
                />
                <QrScannerButton
                  title="Escanear con Cámara"
                  onScan={(code) => {
                    setQrInput(code);
                    handleVerify(code);
                  }}
                />
                <Button
                  onClick={() => handleVerify()}
                  disabled={verifying || !qrInput.trim()}
                  className="h-13 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shrink-0"
                >
                  {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar QR'}
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: Resultado de la Verificación */}
          {verificationResult && !transformedData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* CASO A: BLOQUEO DE ENRUTAMIENTO O SECUENCIA INVÁLIDA */}
              {!verificationResult.is_allowed ? (
                <div className="p-5 rounded-2xl bg-red-950/60 border-2 border-red-600 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="h-8 w-8 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-black uppercase tracking-wider text-white">
                        {verificationResult.error_code === 'AREA_NOT_IN_ROUTE'
                          ? '⛔ BLOQUEO DE ENRUTAMIENTO: ÁREA NO AUTORIZADA'
                          : verificationResult.error_code === 'NO_COMPATIBLE_SPECIFICATION'
                            ? '⚠️ FALTA CONFIGURAR RECETA COMPATIBLE'
                            : '⛔ SECUENCIA INVÁLIDA DE PROCESO'}
                      </p>
                      <p className="text-xs text-red-200 font-medium">
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>

                  {verificationResult.roll?.route && (
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-red-900/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <span className="text-slate-400 font-bold">Ruta Oficial Autorizada:</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {verificationResult.roll.route.map((st: string, i: number, arr: string[]) => (
                          <React.Fragment key={st}>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase border ${
                                st === area
                                  ? 'bg-red-900 text-white border-red-700'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {st}
                            </span>
                            {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-slate-500" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* CASO B: APROBADO Y AUTORIZADO */
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-emerald-950/50 border-2 border-emerald-600 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-7 w-7 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-white uppercase">
                          Rollo Autorizado y Encaminado Correctamente a {area}
                        </p>
                        <p className="text-xs text-emerald-200/90 font-medium">
                          Ruta confirmada:{' '}
                          <span className="font-mono font-bold">
                            {verificationResult.roll.route.join(' ➔ ')}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-900 text-emerald-200 border-emerald-600 font-bold">
                      AUTORIZADO
                    </Badge>
                  </div>

                  {/* Resumen de Dimensiones */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Rollo Telar</span>
                      <span className="text-base font-mono font-black text-white">
                        {verificationResult.roll.roll_code}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Metros Entrada</span>
                      <span className="text-base font-mono font-black text-white">
                        {Number(verificationResult.roll.meters).toFixed(0)} m
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Peso Entrada</span>
                      <span className="text-base font-mono font-black text-emerald-400">
                        {Number(verificationResult.roll.weight_kg).toFixed(1)} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">BOM Telar</span>
                      <span className="text-xs font-black text-slate-200 truncate block">
                        {verificationResult.roll.bom?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Formulario de Parámetros de Transformación */}
                  <div className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-400" />
                      Preparación de Producción y Receta Técnica:
                    </h3>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase text-slate-400">
                        Especificación / Fórmula en {area}:
                      </label>
                      <select
                        value={selectedSpecId || ''}
                        onChange={(e) => setSelectedSpecId(Number(e.target.value))}
                        className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
                      >
                        {verificationResult.compatible_specifications?.map((spec: any) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.code} — {spec.name} ({spec.process_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-400">
                          Metros Resultantes (m):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={metersOut}
                          onChange={(e) => setMetersOut(e.target.value)}
                          className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-lg font-mono font-black text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black uppercase text-slate-400">
                          Peso Resultante (kg):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={weightOut}
                          onChange={(e) => setWeightOut(e.target.value)}
                          className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-lg font-mono font-black text-emerald-400 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Preview del Nuevo QR que se estampará */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Nuevo QR que se Asignará a este Rollo:
                      </span>
                      <span className="font-mono text-base font-black px-3 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-700">
                        {verificationResult.preview_new_qr}
                      </span>
                    </div>

                    {/* Transformación de Costo (Visible para Administradores) */}
                    {allowCosts && (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                          Costo Base Telar acumulado:
                        </span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          ${Number(verificationResult.roll.calculated_roll_cost || 0).toFixed(2)} MXN
                        </span>
                      </div>
                    )}

                    {/* Botón de Ejecución de Transformación */}
                    <Button
                      onClick={handleTransform}
                      disabled={transforming}
                      className="w-full h-15 bg-blue-600 hover:bg-blue-700 text-white font-black text-base uppercase tracking-wider rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
                    >
                      {transforming ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          Procesando Transformación y Generando QR...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-6 w-6" />
                          Confirmar Transformación en {area} y Asignar QR
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Éxito y Entrega del Nuevo QR */}
          {transformedData && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-white tracking-wide">
                  ¡Transformación Completada Exitosamente!
                </h3>
                <p className="text-sm text-slate-300">
                  El rollo ha sido procesado bajo la receta de {area} y los insumos fueron debitados del WIP.
                </p>
              </div>

              {/* Tarjeta del Nuevo QR Generado */}
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-950 border-2 border-blue-500 shadow-2xl space-y-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Nuevo Código QR Oficial PTI ({area}):
                </span>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black text-blue-400 tracking-wider">
                    {transformedData.new_qr_code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transformedData.new_qr_code)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Copiar Código"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Metros Finales</span>
                    <span className="font-black text-white">{transformedData.roll.meters} m</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Peso Final</span>
                    <span className="font-black text-emerald-400">{transformedData.roll.weight_kg} kg</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Siguiente Estación:</span>
                  <span className="px-3 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-700 font-black uppercase">
                    {transformedData.roll.next_allowed_stage}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  onClick={onClose}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider rounded-xl"
                >
                  Finalizar y Volver al WIP
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!transformedData && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/80 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 font-bold"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
