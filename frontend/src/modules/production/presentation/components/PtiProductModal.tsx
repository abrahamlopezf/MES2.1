import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Button, Input, Badge, Icon } from '@/design-system';
import { useCreatePtiProductMutation, useUpdatePtiProductMutation } from '@/modules/extrusion/hooks/useExtrusionFloorQueries';
import { Formula, PtiProduct } from '@/modules/extrusion/types/extrusion.types';

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
  const isEditing = Boolean(pti);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formulaId, setFormulaId] = useState<number | ''>('');
  const [unitWeightKg, setUnitWeightKg] = useState<number>(6.800);
  const [unitPrice, setUnitPrice] = useState<number>(195.00);
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
      setUnitWeightKg(Number(pti.unit_weight_kg) || 6.800);
      setUnitPrice(Number(pti.unit_price) || 0);
      setSpecifications(pti.specifications || '');
      setIsActive(pti.is_active !== undefined ? pti.is_active : true);
    } else {
      setName('');
      setCode('');
      setFormulaId('');
      setUnitWeightKg(6.800);
      setUnitPrice(195.00);
      setSpecifications('');
      setIsActive(true);
    }
  }, [pti, formulas, isOpen]);

  // Encontrar fórmula seleccionada para datos sugeridos
  const selectedFormula = formulas.find((f) => f.id === Number(formulaId));
  const availableFormulas = formulas.filter((f) => {
    const linkedPtiId = Number(f.output_pti_id || f.ptiProducts?.[0]?.id || 0);
    return !linkedPtiId || linkedPtiId === Number(pti?.id) || Number(pti?.formula_id) === Number(f.id);
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
    if (unitWeightKg <= 0) {
      toast.error('El peso unitario en kg debe ser mayor a 0.');
      return;
    }
    if (unitPrice < 0) {
      toast.error('El precio unitario no puede ser negativo.');
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
            unit_price: Number(unitPrice),
            specifications: specifications.trim() || undefined,
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
          unit_price: Number(unitPrice),
          specifications: specifications.trim() || undefined,
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
                onChange={(e) => setFormulaId(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">-- Sin enlazar (puedes hacerlo desde Editar Fórmula) --</option>
                {availableFormulas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name} (Índice: ×{Number(f.cost_index || 1.15).toFixed(2)})
                  </option>
                ))}
              </select>

              {/* DATOS DE LA FÓRMULA SELECCIONADA */}
              {selectedFormula && (
                <div className="p-3 rounded-lg bg-background border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground block">
                      Mezcla: ${Number(selectedFormula.transformed_mixture_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </span>
                    <span className="text-muted-foreground">
                      Factor: ×{Number(selectedFormula.cost_index || 1.15).toFixed(4)} • Rendimiento: {selectedFormula.expected_yield_pieces} pzas
                    </span>
                  </div>

                  {selectedFormula.suggested_pti_unit_price !== undefined && selectedFormula.suggested_pti_unit_price > 0 && (
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

            {/* PESO Y PRECIO UNITARIOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  onChange={(e) => setUnitWeightKg(parseFloat(e.target.value) || 0)}
                  className="font-mono font-bold text-lg text-foreground bg-background"
                  required
                />
                <span className="text-[11px] text-muted-foreground block">
                  Usado por la báscula de piso para convertir kg pesados a piezas recibidas.
                </span>
              </div>

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
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 bg-background"
                  required
                />
                <span className="text-[11px] text-muted-foreground block">
                  Valor asignado a los Racks de piso e inventario en proceso (WIP).
                </span>
              </div>
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
