import React from 'react';
import {
  Boxes,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Scale,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Archive,
  Cpu
} from 'lucide-react';
import {
  PtiRack,
  Formula,
  BackflushingResult,
  MaterialRef,
  ExtruderQueue
} from '../../types/extrusion.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface PtiIngressPresenterProps {
  racks: PtiRack[];
  formulas: Formula[];
  activeQueues: ExtruderQueue[];
  materials?: MaterialRef[];
  isLoading: boolean;
  onRefresh: () => void;
  // Form inputs
  mixtureQr: string;
  onMixtureQrChange: (val: string) => void;
  rackQr: string;
  onRackQrChange: (val: string) => void;
  selectedPtiMaterialId: number | '';
  onPtiMaterialIdChange: (val: number | '') => void;
  quantityPieces: string;
  onQuantityPiecesChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  // Computed validations
  selectedRack: PtiRack | null;
  selectedFormula: Formula | null;
  theoreticalWeightPerPiece: number;
  estimatedRawMaterialConsumedKg: number;
  isCapacityExceeded: boolean;
  isPtiMismatched: boolean;
  mismatchErrorMessage: string;
  // Submitting & Results
  onSubmitIngress: () => void;
  isSubmitting: boolean;
  lastBackflushingResult: BackflushingResult | null;
  onSelectRackFromGrid: (rack: PtiRack) => void;
  onSelectQueueFromList: (queue: ExtruderQueue) => void;
}

export const PtiIngressPresenter: React.FC<PtiIngressPresenterProps> = ({
  racks,
  formulas,
  activeQueues,
  materials = [],
  isLoading,
  onRefresh,
  mixtureQr,
  onMixtureQrChange,
  rackQr,
  onRackQrChange,
  selectedPtiMaterialId,
  onPtiMaterialIdChange,
  quantityPieces,
  onQuantityPiecesChange,
  notes,
  onNotesChange,
  selectedRack,
  selectedFormula,
  theoreticalWeightPerPiece,
  estimatedRawMaterialConsumedKg,
  isCapacityExceeded,
  isPtiMismatched,
  mismatchErrorMessage,
  onSubmitIngress,
  isSubmitting,
  lastBackflushingResult,
  onSelectRackFromGrid,
  onSelectQueueFromList,
}) => {
  const pieces = Number(quantityPieces) || 0;

  // Lista de materiales PTI a mostrar
  const ptiOptions = materials.length > 0
    ? materials
    : [
        { id: 1212, name: 'CINTA AMARILLA' },
        { id: 1213, name: 'CINTA BLANCA' },
        { id: 1238, name: 'POLIPROPILENO (B)' },
      ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera de Estación de Operador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border-2 border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Ingreso de PTI a Racks Dinámicos
            </h1>
            <p className="text-sm font-semibold text-muted-foreground">
              Estación de Empaque Intermedio: Escaneo QR de Mezcla, Condicionamiento de Rack y Backflushing
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="font-bold border-2"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Sincronizar Racks
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: FORMULARIO DE ESCANEO DE OPERADOR (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border-2 border-border rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
            <h2 className="text-lg font-black uppercase text-foreground flex items-center gap-2 border-b-2 border-border pb-3">
              <QrCode className="h-5 w-5 text-primary" />
              1. Escaneo y Captura Operativa
            </h2>

            {/* PASO 1: ORDEN DE CONSUMO / MEZCLA ACTIVA */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                <span>Código QR de Mezcla / Orden de Consumo *</span>
                {activeQueues.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    (Seleccione de mezclas activas o escanee)
                  </span>
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder="Escanee QR de la mezcla activa (ej. QR-MIX-ORD-001)"
                  value={mixtureQr}
                  onChange={(e) => onMixtureQrChange(e.target.value)}
                  className="font-mono font-black text-sm h-11 border-2 pl-3"
                />
              </div>

              {/* Atajos de Mezclas Activas en Extrusoras */}
              {activeQueues.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1.5 uppercase">
                    Mezclas activas en piso:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeQueues.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => onSelectQueueFromList(q)}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border text-left transition-all ${
                          mixtureQr === q.consumption_order_qr_id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        EXT-{q.extruder_id}: {q.consumption_order_qr_id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PASO 2: ESCANEO DE RACK DE PTI */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                <span>Código QR del Rack Físico *</span>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  (Ej. QR-RACK-001)
                </span>
              </label>
              <Input
                placeholder="Escanee QR del Rack físico (ej. QR-RACK-001)"
                value={rackQr}
                onChange={(e) => onRackQrChange(e.target.value)}
                className="font-mono font-black text-sm h-11 border-2 pl-3"
              />
            </div>

            {/* PASO 3: TIPO DE PTI & CANTIDAD DE PIEZAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Tipo de Producto PTI *
                </label>
                <select
                  value={selectedPtiMaterialId}
                  onChange={(e) => onPtiMaterialIdChange(Number(e.target.value) || '')}
                  className="w-full h-11 px-3 bg-background border-2 border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Seleccionar Material PTI --</option>
                  {ptiOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} (ID: {opt.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Cantidad de Piezas a Ingresar *
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ej: 50"
                  value={quantityPieces}
                  onChange={(e) => onQuantityPiecesChange(e.target.value)}
                  className="font-mono font-black text-base h-11 border-2"
                />
              </div>
            </div>

            {/* ALERTAS CRÍTICAS DE REGLAS DE NEGOCIO */}

            {/* ALERTA 1: INCOMPATIBILIDAD DE RACK CONDICIONADO (Regla 5) */}
            {isPtiMismatched && (
              <div className="p-4 bg-rose-500/15 border-2 border-rose-600 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-sm uppercase">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>¡Incompatibilidad de Rack! Intento Bloqueado</span>
                </div>
                <p className="text-xs font-bold text-foreground leading-relaxed">
                  {mismatchErrorMessage}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Regla 5 MES: Un rack con material existente no puede combinarse con otro tipo de PTI.
                </p>
              </div>
            )}

            {/* ALERTA 2: CAPACIDAD EXCEDIDA (RACK LLENO) */}
            {isCapacityExceeded && selectedRack && (
              <div className="p-4 bg-amber-500/15 border-2 border-amber-600 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-sm uppercase">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>¡Capacidad Máxima Excedida!</span>
                </div>
                <p className="text-xs font-bold text-foreground">
                  El Rack {selectedRack.rack_code} tiene capacidad para {selectedRack.max_capacity} piezas.
                  Actualmente posee {selectedRack.current_quantity} pzas. No es posible ingresar {pieces} pzas.
                </p>
              </div>
            )}

            {/* CONDICIONAMIENTO INICIAL (RACK VACÍO) */}
            {selectedRack && selectedRack.status === 'VACIO' && selectedPtiMaterialId && !isPtiMismatched && (
              <div className="p-3 bg-sky-500/10 border-2 border-sky-500/40 rounded-xl flex items-center gap-3 text-sky-800 dark:text-sky-300 text-xs font-bold">
                <Info className="h-5 w-5 shrink-0" />
                <span>
                  El Rack {selectedRack.rack_code} está VACÍO. Al registrar este ingreso quedará
                  <strong> condicionado exclusivamente</strong> para este tipo de PTI.
                </span>
              </div>
            )}

            {/* NOTAS OPCIONALES */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-muted-foreground">
                Notas / Folio Operador (Opcional)
              </label>
              <Input
                placeholder="Observaciones de empaque o turno..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="text-xs h-9 border-2"
              />
            </div>

            {/* BOTÓN PRINCIPAL DE INGRESO */}
            <Button
              size="lg"
              onClick={onSubmitIngress}
              disabled={
                isSubmitting ||
                !rackQr ||
                !selectedPtiMaterialId ||
                pieces <= 0 ||
                isPtiMismatched ||
                isCapacityExceeded
              }
              className="w-full h-12 text-base font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              {isSubmitting ? 'Registrando y Calculando Backflushing...' : 'Registrar Ingreso de PTI'}
            </Button>
          </div>

          {/* TARJETA DE RESULTADO DE BACKFLUSHING TRAS INGRESO */}
          {lastBackflushingResult && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm uppercase">
                <CheckCircle2 className="h-5 w-5" />
                <span>Consumo en Reversa (Backflushing) Ejecutado con Éxito</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold pt-1">
                <div className="p-2 bg-card rounded-lg border border-emerald-500/20">
                  <span className="text-muted-foreground text-[10px] block">Piezas Ingresadas</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    +{lastBackflushingResult.pieces_entered} pzas
                  </span>
                </div>
                <div className="p-2 bg-card rounded-lg border border-emerald-500/20">
                  <span className="text-muted-foreground text-[10px] block">Peso Teórico / Pza</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    {lastBackflushingResult.theoretical_piece_weight_kg} kg
                  </span>
                </div>
                <div className="p-2 bg-card rounded-lg border border-emerald-500/20">
                  <span className="text-muted-foreground text-[10px] block">Merma Transición</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    {lastBackflushingResult.transition_scrap_kg} kg
                  </span>
                </div>
                <div className="p-2 bg-card rounded-lg border border-emerald-500/20">
                  <span className="text-muted-foreground text-[10px] block">Materia Prima Total</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300 font-black text-sm">
                    {lastBackflushingResult.total_raw_material_consumed_kg} kg
                  </span>
                </div>
              </div>

              {lastBackflushingResult.ingredients_breakdown?.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20 text-xs">
                  <span className="font-black text-muted-foreground uppercase text-[11px] block mb-1">
                    Desglose de Materias Primas Consumidas de la Mezcla:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {lastBackflushingResult.ingredients_breakdown.map((ing) => (
                      <span
                        key={ing.material_id}
                        className="bg-card px-2 py-1 rounded border border-border text-[11px] font-mono font-bold text-foreground"
                      >
                        {ing.material_name}: -{ing.consumed_kg} kg
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: MINI-INVENTARIO DE RACKS Y CÁLCULO EN VIVO (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* CÁLCULO DE BACKFLUSHING EN VIVO (Regla 6) */}
          <div className="bg-card border-2 border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-base font-black uppercase text-foreground flex items-center gap-2 border-b-2 border-border pb-2.5">
              <Scale className="h-5 w-5 text-primary" />
              2. Estimación Teórica (Backflushing)
            </h3>

            {selectedFormula ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Fórmula en Uso</span>
                  <p className="font-black text-foreground text-sm">{selectedFormula.name}</p>
                  <div className="flex justify-between text-muted-foreground font-bold text-[11px] pt-1">
                    <span>Tamaño Lote: {selectedFormula.batch_size_kg} kg</span>
                    <span>Rendimiento: {selectedFormula.expected_yield_pieces} pzas</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-bold">
                  <div className="p-3 bg-card border-2 border-border rounded-xl">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Peso Teórico / Pza
                    </span>
                    <span className="font-mono text-base font-black text-foreground">
                      {theoreticalWeightPerPiece} kg
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({selectedFormula.batch_size_kg}kg / {selectedFormula.expected_yield_pieces}pz)
                    </span>
                  </div>

                  <div className="p-3 bg-primary/10 border-2 border-primary/30 rounded-xl">
                    <span className="text-[10px] uppercase text-primary block">
                      Materia Prima Teórica
                    </span>
                    <span className="font-mono text-base font-black text-primary">
                      {estimatedRawMaterialConsumedKg} kg
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({pieces} pz × {theoreticalWeightPerPiece} kg)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                <p className="text-xs font-bold text-muted-foreground">
                  Escanee o seleccione una mezcla para visualizar el cálculo de rendimiento teórico.
                </p>
              </div>
            )}
          </div>

          {/* MINI-INVENTARIO FÍSICO DE RACKS (Regla 5) */}
          <div className="bg-card border-2 border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-border pb-2.5">
              <h3 className="text-base font-black uppercase text-foreground flex items-center gap-2">
                <Archive className="h-5 w-5 text-primary" />
                3. Mini-Inventario de Racks ({racks.length})
              </h3>
              <span className="text-[11px] font-bold text-muted-foreground">
                Click para seleccionar
              </span>
            </div>

            <div className="space-y-3">
              {racks.map((rack) => {
                const percent = Math.min(
                  100,
                  Math.round(((rack.current_quantity || 0) / (rack.max_capacity || 100)) * 100)
                );
                const isSelected = selectedRack?.id === rack.id || rackQr === rack.qr_code;

                return (
                  <div
                    key={rack.id}
                    onClick={() => onSelectRackFromGrid(rack)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-foreground">{rack.rack_code}</span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {rack.qr_code}
                        </span>
                      </div>

                      <Badge
                        variant={
                          rack.status === 'VACIO'
                            ? 'secondary'
                            : rack.status === 'LLENO'
                            ? 'destructive'
                            : 'default'
                        }
                        className="text-[10px] font-black uppercase"
                      >
                        {rack.status}
                      </Badge>
                    </div>

                    {/* Barra de Capacidad */}
                    <div className="space-y-1">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percent >= 100
                              ? 'bg-destructive'
                              : percent >= 75
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono font-bold text-muted-foreground">
                        <span>
                          {rack.current_quantity} / {rack.max_capacity} pzas ({percent}%)
                        </span>
                        <span>Disp: {Math.max(0, rack.max_capacity - rack.current_quantity)}</span>
                      </div>
                    </div>

                    {/* Condicionamiento */}
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-semibold">Condicionado a:</span>
                      <span className="font-black text-foreground">
                        {rack.currentPtiType?.name || (rack.status === 'VACIO' ? 'Libre (Vacío)' : 'Sin Asignar')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
