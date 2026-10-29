import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ViajeroRoll } from '../../types/telares.types';
import { Button } from '@/design-system';
import { Printer, X, CheckCircle, ArrowRight, ShieldCheck, Tag, Info, User, Layers } from 'lucide-react';
import { formatDateTimeCdmx } from '@/utils/date';

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
  const loomNumber = roll.loom_number || roll.loom?.loom_number || roll.loom_id;
  const shiftNumber = roll.shift_number || 1;
  const operatorNomina = roll.operator_nomina || roll.operator?.numero_nomina || '1200';
  const rollSeq = roll.roll_sequence || 1;
  const supervisorName = roll.shiftSupervisor
    ? `${roll.shiftSupervisor.first_name} ${roll.shiftSupervisor.last_name}`.trim()
    : 'No registrado';
  const productKind = roll.product_kind || roll.bom?.product_kind || 'ROLLO_TELA';
  const modelName = roll.output_product_name || roll.bom?.output_product_name || roll.bom?.name || 'Producto de Telares';
  const fabricType = roll.fabric_type || roll.bom?.fabric_type || 'TUBULAR';
  const color = roll.output_color || roll.bom?.output_color || roll.tape_color || roll.bom?.tape_color || 'No registrado';
  const qrPayload = JSON.stringify({
    type: 'TRACEFLOW_TELARES_ROLL', version: 1,
    qr_code: roll.qr_code, roll_code: roll.roll_code,
    loom: { number: loomNumber, name: roll.loom?.name || null }, shift: shiftNumber,
    model: {
      product_kind: productKind, name: modelName, bom_code: roll.bom?.code || null, fabric_type: fabricType, color,
      width_cm: roll.width_cm ?? roll.bom?.target_width_cm ?? null,
      output_width_value: roll.output_width_value ?? roll.bom?.output_width_value ?? null,
      output_width_unit: roll.output_width_unit || roll.bom?.output_width_unit || null,
      output_denier: roll.output_denier ?? roll.bom?.output_denier ?? null,
      tensile_strength_lb: roll.tensile_strength_lb ?? roll.bom?.tensile_strength_lb ?? null,
      units_per_pallet: roll.units_per_pallet ?? roll.bom?.units_per_pallet ?? null,
      packaging_type: roll.packaging_type || roll.bom?.packaging_type || null,
      grammage_g_per_m: roll.grammage_g_per_m ?? roll.bom?.target_weight_g_per_m ?? null,
      ounces_yd2: roll.ounces_yd2 ?? roll.bom?.ounces_yd2 ?? null,
    },
    quantity: { meters: Number(roll.meters), weight_kg: Number(roll.weight_kg) },
    supervisor: roll.shiftSupervisor ? { name: supervisorName, employee_number: roll.shiftSupervisor.numero_nomina || null } : null,
    operator_segments: (roll.operatorSegments || []).map((segment) => ({
      operator: segment.operator ? `${segment.operator.first_name} ${segment.operator.last_name}`.trim() : `Operador #${segment.operator_id}`,
      employee_number: segment.operator?.numero_nomina || null, shift: segment.shift_number,
      meters_from: Number(segment.meters_start), meters_to: Number(segment.meters_end),
      weight_from_kg: segment.weight_start_kg == null ? null : Number(segment.weight_start_kg),
      weight_to_kg: segment.weight_end_kg == null ? null : Number(segment.weight_end_kg),
    })),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border-4 border-slate-900 text-slate-900">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between border-b-2 border-slate-300 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white font-black text-xl">
              TF
            </span>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                TraceFlow — QR Viajero de Tejido
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Etiqueta Oficial de Producción y Enrutamiento (PDF)
              </p>
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
        <div className="my-4 rounded-xl border-2 border-dashed border-slate-400 p-4 bg-slate-50 print:border-none print:p-0 space-y-4">
          {/* Identificador Principal según PDF: [TELAR]-[TURNO]-[NUM_ROLLO]-[NOMINA] */}
          <div className="text-center pb-2 border-b-2 border-slate-200">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 block">
              CÓDIGO OFICIAL DEL ROLLO (NOMENCLATURA STRICTA)
            </span>
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-wider">
              {roll.roll_code}
            </span>
            <div className="mt-1 flex justify-center gap-3 text-xs font-bold text-slate-600">
              <span>Telar: <strong className="text-blue-700 font-mono">#{loomNumber}</strong></span>
              <span>Turno: <strong className="text-amber-700 font-mono">{shiftNumber}°</strong></span>
              <span>Rollo: <strong className="text-emerald-700 font-mono">#{rollSeq}</strong></span>
              <span>Nómina: <strong className="text-purple-700 font-mono">{operatorNomina}</strong></span>
            </div>
          </div>

          {/* QR Central y Datos Básicos */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <div className="rounded-xl border-2 border-slate-900 p-2 bg-white shadow-sm shrink-0">
              <QRCodeSVG value={qrPayload} size={180} level="H" includeMargin={true} />
              <p className="text-center font-mono text-[11px] font-black text-slate-700 pt-1">
                {roll.qr_code}
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Metros Lineales</span>
                  <span className="text-2xl font-black text-blue-700">{roll.meters} m</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Peso Neto</span>
                  <span className="text-2xl font-black text-emerald-700">{roll.weight_kg} kg</span>
                </div>
              </div>

              {/* Ficha Técnica de la Tela (PDF) */}
              <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500 font-bold">Tipo de PTI:</span><strong className="text-slate-900">{productKind === 'ROLLO_TELA' ? 'ROLLO DE TELA' : productKind}</strong></div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Ficha / BOM:</span>
                  <strong className="text-slate-900 truncate max-w-[200px]">{modelName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Gramaje / Tipo:</span>
                  <span className="font-bold text-slate-900">
                    {roll.ounces_yd2 || roll.bom?.ounces_yd2 ? `${Number(roll.ounces_yd2 || roll.bom?.ounces_yd2).toFixed(1)} oz/yd²` : ''} · {fabricType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Color:</span>
                  <span className="font-bold text-blue-700">{color}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Ancho: <strong>{roll.width_cm} cm</strong></span>
                  <span className="text-slate-500">Gramaje: <strong>{Number(roll.grammage_g_per_m).toFixed(1)} g/m</strong></span>
                </div>
                {(roll.output_denier || roll.bom?.output_denier || roll.tensile_strength_lb || roll.bom?.tensile_strength_lb) && <div className="flex justify-between border-t border-slate-100 pt-1 text-[11px] text-slate-600"><span>Denier: <strong>{roll.output_denier || roll.bom?.output_denier || '—'}</strong></span><span>Resistencia: <strong>{roll.tensile_strength_lb || roll.bom?.tensile_strength_lb ? `${roll.tensile_strength_lb || roll.bom?.tensile_strength_lb} lb` : '—'}</strong></span></div>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-500">Supervisor en turno:</span>
              <strong className="text-slate-900">{supervisorName}</strong>
            </div>
            <div className="border-t border-slate-100 pt-2">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Operadores por tramo</p>
              {roll.operatorSegments?.length ? (
                <div className="space-y-1.5">
                  {roll.operatorSegments.map((segment) => (
                    <div key={segment.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                      <span className="font-bold text-slate-800">
                        {segment.operator ? `${segment.operator.first_name} ${segment.operator.last_name}`.trim() : `Operador #${segment.operator_id}`}
                        {segment.operator?.numero_nomina ? ` · ${segment.operator.numero_nomina}` : ''}
                      </span>
                      <span className="text-slate-600">
                        Turno {segment.shift_number} · {Number(segment.meters_start).toFixed(2)}–{Number(segment.meters_end).toFixed(2)} m
                        {segment.weight_start_kg != null && segment.weight_end_kg != null ? ` · ${Number(segment.weight_start_kg).toFixed(3)}–${Number(segment.weight_end_kg).toFixed(3)} kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[11px] text-amber-700">Sin segmentos de operador registrados.</p>}
            </div>
          </div>

          {/* Ruta Autorizada de Producción */}
          <div className="pt-2 border-t-2 border-slate-200">
            <p className="text-xs font-black uppercase text-slate-700 mb-1.5 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Secuencia de Estaciones Autorizada:
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {route.map((stage, idx) => {
                const isCurrent = stage === roll.current_stage;
                const isNext = stage === roll.next_allowed_stage;

                return (
                  <React.Fragment key={stage}>
                    <div
                      className={`px-2.5 py-1 rounded-lg font-black text-xs uppercase flex items-center gap-1 border ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : isNext
                          ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {isCurrent && <CheckCircle className="h-3 w-3" />}
                      {stage}
                    </div>
                    {idx < route.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Emisión Horario CDMX (CST / UTC-6) */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-200">
            <span>Emisión Planta CDMX (CST): <strong className="text-slate-800">{formatDateTimeCdmx(roll.created_at || new Date())}</strong></span>
            <span>Zona: America/Mexico_City (UTC-6)</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handlePrint}
            className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold text-base flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-blue-700/20"
          >
            <Printer className="h-5 w-5" />
            Imprimir Etiqueta Oficial
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
