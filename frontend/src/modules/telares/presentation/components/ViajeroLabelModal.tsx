import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ViajeroRoll } from '../../types/telares.types';
import { Button } from '@/design-system';
import { Printer, X, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface ViajeroLabelModalProps {
  roll: ViajeroRoll | null;
  onClose: () => void;
}

export const ViajeroLabelModal: React.FC<ViajeroLabelModalProps> = ({ roll, onClose }) => {
  if (!roll) return null;

  const handlePrint = () => {
    window.print();
  };

  const route = roll.route || ['TELARES', 'LAMINADO', 'CORTE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border-4 border-slate-800 text-slate-900">
        {/* Header con botón cerrar accesible */}
        <div className="flex items-center justify-between border-b-2 border-slate-300 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white font-black text-lg">
              TF
            </span>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                TraceFlow - QR Viajero
              </h2>
              <p className="text-xs font-semibold text-slate-600">Etiqueta Oficial de Enrutamiento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cuerpo de la Etiqueta (Formato Físico de Planta) */}
        <div className="my-5 rounded-xl border-2 border-dashed border-slate-400 p-4 bg-slate-50 print:border-none print:p-0">
          {/* Identificador Principal */}
          <div className="text-center pb-3 border-b border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">CÓDIGO DE ROLLO</p>
            <p className="text-2xl font-black text-slate-900 tracking-wide">{roll.roll_code}</p>
          </div>

          {/* QR Central y Datos Básicos */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
            <div className="rounded-xl border-2 border-slate-900 p-2 bg-white shadow-sm">
              <QRCodeSVG value={roll.qr_code} size={150} level="H" includeMargin={true} />
            </div>

            <div className="w-full space-y-2">
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Metros Lineales</span>
                <span className="text-2xl font-black text-blue-700">{roll.meters} m</span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">Peso Neto</span>
                <span className="text-2xl font-black text-emerald-700">{roll.weight_kg} kg</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <div className="rounded bg-white p-1.5 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">ANCHO</span>
                  {roll.width_cm} cm
                </div>
                <div className="rounded bg-white p-1.5 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">GRAMAJE</span>
                  {Number(roll.grammage_g_per_m).toFixed(1)} g/m
                </div>
              </div>
            </div>
          </div>

          {/* Código QR Texto */}
          <div className="text-center font-mono text-sm font-bold text-slate-600 bg-slate-200/60 py-1 rounded">
            {roll.qr_code}
          </div>

          {/* Ruta Autorizada de Producción */}
          <div className="mt-4 pt-3 border-t-2 border-slate-300">
            <p className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Secuencia de Estaciones Autorizada:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {route.map((stage, idx) => {
                const isCurrent = stage === roll.current_stage;
                const isNext = stage === roll.next_allowed_stage;
                const isPast = roll.stages_history?.some((h) => h.stage === stage && stage !== roll.current_stage);

                return (
                  <React.Fragment key={stage}>
                    <div
                      className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase flex items-center gap-1 border ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : isNext
                          ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 line-through'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {isCurrent && <CheckCircle className="h-3.5 w-3.5" />}
                      {stage}
                    </div>
                    {idx < route.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 font-medium italic">
              * El escaneo en estaciones no autorizadas o fuera de secuencia será bloqueado automáticamente.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handlePrint}
            className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold text-base flex items-center justify-center gap-2 rounded-xl"
          >
            <Printer className="h-5 w-5" />
            Imprimir Etiqueta
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="sm:w-32 h-12 border-2 border-slate-300 text-slate-700 font-bold text-base rounded-xl"
          >
            Listo / Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ViajeroLabelModal;
