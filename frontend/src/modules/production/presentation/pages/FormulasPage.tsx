import React, { useState } from 'react';
import CollapsibleFilterPanel from '@/components/shared/CollapsibleFilterPanel';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Icon, renderAnyIcon } from '@/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MixRequestModal } from '../components/MixRequestModal';
import { EditFormulaModal } from '../components/EditFormulaModal';
import { CreateFormulaModal } from '../components/CreateFormulaModal';
import { PtiProductModal } from '../components/PtiProductModal';
import { FormulaDetailsModal } from '../components/FormulaDetailsModal';
import {
  useFloorFormulasQuery,
  usePtiProductsQuery,
  useUpdatePtiProductMutation,
  useDeletePtiProductMutation
} from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula, PtiProduct } from '@/modules/extrusion/types/extrusion.types';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { getClientTargetLabel, isClientFormula } from '@/modules/extrusion/domain/clientFormulaRules';
import { apiClient } from '@/core/api/apiClient';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  iconBg: string;
  valueColor?: string;
  subIcon?: any;
  subColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueColor = 'text-foreground',
  subIcon,
  subColor,
}) => (
  <Card className="border-border bg-card shadow-sm p-3 sm:p-4">
    <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2 sm:h-auto sm:w-auto sm:rounded-xl sm:p-3 ${iconBg}`}>
        {renderAnyIcon(icon, { size: 22 })}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug text-muted-foreground" title={title}>{title}</span>
        <div className={`mt-0.5 break-words text-base leading-tight font-black font-mono [overflow-wrap:anywhere] sm:text-lg xl:text-xl ${valueColor}`}>{value}</div>
        <span className={`mt-0.5 flex min-w-0 items-start gap-1 text-sm font-semibold leading-snug ${subColor || 'text-muted-foreground'}`}>
          {subIcon && renderAnyIcon(subIcon, { size: 14, className: 'shrink-0' })}
          <span className="min-w-0 break-words" title={subtitle}>{subtitle}</span>
        </span>
      </div>
    </div>
  </Card>
);

export const FormulasPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const allowCosts = canViewCosts(user);

  // Pestaña activa: 'FORMULAS' o 'PTI_CATALOG'
  const [activeTab, setActiveTab] = useState<'FORMULAS' | 'PTI_CATALOG'>('FORMULAS');

  // Estados de Fórmulas
  const [formulaSearchTerm, setFormulaSearchTerm] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [formulaViewMode, setFormulaViewMode] = useState<'cards' | 'list'>('cards');
  const [expandedMobileFormulaId, setExpandedMobileFormulaId] = useState<Formula['id'] | 'COLLAPSED' | null>(null);
  const [selectedFormulaDetails, setSelectedFormulaDetails] = useState<Formula | null>(null);
  const [selectedMixFormula, setSelectedMixFormula] = useState<Formula | null>(null);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [isCreateFormulaOpen, setIsCreateFormulaOpen] = useState(false);

  // Estados de Catálogo PTI
  const [ptiSearchTerm, setPtiSearchTerm] = useState('');
  const [ptiFormulaFilter, setPtiFormulaFilter] = useState<string>('ALL');
  const [ptiStatusFilter, setPtiStatusFilter] = useState<string>('ACTIVE');
  const [editingPti, setEditingPti] = useState<PtiProduct | null>(null);
  const [ptiLinkFormulaId, setPtiLinkFormulaId] = useState<number | null>(null);
  const [selectedPtiDetails, setSelectedPtiDetails] = useState<PtiProduct | null>(null);
  const [isPtiModalOpen, setIsPtiModalOpen] = useState(false);
  const [deletingPtiId, setDeletingPtiId] = useState<number | null>(null);

  // Queries
  const {
    data: formulas = [],
    isLoading: isFormulasLoading,
    isError: isFormulasError,
    error: formulasError,
    refetch: refetchFormulas,
  } = useFloorFormulasQuery({ is_active: 'ALL' });
  const {
    data: ptiProducts = [],
    isLoading: isPtiLoading,
    isError: isPtiError,
    error: ptiError,
    refetch: refetchPtis,
  } = usePtiProductsQuery({ is_active: 'ALL' });
  const catalogFormulas = formulas.filter((formula) => isClientFormula(formula.code));
  const { data: machineData = [] } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/extrusion/machines');
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      return [];
    },
  });
  const activeMachines = (Array.isArray(machineData) ? machineData : [])
    .filter((machine: any) => machine.is_active !== false
      && String(machine.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
      && String(machine.code || '').trim().toUpperCase() !== 'EXT-LIQ');
  const dynamicMachines = activeMachines.filter((machine: any) => machine.is_dynamic_member);

  // Mutations
  const updatePtiMutation = useUpdatePtiProductMutation();
  const deletePtiMutation = useDeletePtiProductMutation();

  // Helper para máquina destino
  const getTargetMachine = (formula: any) => {
    const clientTarget = getClientTargetLabel(formula);
    if (clientTarget === 'Grupo dinámico de extrusoras') {
      return dynamicMachines.map((machine: any) => machine.name).join(', ') || 'Grupo dinámico sin extrusoras activas';
    }
    if (clientTarget) return clientTarget;
    if (formula.allowed_extruders && formula.allowed_extruders.length > 0) return `Extrusora ${formula.allowed_extruders.join(', ')}`;
    if (formula.description && formula.description.includes('Extrusora')) {
      return formula.description;
    }
    return 'Extrusión General';
  };

  const getIngredients = (formula: any) => {
    return formula.ingredients || [];
  };

  // Filtrado de Fórmulas
  const filteredFormulas = catalogFormulas.filter((f: Formula) => {
    const matchesSearch =
      f.name.toLowerCase().includes(formulaSearchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(formulaSearchTerm.toLowerCase());
    const machine = getTargetMachine(f);
    const selectedMachineRecord = activeMachines.find((candidate: any) => candidate.name === selectedMachine);
    const assignmentMode = String(f.extruder_assignment_mode || '').toUpperCase();
    const matchesMachine = selectedMachine === 'ALL' || (
      selectedMachineRecord && assignmentMode === 'DYNAMIC'
        ? Boolean(selectedMachineRecord.is_dynamic_member)
        : selectedMachineRecord && assignmentMode === 'EXTRUDER_1'
          ? Number(selectedMachineRecord.machine_number) === 1
          : selectedMachineRecord && assignmentMode === 'FIXED'
            ? (f.allowed_extruders || []).map(Number).includes(Number(selectedMachineRecord.id))
            : machine.includes(selectedMachine)
    );
    return matchesSearch && matchesMachine;
  });
  const mobileExpandedFormulaId = expandedMobileFormulaId === 'COLLAPSED'
    ? null
    : filteredFormulas.some((formula) => formula.id === expandedMobileFormulaId)
      ? expandedMobileFormulaId
      : filteredFormulas[0]?.id ?? null;

  const machines = activeMachines.map((machine: any) => machine.name);

  // Filtrado de PTIs
  const filteredPtis = ptiProducts.filter((p: PtiProduct) => {
    const matchesSearch =
      p.name.toLowerCase().includes(ptiSearchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(ptiSearchTerm.toLowerCase()) ||
      (p.specifications && p.specifications.toLowerCase().includes(ptiSearchTerm.toLowerCase())) ||
      (p.tape_type && p.tape_type.toLowerCase().includes(ptiSearchTerm.toLowerCase())) ||
      (p.color && p.color.toLowerCase().includes(ptiSearchTerm.toLowerCase())) ||
      String(p.denier ?? '').includes(ptiSearchTerm.trim());

    const matchesFormula = ptiFormulaFilter === 'ALL'
      || (ptiFormulaFilter === 'UNLINKED' ? !p.formula_id : String(p.formula_id) === ptiFormulaFilter);

    const matchesStatus =
      ptiStatusFilter === 'ALL' ||
      (ptiStatusFilter === 'ACTIVE' && p.is_active) ||
      (ptiStatusFilter === 'INACTIVE' && !p.is_active);

    return matchesSearch && matchesFormula && matchesStatus;
  });

  // Métricas generales de Fórmulas
  const totalFormulas = catalogFormulas.length;
  const avgCostIndex = catalogFormulas.length > 0
    ? (catalogFormulas.reduce((acc, f) => acc + (Number(f.cost_index) || 1.15), 0) / catalogFormulas.length).toFixed(4)
    : 'Pendiente';
  const valuedFormulas = catalogFormulas.filter((formula) => formula.transformed_mixture_value != null);
  const avgMixValue = valuedFormulas.length > 0
    ? (valuedFormulas.reduce((acc, formula) => acc + Number(formula.transformed_mixture_value), 0) / valuedFormulas.length).toFixed(2)
    : null;
  const totalLinkedPtis = catalogFormulas.reduce((acc, f) => acc + (f.ptiProducts?.length || 0), 0);

  // Métricas de Catálogo PTI
  const activePtiProducts = ptiProducts.filter((p) => p.is_active);
  const totalPtisCount = activePtiProducts.length;
  const activePtisCount = totalPtisCount;
  const inactivePtisCount = ptiProducts.length - activePtisCount;
  const weightedPtis = activePtiProducts.filter((p) => p.unit_weight_kg != null && Number(p.unit_weight_kg) > 0);
  const avgWeightKg = weightedPtis.length > 0
    ? (weightedPtis.reduce((acc, p) => acc + Number(p.unit_weight_kg), 0) / weightedPtis.length).toFixed(3)
    : 'Pendiente';
  const avgPtiCostIndex = activePtiProducts.length > 0
    ? (activePtiProducts.reduce((acc, p) => acc + Number(p.transformed_cost_index || 1), 0) / activePtiProducts.length).toFixed(4)
    : '1.0000';

  const getQueryErrorMessage = (error: any) =>
    error?.response?.data?.message || error?.message || 'No se pudo cargar la información. Revisa la conexión con el servidor.';

  // Toggle Activo/Inactivo de un PTI
  const handleTogglePtiActive = async (pti: PtiProduct) => {
    try {
      await updatePtiMutation.mutateAsync({
        id: pti.id,
        payload: { is_active: !pti.is_active }
      });
      toast.success(`PTI '${pti.code}' ${!pti.is_active ? 'activado' : 'desactivado'} correctamente.`);
      refetchPtis();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado del PTI.');
    }
  };

  // Eliminar un PTI
  const handleDeletePti = async (pti: PtiProduct) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto PTI '${pti.code}' (${pti.name}) del catálogo?`)) {
      return;
    }

    try {
      setDeletingPtiId(pti.id);
      await deletePtiMutation.mutateAsync(pti.id);
      toast.success(`Producto PTI '${pti.code}' eliminado exitosamente.`);
      refetchPtis();
      refetchFormulas();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error al eliminar el producto PTI.';
      toast.error(msg);
    } finally {
      setDeletingPtiId(null);
    }
  };

  return (
    <div className="extrusion-workspace mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 p-4 pb-32 sm:gap-5 sm:p-6 lg:p-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full min-w-0 max-w-4xl">
            <h1 className="flex items-center gap-2.5 text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">
              <Icon name="science" size={32} className="shrink-0 text-primary" />
              <span>Extrusión: Fórmulas & Catálogo PTI</span>
            </h1>
            <p className="mt-1 max-w-[75ch] text-base font-medium leading-relaxed text-muted-foreground">
              Consulta las fórmulas de mezcla y los carretes PTI registrados para extrusión.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))} className="hidden min-h-11 shrink-0 gap-2 px-3 text-sm lg:inline-flex">
            <Icon name="qr_code_scanner" size={18} /> Leer QR
          </Button>
        </div>

        {/* TAB SWITCHER INDUSTRIAL */}
        <div className="grid w-full grid-cols-1 gap-1 p-1.5 rounded-xl bg-muted/60 border border-border shadow-sm sm:grid-cols-2">
          <button
            type="button"
            data-testid="tab-formulas"
            onClick={() => setActiveTab('FORMULAS')}
            className={`flex min-h-12 w-full flex-nowrap items-center justify-center gap-2 px-3 py-3 sm:px-4 rounded-lg text-base font-black leading-snug text-center transition-all ${
              activeTab === 'FORMULAS'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={activeTab === 'FORMULAS'}
          >
            <Icon name="science" size={18} className="shrink-0" />
            <span className="min-w-0">Fórmulas de Mezcla (500 Kg)</span>
            <Badge variant="outline" className="ml-1 shrink-0 text-xs font-mono font-bold">{totalFormulas}</Badge>
          </button>

          <button
            type="button"
            data-testid="tab-pti-catalog"
            onClick={() => setActiveTab('PTI_CATALOG')}
            className={`flex min-h-12 w-full flex-nowrap items-center justify-center gap-2 px-3 py-3 sm:px-4 rounded-lg text-base font-black leading-snug text-center transition-all ${
              activeTab === 'PTI_CATALOG'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={activeTab === 'PTI_CATALOG'}
          >
            <Icon name="inventory_2" size={18} className="shrink-0" />
            <span className="min-w-0">Catálogo de PTI (Carretes)</span>
            <Badge variant="outline" className="ml-1 shrink-0 text-xs font-mono font-bold">{totalPtisCount}</Badge>
          </button>
        </div>
      </div>

      {(isFormulasError || isPtiError) && (
        <Card role="alert" className="border-rose-500/40 bg-rose-500/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold text-foreground">No se pudo cargar el catálogo</p>
                {isFormulasError && <p className="mt-1 text-sm text-muted-foreground">Fórmulas: {getQueryErrorMessage(formulasError)}</p>}
                {isPtiError && <p className="mt-1 text-sm text-muted-foreground">PTI: {getQueryErrorMessage(ptiError)}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {isFormulasError && <Button type="button" variant="outline" onClick={() => void refetchFormulas()}>Reintentar fórmulas</Button>}
              {isPtiError && <Button type="button" variant="outline" onClick={() => void refetchPtis()}>Reintentar PTI</Button>}
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* TAB 1: FÓRMULAS DE EXTRUSIÓN & VALOR DE MEZCLA */}
      {/* ========================================================= */}
      {activeTab === 'FORMULAS' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200 sm:gap-5">
          {/* BANNER DE MÉTRICAS OPERACIONALES */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-4">
            <MetricCard
              title="Fórmulas de Mezcla"
              value={totalFormulas}
              subtitle="Recetas registradas en el catálogo"
              icon="science"
              iconBg="bg-primary/10 text-primary"
              subIcon="inventory_2"
            />
            {allowCosts ? (
              <>
                <MetricCard
                  title="Factor de Costo"
                  value={`×${avgCostIndex}`}
                  subtitle="Índice editable por fórmula"
                  icon="auto_awesome"
                  iconBg="bg-purple-500/10 text-purple-600"
                  valueColor="text-purple-600"
                />
                <MetricCard
                  title="Valor de Mezcla"
                  value={avgMixValue == null ? 'Pendiente' : `$${Number(avgMixValue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                  subtitle={avgMixValue == null ? 'Faltan costos por lote de uno o más materiales' : `Promedio de ${valuedFormulas.length} fórmulas costeables`}
                  icon="payments"
                  iconBg="bg-emerald-500/10 text-emerald-600"
                  valueColor="text-emerald-600"
                />
              </>
            ) : (
              <>
                <MetricCard
                  title="Recetas Operativas"
                  value={catalogFormulas.filter(f => f.is_active !== false).length}
                  subtitle="Disponibles en piso de extrusión"
                  icon="precision_manufacturing"
                  iconBg="bg-purple-500/10 text-purple-600"
                  valueColor="text-purple-600"
                />
                <MetricCard
                  title="Tamaño Estándar"
                  value="500 kg"
                  subtitle="Capacidad de bache por receta"
                  icon="scale"
                  iconBg="bg-emerald-500/10 text-emerald-600"
                  valueColor="text-emerald-600"
                />
              </>
            )}
            <MetricCard
              title="Carretes Enlazados"
              value={totalLinkedPtis}
              subtitle="Productos vinculados a recetas"
              icon="inventory_2"
              iconBg="bg-blue-500/10 text-blue-600"
              valueColor="text-blue-600"
            />
          </div>

          {/* BARRA DE FILTROS & CONMUTADOR DE VISTA */}
          <CollapsibleFilterPanel title="Buscar y filtrar fórmulas" summary={`${filteredFormulas.length} de ${formulas.length} fórmulas${formulaSearchTerm ? ` · ${formulaSearchTerm}` : ''}`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,16rem)]">
                <div className="relative min-w-0 w-full">
                  <Icon name="search" size={18} className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <label htmlFor="formula-search" className="sr-only">Buscar fórmula por código o nombre</label>
                  <Input
                    id="formula-search"
                    placeholder="Buscar fórmula por código o nombre..."
                    value={formulaSearchTerm}
                    onChange={(e) => setFormulaSearchTerm(e.target.value)}
                    className="!pl-10 min-h-11 w-full bg-background text-base"
                  />
                </div>

                <div className="flex min-w-0 w-full items-center gap-2">
                  <Icon name="filter_alt" size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <label htmlFor="formula-machine-filter" className="sr-only">Filtrar fórmulas por máquina</label>
                  <select
                    id="formula-machine-filter"
                    value={selectedMachine}
                    onChange={(e) => setSelectedMachine(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Todas las máquinas</option>
                    {machines.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONMUTADOR DE VISTAS (TARJETAS / LISTA) */}
              <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:shrink-0">
                <PermissionGate permission="extrusion.formulas.manage">
                  <Button type="button" className="min-h-11 flex-1 gap-2 whitespace-nowrap font-bold xl:flex-none" onClick={() => setIsCreateFormulaOpen(true)}>
                    <Icon name="add" size={18} />
                    Nueva fórmula
                  </Button>
                </PermissionGate>
                <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-muted/60 p-1 shadow-xs" aria-label="Cambiar vista de fórmulas">
                  <button
                    type="button"
                    data-testid="toggle-view-cards"
                    aria-label="Ver fórmulas en tarjetas"
                    aria-pressed={formulaViewMode === 'cards'}
                    onClick={() => setFormulaViewMode('cards')}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm transition-all ${formulaViewMode === 'cards' ? 'border border-border bg-card font-bold text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Vista de tarjetas"
                  >
                    <Icon name="grid_view" size={18} />
                  </button>
                  <button
                    type="button"
                    data-testid="toggle-view-list"
                    aria-label="Ver fórmulas en lista"
                    aria-pressed={formulaViewMode === 'list'}
                    onClick={() => setFormulaViewMode('list')}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm transition-all ${formulaViewMode === 'list' ? 'border border-border bg-card font-bold text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Vista de lista"
                  >
                    <Icon name="format_list_bulleted" size={18} />
                  </button>
                </div>
              </div>
            </div>
          </CollapsibleFilterPanel>

          {/* LISTA DE FÓRMULAS */}
          {isFormulasLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Icon name="science" size={36} className="animate-spin text-primary" />
              <p className="font-bold">Cargando fórmulas y calculando valorizaciones...</p>
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border p-8">
              <Icon name="science" size={48} className="opacity-20 mb-3" />
              <p className="font-bold text-lg text-foreground">No se encontraron fórmulas</p>
              <p className="text-sm text-muted-foreground">Prueba modificando los filtros de búsqueda.</p>
            </div>
          ) : formulaViewMode === 'cards' ? (
            /* ========================================================= */
            /* VISTA DE TARJETAS (GRID RESPONSIVO)                       */
            /* ========================================================= */
            <>
            <div className="grid gap-2 md:hidden">
              {filteredFormulas.map((formula: Formula) => {
                const isExpanded = mobileExpandedFormulaId === formula.id;
                const linkedPtis = formula.ptiProducts || [];
                const rawCost = formula.raw_materials_cost == null ? null : Number(formula.raw_materials_cost);
                const transformedVal = formula.transformed_mixture_value == null ? null : Number(formula.transformed_mixture_value);
                const suggestedPrice = formula.suggested_pti_unit_price == null ? null : Number(formula.suggested_pti_unit_price);
                const costIndex = Number(formula.cost_index) || 1.1500;
                const detailsId = `mobile-formula-details-${formula.id}`;

                return (
                  <article
                    key={`mobile-${formula.id}`}
                    className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${isExpanded ? 'min-h-[60dvh] shadow-sm' : ''}`}
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedMobileFormulaId(isExpanded ? 'COLLAPSED' : formula.id)}
                      className="flex min-h-20 w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="max-w-full break-all font-mono text-xs font-bold">{formula.code}</Badge>
                          <Badge variant={formula.is_active === false ? 'secondary' : 'success'} className="text-xs font-bold">{formula.is_active === false ? 'Inactiva' : 'Activa'}</Badge>
                          <span className="text-xs font-semibold text-muted-foreground">{formula.batch_size_kg || 500} kg</span>
                        </span>
                        <span className="block line-clamp-2 break-words text-base font-bold leading-snug text-foreground">{formula.name}</span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground">{getTargetMachine(formula)} · {formula.expected_yield_pieces} pzas</span>
                      </span>
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground" aria-hidden="true">
                        <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={22} />
                      </span>
                    </button>

                    <div id={detailsId} hidden={!isExpanded} className="flex flex-1 flex-col gap-4 border-t border-border p-4">
                      <dl className="grid gap-3">
                        <div>
                          <dt className="text-sm font-semibold text-muted-foreground">Máquina asignada</dt>
                          <dd className="mt-0.5 break-words text-base font-semibold text-foreground">{getTargetMachine(formula)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-semibold text-muted-foreground">Rendimiento esperado</dt>
                          <dd className="mt-0.5 break-words font-mono text-base font-bold tabular-nums text-foreground">{formula.expected_yield_pieces} pzas · {formula.expected_yield_kg || 490} kg</dd>
                        </div>
                        <div className="rounded-lg border border-border bg-background/60 p-3">
                          <dt className="text-sm font-bold text-muted-foreground">PTI de salida</dt>
                          <dd className="mt-1 break-words text-base font-semibold leading-snug text-foreground">
                            {linkedPtis.length > 0 ? linkedPtis.map((pti) => `${pti.code} · ${pti.name}`).join(', ') : 'Sin PTI enlazado'}
                          </dd>
                        </div>
                      </dl>

                      {allowCosts && (
                        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-2.5">
                          <div className="min-w-0 rounded-lg bg-background/45 p-2">
                            <dt className="text-xs font-bold uppercase leading-snug text-muted-foreground">Insumos base</dt>
                            <dd className="mt-1 break-words text-sm font-bold tabular-nums text-foreground">{rawCost == null ? 'Pendiente de costeo' : `$${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</dd>
                          </div>
                          <div className="min-w-0 rounded-lg bg-background/45 p-2 text-center">
                            <dt className="text-xs font-bold uppercase text-primary">Factor</dt>
                            <dd className="mt-1 font-mono text-sm font-black text-primary">×{costIndex.toFixed(4)}</dd>
                          </div>
                          <div className="col-span-2 min-w-0 border-t border-border px-2 pt-2">
                            <dt className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Transformada</dt>
                            <dd className="mt-1 break-words text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">{transformedVal == null ? 'Pendiente' : `$${transformedVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</dd>
                            <dd className="mt-0.5 break-words text-sm text-muted-foreground">{suggestedPrice == null ? 'Precio sugerido pendiente' : `Precio sugerido: ~$${suggestedPrice.toFixed(2)}/pza`}</dd>
                          </div>
                        </dl>
                      )}

                      <div className="mt-auto grid gap-2 border-t border-border pt-3">
                        <Button
                          variant="secondary"
                          className="min-h-12 w-full gap-2 whitespace-normal text-base font-bold leading-tight"
                          onClick={() => setSelectedFormulaDetails(formula)}
                        >
                          <Icon name="description" size={18} />
                          Ingredientes y detalles
                        </Button>
                        <PermissionGate permission="extrusion.formulas.manage">
                          <Button
                            variant="outline"
                            aria-label={`Editar configuración de ${formula.name}`}
                            className="min-h-12 w-full gap-2 text-base font-bold"
                            onClick={() => setEditingFormula(formula)}
                          >
                            <Icon name="edit" size={18} />
                            Editar configuración
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-2 2xl:grid-cols-3">
              {filteredFormulas.map((formula: Formula) => {
                const costIndex = Number(formula.cost_index) || 1.1500;
                const rawCost = formula.raw_materials_cost == null ? null : Number(formula.raw_materials_cost);
                const transformedVal = formula.transformed_mixture_value == null ? null : Number(formula.transformed_mixture_value);
                const suggestedPrice = formula.suggested_pti_unit_price == null ? null : Number(formula.suggested_pti_unit_price);
                const linkedPtis = formula.ptiProducts || [];

                return (
                  <Card
                    key={formula.id}
                    className="flex min-w-0 flex-col justify-between overflow-hidden border border-border bg-card shadow-sm"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:gap-3.5 sm:p-5">
                      {/* HEADER DE TARJETA */}
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="max-w-full break-all font-mono text-xs font-bold sm:text-sm">{formula.code}</Badge>
                          <Badge variant="secondary" className="text-sm font-semibold">Lote: {formula.batch_size_kg || 500} kg</Badge>
                          <Badge variant={formula.is_active === false ? 'secondary' : 'success'} className="text-xs font-bold">{formula.is_active === false ? 'Inactiva' : 'Activa'}</Badge>
                        </div>
                        <h3 className="break-words text-lg font-black leading-snug text-foreground sm:text-xl">
                          {formula.name}
                        </h3>
                      </div>

                      {/* METADATA RÁPIDA */}
                      <div className="grid grid-cols-1 gap-2 border-t border-border/70 pt-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-muted-foreground">Máquina asignada</span>
                          <span className="mt-0.5 flex min-w-0 items-start gap-2 text-sm font-semibold text-foreground">
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-purple-500" aria-hidden="true" />
                            <span className="break-words">{getTargetMachine(formula)}</span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-muted-foreground">Rendimiento esperado</span>
                          <span className="mt-0.5 block break-words font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formula.expected_yield_pieces} pzas · {formula.expected_yield_kg || 490} kg
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 rounded-lg border border-border bg-background/60 px-3 py-2.5">
                        <span className="block text-sm font-bold text-muted-foreground">PTI de salida</span>
                        {linkedPtis.length > 0 ? linkedPtis.map((pti) => (
                          <span key={pti.id} className="mt-1 block break-words text-sm font-semibold leading-snug text-foreground">
                            {pti.code} · {pti.name}
                          </span>
                        )) : <span className="mt-1 block text-sm font-medium text-muted-foreground">Sin PTI enlazado</span>}
                      </div>

                      {/* BLOQUE ECONÓMICO */}
                      {allowCosts && (
                        <div className="mt-auto grid min-w-0 grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-2.5 sm:grid-cols-3 sm:p-3">
                          <div className="min-w-0 rounded-lg bg-background/45 p-2 text-left sm:bg-transparent sm:p-0">
                            <span className="block text-xs font-bold uppercase leading-snug text-muted-foreground sm:text-sm">Insumos base</span>
                            <span className="mt-1 block break-words text-sm font-bold tabular-nums text-foreground sm:font-mono">
                              {rawCost == null ? 'Pendiente de costeo' : `$${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                            </span>
                          </div>

                          <div className="min-w-0 rounded-lg bg-background/45 p-2 text-center sm:border-x sm:border-border sm:bg-transparent sm:px-1 sm:py-0">
                            <span className="block text-xs font-bold uppercase text-primary sm:text-sm">Factor</span>
                            <Badge variant="default" className="mt-1 max-w-full border-primary/30 bg-primary/15 px-1.5 py-0 font-mono text-sm font-black text-primary">
                              ×{costIndex.toFixed(4)}
                            </Badge>
                          </div>

                          <div className="col-span-2 min-w-0 rounded-lg border-t border-border px-2 pt-2 text-left sm:col-span-1 sm:border-0 sm:px-0 sm:pt-0 sm:text-right">
                            <span className="block text-xs font-bold uppercase leading-snug text-emerald-700 dark:text-emerald-400 sm:text-sm">Transformada</span>
                            <span className="mt-1 block break-words text-base font-black tabular-nums text-emerald-700 dark:text-emerald-400 sm:font-mono sm:text-sm">
                              {transformedVal == null ? 'Pendiente' : `$${transformedVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                            </span>
                            <span className="mt-0.5 block break-words text-sm text-muted-foreground">
                              {suggestedPrice == null ? 'Precio sugerido pendiente' : `~$${suggestedPrice.toFixed(2)}/pza`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FOOTER CON BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-2 border-t border-border bg-muted/20 p-3 sm:px-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-12 min-w-0 flex-1 gap-1.5 whitespace-normal text-sm font-bold leading-tight sm:text-base"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFormulaDetails(formula);
                        }}
                      >
                        <Icon name="description" size={16} />
                        <span className="text-left">Ingredientes y detalles</span>
                      </Button>

                      <PermissionGate permission="extrusion.formulas.manage">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Editar configuración de ${formula.name}`}
                          className="min-h-12 min-w-[5.5rem] gap-2 px-3 font-bold text-base text-muted-foreground hover:text-foreground sm:min-w-12"
                          title="Editar asignación y parámetros"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFormula(formula);
                          }}
                        >
                          <Icon name="edit" size={14} />
                          <span className="sm:hidden">Editar</span>
                        </Button>
                      </PermissionGate>
                    </div>
                  </Card>
                );
              })}
            </div>
            </>
          ) : (
            /* ========================================================= */
            /* VISTA DE LISTA (ESTILO ALMACÉN > CATÁLOGO)               */
            /* ========================================================= */
            <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-foreground text-lg tracking-tight">Fórmulas registradas</h3>
                  <p className="text-sm text-muted-foreground font-semibold">Consulta las recetas y mezclas maestras configuradas para extrusión.</p>
                </div>
                <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border text-sm font-bold text-foreground">
                  {filteredFormulas.length} fórmulas
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-5 pt-2">
                <div className="grid gap-3 2xl:hidden">
                  {filteredFormulas.map((formula: Formula) => {
                    const linkedPtis = formula.ptiProducts || [];

                    return (
                      <article key={formula.id} className="rounded-xl border border-border bg-background p-4">
                        <p className="break-words font-mono text-sm font-bold text-primary">{formula.code}</p>
                        <h4 className="mt-1 text-lg font-bold leading-snug text-foreground">{formula.name}</h4>
                        <Badge variant={formula.is_active === false ? 'secondary' : 'success'} className="mt-2 w-fit text-xs font-bold">{formula.is_active === false ? 'INACTIVA' : 'ACTIVA'}</Badge>

                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-base">
                          <div className="col-span-2">
                            <dt className="text-sm font-semibold text-muted-foreground">Máquina destino</dt>
                            <dd className="mt-0.5 break-words font-medium text-foreground">{getTargetMachine(formula)}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-semibold text-muted-foreground">Tamaño del lote</dt>
                            <dd className="mt-0.5 font-mono font-bold text-foreground">{formula.batch_size_kg || 500} kg</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-semibold text-muted-foreground">Rendimiento esperado</dt>
                            <dd className="mt-0.5 font-mono font-bold text-foreground">{formula.expected_yield_pieces} pzas</dd>
                            <dd className="text-sm text-muted-foreground">{formula.expected_yield_kg || 490} kg</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-sm font-semibold text-muted-foreground">PTI de salida</dt>
                            <dd className="mt-0.5 break-words font-medium text-foreground">
                              {linkedPtis.length > 0 ? linkedPtis.map((pti) => `${pti.code} · ${pti.name}`).join(', ') : 'Sin PTI enlazado'}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
                          <Button
                            variant="secondary"
                            className="min-h-12 w-full gap-2 text-base font-bold"
                            onClick={() => setSelectedFormulaDetails(formula)}
                          >
                            <Icon name="description" size={18} />
                            Detalles
                          </Button>
                          <PermissionGate permission="extrusion.formulas.manage">
                            <Button
                              variant="outline"
                              aria-label={`Editar configuración de ${formula.name}`}
                              className="min-h-12 w-full gap-2 text-base font-bold"
                              onClick={() => setEditingFormula(formula)}
                            >
                              <Icon name="edit" size={18} />
                              Editar configuración
                            </Button>
                          </PermissionGate>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div
                  role="region"
                  aria-label="Tabla de fórmulas de extrusión. Desplázate horizontalmente para ver todas las columnas."
                  tabIndex={0}
                  className="hidden w-full overflow-x-auto pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:block"
                >
                  <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="w-[13%] rounded-l-xl bg-secondary px-3 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Código
                        </th>
                        <th className="w-[37%] bg-secondary px-3 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Fórmula / Receta
                        </th>
                        <th className="w-[18%] bg-secondary px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Rendimiento
                        </th>
                        <th className="w-[14%] bg-secondary px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Carretes PTI
                        </th>
                        <th className="w-[18%] rounded-r-xl bg-secondary px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="mt-2">
                      {filteredFormulas.map((formula: Formula) => {
                        const linkedPtis = formula.ptiProducts || [];

                        return (
                          <tr
                            key={formula.id}
                            className="group transition-colors hover:bg-secondary/20"
                          >
                            {/* CÓDIGO */}
                            <td className="border-b border-border/50 px-4 py-3.5 align-middle">
                              <strong className="font-black text-base text-primary">
                                {formula.code}
                              </strong>
                            </td>

                            {/* NOMBRE Y DATOS */}
                            <td className="border-b border-border/50 px-4 py-3.5 align-middle">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-base text-foreground/90 group-hover:text-primary transition-colors">
                                  {formula.name}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold flex-wrap">
                                  <Badge variant={formula.is_active === false ? 'secondary' : 'success'} className="text-sm font-bold">{formula.is_active === false ? 'INACTIVA' : 'ACTIVA'}</Badge>
                                  <span className="flex items-center gap-1.5">
                                    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span>{getTargetMachine(formula)}</span>
                                  </span>
                                  <Badge variant="secondary" className="text-sm font-bold px-2 py-0.5">
                                    {formula.batch_size_kg || 500} Kg Lote
                                  </Badge>
                                </div>
                              </div>
                            </td>

                            {/* RENDIMIENTO TEÓRICO */}
                            <td className="border-b border-border/50 px-4 py-3.5 align-middle text-center whitespace-nowrap">
                              <span className="font-mono font-bold text-sm text-foreground block">
                                {formula.expected_yield_pieces} pzas
                              </span>
                              <span className="text-sm text-muted-foreground block font-medium">
                                ({formula.expected_yield_kg || 490} kg estimados)
                              </span>
                            </td>

                            {/* CARRETES PTI ENLAZADOS */}
                            <td className="border-b border-border/50 px-4 py-3.5 align-middle text-center whitespace-nowrap">
                              {linkedPtis.length > 0 ? linkedPtis.map((pti) => (
                                <div key={pti.id} className="mb-1 text-left last:mb-0">
                                  <span className="block font-mono text-xs font-bold text-primary">{pti.code}</span>
                                  <span className="block max-w-52 truncate text-xs text-foreground" title={pti.name}>{pti.name}</span>
                                </div>
                              )) : <span className="text-sm text-muted-foreground">Sin PTI enlazado</span>}
                            </td>

                            {/* ACCIONES */}
                            <td className="border-b border-border/50 px-3 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  className="min-h-11 gap-1.5 whitespace-nowrap border-border/70 px-3 text-sm font-bold shadow-sm hover:bg-secondary/30"
                                  onClick={() => setSelectedFormulaDetails(formula)}
                                >
                                  <Icon name="description" size={18} className="text-primary" />
                                  Detalles
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger aria-label={`Acciones para fórmula ${formula.code}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-500 bg-slate-700/80 text-white shadow-sm transition-all hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <span className="sr-only">Abrir menú</span>
                                    <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 font-medium">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedFormulaDetails(formula)}
                                      className="min-h-11 cursor-pointer py-2 text-base"
                                    >
                                      <Icon name="description" size={16} className="mr-2 text-primary" />
                                      <span>Ver Ficha Técnica</span>
                                    </DropdownMenuItem>

                                    <PermissionGate permission="extrusion.formulas.manage">
                                      <DropdownMenuItem
                                        onClick={() => setEditingFormula(formula)}
                                        className="min-h-11 cursor-pointer py-2 text-base"
                                      >
                                        <Icon name="edit" size={16} className="mr-2 text-amber-500" />
                                      <span>Editar configuración</span>
                                      </DropdownMenuItem>
                                    </PermissionGate>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CATÁLOGO DE PRODUCTOS TERMINADOS INTERMEDIOS (PTI) */}
      {/* ========================================================= */}
      {activeTab === 'PTI_CATALOG' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200 sm:gap-5">
          {/* BANNER DE MÉTRICAS PTI */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-4">
            <MetricCard
              title="Carretes y bobinas"
              value={totalPtisCount}
              subtitle={`${inactivePtisCount} históricos archivados`}
              icon="inventory_2"
              iconBg="bg-primary/10 text-primary"
            />
            <MetricCard
              title="Fórmulas Vinculadas"
              value={new Set(activePtiProducts.map((p) => p.formula_id).filter(Boolean)).size}
              subtitle="Con trazabilidad genealógica"
              icon="link"
              iconBg="bg-purple-500/10 text-purple-600"
              valueColor="text-purple-600"
            />
            <MetricCard
              title="Peso promedio por unidad"
              value={avgWeightKg === 'Pendiente' ? avgWeightKg : `${avgWeightKg} kg`}
              subtitle="Peso unitario de PTI activos"
              icon="scale"
              iconBg="bg-blue-500/10 text-blue-600"
              valueColor="text-blue-600"
            />
            {allowCosts ? (
              <MetricCard
                title="Índice transformado PTI"
                value={`×${avgPtiCostIndex}`}
                subtitle="Multiplicador aplicado al costo/kg de mezcla"
                icon="payments"
                iconBg="bg-emerald-500/10 text-emerald-600"
                valueColor="text-emerald-600"
              />
            ) : (
              <MetricCard
                title="PTIs Calibrados"
                value={ptiProducts.filter((p) => p.tape_width_mm && p.denier).length}
                subtitle="Fichas con denier y ancho asignado"
                icon="tune"
                iconBg="bg-emerald-500/10 text-emerald-600"
                valueColor="text-emerald-600"
              />
            )}
          </div>

          {/* BARRA DE FILTROS & BOTÓN NUEVO PTI */}
          <CollapsibleFilterPanel title="Buscar y filtrar PTI" summary={`${filteredPtis.length} de ${ptiProducts.length} fichas · ${ptiStatusFilter === 'ACTIVE' ? 'Activos' : ptiStatusFilter === 'INACTIVE' ? 'Inactivos' : 'Todos los estados'}${ptiSearchTerm ? ` · ${ptiSearchTerm}` : ''}`}>
            <div className="flex flex-col items-stretch justify-between gap-3 xl:flex-row xl:items-center">
              <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,16rem)] xl:grid-cols-[minmax(16rem,20rem)_minmax(14rem,16rem)_minmax(10rem,12rem)]">
                <div className="relative min-w-0 w-full">
                  <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10 shrink-0" />
                  <label htmlFor="pti-search" className="sr-only">Buscar PTI por código, nombre o ficha</label>
                  <Input
                    id="pti-search"
                    placeholder="Buscar por código, nombre o ficha..."
                    value={ptiSearchTerm}
                    onChange={(e) => setPtiSearchTerm(e.target.value)}
                    className="!pl-10 min-h-11 w-full bg-background text-base"
                  />
                </div>

                <div className="flex min-w-0 w-full items-center gap-2">
                  <Icon name="filter_alt" size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <label htmlFor="pti-formula-filter" className="sr-only">Filtrar PTI por fórmula</label>
                  <select
                    id="pti-formula-filter"
                    value={ptiFormulaFilter}
                    onChange={(e) => setPtiFormulaFilter(e.target.value)}
                    className="min-h-11 w-full min-w-0 truncate rounded-lg border border-border bg-background px-3 text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Todas las fórmulas</option>
                    <option value="UNLINKED">PTI sin fórmula</option>
                    {formulas.map((f) => (
                      <option key={f.id} value={String(f.id)}>{f.code} - {f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0 w-full">
                  <label htmlFor="pti-status-filter" className="sr-only">Filtrar PTI por estado</label>
                  <select
                    id="pti-status-filter"
                    value={ptiStatusFilter}
                    onChange={(e) => setPtiStatusFilter(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="ACTIVE">Solo Activos</option>
                    <option value="INACTIVE">Solo Inactivos</option>
                  </select>
                </div>
              </div>

              <PermissionGate permission="extrusion.formulas.manage">
                <Button
                  data-testid="new-pti-btn"
                  onClick={() => {
                    setEditingPti(null);
                    setIsPtiModalOpen(true);
                  }}
                  className="min-h-11 w-full shrink-0 gap-2 px-4 font-bold shadow-sm xl:w-auto"
                >
                  <Icon name="add" size={18} />
                  Nuevo PTI (Carrete)
                </Button>
              </PermissionGate>
            </div>
          </CollapsibleFilterPanel>

          {/* TABLA INDUSTRIAL DE PRODUCTOS PTI */}
          {isPtiLoading ? (
            <Card className="py-16 border-border bg-card shadow-sm flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Icon name="inventory_2" size={36} className="animate-spin text-primary" />
              <p className="font-bold">Cargando catálogo de PTIs...</p>
            </Card>
          ) : filteredPtis.length === 0 ? (
            <Card className="py-16 border-dashed border-border bg-card shadow-sm flex flex-col items-center justify-center text-muted-foreground p-8">
              <Icon name="inventory_2" size={48} className="opacity-20 mb-3" />
              <p className="font-bold text-lg text-foreground">No se encontraron productos PTI</p>
              <p className="text-sm text-muted-foreground mb-4">
                No hay carretes registrados que coincidan con los criterios seleccionados.
              </p>
              <Button
                variant="outline"
                className="gap-2 font-bold"
                onClick={() => {
                  setEditingPti(null);
                  setIsPtiModalOpen(true);
                }}
              >
                <Icon name="add" size={16} />
                Registrar Primer Carrete PTI
              </Button>
            </Card>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h3 className="font-bold text-foreground text-lg tracking-tight">Carretes y Bobinas PTI registrados</h3>
                  <p className="text-base font-medium text-muted-foreground">La tabla muestra el enlace actual. Para asignarlo, edita la ficha PTI y elige la fórmula que lo produce.</p>
                </div>
                <div className="w-fit rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm font-bold text-foreground">
                  {filteredPtis.length} carretes
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-5 pt-2">
                <div className="grid gap-3 2xl:hidden">
                  {filteredPtis.map((pti: PtiProduct) => (
                    <article key={pti.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-mono text-sm font-bold text-primary">{pti.code}</p>
                          <h4 className="mt-1 text-lg font-bold leading-snug text-foreground">{pti.name}</h4>
                          <Badge variant={pti.is_active ? 'default' : 'secondary'} className={`mt-2 min-h-8 w-fit text-sm font-bold ${pti.is_active ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {pti.is_active ? 'ACTIVO' : 'INACTIVO'}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${pti.name}`}
                            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <span className="text-2xl font-bold leading-none" aria-hidden="true">&#8942;</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 font-medium">
                            <DropdownMenuItem onClick={() => setSelectedPtiDetails(pti)} className="min-h-12 cursor-pointer py-3">
                              <Icon name="visibility" size={18} className="mr-2 text-primary" />
                              <span>Detalles</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <PermissionGate permission="extrusion.formulas.manage">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingPti(pti);
                                  setIsPtiModalOpen(true);
                                }}
                                className="min-h-12 cursor-pointer py-3"
                              >
                                <Icon name="edit" size={18} className="mr-2 text-primary" />
                                <span>Editar PTI</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={deletingPtiId === pti.id}
                                onClick={() => handleDeletePti(pti)}
                                className="min-h-12 cursor-pointer py-3 text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20"
                              >
                                <Icon name="delete" size={18} className="mr-2" />
                                <span>Eliminar Carrete</span>
                              </DropdownMenuItem>
                            </PermissionGate>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3 text-base">
                        <div className="col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <dt className="text-sm font-semibold text-muted-foreground">Fórmula enlazada</dt>
                          <dd className="mt-1 break-words font-semibold text-foreground">
                            {pti.formula?.code ? `${pti.formula.code} · ${pti.formula.name}` : pti.formula_id ? `Fórmula #${pti.formula_id}` : 'Sin fórmula enlazada'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-semibold text-muted-foreground">Peso unitario</dt>
                          <dd className="mt-0.5 font-mono font-bold text-foreground">{pti.unit_weight_kg == null ? 'Pendiente de captura' : `${Number(pti.unit_weight_kg).toFixed(3)} kg`}</dd>
                        </div>
                        {allowCosts && (
                          <div>
                            <dt className="text-sm font-semibold text-muted-foreground">Precio unitario</dt>
                            <dd className="mt-0.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">${Number(pti.unit_price).toFixed(2)}</dd>
                          </div>
                        )}
                      </dl>

                      <details className="rounded-lg border border-border bg-muted/20">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span>Ficha técnica y especificaciones</span>
                          <Icon name="expand_more" size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                        </summary>
                        <div className="space-y-3 border-t border-border p-3">
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-foreground">
                            <div className="col-span-2"><dt className="font-semibold text-muted-foreground">Fórmula enlazada</dt><dd className="mt-0.5 break-words">{pti.formula ? <><span className="font-semibold">{pti.formula.name}</span><span className="mt-0.5 block font-mono text-muted-foreground">{pti.formula.code}{allowCosts ? ` · ×${Number(pti.formula.cost_index || 1.15).toFixed(2)}` : ''}</span></> : pti.formula_id ? `Fórmula #${pti.formula_id}` : 'Sin fórmula enlazada'}</dd></div>
                            <div><dt className="font-semibold text-muted-foreground">Extrusora</dt><dd>{pti.extrusion_machine_number ? `#${pti.extrusion_machine_number}` : '—'}</dd></div>
                            <div><dt className="font-semibold text-muted-foreground">Tipo de cinta</dt><dd>{pti.tape_type || '—'}</dd></div>
                            <div className="col-span-2 min-w-0"><dt className="font-semibold text-muted-foreground">Color</dt><dd className="break-words">{pti.color || '—'}</dd></div>
                            <div><dt className="font-semibold text-muted-foreground">Denier</dt><dd>{pti.denier ?? '—'}</dd></div>
                            <div><dt className="font-semibold text-muted-foreground">Cintas</dt><dd>{pti.tape_count == null ? '—' : `${pti.tape_count} ±${pti.tape_count_tolerance ?? 10}`}</dd></div>
                            <div><dt className="font-semibold text-muted-foreground">Ancho</dt><dd>{pti.tape_width_mm == null ? '—' : `${Number(pti.tape_width_mm)} mm`}</dd></div>
                            <div className="col-span-2"><dt className="font-semibold text-muted-foreground">Subárea de suministro</dt><dd className="mt-0.5 break-words">{pti.telares_subarea_code === 'TELARES_BANDA' || (!pti.telares_subarea_code && Number(pti.extrusion_machine_number) === 1) ? 'Telares Banda' : pti.telares_subarea_code === 'NO_APLICA' ? 'Sin destino a Telares' : 'Telares Rollo'} · según la máquina configurada</dd></div>
                            {allowCosts && <div><dt className="font-semibold text-muted-foreground">Índice PTI</dt><dd>×{Number(pti.transformed_cost_index || 1).toFixed(4)}</dd></div>}
                          </dl>
                          <div className="border-t border-border pt-3">
                            <h5 className="text-sm font-semibold text-muted-foreground">Especificaciones</h5>
                            <p className="mt-1 break-words text-base text-foreground">{pti.specifications || <span className="italic text-muted-foreground">Sin ficha técnica</span>}</p>
                          </div>
                        </div>
                      </details>

                      <div className="mt-3 border-t border-border pt-3">
                        {hasPermission('extrusion.formulas.manage') ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePtiActive(pti)}
                            aria-label={`${pti.is_active ? 'Desactivar' : 'Activar'} PTI ${pti.code}`}
                            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-base font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Icon name="power_settings_new" size={18} className={pti.is_active ? 'text-amber-500' : 'text-emerald-500'} />
                            {pti.is_active ? 'Desactivar PTI' : 'Activar PTI'}
                          </button>
                        ) : (
                          <div className="flex min-h-11 items-center justify-center">
                            <Badge variant={pti.is_active ? 'default' : 'secondary'} className={`text-sm font-bold ${pti.is_active ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : ''}`}>
                              {pti.is_active ? 'ACTIVO' : 'INACTIVO'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div
                  role="region"
                  aria-label="Tabla de productos PTI. Desplázate horizontalmente para ver todas las columnas."
                  tabIndex={0}
                  className="hidden w-full overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:block"
                >
                  <table className={`w-full ${allowCosts ? 'min-w-[1020px]' : 'min-w-[900px]'} table-fixed border-separate border-spacing-0`}>
                    <thead>
                      <tr>
                        <th className="w-[120px] rounded-l-xl bg-secondary px-3 py-3 text-left text-sm font-bold leading-tight text-secondary-foreground whitespace-normal break-words">
                          Código / SKU
                        </th>
                        <th className="bg-secondary px-3 py-3 text-left text-sm font-bold leading-tight text-secondary-foreground whitespace-normal break-words">
                          Carrete / Bobina
                        </th>
                        <th className="bg-secondary px-3 py-3 text-left text-sm font-bold leading-tight text-secondary-foreground whitespace-normal break-words">
                          Fórmula enlazada
                        </th>
                        <th className="w-[125px] bg-secondary px-3 py-3 text-center text-sm font-bold leading-tight text-secondary-foreground whitespace-normal break-words">
                          Peso Unit.
                        </th>
                        {allowCosts && (
                          <th className="w-[125px] bg-secondary px-3 py-3 text-center text-sm font-bold leading-tight text-secondary-foreground whitespace-nowrap">
                            Precio Unit.
                          </th>
                        )}
                        <th className="w-[110px] bg-secondary px-3 py-3 text-center text-sm font-bold leading-tight text-secondary-foreground whitespace-normal break-words">
                          Estado
                        </th>
                        <th className="w-[100px] rounded-r-xl bg-secondary px-3 py-3 text-center text-sm font-bold leading-tight text-secondary-foreground whitespace-nowrap">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="mt-2">
                      {filteredPtis.map((pti: PtiProduct) => (
                        <tr key={pti.id} className="group hover:bg-secondary/20 transition-colors">
                          <td className="border-b border-border/50 px-2.5 py-2.5 align-middle">
                            <strong className="font-black text-sm text-primary truncate block" title={pti.code}>
                              {pti.code}
                            </strong>
                          </td>

                          <td className="border-b border-border/50 px-3 py-2.5 align-middle">
                            {pti.formula?.code ? (
                              <><span className="block truncate font-mono text-sm font-bold text-primary" title={pti.formula.code}>{pti.formula.code}</span><span className="mt-0.5 block line-clamp-2 text-sm text-foreground" title={pti.formula.name}>{pti.formula.name}</span></>
                            ) : pti.formula_id ? <span className="font-mono text-sm">Fórmula #{pti.formula_id}</span> : <span className="text-sm text-muted-foreground">Sin enlazar</span>}
                          </td>

                          <td className="border-b border-border/50 px-2.5 py-2.5 align-middle">
                            <span className="font-bold text-sm text-foreground/90 line-clamp-2 leading-tight block" title={pti.name}>
                              {pti.name}
                            </span>
                          </td>

                          <td className="border-b border-border/50 px-2 py-2.5 align-middle text-center font-mono text-sm font-bold text-foreground whitespace-nowrap">
                            {pti.unit_weight_kg == null ? 'Pendiente' : `${Number(pti.unit_weight_kg).toFixed(3)} kg`}
                          </td>

                          {allowCosts && (
                            <td className="border-b border-border/50 px-2 py-2.5 align-middle text-center font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              ${Number(pti.unit_price).toFixed(2)}
                            </td>
                          )}

                          <td className="border-b border-border/50 px-3 py-2.5 align-middle text-center">
                            {hasPermission('extrusion.formulas.manage') ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePtiActive(pti)}
                                title={pti.is_active ? 'Desactivar PTI' : 'Activar PTI'}
                                aria-label={`${pti.is_active ? 'Desactivar' : 'Activar'} PTI ${pti.code}`}
                                className="inline-flex min-h-11 min-w-[100px] items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                              <Badge
                                variant={pti.is_active ? 'default' : 'secondary'}
                                className={`text-sm font-bold cursor-pointer transition-all ${
                                  pti.is_active
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                              >
                                {pti.is_active ? 'ACTIVO' : 'INACTIVO'}
                              </Badge>
                              </button>
                            ) : (
                              <Badge variant={pti.is_active ? 'default' : 'secondary'} className={`text-sm font-bold ${pti.is_active ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : ''}`}>
                                {pti.is_active ? 'ACTIVO' : 'INACTIVO'}
                              </Badge>
                            )}
                          </td>

                          <td className="border-b border-border/50 px-2 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger aria-label={`Acciones para ${pti.name}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                                <span className="sr-only">Abrir menú</span>
                                <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 font-medium">
                                <DropdownMenuItem onClick={() => setSelectedPtiDetails(pti)} className="min-h-11 cursor-pointer py-2 text-base">
                                  <Icon name="visibility" size={16} className="mr-2 text-primary" />
                                  <span>Detalles</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <PermissionGate permission="extrusion.formulas.manage">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingPti(pti);
                                      setIsPtiModalOpen(true);
                                    }}
                                    className="min-h-11 cursor-pointer py-2 text-base"
                                  >
                                    <Icon name="edit" size={16} className="mr-2 text-primary" />
                                    <span>Editar PTI</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    disabled={deletingPtiId === pti.id}
                                    onClick={() => handleDeletePti(pti)}
                                    className="cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                  >
                                    <Icon name="delete" size={16} className="mr-2" />
                                    <span>Eliminar Carrete</span>
                                  </DropdownMenuItem>
                                </PermissionGate>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALES DEL SISTEMA */}
      {/* ========================================================= */}

      {/* Modal de Solicitud de Mezcla */}
      <CreateFormulaModal
        isOpen={isCreateFormulaOpen}
        onClose={() => setIsCreateFormulaOpen(false)}
        allowCosts={allowCosts}
        onCreated={(formula) => {
          setIsCreateFormulaOpen(false);
          setSelectedFormulaDetails(formula);
        }}
      />

      <MixRequestModal
        isOpen={Boolean(selectedMixFormula)}
        onClose={() => setSelectedMixFormula(null)}
        formula={selectedMixFormula}
      />

      {/* Modal de Edición de Fórmula y Factor Multiplicador */}
      <EditFormulaModal
        isOpen={Boolean(editingFormula)}
        onClose={() => setEditingFormula(null)}
        formula={editingFormula}
      />

      {/* Modal de Creación / Edición de Producto PTI */}
      <Dialog open={Boolean(selectedPtiDetails)} onOpenChange={(open) => !open && setSelectedPtiDetails(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-border bg-card p-5 text-foreground sm:p-6">
          {selectedPtiDetails && (
            <>
              <DialogHeader className="pr-8 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl">Detalle del PTI</DialogTitle>
                  <Badge variant={selectedPtiDetails.is_active ? 'default' : 'secondary'}>
                    {selectedPtiDetails.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <DialogDescription className="break-words font-mono text-primary">
                  {selectedPtiDetails.code} · {selectedPtiDetails.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <section className="rounded-xl border border-border bg-background/40 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Ficha de cinta</h3>
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Subárea / extrusora</dt><dd className="font-semibold">{selectedPtiDetails.tape_type || 'Tipo pendiente'} · Extrusora {selectedPtiDetails.extrusion_machine_number ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Color</dt><dd className="font-semibold">{selectedPtiDetails.color || '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Denier</dt><dd className="font-semibold">{selectedPtiDetails.denier == null ? '—' : `${selectedPtiDetails.denier} D`}</dd></div>
                    <div><dt className="text-muted-foreground">Cintas</dt><dd className="font-semibold">{selectedPtiDetails.tape_count == null ? '—' : `${selectedPtiDetails.tape_count} ±${selectedPtiDetails.tape_count_tolerance ?? 10}`}</dd></div>
                    <div><dt className="text-muted-foreground">Ancho</dt><dd className="font-semibold">{selectedPtiDetails.tape_width_mm == null ? '—' : `${Number(selectedPtiDetails.tape_width_mm)} mm`}</dd></div>
                    <div><dt className="text-muted-foreground">Peso unitario</dt><dd className="font-semibold">{selectedPtiDetails.unit_weight_kg == null ? 'Pendiente' : `${Number(selectedPtiDetails.unit_weight_kg).toFixed(3)} kg`}</dd></div>
                    {allowCosts && <div><dt className="text-muted-foreground">Precio unitario</dt><dd className="font-semibold text-emerald-500">${Number(selectedPtiDetails.unit_price || 0).toFixed(2)}</dd></div>}
                    <div className="sm:col-span-2"><dt className="text-muted-foreground">Subárea de suministro</dt><dd className="font-semibold">{selectedPtiDetails.telares_subarea_code === 'TELARES_BANDA' || (!selectedPtiDetails.telares_subarea_code && Number(selectedPtiDetails.extrusion_machine_number) === 1) ? 'Telares Banda' : selectedPtiDetails.telares_subarea_code === 'NO_APLICA' ? 'Sin destino a Telares' : 'Telares Rollo'} · según la máquina configurada</dd></div>
                    {allowCosts && <div><dt className="text-muted-foreground">Índice de costo PTI</dt><dd className="font-mono font-semibold">×{Number(selectedPtiDetails.transformed_cost_index || 1).toFixed(4)}</dd></div>}
                  </dl>
                </section>

                <section className="rounded-xl border border-border bg-background/40 p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Fórmula enlazada</h3>
                  {selectedPtiDetails.formula ? <><p className="font-semibold">{selectedPtiDetails.formula.name}</p><p className="font-mono text-sm text-muted-foreground">{selectedPtiDetails.formula.code}{allowCosts ? ` · ×${Number(selectedPtiDetails.formula.cost_index || 1.15).toFixed(2)}` : ''}</p></> : <p className="text-sm text-muted-foreground">{selectedPtiDetails.formula_id ? `Fórmula #${selectedPtiDetails.formula_id}` : 'Sin fórmula enlazada'}</p>}
                </section>

                <section className="rounded-xl border border-border bg-background/40 p-4">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Especificaciones</h3>
                  <p className="whitespace-pre-wrap text-sm">{selectedPtiDetails.specifications || 'Sin ficha técnica registrada.'}</p>
                </section>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPtiDetails(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PtiProductModal
        isOpen={isPtiModalOpen}
        onClose={() => {
          setIsPtiModalOpen(false);
          setEditingPti(null);
          setPtiLinkFormulaId(null);
        }}
        pti={editingPti}
        formulas={formulas}
        suggestedFormulaId={ptiLinkFormulaId}
      />

      {/* Modal de Detalles Completos de Fórmula */}
      <FormulaDetailsModal
        isOpen={Boolean(selectedFormulaDetails)}
        onClose={() => setSelectedFormulaDetails(null)}
        formula={catalogFormulas.find((f: Formula) => f.id === selectedFormulaDetails?.id) || selectedFormulaDetails}
        onEditFormula={(f) => {
          setSelectedFormulaDetails(null);
          setEditingFormula(f);
        }}
        onRequestMix={(f) => {
          setSelectedFormulaDetails(null);
          setSelectedMixFormula(f);
        }}
        onOpenCreatePti={(formula) => {
          setSelectedFormulaDetails(null);
          setActiveTab('PTI_CATALOG');
          setPtiLinkFormulaId(formula?.id ?? null);
          setPtiFormulaFilter('UNLINKED');
          setIsPtiModalOpen(true);
        }}
        onManagePtiLink={(formula) => {
          setSelectedFormulaDetails(null);
          setActiveTab('PTI_CATALOG');
          setPtiLinkFormulaId(formula.id);
          setPtiFormulaFilter(formula.ptiProducts?.length ? String(formula.id) : 'UNLINKED');
        }}
      />
    </div>
  );
};
