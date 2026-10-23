import React from 'react';
import {
  Factory,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  ArrowUpCircle,
  PlusCircle,
  Layers,
  Scale,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  QrCode
} from 'lucide-react';
import {
  MachineQueueGroup,
  ExtruderQueue,
  Formula
} from '../../types/extrusion.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';

export interface ExtrusionBoardPresenterProps {
  queues: MachineQueueGroup[];
  formulas: Formula[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  onOpenContainerQr?: (qrCodeOrFolio: string) => void;
  // Modal Switch Priority
  isSwitchModalOpen: boolean;
  targetQueue: ExtruderQueue | null;
  activeQueue: ExtruderQueue | null;
  scrapWeight: string;
  onScrapWeightChange: (val: string) => void;
  onOpenSwitchModal: (targetQueue: ExtruderQueue, activeQueue: ExtruderQueue | null) => void;
  onCloseSwitchModal: () => void;
  onConfirmSwitch: () => void;
  isSwitching: boolean;
  // Modal Enqueue
  isEnqueueModalOpen: boolean;
  selectedMachineId: number;
  enqueueForm: {
    consumption_order_qr_id: string;
    formula_id: number | '';
    priority: number;
    notes: string;
  };
  onEnqueueFormChange: (field: string, value: any) => void;
  onOpenEnqueueModal: (machineId: number) => void;
  onCloseEnqueueModal: () => void;
  onConfirmEnqueue: () => void;
  isEnqueuing: boolean;
  isFormulaRestrictedForMachine: (formula: Formula, machineId: number) => boolean;
}

export const ExtrusionBoardPresenter: React.FC<ExtrusionBoardPresenterProps> = ({
  queues,
  formulas,
  isLoading,
  isError,
  onRefresh,
  isSwitchModalOpen,
  targetQueue,
  activeQueue,
  scrapWeight,
  onScrapWeightChange,
  onOpenSwitchModal,
  onCloseSwitchModal,
  onConfirmSwitch,
  isSwitching,
  isEnqueueModalOpen,
  selectedMachineId,
  enqueueForm,
  onEnqueueFormChange,
  onOpenEnqueueModal,
  onCloseEnqueueModal,
  onConfirmEnqueue,
  isEnqueuing,
  isFormulaRestrictedForMachine,
  onOpenContainerQr,
}) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 pb-32 lg:pr-24">
      {/* Header Industrial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border-2 border-border p-5 rounded-xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Factory className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
                Tablero de Control de Extrusión
              </h1>
              <p className="text-sm font-semibold text-muted-foreground">
                Supervisión de piso: Gestión de Colas, Transiciones con Purga y Restricciones Operativas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="font-bold border-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-destructive/15 border-2 border-destructive text-destructive rounded-xl flex items-center gap-3 font-bold">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <span>Error al sincronizar con el servidor de Extrusión. Por favor, reintente.</span>
        </div>
      )}

      {/* Kanban Grid de las 4 Extrusoras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {queues.map((group) => {
          const { machine, active, paused, waiting } = group;
          const isMachine4 = machine.id === 4;

          return (
            <div
              key={machine.id}
              className={`flex flex-col bg-card rounded-xl border-2 shadow-sm transition-all overflow-hidden ${
                isMachine4 ? 'border-amber-500/60 dark:border-amber-500/40' : 'border-border'
              }`}
            >
              {/* Cabecera de Máquina */}
              <div
                className={`p-4 border-b-2 ${
                  isMachine4
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-muted/40 border-border'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Línea de Producción
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={machine.type === 'FIXED' ? 'secondary' : 'default'}
                        className="font-black text-[10px] uppercase px-1.5 py-0"
                      >
                        {machine.type === 'FIXED' ? 'Fija' : 'Dinámica'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold font-mono px-1.5 py-0 ${
                          machine.modo_silo 
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {machine.modo_silo ? 'Silo' : 'Costales'}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="text-xl font-black text-foreground tracking-tight whitespace-nowrap">
                    {machine.name}
                  </h2>

                  {machine.modo_silo && machine.silo && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                      Silo: {machine.silo.name} ({Number(machine.silo.current_stock_kg || 0).toLocaleString()} kg)
                    </span>
                  )}
                </div>

                {/* Banner de Restricción Estricta para Extrusora 4 */}
                {isMachine4 && (
                  <div className="mt-2.5 p-2 bg-rose-500/15 border border-rose-500/40 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-400">
                    <ShieldAlert className="h-4 w-4 shrink-0 font-bold" />
                    <span className="text-xs font-black uppercase tracking-wide">
                      Regla Estricta: PROHIBIDO POLIPROPILENO (B)
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs font-bold text-muted-foreground pt-2 border-t border-border/40">
                  <span>En Cola: {waiting.length + paused.length + (active ? 1 : 0)} mezclas</span>
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                    {waiting.length} en espera
                  </Badge>
                </div>
              </div>

              {/* Contenido de la Columna */}
              <div className="p-3.5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* SECCIÓN 1: MEZCLA ACTIVA */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
                        Mezcla en Proceso (Activa)
                      </span>
                    </div>

                    {active ? (
                      <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl space-y-2.5 shadow-sm">
                        {/* Fila Superior: Badges y Botón de QR */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
                              ACTIVA
                            </Badge>
                            {(active.is_silo_kit || active.consumption_order_qr_id?.startsWith('KIT-ADITIVOS')) && (
                              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-black text-[9px] px-1.5 py-0.5 shrink-0">
                                KIT SILO
                              </Badge>
                            )}
                          </div>
                          {onOpenContainerQr && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenContainerQr(active.consumption_order_qr_id)}
                              className="h-6 px-2 text-[10px] font-bold border-emerald-500/50 text-emerald-700 dark:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/30 gap-1 shrink-0"
                              title="Ver / Reimprimir QR de este contenedor"
                            >
                              <QrCode className="h-3 w-3" />
                              <span>Ver QR</span>
                            </Button>
                          )}
                        </div>

                        {/* Código QR del Contenedor con ancho completo y alto contraste */}
                        <div className="font-mono text-xs font-black px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 border border-emerald-500/30 truncate" title={active.consumption_order_qr_id}>
                          {active.consumption_order_qr_id}
                        </div>

                        <div>
                          <p className="text-sm font-black text-foreground leading-tight">
                            {active.formula?.name || 'Fórmula Asignada'}
                          </p>
                          <p className="text-xs font-bold text-muted-foreground">
                            Código: {active.formula?.code || 'N/A'}
                          </p>
                        </div>

                        {/* Rendimientos Teóricos */}
                        {active.formula && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-bold">
                            <div className="bg-card/70 p-1.5 rounded border border-emerald-500/20">
                              <span className="text-muted-foreground block text-[10px]">Rdto. Piezas</span>
                              <span className="font-mono text-foreground font-black">
                                {active.formula.expected_yield_pieces} pzas
                              </span>
                            </div>
                            <div className="bg-card/70 p-1.5 rounded border border-emerald-500/20">
                              <span className="text-muted-foreground block text-[10px]">Lote Mezcla</span>
                              <span className="font-mono text-foreground font-black">
                                {active.formula.batch_size_kg} kg
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-border rounded-xl text-center bg-muted/20">
                        <p className="text-xs font-bold text-muted-foreground">
                          Extrusora inactiva / Sin mezcla activa
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 2: MEZCLAS PAUSADAS */}
                  {paused.length > 0 && (
                    <div>
                      <span className="text-xs font-black tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5 mb-2">
                        <Pause className="h-3.5 w-3.5" />
                        Pausadas / Interrumpidas ({paused.length})
                      </span>

                      <div className="space-y-2">
                        {paused.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-amber-800 dark:text-amber-300">
                                {item.consumption_order_qr_id}
                              </span>
                              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 font-black text-[10px]">
                                PAUSADA
                              </Badge>
                            </div>
                            <p className="text-xs font-black text-foreground">
                              {item.formula?.name}
                            </p>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenSwitchModal(item, active)}
                                className="flex-1 h-8 text-xs font-black border-amber-500/50 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                              >
                                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                                Reanudar (Purga)
                              </Button>
                              {onOpenContainerQr && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenContainerQr(item.consumption_order_qr_id)}
                                  className="h-8 px-2.5 text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 gap-1 shrink-0"
                                  title="Ver / Reimprimir QR de este contenedor"
                                >
                                  <QrCode className="h-3.5 w-3.5" />
                                  <span>QR</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 3: COLA EN ESPERA (PRIORIDADES) */}
                  <div>
                    <span className="text-xs font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5" />
                      Cola de Espera ({waiting.length})
                    </span>

                    {waiting.length === 0 ? (
                      <div className="p-3 border border-border rounded-lg text-center bg-muted/10">
                        <p className="text-xs font-semibold text-muted-foreground">Cola vacía</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waiting.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-3 bg-card border-2 border-border rounded-xl space-y-2 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0 whitespace-nowrap">
                                  #{idx + 1} Turno (P{item.priority})
                                </span>
                                {(item.is_silo_kit || item.consumption_order_qr_id?.startsWith('KIT-ADITIVOS')) && (
                                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-black text-[9px] px-1.5 py-0.5">
                                    KIT SILO
                                  </Badge>
                                )}
                              </div>
                              <span className="font-mono text-xs font-bold text-muted-foreground">
                                {item.consumption_order_qr_id}
                              </span>
                            </div>

                            <p className="text-xs font-black text-foreground">
                              {item.formula?.name}
                            </p>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onOpenSwitchModal(item, active)}
                                className="flex-1 h-8 text-xs font-black bg-secondary hover:bg-secondary/80 text-foreground"
                              >
                                <ArrowUpCircle className="h-3.5 w-3.5 mr-1 text-primary" />
                                Priorizar / Activar
                              </Button>
                              {onOpenContainerQr && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenContainerQr(item.consumption_order_qr_id)}
                                  className="h-8 px-2.5 text-xs font-bold border-border hover:border-primary/50 text-foreground gap-1 shrink-0"
                                  title="Ver / Reimprimir QR de este contenedor"
                                >
                                  <QrCode className="h-3.5 w-3.5 text-primary" />
                                  <span>QR</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie de Columna */}
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEnqueueModal(machine.id)}
                    className="w-full text-xs font-black border-dashed border-2 hover:border-primary"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Encolar Mezcla
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: INTERRUMPIÓN DE MEZCLA Y REGISTRO DE MERMA DE PURGA (Reglas 3 y 4) */}
      {isSwitchModalOpen && targetQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none animate-in fade-in duration-150">
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-500/40">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground uppercase">
                    Interrumpir Mezcla y Priorizar
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    Regla Operativa: Registro Obligatorio de Merma de Purga
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseSwitchModal}
                className="h-8 w-8 p-0 rounded-full font-bold"
              >
                ✕
              </Button>
            </div>

            {/* Comparativa de Mezclas */}
            <div className="space-y-3">
              {activeQueue && (
                <div className="p-3 bg-rose-500/10 border-2 border-rose-500/30 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                    <span className="uppercase">Mezcla Actual (Pasará a PAUSADA)</span>
                    <Badge variant="outline" className="border-rose-500 text-rose-700 dark:text-rose-400 font-black">
                      PAUSARÁ
                    </Badge>
                  </div>
                  <p className="font-mono font-black text-foreground text-sm">
                    {activeQueue.consumption_order_qr_id}
                  </p>
                  <p className="font-bold text-muted-foreground">{activeQueue.formula?.name}</p>
                </div>
              )}

              <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="uppercase">Nueva Mezcla Seleccionada</span>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 font-black">
                    ACTIVARÁ
                  </Badge>
                </div>
                <p className="font-mono font-black text-foreground text-sm">
                  {targetQueue.consumption_order_qr_id}
                </p>
                <p className="font-bold text-muted-foreground">{targetQueue.formula?.name}</p>
              </div>
            </div>

            {/* Campo Obligatorio de Merma de Transición */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border-2 border-border">
              <label className="text-xs font-black uppercase text-foreground flex items-center justify-between">
                <span>Peso de Merma de Transición / Purga (Kg) *</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  Requerido &gt; 0
                </span>
              </label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Ej: 15.5"
                  value={scrapWeight}
                  onChange={(e) => onScrapWeightChange(e.target.value)}
                  className="pl-9 font-mono font-black text-base h-11 border-2"
                />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground leading-tight">
                El sistema registrará esta merma en el log de extrusión antes de permitir la entrada del nuevo material a la cabeza de la extrusora.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onCloseSwitchModal}
                disabled={isSwitching}
                className="font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={onConfirmSwitch}
                disabled={isSwitching || !scrapWeight || Number(scrapWeight) <= 0}
                className="font-black bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSwitching ? 'Procesando Transición...' : 'Confirmar e Iniciar Nueva Mezcla'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ENCOLAR MEZCLA NUEVA (Valida Restricción de Máquina 4) */}
      {isEnqueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none animate-in fade-in duration-150">
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b-2 border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground uppercase">
                    Encolar Mezcla en Extrusora {selectedMachineId}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    Vinculación de Orden de Consumo de Almacén con Fórmula
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseEnqueueModal}
                className="h-8 w-8 p-0 rounded-full font-bold"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              {/* Restricción activa banner para Extrusora 4 */}
              {selectedMachineId === 4 && (
                <div className="p-3 bg-rose-500/15 border-2 border-rose-500/50 rounded-xl text-rose-700 dark:text-rose-400 space-y-1">
                  <div className="flex items-center gap-2 font-black text-xs uppercase">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Bloqueo Activo en Máquina 4</span>
                  </div>
                  <p className="text-xs font-bold">
                    Cualquier fórmula que contenga &quot;POLIPROPILENO (B)&quot; se encuentra inhabilitada para esta máquina por directriz de calidad.
                  </p>
                </div>
              )}

              {/* QR Orden de Consumo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Código QR de Orden de Consumo (Almacén) *
                </label>
                <div className="flex gap-2">
                  <QrScannerButton
                    title="Escanear QR de la orden de consumo"
                    onScan={(code) => onEnqueueFormChange('consumption_order_qr_id', code.trim())}
                  />
                  <Input
                    placeholder="Ej: QR-MIX-ORD-001 o folio"
                    value={enqueueForm.consumption_order_qr_id}
                    onChange={(e) => onEnqueueFormChange('consumption_order_qr_id', e.target.value)}
                    className="font-mono font-bold h-10 border-2"
                  />
                </div>
              </div>

              {/* Selección de Fórmula */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Fórmula a Procesar *
                </label>
                <select
                  value={enqueueForm.formula_id}
                  onChange={(e) => onEnqueueFormChange('formula_id', Number(e.target.value) || '')}
                  className="w-full h-11 px-3 bg-background border-2 border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Seleccione una fórmula --</option>
                  {formulas.map((form) => {
                    const isRestricted = isFormulaRestrictedForMachine(form, selectedMachineId);
                    return (
                      <option
                        key={form.id}
                        value={form.id}
                        disabled={isRestricted}
                        className={isRestricted ? 'text-destructive font-bold' : ''}
                      >
                        {form.name} ({form.code}) - {form.batch_size_kg} kg{' '}
                        {isRestricted ? '⚠️ [BLOQUEADA: CONTIENE POLIPROPILENO (B)]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Prioridad */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Nivel de Prioridad (Mayor número = Mayor prioridad)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={enqueueForm.priority}
                  onChange={(e) => onEnqueueFormChange('priority', Number(e.target.value) || 1)}
                  className="font-mono font-bold h-10 border-2"
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  Notas / Observaciones de Piso
                </label>
                <Input
                  placeholder="Opcional: Turno, especificaciones..."
                  value={enqueueForm.notes}
                  onChange={(e) => onEnqueueFormChange('notes', e.target.value)}
                  className="text-sm font-medium h-10 border-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onCloseEnqueueModal}
                disabled={isEnqueuing}
                className="font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={onConfirmEnqueue}
                disabled={
                  isEnqueuing ||
                  !enqueueForm.consumption_order_qr_id ||
                  !enqueueForm.formula_id
                }
                className="font-black bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isEnqueuing ? 'Encolando...' : 'Confirmar y Encolar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
