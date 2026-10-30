import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button, Input, Badge, Icon } from '@/design-system';
import { useCreatePtiProductMutation, useUpdatePtiProductMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula, PtiProduct } from '@/modules/extrusion/types/extrusion.types';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import { colorNamesMatch, getNamedColors } from '@/modules/extrusion/domain/colorRules';

interface PtiProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  pti: PtiProduct | null;
  formulas: Formula[];
}

export const PtiProductModal: React.FC<PtiProductModalProps> = ({
  isOpen,
  onClose,
  pti,
  formulas
}) => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const isEditing = Boolean(pti);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formulaId, setFormulaId] = useState<number | ''>('');
  const [extrusionMachineNumber, setExtrusionMachineNumber] = useState<number | ''>('');
  const [tapeType, setTapeType] = useState('');
  const [color, setColor] = useState('');
  const [denier, setDenier] = useState<number | ''>('');
  const [tapeCount, setTapeCount] = useState<number | ''>('');
  const [tapeCountTolerance, setTapeCountTolerance] = useState<number>(10);
  const [tapeWidthMm, setTapeWidthMm] = useState<number | ''>('');
  const [transformedCostIndex, setTransformedCostIndex] = useState<number | ''>('');
  const [unitWeightKg, setUnitWeightKg] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [specifications, setSpecifications] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const createMutation = useCreatePtiProductMutation();
  const updateMutation = useUpdatePtiProductMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (pti) {
      setName(pti.name || '');
      setCode(pti.code || '');
      setFormulaId(pti.formula_id || '');
      setExtrusionMachineNumber(pti.extrusion_machine_number == null ? '' : Number(pti.extrusion_machine_number));
      setTapeType(pti.tape_type || '');
      setColor(pti.color || '');
      setDenier(pti.denier == null ? '' : Number(pti.denier));
      setTapeCount(pti.tape_count == null ? '' : Number(pti.tape_count));
      setTapeCountTolerance(Number(pti.tape_count_tolerance ?? 10));
      setTapeWidthMm(pti.tape_width_mm == null ? '' : Number(pti.tape_width_mm));
      setTransformedCostIndex(pti.transformed_cost_index == null ? '' : Number(pti.transformed_cost_index));
      setUnitWeightKg(pti.unit_weight_kg == null ? '' : Number(pti.unit_weight_kg));
      setUnitPrice(pti.unit_price == null ? '' : Number(pti.unit_price));
      setSpecifications(pti.specifications || '');
      setIsActive(pti.is_active !== undefined ? pti.is_active : true);
    } else {
      setName('');
      setCode('');
      setFormulaId('');
      setExtrusionMachineNumber('');
      setTapeType('');
      setColor('');
      setDenier('');
      setTapeCount('');
      setTapeCountTolerance(10);
      setTapeWidthMm('');
      setTransformedCostIndex('');
      setUnitWeightKg('');
      setUnitPrice('');
      setSpecifications('');
      setIsActive(true);
    }
  }, [pti, formulas, isOpen]);

  // Encontrar fórmula seleccionada para datos sugeridos
  const selectedFormula = formulas.find((f) => f.id === Number(formulaId));
  const availableFormulas = formulas.filter((f) => {
    const linkedPti = (f.ptiProducts || [])[0];
    return !linkedPti || Number(linkedPti.id) === Number(pti?.id) || Number(pti?.formula_id) === Number(f.id);
  });

  const handleApplySuggestedPrice = () => {
    if (selectedFormula?.suggested_pti_unit_price && selectedFormula.suggested_pti_unit_price > 0) {
      setUnitPrice(selectedFormula.suggested_pti_unit_price);
      toast.info(`Precio sugerido ($${selectedFormula.suggested_pti_unit_price.toFixed(2)}) aplicado.`);
    } else {
      toast.warning('Esta fórmula no tiene un precio unitario sugerido calculado.');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre del producto PTI (carrete/bobina) es obligatorio.');
      return;
    }
    if (unitWeightKg === '' || !Number.isFinite(Number(unitWeightKg)) || Number(unitWeightKg) <= 0) {
      toast.error('El peso unitario en kg debe ser mayor a 0.');
      return;
    }
    if (unitPrice !== '' && (!Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0)) {
      toast.error('El precio unitario no puede ser negativo.');
      return;
    }
    const technicalProfile = {
      extrusion_machine_number: Number(extrusionMachineNumber),
      tape_type: tapeType.trim(),
      color: color.trim(),
      denier: Number(denier),
      tape_count: Number(tapeCount),
      tape_count_tolerance: Number(tapeCountTolerance),
      tape_width_mm: Number(tapeWidthMm),
      transformed_cost_index: allowCosts
        ? (transformedCostIndex === '' ? 1 : Number(transformedCostIndex))
        : Number(pti?.transformed_cost_index || 1),
    };
    const profileIsComplete = Number.isInteger(technicalProfile.extrusion_machine_number) && technicalProfile.extrusion_machine_number > 0
      && Boolean(technicalProfile.tape_type && technicalProfile.color)
      && Number.isInteger(technicalProfile.denier) && technicalProfile.denier > 0
      && Number.isInteger(technicalProfile.tape_count) && technicalProfile.tape_count > 0
      && Number.isInteger(technicalProfile.tape_count_tolerance) && technicalProfile.tape_count_tolerance >= 0
      && Number.isFinite(technicalProfile.tape_width_mm) && technicalProfile.tape_width_mm > 0
      && Number.isFinite(technicalProfile.transformed_cost_index) && technicalProfile.transformed_cost_index > 0;
    if (!profileIsComplete) {
      toast.error('Completa extrusora de referencia, tipo/color de cinta, denier, número de cintas, tolerancia, ancho e índice de transformación.');
      return;
    }
    const fieldColors = getNamedColors(technicalProfile.color);
    const nameColors = getNamedColors(name);
    if (fieldColors.length !== 1) {
      toast.error('Cada PTI debe corresponder a un solo color. Registra una ficha distinta para cada color.');
      return;
    }
    if (nameColors.length > 1 || (nameColors.length === 1 && !colorNamesMatch(name, technicalProfile.color))) {
      toast.error('El nombre del PTI incluye colores distintos al campo Color. Corrige el nombre para que corresponda a uno solo.');
      return;
    }

    try {
      if (isEditing && pti) {
        await updateMutation.mutateAsync({
          id: pti.id,
          payload: {
            name: name.trim(),
            code: code.trim().toUpperCase() || undefined,
            formula_id: formulaId ? Number(formulaId) : null,
            unit_weight_kg: Number(unitWeightKg),
            unit_price: unitPrice === '' ? 0 : Number(unitPrice),
            specifications: specifications.trim() || undefined,
            ...technicalProfile,
            is_active: isActive
          }
        });
        toast.success(`Producto PTI '${name}' actualizado con éxito.`);
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: code.trim().toUpperCase() || undefined,
          formula_id: formulaId ? Number(formulaId) : null,
          unit_weight_kg: Number(unitWeightKg),
          unit_price: unitPrice === '' ? 0 : Number(unitPrice),
          specifications: specifications.trim() || undefined,
          ...technicalProfile,
          is_active: isActive
        });
        toast.success(`Nuevo producto PTI '${name}' registrado en el catálogo.`);
      }
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error al guardar el producto PTI.';
      toast.error(msg);
    }
  };

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
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border flex flex-col overflow-hidden max-h-[92vh] shadow-2xl z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="inventory_2" size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
                {isEditing ? 'Editar Producto Saliente (PTI)' : 'Nuevo Producto PTI (Carrete / Bobina)'}
                {isEditing && pti?.code && (
                  <Badge variant="outline" className="font-mono text-xs">{pti.code}</Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-1">
                Define el carrete/bobina derivado de la fórmula de extrusión para pesaje en báscula y valorización de Racks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50 shrink-0"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Form with scrollable body and fixed footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-background">
            {/* VINCULACIÓN A LA FÓRMULA DE EXTRUSIÓN */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Icon name="link" size={14} className="text-primary" />
                  Fórmula de Extrusión Enlazada (Opcional)
                </label>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Determina la mezcla de 500kg
                </span>
              </div>

              <select
                value={formulaId}
                onChange={(e) => setFormulaId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">-- Sin enlazar (puedes hacerlo desde Editar Fórmula) --</option>
                {availableFormulas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name}{allowCosts ? ` (Índice: ×${Number(f.cost_index || 1.15).toFixed(2)})` : ''}
                  </option>
                ))}
              </select>

              {/* DATOS DE LA FÓRMULA SELECCIONADA */}
              {selectedFormula && (
                <div className="p-3 rounded-lg bg-background border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    {allowCosts ? (
                      <>
                        <span className="font-bold text-foreground block">
                          Mezcla: ${Number(selectedFormula.transformed_mixture_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                        <span className="text-muted-foreground">
                          Factor: ×{Number(selectedFormula.cost_index || 1.15).toFixed(4)} • Rendimiento: {selectedFormula.expected_yield_pieces} pzas
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground font-semibold">
                        Rendimiento calibrado: {selectedFormula.expected_yield_pieces} pzas ({selectedFormula.expected_yield_kg || 490} kg)
                      </span>
                    )}
                  </div>

                  {allowCosts && selectedFormula.suggested_pti_unit_price !== undefined && selectedFormula.suggested_pti_unit_price > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplySuggestedPrice}
                      className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 shrink-0 font-bold"
                    >
                      <Icon name="auto_awesome" size={14} />
                      Usar Precio Sugerido (${selectedFormula.suggested_pti_unit_price.toFixed(2)})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* CAMPOS PRINCIPALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Nombre del Carrete / Bobina *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Bobina Rafia 1000D Amarilla"
                  className="font-medium bg-background"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Código / SKU Único
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej. PTI-RAF-AMARILLA-01 (Opcional)"
                  className="font-mono uppercase bg-background"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Si se omite, se generará automáticamente a partir de la fórmula.
                </span>
              </div>
            </div>

            {/* PERFIL TÉCNICO OBLIGATORIO PARA ALTA PTI */}
            <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Perfil técnico de la cinta</h3>
                <p className="text-xs text-muted-foreground mt-1">Estos datos son requeridos por producción; no se precargan valores que el cliente aún no haya confirmado.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Extrusora de referencia *
                  <select value={extrusionMachineNumber} onChange={(e) => setExtrusionMachineNumber(e.target.value ? Number(e.target.value) : '')} required className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                    <option value="">Seleccionar extrusora</option>
                    {[1, 2, 4, 5, 6].map((machine) => <option key={machine} value={machine}>{machine === 6 ? 'Extrusora Liquitank' : `Extrusora ${machine}`}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Tipo de cinta *
                  <Input value={tapeType} onChange={(e) => setTapeType(e.target.value)} placeholder="Ej. Rafia / trama / urdimbre" required className="bg-background" />
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Color y variante *
                  <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej. Blanco anti-UV" required className="bg-background" />
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Denier *
                  <Input type="number" min="1" step="1" value={denier} onChange={(e) => setDenier(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 2300" required className="bg-background" />
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Número de cintas *
                  <Input type="number" min="1" step="1" value={tapeCount} onChange={(e) => setTapeCount(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 96" required className="bg-background" />
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Tolerancia de cintas *
                  <Input type="number" min="0" step="1" value={tapeCountTolerance} onChange={(e) => setTapeCountTolerance(e.target.value ? Number(e.target.value) : 0)} required className="bg-background" />
                </label>
                <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Ancho de cinta (mm) *
                  <Input type="number" min="0.01" step="0.01" value={tapeWidthMm} onChange={(e) => setTapeWidthMm(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 2.5" required className="bg-background" />
                </label>
                {allowCosts && <label className="text-xs font-bold text-muted-foreground space-y-1">
                  Índice de costo transformado *
                  <Input type="number" min="0.0001" step="0.0001" value={transformedCostIndex} onChange={(e) => setTransformedCostIndex(e.target.value ? Number(e.target.value) : '')} placeholder="Captura el índice" required className="bg-background" />
                </label>}
              </div>
            </section>

            {/* PESO Y PRECIO UNITARIOS */}
            <div className={`grid grid-cols-1 ${allowCosts ? 'sm:grid-cols-2' : ''} gap-4`}>
              <div className="p-3.5 rounded-xl bg-card border border-border space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Icon name="scale" size={15} className="text-primary" />
                  Peso Unitario Estándar (Kg) *
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.1"
                  value={unitWeightKg}
                  onChange={(e) => setUnitWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="font-mono font-bold text-lg text-foreground bg-background"
                  required
                />
                <span className="text-[11px] text-muted-foreground block">
                  Usado por la báscula de piso para convertir kg pesados a piezas recibidas.
                </span>
              </div>

              {allowCosts && (
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Icon name="payments" size={15} className="text-emerald-500" />
                    Precio Unitario ($ MXN) *
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 bg-background"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    Valor asignado a los Racks de piso e inventario en proceso (WIP).
                  </span>
                </div>
              )}
            </div>

            {/* ESPECIFICACIONES TÉCNICAS */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Icon name="description" size={15} />
                Especificaciones Técnicas / Ficha del Carrete
              </label>
              <textarea
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none font-medium"
                placeholder="Ej. Ancho: 2.5mm, Denier: 1000D, Tenacidad: 5.5 g/den, Calibre estándar cinturón, Bobina 6.8kg..."
              />
            </div>

            {/* ESTADO ACTIVO */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div>
                <span className="font-bold text-sm text-foreground block">Estado del Producto PTI</span>
                <span className="text-xs text-muted-foreground">
                  {isActive ? 'Activo para escaneo y acondicionamiento en Racks de extrusión' : 'Inactivo (oculto en piso)'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-border bg-card flex justify-end items-center gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="font-bold px-5">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2 font-bold px-6">
              {isPending ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icon name="save" size={16} />
                  {isEditing ? 'Guardar Cambios' : 'Registrar PTI'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
