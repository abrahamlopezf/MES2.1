import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/core/api/apiClient';
import { Button, Input, Badge, Icon } from '@/design-system';

interface MixRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  formula: any;
}

export const MixRequestModal: React.FC<MixRequestModalProps> = ({ isOpen, onClose, formula }) => {
  const [quantity, setQuantity] = useState(500);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { mutate: submitRequest, isPending } = useMutation({
    mutationFn: async () => {
      // Usamos el id temporal de extrusora 1 por ahora, hasta integrar la sesión de extrusora
      const to_area_id = 1; 
      
      const response = await apiClient.post('/extrusion/mix-requests', {
        formula_id: formula.id,
        to_area_id,
        quantity,
        notes
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Solicitud de mezcla enviada a la cola.');
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'mix-requests'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.friendlyMessage || 'Error al solicitar mezcla.');
    }
  });

  if (!isOpen || !formula) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('La cantidad en kg debe ser mayor a 0.');
      return;
    }
    submitRequest();
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
        className="relative w-full max-w-md bg-card rounded-2xl border border-border flex flex-col overflow-hidden max-h-[92vh] shadow-2xl z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="blender" size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
                Solicitar Mezcla
                {formula.code && (
                  <Badge variant="outline" className="font-mono text-xs">{formula.code}</Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-1">
                {formula.name}
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

        {/* Form Body & Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-background">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fórmula Seleccionada
              </div>
              <div className="font-bold text-foreground text-sm">
                {formula.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Lote Estándar: {formula.batch_size_kg || 500} Kg
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Cantidad Requerida (Kg) *
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                step="any"
                required
                className="font-semibold text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Notas / Observaciones (Opcional)
              </label>
              <textarea
                className="w-full min-h-[90px] bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none placeholder:text-muted-foreground"
                placeholder="Indica especificaciones para el centro de mezclado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-border bg-card flex justify-end items-center gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="font-bold px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || quantity <= 0}
              className="gap-2 font-bold px-6"
            >
              {isPending ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Icon name="send" size={16} />
                  Confirmar Solicitud
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
