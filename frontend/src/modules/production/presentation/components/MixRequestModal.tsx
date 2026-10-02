import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Send, Loader2 } from 'lucide-react';
import { apiClient } from '@/core/api/apiClient';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/design-system';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md mx-4 shadow-xl border-border bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-xl font-black text-foreground">Solicitar Mezcla</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-secondary/20 h-8 w-8">
            <X size={18} />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-1">{formula.name}</h3>
            <p className="text-sm text-muted-foreground">{formula.internal_code || formula.code}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Cantidad (Kg)</label>
            <Input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Notas (Opcional)</label>
            <textarea 
              className="w-full min-h-[80px] bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Alguna observación para el centro de mezclado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button 
            className="w-full mt-4 gap-2" 
            onClick={() => submitRequest()}
            disabled={isPending || quantity <= 0}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Confirmar Solicitud
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
