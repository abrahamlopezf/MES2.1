import React from 'react';
import {
  Factory,
  AlertTriangle,
  ArrowUpCircle,
  PlusCircle,
  Scale,
  RefreshCw,
  CheckCircle2,
  XCircle,
  QrCode,
  ChevronDown
} from 'lucide-react';
import {
  MachineQueueGroup,
  ExtruderQueue,
  Formula
} from '../../types/extrusion.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getQueueOutputVariantKey } from '../../domain/queueOutputVariant';
import { Input } from '@/components/ui/input';
import { QrScannerButton } from '@/shared/components/scan/QrScannerButton';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';

export interface ExtrusionBoardPresenterProps {
  queues: MachineQueueGroup[];
  formulas: Formula[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  onOpenContainerQr?: (qrCodeOrFolio: string) => void;
  // Modal Switch Priority
  isSwitchModalOpen: boolean;
  isPendingPtiPromptOpen: boolean;
  onPendingPtiRegister: () => void;
  onPendingPtiContinue: () => void;
  onPendingPtiCancel: () => void;
  pendingPtiStep: 'QUESTION' | 'QUICK_INGRESS';
  quickRacks: Array<{ id: number; rack_code: string; qr_code: string; current_quantity: number; max_capacity: number; current_pti_product_id?: number | null; current_pti_type_id?: number | null }>;
  quickPtiProducts: Array<{ id: number; code: string; name: string; color: string | null; material_id?: number | null; unit_price: number }>;
  quickRackId: number | '';
  onQuickRackChange: (id: number | '') => void;
  quickPtiProductId: number | '';
  onQuickPtiProductChange: (id: number | '') => void;
  quickPieces: string;
  onQuickPiecesChange: (value: string) => void;
  onStartQuickPtiIngress: () => void;
  onConfirmQuickPtiIngress: () => void;
  isQuickPtiSubmitting: boolean;
  targetQueue: ExtruderQueue | null;
  activeQueue: ExtruderQueue | null;
  purgePercentage: string;
  onPurgePercentageChange: (val: string) => void;
  estimatedTransitionScrapKg: number;
  onOpenSwitchModal: (targetQueue: ExtruderQueue, activeQueue: ExtruderQueue | null, prioritizeFormulaId?: number) => void;
  onScanPausedQr: (scannedCode: string, expectedQueue: ExtruderQueue) => void;
  onCloseSwitchModal: () => void;
  onConfirmSwitch: () => void;
  isSwitching: boolean;
  resumeQrVerified: boolean;
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

type QueueEntryStatus = 'ACTIVA' | 'PAUSADA' | 'EN_ESPERA';

interface GroupedFormulaQueue {
  groupKey: string;
  formulaId: number;
  outputPtiProductId: number | null;
  formulaName: string;
  formulaCode?: string;
  entries: Array<{ queue: ExtruderQueue; status: QueueEntryStatus; position?: number }>;
  activeFormulaSummary?: MachineQueueGroup['active_formula_group'];
}

const groupQueuesByFormula = (machineQueue: MachineQueueGroup): GroupedFormulaQueue[] => {
  const grouped = new Map<string, GroupedFormulaQueue>();
  const addQueue = (queue: ExtruderQueue, status: QueueEntryStatus, position?: number) => {
    if (!queue || typeof queue !== 'object') return;
    const formulaId = Number(queue.formula_id ?? queue.formula?.id ?? 0);
    const outputPtiProductId = Number(queue.output_pti_product_id || queue.formula?.ptiProducts?.[0]?.id || 0) || null;
    const groupKey = getQueueOutputVariantKey(queue);
    let formulaGroup = grouped.get(groupKey);

    if (!formulaGroup) {
      formulaGroup = {
        groupKey,
        formulaId,
        outputPtiProductId,
        formulaName: queue.formula?.name || 'Fórmula no disponible',
        formulaCode: queue.formula?.code,
        entries: [],
        activeFormulaSummary:
          machineQueue.active_formula_group?.formula_id === formulaId
            && (!outputPtiProductId || !machineQueue.active_formula_group.output_pti_product_id || Number(machineQueue.active_formula_group.output_pti_product_id) === outputPtiProductId)
            ? machineQueue.active_formula_group
            : undefined,
      };
      grouped.set(groupKey, formulaGroup);
    }

    formulaGroup.entries.push({ queue, status, position });
  };

  if (machineQueue.active) addQueue(machineQueue.active, 'ACTIVA');
  machineQueue.paused.forEach((queue) => addQueue(queue, 'PAUSADA'));
  machineQueue.waiting.forEach((queue, index) => addQueue(queue, 'EN_ESPERA', index + 1));

  return Array.from(grouped.values());
};

interface FormulaQueueGroupsProps {
  machineQueue: MachineQueueGroup;
  onOpenSwitchModal: (targetQueue: ExtruderQueue, activeQueue: ExtruderQueue | null, prioritizeFormulaId?: number) => void;
  onScanPausedQr: (scannedCode: string, expectedQueue: ExtruderQueue) => void;
  onOpenContainerQr?: (qrCodeOrFolio: string) => void;
}

const FormulaQueueGroups: React.FC<FormulaQueueGroupsProps> = ({
  machineQueue,
  onOpenSwitchModal,
  onScanPausedQr,
  onOpenContainerQr,
}) => {
  const formulaGroups = groupQueuesByFormula(machineQueue);

  if (formulaGroups.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/10 px-4 py-6 text-center">
        <p className="text-base font-semibold text-muted-foreground">No hay contenedores asignados a esta extrusora.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Contenedores agrupados por fórmula">
      <h3 className="text-lg font-black text-foreground">Fórmulas asignadas</h3>
      {formulaGroups.map((formulaGroup) => {
        const activeCount = formulaGroup.entries.filter((entry) => entry.status === 'ACTIVA').length;
        const pausedCount = formulaGroup.entries.filter((entry) => entry.status === 'PAUSADA').length;
        const waitingCount = formulaGroup.entries.filter((entry) => entry.status === 'EN_ESPERA').length;
        const firstWaiting = formulaGroup.entries.find((entry) => entry.status === 'EN_ESPERA');
        const groupAlreadyActive = Number(machineQueue.active?.formula_id) === Number(formulaGroup.formulaId);
        const formulaColors = [...new Set(formulaGroup.entries
          .filter((entry) => Boolean(entry?.queue))
          .map(({ queue }) => queue?.output_pti_color || queue?.formula?.ptiProducts?.find((pti) => Number(pti.id) === Number(queue?.output_pti_product_id))?.color || queue?.formula?.ptiProducts?.[0]?.color)
          .filter(Boolean))];
        const summary = (showContainerCount: boolean) => (
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black leading-snug">{formulaGroup.formulaName}</span>
              {showContainerCount && (
                <Badge variant="secondary" className="min-h-7 px-2 text-sm font-bold">
                  {formulaGroup.entries.length} contenedores
                </Badge>
              )}
            </div>
            {formulaGroup.formulaCode && (
              <span className="block text-sm font-semibold text-muted-foreground">Código: {formulaGroup.formulaCode}</span>
            )}
            <span className="block text-sm font-semibold text-muted-foreground">Color(es) de salida: {formulaColors.join(', ') || 'PTI sin color enlazado'}</span>
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
              {activeCount > 0 && <span className="text-emerald-700 dark:text-emerald-300">{activeCount} activa{activeCount === 1 ? '' : 's'}</span>}
              <span>{waitingCount} en espera</span>
              {pausedCount > 0 && <span className="text-amber-700 dark:text-amber-300">{pausedCount} pausada{pausedCount === 1 ? '' : 's'}</span>}
            </span>
            {formulaGroup.activeFormulaSummary && formulaGroup.activeFormulaSummary.batch_count > 1 && (
              <span className="block text-sm font-bold text-foreground">
                Agrupación reportada por producción: {formulaGroup.activeFormulaSummary.batch_count} lotes · {Number(formulaGroup.activeFormulaSummary.quantity_kg).toLocaleString()} kg
              </span>
            )}
          </div>
        );
        const containers = (
          <div className="space-y-3 border-t border-border p-3 sm:p-4">
            {formulaGroup.entries.length > 1 && firstWaiting && !groupAlreadyActive && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenSwitchModal(firstWaiting.queue, machineQueue.active, formulaGroup.formulaId)}
                className="min-h-14 w-full justify-center whitespace-normal text-base font-black sm:text-lg"
              >
                <ArrowUpCircle className="mr-2 h-5 w-5 text-primary" />
                Priorizar fórmula completa ({waitingCount} en espera)
              </Button>
            )}
            {formulaGroup.entries.map(({ queue, status, position }) => (
              <article key={queue.id} className="border-b border-border py-3 last:border-b-0 sm:py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="break-all font-mono text-base font-black text-foreground">{queue.consumption_order_qr_id}</span>
                  <Badge
                    variant={status === 'ACTIVA' ? 'default' : 'secondary'}
                    className={`min-h-8 px-2.5 text-sm font-black ${
                      status === 'ACTIVA'
                        ? 'bg-emerald-600 text-white'
                        : status === 'PAUSADA'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                          : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {status === 'EN_ESPERA' ? `En espera · turno ${position} · prioridad ${queue.priority}` : status === 'PAUSADA' ? 'Pausada' : 'Activa'}
                  </Badge>
                </div>
                {queue.container_remaining_quantity_kg != null && (
                  <p className="mt-2 text-sm font-bold text-foreground">Saldo de este contenedor: {Number(queue.container_remaining_quantity_kg).toFixed(3)} kg</p>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {status === 'PAUSADA' && (
                    <QrScannerButton
                      title={`Escanear QR de ${queue.consumption_order_qr_id} para reanudar`}
                      onScan={(code) => onScanPausedQr(code, queue)}
                    />
                  )}
                  {status === 'EN_ESPERA' && (
                    <Button
                      variant="secondary"
                      onClick={() => onOpenSwitchModal(queue, machineQueue.active)}
                      className="min-h-12 w-full whitespace-normal text-base font-bold sm:flex-1"
                    >
                      <ArrowUpCircle className="mr-2 h-5 w-5 text-primary" />
                      Priorizar / Activar
                    </Button>
                  )}
                  {onOpenContainerQr && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenContainerQr(queue.consumption_order_qr_id)}
                      className="min-h-12 w-full text-base font-bold sm:w-auto"
                      title="Ver o reimprimir QR de este contenedor"
                    >
                      <QrCode className="mr-2 h-5 w-5" />
                      Ver QR del contenedor
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {formulaGroup.activeFormulaSummary && formulaGroup.activeFormulaSummary.batch_count > 1 && (
              <p className="px-1 text-sm font-semibold text-muted-foreground">
                Los contenedores conservan sus QR individuales para mantener la trazabilidad de cada lote.
              </p>
            )}
          </div>
        );

        if (formulaGroup.entries.length === 1) {
          return (
            <section key={formulaGroup.formulaId} className="rounded-xl border-2 border-border bg-card">
              <div className="px-4 py-4">{summary(false)}</div>
              {containers}
            </section>
          );
        }

        return (
          <details key={formulaGroup.formulaId} className="group rounded-xl border-2 border-border bg-card">
            <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-foreground hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
              {summary(true)}
              <ChevronDown aria-hidden="true" className="h-6 w-6 shrink-0 text-foreground transition-transform group-open:rotate-180" />
            </summary>
            {containers}
          </details>
        );
      })}
    </section>
  );
};

export const ExtrusionBoardPresenter: React.FC<ExtrusionBoardPresenterProps> = ({
  queues,
  formulas,
  isLoading,
  isError,
  onRefresh,
  isSwitchModalOpen,
  isPendingPtiPromptOpen,
  onPendingPtiRegister,
  onPendingPtiContinue,
  onPendingPtiCancel,
  pendingPtiStep,
  quickRacks,
  quickPtiProducts,
  quickRackId,
  onQuickRackChange,
  quickPtiProductId,
  onQuickPtiProductChange,
  quickPieces,
  onQuickPiecesChange,
  onStartQuickPtiIngress,
  onConfirmQuickPtiIngress,
  isQuickPtiSubmitting,
  targetQueue,
  activeQueue,
  purgePercentage,
  onPurgePercentageChange,
  estimatedTransitionScrapKg,
  onOpenSwitchModal,
  onScanPausedQr,
  onCloseSwitchModal,
  onConfirmSwitch,
  isSwitching,
  resumeQrVerified,
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
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const [activeTabMachineId, setActiveTabMachineId] = React.useState<number | null>(null);
  const visibleMachineId = queues.some((group) => group.machine.id === activeTabMachineId)
    ? activeTabMachineId
    : queues[0]?.machine.id ?? null;

  return (
    <div className="extrusion-workspace p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 pb-32 lg:pr-24">
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

      {/* Resumen comparativo; el detalle completo se enfoca en una máquina hasta escritorio amplio. */}
      <section className="space-y-3" aria-label="Navegación de extrusoras">
        <p className="text-base font-semibold text-foreground">Selecciona una extrusora para consultar sus fórmulas y contenedores.</p>
        <div role="group" aria-label="Seleccionar extrusora" className="flex gap-3 overflow-x-auto pb-2">
          {queues.map((group) => {
            const { machine, active, paused, waiting } = group;
            const isSelected = machine.id === visibleMachineId;
            return (
              <button
                key={machine.id}
                type="button"
                aria-pressed={isSelected}
                aria-controls="selected-machine-details"
                onClick={() => setActiveTabMachineId(machine.id)}
                className={`flex min-h-20 min-w-52 shrink-0 flex-col items-start justify-center gap-1 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 xl:min-w-0 xl:flex-1 ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                <span className="text-base font-black leading-tight">{machine.name}</span>
                <span className="text-sm font-semibold text-foreground">
                  {active ? '1 activa' : 'Sin mezcla activa'}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {waiting.length} en espera · {paused.length} pausadas
                </span>
                {machine.id === 4 && <span className="text-sm font-bold text-destructive">Restricción de material</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Una sola extrusora activa en la vista; las demás se consultan desde la cinta. */}
      <div className="space-y-5">
        {queues.map((group) => {
          const { machine, active, waiting } = group;
          const isSelectedMachine = machine.id === visibleMachineId;

          return (
            <div
              key={machine.id}
              id={isSelectedMachine ? 'selected-machine-details' : undefined}
              className={`${isSelectedMachine ? 'flex' : 'hidden'} w-full flex-col overflow-hidden rounded-xl border-2 border-border bg-card shadow-sm`}
            >
              {/* Cabecera de Máquina */}
              <div
                className="p-4 border-b-2 bg-muted/40 border-border"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Línea de Producción
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={machine.is_dynamic_member || machine.code === 'EXT-01' ? 'secondary' : 'outline'}
                        className="font-black text-[10px] uppercase px-1.5 py-0"
                      >
                        {machine.code === 'EXT-01' ? 'Exclusiva' : machine.is_dynamic_member ? 'Grupo dinámico' : 'Fuera del grupo'}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="text-xl font-black text-foreground tracking-tight whitespace-nowrap">
                    {machine.name}
                  </h2>

                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-sm font-bold text-foreground">
                  <span>Mezclas asignadas: {group.total_in_queue}</span>
                  <Badge variant="secondary" className="min-h-8 px-2 text-sm font-bold">
                    {waiting.length} en espera
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between space-y-4 p-3.5 sm:p-5">
                <FormulaQueueGroups
                  machineQueue={group}
                  onOpenSwitchModal={onOpenSwitchModal}
                  onScanPausedQr={onScanPausedQr}
                  onOpenContainerQr={onOpenContainerQr}
                />
                {/* Pie de Columna */}
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEnqueueModal(machine.id)}
                    className="min-h-12 w-full border-2 border-dashed text-base font-black hover:border-primary"
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

      {isPendingPtiPromptOpen && targetQueue && activeQueue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="pending-pti-title" aria-describedby="pending-pti-description" className="my-auto w-full max-w-xl space-y-5 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            {pendingPtiStep === 'QUESTION' ? <>
              <header className="space-y-2">
                <h2 id="pending-pti-title" className="text-xl font-black leading-tight">Antes de cambiar la mezcla</h2>
                <p id="pending-pti-description" className="text-sm leading-relaxed text-muted-foreground">¿Quedan bobinas de PTI de la mezcla activa por registrar en un rack?</p>
              </header>
              <div className="grid gap-2 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-2 sm:gap-4 sm:p-4">
                <p className="min-w-0 break-words"><strong className="block text-xs uppercase tracking-wide text-muted-foreground">Mezcla activa</strong><span className="font-semibold">{activeQueue.consumption_order_qr_id}</span></p>
                <p className="min-w-0 break-words"><strong className="block text-xs uppercase tracking-wide text-muted-foreground">Siguiente mezcla</strong><span className="font-semibold">{targetQueue.consumption_order_qr_id}</span></p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">Si quedan, registra esas bobinas ahora. Después indicarás el porcentaje de purgante.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={onPendingPtiRegister} className="h-auto min-h-[4.5rem] min-w-0 justify-start whitespace-normal px-4 py-3 text-left">
                  <span><span className="block font-bold">Sí, registrar bobinas</span><span className="mt-1 block text-xs font-medium text-muted-foreground">Abrir registro rápido en rack</span></span>
                </Button>
                <Button onClick={onPendingPtiContinue} className="h-auto min-h-[4.5rem] min-w-0 justify-start whitespace-normal px-4 py-3 text-left">
                  <span><span className="block font-bold">No hay pendientes</span><span className="mt-1 block text-xs font-medium opacity-80">Continuar al porcentaje de purgante</span></span>
                </Button>
              </div>
            </> : <>
              <header className="space-y-2">
                <h2 id="pending-pti-title" className="text-xl font-black leading-tight">Registro rápido de bobinas</h2>
                <p id="pending-pti-description" className="text-sm leading-relaxed text-muted-foreground">Registra el PTI terminado de la mezcla activa antes de comenzar la purga.</p>
              </header>
              <div className="grid gap-3">
                <label className="space-y-1 text-sm font-bold">Rack
                  <select value={quickRackId} onChange={(event) => onQuickRackChange(Number(event.target.value) || '')} className="h-11 w-full rounded-lg border-2 border-border bg-background px-3">
                    <option value="">Selecciona un rack compatible</option>
                    {quickRacks.filter((rack) => !rack.current_pti_product_id || Number(rack.current_pti_product_id) === Number(quickPtiProductId)).map((rack) => <option key={rack.id} value={rack.id}>{rack.rack_code} · {Math.max(0, rack.max_capacity - rack.current_quantity)} espacios</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-bold">PTI de la mezcla activa
                  <select value={quickPtiProductId} onChange={(event) => onQuickPtiProductChange(Number(event.target.value) || '')} className="h-11 w-full rounded-lg border-2 border-border bg-background px-3">
                    <option value="">Selecciona el PTI</option>
                    {quickPtiProducts.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}{product.color ? ` · ${product.color}` : ''}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-bold">Bobinas por registrar
                  <Input type="number" min="1" step="1" value={quickPieces} onChange={(event) => onQuickPiecesChange(event.target.value)} placeholder="Cantidad de bobinas" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Mezcla: <span className="font-semibold text-foreground">{activeQueue.consumption_order_qr_id}</span>. Al guardar, el PTI quedará trazado a esta mezcla.</p>
              {quickRacks.filter((rack) => !rack.current_pti_product_id || Number(rack.current_pti_product_id) === Number(quickPtiProductId)).length === 0 && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold">No hay racks compatibles para iniciar el registro. Registra un rack desde Ingreso de PTI y vuelve a este cambio. Si el rack seleccionado se llena, el sistema distribuirá las bobinas restantes en racks compatibles o creará uno automáticamente.</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onPendingPtiCancel}>Cancelar</Button>
                <Button onClick={onConfirmQuickPtiIngress} disabled={isQuickPtiSubmitting || !quickRackId || !quickPtiProductId || Number(quickPieces) <= 0}>{isQuickPtiSubmitting ? 'Registrando…' : 'Registrar y continuar'}</Button>
              </div>
            </>}
            {pendingPtiStep === 'QUESTION' && <div className="flex justify-end border-t border-border pt-3"><Button variant="ghost" onClick={onPendingPtiCancel} className="min-h-11 min-w-28">Cancelar</Button></div>}
          </div>
        </div>
      )}
      {/* Modal para confirmar transición entre mezclas */}
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
                    {targetQueue.status === 'PAUSADA' ? 'Confirmar reanudación de mezcla' : 'Interrumpir Mezcla y Priorizar'}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground">
                    {targetQueue.status === 'PAUSADA'
                      ? activeQueue ? 'QR validado. Confirma el cambio y registra la transición de línea.' : 'QR validado. Confirma para reactivar esta mezcla; no hay otra corrida activa.'
                      : 'La merma real se registra por color al cierre del turno.'}
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

            {resumeQrVerified && (
              <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                QR escaneado y validado para esta extrusora: <span className="font-mono">{targetQueue.consumption_order_qr_id}</span>
              </div>
            )}

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
                  <p className="font-semibold text-muted-foreground">Color PTI capturado: {activeQueue.output_pti_color || activeQueue.formula?.ptiProducts?.[0]?.color || 'Sin color ligado al PTI'}</p>
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
                <p className="font-semibold text-muted-foreground">Color PTI capturado: {targetQueue.output_pti_color || targetQueue.formula?.ptiProducts?.[0]?.color || 'Sin color ligado al PTI'}</p>
              </div>
            </div>

            {activeQueue ? <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-muted-foreground">Indica la proporción de purgante usada para limpiar el husillo. La merma estimada se calculará automáticamente; el peso real se capturará al cierre del turno por color.</p>
              <label className="block max-w-xs space-y-1 text-sm font-bold">Porcentaje de purgante (%)
                <div className="relative"><Input type="number" min="0" max="100" step="0.1" value={purgePercentage} onChange={(event) => onPurgePercentageChange(event.target.value)} placeholder="Ej. 5" className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div>
              </label>
              {purgePercentage !== '' && <div className="rounded-lg border border-primary/30 bg-primary/5 p-3" aria-live="polite">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Merma de transición estimada</p>
                <p className="mt-1 text-xl font-black tabular-nums">{estimatedTransitionScrapKg.toFixed(3)} kg</p>
                <p className="mt-1 text-xs text-muted-foreground">Saldo disponible de la mezcla nueva × porcentaje de purgante. Se ajustará con el pesaje real al cierre del turno.</p>
              </div>}
            </div> : targetQueue.status === 'PAUSADA' ? (
              <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm font-semibold text-muted-foreground">
                No se registrará merma de transición porque no hay otra mezcla activa que interrumpir.
              </p>
            ) : null}

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
                disabled={isSwitching || (Boolean(activeQueue && activeQueue.id !== targetQueue.id) && (purgePercentage === '' || Number(purgePercentage) < 0 || Number(purgePercentage) > 100)) || (targetQueue.status === 'PAUSADA' && !resumeQrVerified)}
                className="font-black bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSwitching ? 'Procesando Transición...' : targetQueue.status === 'PAUSADA' ? 'Confirmar y reanudar mezcla' : 'Confirmar e Iniciar Nueva Mezcla'}
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
                        {isRestricted ? '⚠️ [NO AUTORIZADA PARA ESTA MÁQUINA]' : ''}
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
