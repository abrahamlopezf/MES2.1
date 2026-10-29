import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input, Icon } from '@/design-system';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { useUpdateFormulaMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { useMaterialsQuery } from '@/modules/materials/hooks/useMaterialsQueries';
import { Formula, PtiProduct } from '@/modules/extrusion/types/extrusion.types';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { getClientTargetLabel, isClientFormula } from '@/modules/extrusion/domain/clientFormulaRules';

interface FormulaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  formula: Formula | null;
  onEditFormula?: (formula: Formula) => void;
  onRequestMix?: (formula: Formula) => void;
  onOpenCreatePti?: () => void;
}

interface DraftIngredient {
  id?: number;
  material_id: number;
  quantity: number;
  percentage: number;
  unit: string;
  is_restricted_on_machine_4: boolean;
}

const isPolypropyleneIngredient = (ingredient: any, material?: { name?: string; code?: string }) => {
  const name = String(material?.name || ingredient?.material?.name || ingredient?.material_name || '').trim().toUpperCase();
  const code = String(material?.code || ingredient?.material?.internal_code || ingredient?.material?.material_code || ingredient?.material_code || '').trim().toUpperCase();
  return name.startsWith('POLIPROPILENO') || name === 'PP' || name.startsWith('PP ') || code.startsWith('MP-PP');
};

const IngredientSupplyBadge = ({ ingredient, material }: { ingredient: any; material?: { name?: string; code?: string } }) => (
  <Badge variant="outline" className={isPolypropyleneIngredient(ingredient, material)
    ? 'text-sm text-sky-700 dark:text-sky-300 border-sky-500/40'
    : 'text-sm text-amber-700 dark:text-amber-300 border-amber-500/40'}>
    {isPolypropyleneIngredient(ingredient, material) ? 'SILO · POLIPROPILENO' : 'WIP / ODC · ALMACÉN'}
  </Badge>
);

export const FormulaDetailsModal: React.FC<FormulaDetailsModalProps> = ({
  isOpen,
  onClose,
  formula,
  onEditFormula,
  onRequestMix,
  onOpenCreatePti
}) => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const roleCode = (typeof user?.role === 'string' ? user.role : (user?.role?.code || user?.role?.name || '')).toUpperCase();
  const canEditFormulaIngredients = ['ADMIN_EXT', 'ADMIN_EXTRUSION', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'SUPERADMIN'].includes(roleCode);

  // Edición inline de ingredientes
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);

  useEffect(() => {
    if (!canEditFormulaIngredients) setIsEditingIngredients(false);
  }, [canEditFormulaIngredients]);

  // Queries y Mutaciones
  const { data: materialsData, isLoading: isLoadingMaterials } = useMaterialsQuery({ pageSize: 250 }, { enabled: isOpen });
  const rawMaterials = materialsData?.items || [];
  const updateMutation = useUpdateFormulaMutation();
  const usesClientCatalogRules = isClientFormula(formula?.code);

  // Catálogo unificado de materiales (incluye los materiales ya asociados a la fórmula)
  const availableMaterials = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code?: string }>();
    rawMaterials.forEach((m: any) => {
      map.set(m.id, {
        id: m.id,
        name: m.name,
        code: m.internal_code || m.code
      });
    });
    (formula?.ingredients || []).forEach((ing: any) => {
      if (ing.material && !map.has(ing.material.id)) {
        map.set(ing.material.id, {
          id: ing.material.id,
          name: ing.material.name,
          code: ing.material.internal_code || ing.material.code
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawMaterials, formula?.ingredients]);

  // Inicializar borrador al cambiar la fórmula o abrir el modal
  useEffect(() => {
    if (formula?.ingredients) {
      setDraftIngredients(
        formula.ingredients.map((ing: any) => ({
          id: ing.id,
          material_id: Number(ing.material_id),
          quantity: Number(ing.quantity || ing.weight_kg || 0),
          percentage: Number(ing.percentage || 0),
          unit: ing.unit || 'KG',
          is_restricted_on_machine_4: usesClientCatalogRules ? false : Boolean(ing.is_restricted_on_machine_4)
        }))
      );
    } else {
      setDraftIngredients([]);
    }
    setIsEditingIngredients(false);
  }, [formula?.id, isOpen, usesClientCatalogRules]);

  // Todos los Hooks se ejecutan antes de este retorno. El modal permanece montado
  // en la página y su estado abierto/cerrado cambia sin alterar el orden de Hooks.
  if (!isOpen || !formula) return null;

  const costIndex = Number(formula.cost_index) || 1.1500;
  const rawCost = formula.raw_materials_cost == null ? null : Number(formula.raw_materials_cost);
  const transformedVal = formula.transformed_mixture_value == null ? null : Number(formula.transformed_mixture_value);
  const suggestedPrice = formula.suggested_pti_unit_price == null ? null : Number(formula.suggested_pti_unit_price);
  const expectedYieldPieces = Number(formula.expected_yield_pieces) || 0;
  const expectedYieldKg = Number(formula.expected_yield_kg) || 0;
  const batchSizeKg = Number(formula.batch_size_kg) || 500;
  const costPerKg = transformedVal == null ? null : (batchSizeKg > 0 ? (transformedVal / batchSizeKg).toFixed(2) : null);

  // Handlers para edición de filas
  const handleMaterialChange = (index: number, newMaterialId: number) => {
    const selectedMat = availableMaterials.find((m) => m.id === newMaterialId);
    const isRestrictedM4 = !usesClientCatalogRules && Boolean(
      selectedMat?.name?.toUpperCase().includes('POLIPROPILENO (B)')
    );
    setDraftIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        material_id: newMaterialId,
        is_restricted_on_machine_4: isRestrictedM4
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    const qty = Math.max(0, newQty);
    const pct = batchSizeKg > 0 ? (qty / batchSizeKg) * 100 : 0;
    setDraftIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: Number(qty),
        percentage: Number(pct.toFixed(2))
      };
      return copy;
    });
  };

  const handlePercentageChange = (index: number, newPct: number) => {
    const pct = Math.max(0, newPct);
    const qty = batchSizeKg > 0 ? (pct / 100) * batchSizeKg : 0;
    setDraftIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        percentage: Number(pct),
        quantity: Number(qty.toFixed(2))
      };
      return copy;
    });
  };

  const handleToggleRestrictedM4 = (index: number) => {
    if (usesClientCatalogRules) return;
    setDraftIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        is_restricted_on_machine_4: !copy[index].is_restricted_on_machine_4
      };
      return copy;
    });
  };

  const handleAddRow = () => {
    const defaultMat = availableMaterials[0];
    const newRow: DraftIngredient = {
      material_id: defaultMat?.id || 0,
      quantity: 0,
      percentage: 0,
      unit: 'KG',
      is_restricted_on_machine_4: !usesClientCatalogRules && Boolean(
        defaultMat?.name?.toUpperCase().includes('POLIPROPILENO (B)')
      )
    };
    setDraftIngredients((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (draftIngredients.length <= 1) {
      toast.warning('La fórmula debe contener al menos un ingrediente.');
      return;
    }
    setDraftIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    if (formula?.ingredients) {
      setDraftIngredients(
        formula.ingredients.map((ing: any) => ({
          id: ing.id,
          material_id: Number(ing.material_id),
          quantity: Number(ing.quantity || ing.weight_kg || 0),
          percentage: Number(ing.percentage || 0),
          unit: ing.unit || 'KG',
          is_restricted_on_machine_4: usesClientCatalogRules ? false : Boolean(ing.is_restricted_on_machine_4)
        }))
      );
    }
    setIsEditingIngredients(false);
  };

  const handleSaveIngredients = async () => {
    if (!canEditFormulaIngredients) {
      toast.error('Tu rol no puede modificar los ingredientes de una fórmula.');
      setIsEditingIngredients(false);
      return;
    }
    if (draftIngredients.length === 0) {
      toast.error('Debes incluir al menos un ingrediente en la fórmula.');
      return;
    }

    for (let i = 0; i < draftIngredients.length; i++) {
      const row = draftIngredients[i];
      if (!row.material_id) {
        toast.error(`La fila #${i + 1} no tiene un material válido asignado.`);
        return;
      }
    }

    if (usesClientCatalogRules && !isDraftBalancedKg) {
      toast.error(`La receta debe sumar ${batchSizeKg.toFixed(2)} kg. Total actual: ${totalDraftKg.toFixed(2)} kg.`);
      return;
    }
    if (usesClientCatalogRules && !isDraftBalancedPct) {
      toast.error(`La composición debe sumar 100%. Total actual: ${totalDraftPct.toFixed(2)}%.`);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: formula.id,
        payload: {
          ingredients: draftIngredients.map((row) => ({
            material_id: Number(row.material_id),
            quantity: Number(row.quantity),
            percentage: Number(row.percentage),
            unit: row.unit || 'KG',
            is_restricted_on_machine_4: Boolean(row.is_restricted_on_machine_4)
          }))
        }
      });
      toast.success('Fórmula, composición e insumos actualizados con éxito.');
      setIsEditingIngredients(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error al guardar los ingredientes de la fórmula.';
      toast.error(msg);
    }
  };

  // Cálculos en vivo del borrador
  const totalDraftKg = draftIngredients.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalDraftPct = draftIngredients.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
  const isDraftBalancedKg = Math.abs(totalDraftKg - batchSizeKg) < 0.05;
  const isDraftBalancedPct = Math.abs(totalDraftPct - 100) < 0.1;

  const getTargetMachine = () => {
    const clientLabel = getClientTargetLabel(formula);
    if (clientLabel) return clientLabel;
    if (formula.allowed_extruders && formula.allowed_extruders.length > 0) {
      return `Extrusora ${formula.allowed_extruders.join(', ')}`;
    }
    if (formula.description && formula.description.includes('Extrusora')) {
      return formula.description;
    }
    return 'Extrusión General';
  };

  const ingredients = formula.ingredients || [];
  const ptiProducts = formula.ptiProducts || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-4xl bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DEL MODAL */}
        <div className="flex flex-row items-start justify-between gap-3 border-b border-border bg-card py-4 px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="science" size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <CardTitle className="text-lg sm:text-xl font-black leading-snug text-foreground whitespace-normal break-words">
                  {formula.name}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-sm font-bold">
                  {formula.code}
                </Badge>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {batchSizeKg} Kg Lote
                </Badge>
                {formula.is_active ? (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-sm font-bold">
                    ACTIVA
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm">
                    INACTIVA
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground font-medium mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                  <span>{getTargetMachine()}</span>
                </span>
                <span>•</span>
                <span>Rendimiento Teórico: {expectedYieldPieces} piezas ({expectedYieldKg} kg)</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar detalle de fórmula"
            className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 h-12 w-12 flex items-center justify-center"
          >
            <Icon name="close" size={20} />
          </Button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1 bg-background">
          {/* SECCIÓN ECONÓMICA: INSUMOS BASE, FACTOR ÍNDICE Y MEZCLA TRANSFORMADA */}
          {allowCosts && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-foreground text-base uppercase tracking-wider flex items-center gap-2">
                  <Icon name="auto_awesome" size={16} className="text-primary" />
                  Valorización Económica del Bache ({batchSizeKg} Kg)
                </h4>
                <span className="text-sm text-muted-foreground font-medium">
                  Costo calculado por transformación industrial
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. INSUMOS BASE */}
                <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between shadow-xs">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider block">
                    Insumos Base
                  </span>
                  <div className="my-2">
                    <div className="text-2xl font-black font-mono text-foreground">
                      {rawCost == null ? 'Pendiente de costeo' : `$${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground block">
                      Costo neto formulación
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium pt-2 border-t border-border/60">
                    Materia prima directa {batchSizeKg} kg
                  </div>
                </div>

                {/* 2. FACTOR ÍNDICE */}
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between shadow-xs">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    Factor Índice
                  </span>
                  <div className="my-2">
                    <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                      ×{costIndex.toFixed(4)}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground block">
                      Multiplicador operativo
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium pt-2 border-t border-purple-500/20">
                    Energía, M.O. y calibración
                  </div>
                </div>

                {/* 3. MEZCLA TRANSFORMADA */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between shadow-xs">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Mezcla Transformada
                  </span>
                  <div className="my-2">
                    <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {transformedVal == null ? 'Pendiente' : `$${transformedVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground block">
                      Valor total del bache
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium pt-2 border-t border-emerald-500/20 font-mono">
                    {costPerKg == null ? 'Costo/kg pendiente' : `$${costPerKg} MXN / kg`}
                  </div>
                </div>

                {/* 4. PRECIO SUGERIDO PTI */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between shadow-xs">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Costo Sugerido PTI
                  </span>
                  <div className="my-2">
                    <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                      {suggestedPrice == null ? 'Pendiente' : `~$${suggestedPrice.toFixed(2)}`}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground block">
                      Por pieza esperada
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium pt-2 border-t border-blue-500/20">
                    Base ~{expectedYieldPieces} piezas/lote
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ESPECIFICACIÓN DE INGREDIENTES Y COMPOSICIÓN */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                  <Icon name="description" size={16} className="text-primary" />
                  Especificación de Ingredientes (Bache de {batchSizeKg} Kg)
                </h4>
                <Badge variant="outline" className="text-xs font-mono">
                  {isEditingIngredients ? draftIngredients.length : ingredients.length} Ingrediente{(isEditingIngredients ? draftIngredients.length : ingredients.length) !== 1 ? 's' : ''}
                </Badge>
                {isEditingIngredients && (
                  <Badge variant="default" className="text-xs bg-amber-500 text-black font-bold animate-pulse">
                    Modo Edición
                  </Badge>
                )}
              </div>

              {/* Botón para iniciar o cancelar edición */}
              {canEditFormulaIngredients && (
                !isEditingIngredients ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-12 gap-2 px-4 font-bold text-base border-primary/30 text-primary hover:bg-primary/10 self-start sm:self-auto"
                    onClick={() => setIsEditingIngredients(true)}
                  >
                    <Icon name="edit" size={14} />
                    Editar Ingredientes y Composición
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updateMutation.isPending}
                      className="min-h-12 gap-2 px-4 font-bold text-base text-muted-foreground"
                    >
                      <Icon name="undo" size={14} />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveIngredients}
                      disabled={updateMutation.isPending}
                      className="min-h-12 gap-2 px-4 font-bold text-base"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Icon name="progress_activity" size={14} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Icon name="save" size={14} />
                          Guardar Composición
                        </>
                      )}
                    </Button>
                  </div>
                )
              )}
            </div>

            {/* Tarjetas legibles para tablet y móvil */}
            <div className="space-y-3 md:hidden">
              {(isEditingIngredients ? draftIngredients : ingredients).map((item: any, idx: number) => {
                const material = availableMaterials.find((candidate) => candidate.id === (isEditingIngredients ? item.material_id : item.material_id));
                const name = item.material?.name || material?.name || `Material #${item.material_id}`;
                return (
                  <section key={idx} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-semibold text-muted-foreground">Material / resina</p>
                        {isEditingIngredients ? (
                          <select value={item.material_id} onChange={(e) => handleMaterialChange(idx, Number(e.target.value))}
                            aria-label={`Material de ingrediente ${idx + 1}`}
                            className="min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary outline-none">
                            <option value={0}>Selecciona material</option>
                            {availableMaterials.map((m) => <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name}</option>)}
                          </select>
                        ) : <p className="text-lg font-bold text-foreground">{name}</p>}
                      </div>
                      {isEditingIngredients && <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${name}`}
                        className="min-h-12 min-w-12 shrink-0 text-destructive focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => handleRemoveRow(idx)} disabled={draftIngredients.length <= 1}><Icon name="delete" size={20} /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1 text-sm font-semibold text-muted-foreground">Cantidad (kg)
                        {isEditingIngredients ? <Input type="number" step="0.01" min="0" value={item.quantity}
                          aria-label={`Cantidad de ${name}`} onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)} className="min-h-12 text-base font-mono font-bold" />
                          : <span className="block text-lg font-bold text-foreground">{Number(item.quantity || item.weight_kg || 0).toFixed(2)} kg</span>}
                      </label>
                      <label className="space-y-1 text-sm font-semibold text-muted-foreground">% composición
                        {isEditingIngredients ? <Input type="number" step="0.01" min="0" max="100" value={item.percentage}
                          aria-label={`Porcentaje de ${name}`} onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value) || 0)} className="min-h-12 text-base font-mono font-bold" />
                          : <span className="block text-lg font-bold text-foreground">{Number(item.percentage || 0).toFixed(2)}%</span>}
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <span className="text-sm font-semibold text-muted-foreground">{usesClientCatalogRules ? 'Abastecimiento' : 'Restricción M4'}</span>
                      {isEditingIngredients ? <button type="button" onClick={() => handleToggleRestrictedM4(idx)} disabled={usesClientCatalogRules}
                        aria-label={`Cambiar restricción M4 de ${name}`} className="min-h-12 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {usesClientCatalogRules ? <IngredientSupplyBadge ingredient={item} material={material} /> : item.is_restricted_on_machine_4 ? <Badge variant="destructive" className="text-sm">PROHIBIDO M4</Badge>
                          : <Badge variant="outline" className="text-sm text-emerald-700 dark:text-emerald-400">PERMITIDO</Badge>}
                      </button> : usesClientCatalogRules ? <IngredientSupplyBadge ingredient={item} material={material} /> : item.is_restricted_on_machine_4 ? <Badge variant="destructive" className="text-sm">PROHIBIDO M4</Badge>
                        : <Badge variant="outline" className="text-sm text-emerald-700 dark:text-emerald-400">PERMITIDO</Badge>}
                    </div>
                  </section>
                );
              })}
              {isEditingIngredients && <Button type="button" variant="outline" onClick={handleAddRow}
                className="min-h-12 w-full gap-2 border-dashed text-base font-bold text-primary"><Icon name="add" size={18} />Agregar Material</Button>}
            </div>

            {/* TABLA: MODO LECTURA O MODO EDICIÓN */}
            <div className="hidden rounded-xl border border-border bg-card overflow-hidden shadow-xs md:block">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-sm uppercase">Material / Resina</TableHead>
                    <TableHead className="font-bold text-sm uppercase text-right w-36">Cantidad (Kg)</TableHead>
                    <TableHead className="font-bold text-sm uppercase text-right w-32">% Composición</TableHead>
                    <TableHead className="font-bold text-sm uppercase text-center w-44">{usesClientCatalogRules ? 'Abastecimiento' : 'Restricción M4'}</TableHead>
                    {isEditingIngredients && (
                          <TableHead className="font-bold text-sm uppercase text-center w-14">Acción</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isEditingIngredients ? (
                    // MODO EDICIÓN ACTIVO
                    draftIngredients.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                        {/* Selector de Material */}
                        <TableCell className="py-2">
                          <select
                            value={item.material_id}
                            onChange={(e) => handleMaterialChange(idx, Number(e.target.value))}
                            className="w-full min-h-12 bg-background border border-border rounded-lg px-3 py-2 text-base font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary outline-none"
                          >
                            <option value={0}>-- Selecciona Material --</option>
                            {availableMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.code ? `[${m.code}] ` : ''}{m.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>

                        {/* Input Cantidad (Kg) */}
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-28 min-h-12 text-right font-mono font-bold text-base"
                            />
                            <span className="text-base text-muted-foreground font-semibold">kg</span>
                          </div>
                        </TableCell>

                        {/* Input % Composición */}
                        <TableCell className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={item.percentage}
                              onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-24 min-h-12 text-right font-mono font-semibold text-base"
                            />
                            <span className="text-base text-muted-foreground font-semibold">%</span>
                          </div>
                        </TableCell>

                        {/* Toggle Restricción Máquina 4 */}
                        <TableCell className="text-center py-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRestrictedM4(idx)}
                            disabled={usesClientCatalogRules}
                            aria-label={`Cambiar restricción de máquina 4 para ${availableMaterials.find((material) => material.id === item.material_id)?.name || 'ingrediente'}`}
                            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg px-2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {usesClientCatalogRules ? (
                              <IngredientSupplyBadge ingredient={item} material={availableMaterials.find((candidate) => candidate.id === item.material_id)} />
                            ) : item.is_restricted_on_machine_4 ? (
                              <Badge variant="destructive" className="text-sm cursor-pointer hover:opacity-80">
                                PROHIBIDO M4
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-sm text-emerald-700 dark:text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/10">
                                PERMITIDO
                              </Badge>
                            )}
                          </button>
                        </TableCell>

                        {/* Eliminar Fila */}
                        <TableCell className="text-center py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="min-h-12 min-w-12 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={draftIngredients.length <= 1}
                            title="Eliminar ingrediente"
                            aria-label="Eliminar ingrediente"
                          >
                            <Icon name="delete" size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // MODO LECTURA ESTÁNDAR
                    ingredients.length > 0 ? (
                      ingredients.map((ing: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-semibold text-foreground py-2.5">
                            {ing.material?.name || `Material #${ing.material_id}`}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary py-2.5">
                            {Number(ing.quantity || ing.weight_kg || 0).toFixed(2)} kg
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground py-2.5">
                            {Number(ing.percentage || 0).toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            {usesClientCatalogRules ? (
                              <IngredientSupplyBadge ingredient={ing} material={availableMaterials.find((candidate) => candidate.id === ing.material_id)} />
                            ) : ing.is_restricted_on_machine_4 ? (
                              <Badge variant="destructive" className="text-sm">PROHIBIDO M4</Badge>
                            ) : (
                              <Badge variant="outline" className="text-sm text-emerald-700 dark:text-emerald-400 border-emerald-500/40">PERMITIDO</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                          No hay ingredientes registrados para esta fórmula.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>

                <TableFooter className="bg-muted/30 font-bold border-t border-border">
                  {isEditingIngredients ? (
                    // FOOTER EN MODO EDICIÓN: TOTALES DINÁMICOS Y BOTÓN DE AGREGAR
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="py-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddRow}
                          className="min-h-12 gap-2 px-4 font-bold text-base border-dashed text-primary hover:bg-primary/10"
                        >
                          <Icon name="add" size={14} />
                          Agregar Material
                        </Button>
                      </TableCell>
                      <TableCell className="text-right font-mono py-2.5">
                        <div className="flex flex-col items-end">
                          <span className={`font-black text-xs ${isDraftBalancedKg ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                            {totalDraftKg.toFixed(2)} kg
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Meta: {batchSizeKg} kg
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono py-2.5">
                        <div className="flex flex-col items-end">
                          <span className={`font-black text-xs ${isDraftBalancedPct ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                            {totalDraftPct.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Meta: 100.00%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell colSpan={2} className="text-center py-2.5">
                        {isDraftBalancedKg && isDraftBalancedPct ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 gap-1 flex items-center">
                            <Icon name="check_circle" size={12} /> Mezcla Equilibrada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 gap-1 flex items-center">
                            <Icon name="warning" size={12} /> Ajustar bache ({totalDraftKg.toFixed(1)}/{batchSizeKg}kg)
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    // FOOTER EN MODO LECTURA
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="text-foreground uppercase text-xs">{allowCosts ? 'Costo Base de Materiales' : 'Total Formulación'}</TableCell>
                      <TableCell className="text-right font-mono text-primary font-black">
                        {batchSizeKg}.00 kg
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">100.00%</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-black">
                        {allowCosts ? (rawCost == null ? 'Pendiente de costeo' : `$${rawCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`) : '—'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableFooter>
              </Table>
            </div>
          </div>

          {/* PRODUCTOS PTI SALIENTES ENLAZADOS */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-black text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                <Icon name="inventory_2" size={16} className="text-primary" />
                Productos PTI Salientes Enlazados (Carretes / Bobinas)
              </h4>
              <Badge variant="outline" className="text-xs font-mono">
                {ptiProducts.length} Carretes
              </Badge>
            </div>

            {ptiProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ptiProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-foreground block truncate">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground block truncate">{p.code}</span>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-medium">
                        <span>Peso: <strong className="text-foreground">{p.unit_weight_kg == null ? 'Pendiente' : `${Number(p.unit_weight_kg).toFixed(3)} kg`}</strong></span>
                        {allowCosts && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ${Number(p.unit_price).toFixed(2)} MXN
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">Ext. {p.extrusion_machine_number ?? '—'} · {p.tape_type || 'Tipo pendiente'}</span>
                        <span className="block break-words">Color: {p.color || '—'}</span>
                        <span className="block font-mono">{p.denier == null ? '—' : `${p.denier} D`} · {p.tape_count == null ? '—' : `${p.tape_count} ±${p.tape_count_tolerance ?? 10}`} cintas · {p.tape_width_mm == null ? '—' : `${Number(p.tape_width_mm)} mm`}{allowCosts ? ` · índice ×${Number(p.transformed_cost_index || 1).toFixed(4)}` : ''}</span>
                      </div>
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {p.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-card border border-dashed border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
                <span>Esta fórmula aún no tiene productos terminados intermedios (PTI) enlazados.</span>
                {onOpenCreatePti && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 text-primary shrink-0"
                    onClick={onOpenCreatePti}
                  >
                    <Icon name="add" size={14} />
                    Dar de alta PTI
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>

        {/* FOOTER CON ACCIONES */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 px-6 border-t border-border bg-card shrink-0">
          <div className="text-xs text-muted-foreground font-medium hidden sm:block">
            {formula.description || `Receta para formulación de mezcla de ${batchSizeKg} Kg`}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isEditingIngredients ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  className="font-bold text-xs px-4"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveIngredients}
                  disabled={updateMutation.isPending}
                  className="gap-1.5 font-bold text-xs px-4"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Icon name="progress_activity" size={15} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={15} />
                      Guardar Composición
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {onEditFormula && (
                  <PermissionGate permission="extrusion.formulas.manage">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-bold text-xs"
                      onClick={() => onEditFormula(formula)}
                    >
                      <Icon name="edit" size={15} />
                      Editar Parámetros
                    </Button>
                  </PermissionGate>
                )}

                {/* Botón Solicitar Mezcla comentado temporalmente a petición del usuario */}
                {/* {onRequestMix && (
                  <PermissionGate permission="extrusion.wip.manage">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 font-bold text-xs"
                      onClick={() => onRequestMix(formula)}
                    >
                      <PackageCheck size={15} />
                      Solicitar Mezcla
                    </Button>
                  </PermissionGate>
                )} */}

                <Button
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="font-bold text-xs px-4"
                >
                  Cerrar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
