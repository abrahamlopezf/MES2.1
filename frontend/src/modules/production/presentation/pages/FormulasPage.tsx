import React, { useState } from 'react';
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
import { MixRequestModal } from '../components/MixRequestModal';
import { EditFormulaModal } from '../components/EditFormulaModal';
import { PtiProductModal } from '../components/PtiProductModal';
import { FormulaDetailsModal } from '../components/FormulaDetailsModal';
import {
  useFloorFormulasQuery,
  usePtiProductsQuery,
  useUpdatePtiProductMutation,
  useDeletePtiProductMutation
} from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula, PtiProduct } from '@/modules/extrusion/types/extrusion.types';

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
  <Card className="border-border bg-card shadow-sm p-3.5 sm:p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${iconBg} flex items-center justify-center`}>
        {renderAnyIcon(icon, { size: 22 })}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] xl:text-xs font-bold text-muted-foreground uppercase tracking-wide block truncate" title={title}>{title}</span>
        <div className={`text-xl sm:text-2xl font-black font-mono leading-tight mt-0.5 ${valueColor}`}>{value}</div>
        <span className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${subColor || 'text-muted-foreground'}`}>
          {subIcon && renderAnyIcon(subIcon, { size: 14, className: 'shrink-0' })}
          <span className="truncate" title={subtitle}>{subtitle}</span>
        </span>
      </div>
    </div>
  </Card>
);

export const FormulasPage: React.FC = () => {
  // Pestaña activa: 'FORMULAS' o 'PTI_CATALOG'
  const [activeTab, setActiveTab] = useState<'FORMULAS' | 'PTI_CATALOG'>('FORMULAS');

  // Estados de Fórmulas
  const [formulaSearchTerm, setFormulaSearchTerm] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [formulaViewMode, setFormulaViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedFormulaDetails, setSelectedFormulaDetails] = useState<Formula | null>(null);
  const [selectedMixFormula, setSelectedMixFormula] = useState<Formula | null>(null);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);

  // Estados de Catálogo PTI
  const [ptiSearchTerm, setPtiSearchTerm] = useState('');
  const [ptiFormulaFilter, setPtiFormulaFilter] = useState<string>('ALL');
  const [ptiStatusFilter, setPtiStatusFilter] = useState<string>('ALL');
  const [editingPti, setEditingPti] = useState<PtiProduct | null>(null);
  const [isPtiModalOpen, setIsPtiModalOpen] = useState(false);
  const [deletingPtiId, setDeletingPtiId] = useState<number | null>(null);

  // Queries
  const { data: formulas = [], isLoading: isFormulasLoading, refetch: refetchFormulas } = useFloorFormulasQuery();
  const { data: ptiProducts = [], isLoading: isPtiLoading, refetch: refetchPtis } = usePtiProductsQuery({ is_active: 'ALL' });

  // Mutations
  const updatePtiMutation = useUpdatePtiProductMutation();
  const deletePtiMutation = useDeletePtiProductMutation();

  // Helper para máquina destino
  const getTargetMachine = (formula: any) => {
    if (formula.allowed_extruders && formula.allowed_extruders.length > 0) {
      return `Extrusora ${formula.allowed_extruders.join(', ')}`;
    }
    if (formula.description && formula.description.includes('Extrusora')) {
      return formula.description;
    }
    return 'Extrusión General';
  };

  const getIngredients = (formula: any) => {
    return formula.ingredients || [];
  };

  // Filtrado de Fórmulas
  const filteredFormulas = formulas.filter((f: Formula) => {
    const matchesSearch =
      f.name.toLowerCase().includes(formulaSearchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(formulaSearchTerm.toLowerCase());
    const machine = getTargetMachine(f);
    const matchesMachine = selectedMachine === 'ALL' || machine.includes(selectedMachine);
    return matchesSearch && matchesMachine;
  });

  const machines = ['Extrusora 1', 'Extrusora 3', 'Extrusora 4', 'Extrusora 5', 'Liquitank'];

  // Filtrado de PTIs
  const filteredPtis = ptiProducts.filter((p: PtiProduct) => {
    const matchesSearch =
      p.name.toLowerCase().includes(ptiSearchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(ptiSearchTerm.toLowerCase()) ||
      (p.specifications && p.specifications.toLowerCase().includes(ptiSearchTerm.toLowerCase()));

    const matchesFormula =
      ptiFormulaFilter === 'ALL' || String(p.formula_id) === ptiFormulaFilter;

    const matchesStatus =
      ptiStatusFilter === 'ALL' ||
      (ptiStatusFilter === 'ACTIVE' && p.is_active) ||
      (ptiStatusFilter === 'INACTIVE' && !p.is_active);

    return matchesSearch && matchesFormula && matchesStatus;
  });

  // Métricas generales de Fórmulas
  const totalFormulas = formulas.length;
  const avgCostIndex = formulas.length > 0
    ? (formulas.reduce((acc, f) => acc + (Number(f.cost_index) || 1.15), 0) / formulas.length).toFixed(4)
    : '1.1500';
  const avgMixValue = formulas.length > 0
    ? (formulas.reduce((acc, f) => acc + (Number(f.transformed_mixture_value) || 0), 0) / formulas.length).toFixed(2)
    : '0.00';
  const totalLinkedPtis = formulas.reduce((acc, f) => acc + (f.ptiProducts?.length || 0), 0);

  // Métricas de Catálogo PTI
  const totalPtisCount = ptiProducts.length;
  const activePtisCount = ptiProducts.filter((p) => p.is_active).length;
  const avgWeightKg = ptiProducts.length > 0
    ? (ptiProducts.reduce((acc, p) => acc + (Number(p.unit_weight_kg) || 0), 0) / ptiProducts.length).toFixed(3)
    : '6.800';
  const avgPriceMxn = ptiProducts.length > 0
    ? (ptiProducts.reduce((acc, p) => acc + (Number(p.unit_price) || 0), 0) / ptiProducts.length).toFixed(2)
    : '0.00';

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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 pb-32 lg:pr-24">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-border pb-5">
        <div className="flex-1 min-w-0 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Icon name="science" size={32} className="text-primary shrink-0" />
            <span>Extrusión: Fórmulas & Catálogo PTI</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1 leading-relaxed">
            Gestión integral de recetas de 500kg, índice multiplicador de transformación y catálogo de productos terminados intermedios (carretes).
          </p>
        </div>

        {/* TAB SWITCHER INDUSTRIAL */}
        <div className="flex items-center p-1.5 rounded-xl bg-muted/60 border border-border shrink-0 shadow-sm self-stretch sm:self-auto overflow-x-auto">
          <button
            type="button"
            data-testid="tab-formulas"
            onClick={() => setActiveTab('FORMULAS')}
            className={`flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm font-black whitespace-nowrap transition-all ${
              activeTab === 'FORMULAS'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="science" size={18} className="shrink-0" />
            <span>Fórmulas de Mezcla (500 Kg)</span>
            <Badge variant="outline" className="ml-1 text-xs font-mono font-bold">{totalFormulas}</Badge>
          </button>

          <button
            type="button"
            data-testid="tab-pti-catalog"
            onClick={() => setActiveTab('PTI_CATALOG')}
            className={`flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm font-black whitespace-nowrap transition-all ${
              activeTab === 'PTI_CATALOG'
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="inventory_2" size={18} className="shrink-0" />
            <span>Catálogo de PTI (Carretes)</span>
            <Badge variant="outline" className="ml-1 text-xs font-mono font-bold">{totalPtisCount}</Badge>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FÓRMULAS DE EXTRUSIÓN & VALOR DE MEZCLA */}
      {/* ========================================================= */}
      {activeTab === 'FORMULAS' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* BANNER DE MÉTRICAS OPERACIONALES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Fórmulas de Mezcla"
              value={totalFormulas}
              subtitle="100% calibradas para 500kg"
              icon="science"
              iconBg="bg-primary/10 text-primary"
              subIcon="check_circle"
              subColor="text-emerald-600"
            />
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
              value={`$${Number(avgMixValue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              subtitle="Por bache de 500 kg transformado"
              icon="payments"
              iconBg="bg-emerald-500/10 text-emerald-600"
              valueColor="text-emerald-600"
            />
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
          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                <div className="relative w-full sm:w-80 md:w-96">
                  <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    placeholder="Buscar fórmula por código o nombre..."
                    value={formulaSearchTerm}
                    onChange={(e) => setFormulaSearchTerm(e.target.value)}
                    className="!pl-10 w-full bg-background"
                  />
                </div>

                <div className="w-full sm:w-64 flex items-center gap-2">
                  <Icon name="filter_alt" size={18} className="text-muted-foreground shrink-0" />
                  <select
                    value={selectedMachine}
                    onChange={(e) => setSelectedMachine(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
                  >
                    <option value="ALL">Todas las máquinas</option>
                    {machines.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONMUTADOR DE VISTAS (TARJETAS / LISTA) */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border shrink-0 self-end sm:self-auto shadow-xs">
                <button
                  type="button"
                  data-testid="toggle-view-cards"
                  onClick={() => setFormulaViewMode('cards')}
                  className={`p-2 rounded-lg text-sm flex items-center justify-center transition-all ${
                    formulaViewMode === 'cards'
                      ? 'bg-card text-primary shadow-sm border border-border font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Vista de Tarjetas (Grid)"
                >
                  <Icon name="grid_view" size={18} />
                </button>
                <button
                  type="button"
                  data-testid="toggle-view-list"
                  onClick={() => setFormulaViewMode('list')}
                  className={`p-2 rounded-lg text-sm flex items-center justify-center transition-all ${
                    formulaViewMode === 'list'
                      ? 'bg-card text-primary shadow-sm border border-border font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Vista de Lista (Tabla)"
                >
                  <Icon name="format_list_bulleted" size={18} />
                </button>
              </div>
            </CardContent>
          </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFormulas.map((formula: Formula) => {
                const costIndex = Number(formula.cost_index) || 1.1500;
                const rawCost = Number(formula.raw_materials_cost) || 13500.00;
                const transformedVal = Number(formula.transformed_mixture_value) || (rawCost * costIndex);
                const suggestedPrice = Number(formula.suggested_pti_unit_price) || 0;
                const ptiCount = formula.ptiProducts?.length || 0;

                return (
                  <Card
                    key={formula.id}
                    className="border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
                    onClick={() => setSelectedFormulaDetails(formula)}
                  >
                    <div className="p-5 flex flex-col gap-3.5 flex-1">
                      {/* HEADER DE TARJETA */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors mt-0.5">
                            <Icon name="science" size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge variant="outline" className="font-mono text-[11px] font-bold">{formula.code}</Badge>
                              <Badge variant="secondary" className="text-[11px] font-semibold">{formula.batch_size_kg || 500} Kg</Badge>
                            </div>
                            <h3 className="font-black text-base text-foreground leading-snug line-clamp-2">
                              {formula.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* METADATA RÁPIDA */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-2 border-t border-border/50">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                          <span className="truncate">{getTargetMachine(formula)}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px]">
                          {formula.expected_yield_pieces} pzas ({formula.expected_yield_kg || 490} kg)
                        </span>
                      </div>

                      {/* BLOQUE ECONÓMICO */}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border grid grid-cols-3 gap-2 mt-auto">
                        <div className="text-left">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block truncate">Insumos Base</span>
                          <span className="text-xs font-mono font-bold text-foreground block truncate">
                            ${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="text-center px-1 border-x border-border">
                          <span className="text-[10px] font-bold text-primary uppercase block">Factor</span>
                          <Badge variant="default" className="bg-primary/15 text-primary border-primary/30 font-mono font-black text-[11px] px-1.5 py-0">
                            ×{costIndex.toFixed(4)}
                          </Badge>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block truncate">Transformada</span>
                          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block truncate">
                            ${transformedVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block truncate">
                            ~${suggestedPrice.toFixed(2)}/pza
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER CON BOTONES DE ACCIÓN */}
                    <div className="p-3 px-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 font-bold text-xs flex-1 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFormulaDetails(formula);
                        }}
                      >
                        <Icon name="description" size={14} />
                        Detalles
                      </Button>

                      <PermissionGate permission="extrusion.formulas.manage">
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold text-xs px-2.5 h-8 text-muted-foreground hover:text-foreground"
                          title="Editar Factor Índice"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFormula(formula);
                          }}
                        >
                          <Icon name="edit" size={14} />
                        </Button>
                      </PermissionGate>
                    </div>
                  </Card>
                );
              })}
            </div>
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
                <div className="w-full pb-2 overflow-x-auto">
                  <table className="w-full table-fixed border-separate border-spacing-0">
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
                        const ptiCount = formula.ptiProducts?.length || 0;

                        return (
                          <tr
                            key={formula.id}
                            className="group hover:bg-secondary/20 transition-colors cursor-pointer"
                            onClick={() => setSelectedFormulaDetails(formula)}
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
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span>{getTargetMachine(formula)}</span>
                                  </span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.5">
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
                              <span className="text-xs text-muted-foreground block font-medium">
                                ({formula.expected_yield_kg || 490} kg estimados)
                              </span>
                            </td>

                            {/* CARRETES PTI ENLAZADOS */}
                            <td className="border-b border-border/50 px-4 py-3.5 align-middle text-center whitespace-nowrap">
                              {ptiCount > 0 ? (
                                <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30 bg-primary/10">
                                  {ptiCount} PTI enlazado{ptiCount !== 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  Sin carretes
                                </span>
                              )}
                            </td>

                            {/* ACCIONES */}
                            <td className="border-b border-border/50 px-3 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 font-bold text-xs h-8 px-2.5 border-border/70 hover:bg-secondary/30 transition-all shadow-sm"
                                  onClick={() => setSelectedFormulaDetails(formula)}
                                >
                                  <Icon name="description" size={14} className="text-primary" />
                                  Detalles
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                                    <span className="sr-only">Abrir menú</span>
                                    <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 font-medium">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedFormulaDetails(formula)}
                                      className="cursor-pointer py-2"
                                    >
                                      <Icon name="description" size={16} className="mr-2 text-primary" />
                                      <span>Ver Ficha Técnica</span>
                                    </DropdownMenuItem>

                                    <PermissionGate permission="extrusion.formulas.manage">
                                      <DropdownMenuItem
                                        onClick={() => setEditingFormula(formula)}
                                        className="cursor-pointer py-2"
                                      >
                                        <Icon name="edit" size={16} className="mr-2 text-amber-500" />
                                        <span>Editar Factor Índice</span>
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
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* BANNER DE MÉTRICAS PTI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Carretes / Bobinas"
              value={totalPtisCount}
              subtitle={`${activePtisCount} activos en planta`}
              icon="inventory_2"
              iconBg="bg-primary/10 text-primary"
              subIcon="check_circle"
              subColor="text-emerald-600"
            />
            <MetricCard
              title="Fórmulas Vinculadas"
              value={new Set(ptiProducts.map((p) => p.formula_id)).size}
              subtitle="Con trazabilidad genealógica"
              icon="link"
              iconBg="bg-purple-500/10 text-purple-600"
              valueColor="text-purple-600"
            />
            <MetricCard
              title="Peso Promedio"
              value={`${avgWeightKg} kg`}
              subtitle="Factor para báscula de piso"
              icon="scale"
              iconBg="bg-blue-500/10 text-blue-600"
              valueColor="text-blue-600"
            />
            <MetricCard
              title="Precio Promedio"
              value={`$${Number(avgPriceMxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              subtitle="Valor unitario para Racks/WIP"
              icon="payments"
              iconBg="bg-emerald-500/10 text-emerald-600"
              valueColor="text-emerald-600"
            />
          </div>

          {/* BARRA DE FILTROS & BOTÓN NUEVO PTI */}
          <Card className="shadow-sm border-border bg-card">
            <CardContent className="p-4 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-1">
                <div className="relative w-full sm:w-80">
                  <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10 shrink-0" />
                  <Input
                    placeholder="Buscar por código, nombre o ficha..."
                    value={ptiSearchTerm}
                    onChange={(e) => setPtiSearchTerm(e.target.value)}
                    className="!pl-10 w-full bg-background h-10"
                  />
                </div>

                <div className="w-full sm:w-64 flex items-center gap-2">
                  <Icon name="filter_alt" size={18} className="text-muted-foreground shrink-0" />
                  <select
                    value={ptiFormulaFilter}
                    onChange={(e) => setPtiFormulaFilter(e.target.value)}
                    className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-medium truncate"
                  >
                    <option value="ALL">Todas las fórmulas</option>
                    {formulas.map((f) => (
                      <option key={f.id} value={String(f.id)}>{f.code} - {f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-44">
                  <select
                    value={ptiStatusFilter}
                    onChange={(e) => setPtiStatusFilter(e.target.value)}
                    className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
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
                  className="w-full xl:w-auto h-10 gap-2 font-black shrink-0 px-5 shadow-sm"
                >
                  <Icon name="add" size={18} />
                  Nuevo PTI (Carrete)
                </Button>
              </PermissionGate>
            </CardContent>
          </Card>

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
            <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-foreground text-lg tracking-tight">Carretes y Bobinas PTI registrados</h3>
                  <p className="text-sm text-muted-foreground font-semibold">Catálogo controlado de productos terminados intermedios listos para extrusión y pesaje.</p>
                </div>
                <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border text-sm font-bold text-foreground">
                  {filteredPtis.length} carretes
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-5 pt-2">
                <div className="w-full pb-2 overflow-x-auto">
                  <table className="w-full table-fixed border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="w-[13%] rounded-l-xl bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Código / SKU
                        </th>
                        <th className="w-[18%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Carrete / Bobina
                        </th>
                        <th className="w-[18%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Fórmula Enlazada
                        </th>
                        <th className="w-[17%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Especificaciones
                        </th>
                        <th className="w-[9%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Peso Unit.
                        </th>
                        <th className="w-[9%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Precio Unit.
                        </th>
                        <th className="w-[8%] bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
                          Estado
                        </th>
                        <th className="w-[8%] rounded-r-xl bg-secondary px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground whitespace-nowrap">
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

                          <td className="border-b border-border/50 px-2.5 py-2.5 align-middle">
                            <span className="font-bold text-sm text-foreground/90 line-clamp-2 leading-tight block" title={pti.name}>
                              {pti.name}
                            </span>
                          </td>

                          <td className="border-b border-border/50 px-2.5 py-2.5 align-middle">
                            {pti.formula ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-foreground text-xs leading-snug line-clamp-1 block" title={pti.formula.name}>
                                  {pti.formula.name}
                                </span>
                                <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                                  <span>{pti.formula.code}</span>
                                  <span>•</span>
                                  <span className="text-purple-600 font-bold">×{Number(pti.formula.cost_index || 1.15).toFixed(2)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Fórmula #{pti.formula_id}</span>
                            )}
                          </td>

                          <td className="border-b border-border/50 px-2.5 py-2.5 align-middle overflow-hidden" title={pti.specifications || ''}>
                            <p
                              className="text-xs font-medium text-muted-foreground line-clamp-2 leading-tight break-words"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {pti.specifications || <span className="italic opacity-50">Sin ficha técnica</span>}
                            </p>
                          </td>

                          <td className="border-b border-border/50 px-2 py-2.5 align-middle text-center font-mono font-bold text-foreground whitespace-nowrap text-xs">
                            {Number(pti.unit_weight_kg).toFixed(3)} kg
                          </td>

                          <td className="border-b border-border/50 px-2 py-2.5 align-middle text-center font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-xs">
                            ${Number(pti.unit_price).toFixed(2)}
                          </td>

                          <td className="border-b border-border/50 px-3 py-2.5 align-middle text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePtiActive(pti)}
                              title={pti.is_active ? 'Click para desactivar' : 'Click para activar'}
                              className="inline-flex cursor-pointer"
                            >
                              <Badge
                                variant={pti.is_active ? 'default' : 'secondary'}
                                className={`text-[11px] font-bold cursor-pointer transition-all ${
                                  pti.is_active
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                              >
                                {pti.is_active ? 'ACTIVO' : 'INACTIVO'}
                              </Badge>
                            </button>
                          </td>

                          <td className="border-b border-border/50 px-2 py-2 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 text-white border border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm">
                                <span className="sr-only">Abrir menú</span>
                                <span className="text-xl font-bold text-white leading-none pb-1">&#8942;</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 font-medium">
                                <PermissionGate permission="extrusion.formulas.manage">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingPti(pti);
                                      setIsPtiModalOpen(true);
                                    }}
                                    className="cursor-pointer py-2"
                                  >
                                    <Icon name="edit" size={16} className="mr-2 text-primary" />
                                    <span>Editar Carrete</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleTogglePtiActive(pti)}
                                    className="cursor-pointer py-2"
                                  >
                                    <Icon name="power_settings_new" size={16} className={`mr-2 ${pti.is_active ? 'text-amber-500' : 'text-emerald-500'}`} />
                                    <span>{pti.is_active ? 'Desactivar PTI' : 'Activar PTI'}</span>
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
      <PtiProductModal
        isOpen={isPtiModalOpen}
        onClose={() => {
          setIsPtiModalOpen(false);
          setEditingPti(null);
        }}
        pti={editingPti}
        formulas={formulas}
      />

      {/* Modal de Detalles Completos de Fórmula */}
      <FormulaDetailsModal
        isOpen={Boolean(selectedFormulaDetails)}
        onClose={() => setSelectedFormulaDetails(null)}
        formula={formulas.find((f: Formula) => f.id === selectedFormulaDetails?.id) || selectedFormulaDetails}
        onEditFormula={(f) => {
          setSelectedFormulaDetails(null);
          setEditingFormula(f);
        }}
        onRequestMix={(f) => {
          setSelectedFormulaDetails(null);
          setSelectedMixFormula(f);
        }}
        onOpenCreatePti={() => {
          setSelectedFormulaDetails(null);
          setActiveTab('PTI_CATALOG');
          setIsPtiModalOpen(true);
        }}
      />
    </div>
  );
};
