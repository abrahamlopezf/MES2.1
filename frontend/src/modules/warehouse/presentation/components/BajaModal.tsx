import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button, Badge } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';

export const BajaModal = ({ item, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [selectedLotes, setSelectedLotes] = useState<number[]>([]);
  const [tipoBajaId, setTipoBajaId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['warehouse', 'lotes', item.material_id],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${item.material_id}/lotes`);
      return response.data.data;
    }
  });

  const { data: tiposBaja = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['warehouse', 'tipo-baja'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/tipo-baja`);
      return response.data.data;
    }
  });

  const { mutate: handleBaja, isLoading: isSubmitting } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/dispose', {
        material_id: item.material_id,
        lote_ids: selectedLotes,
        tipo_baja_id: Number(tipoBajaId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Baja registrada exitosamente');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la baja');
    }
  });

  const totalSelectedQuantity = useMemo(() => {
    return selectedLotes.reduce((acc, loteId) => {
      const lote = lotes.find(l => l.id === loteId);
      return acc + (lote ? Number((lote.available_amount ?? lote.amount) || 0) : 0);
    }, 0);
  }, [selectedLotes, lotes]);

  const toggleLote = (loteId: number) => {
    setSelectedLotes(prev => 
      prev.includes(loteId) ? prev.filter(id => id !== loteId) : [...prev, loteId]
    );
  };

  const activeLotes = useMemo(() => {
    return lotes.filter((lote: any) => lote.is_active === true || lote.is_active === 1 || String(lote.is_active) === '1');
  }, [lotes]);

  const toggleAll = () => {
    if (selectedLotes.length === activeLotes.length) {
      setSelectedLotes([]);
    } else {
      setSelectedLotes(activeLotes.map(l => l.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <AlertTriangle className="text-warning" size={20} />
            Baja de Material
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Info Banner */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Material</p>
                <p className="font-bold text-foreground">{item.material?.name}</p>
                <p className="text-xs text-muted-foreground">{item.material?.internal_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Disponible</p>
                <p className="font-bold text-primary text-lg">{Number(item.amount).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Lotes List */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-foreground">Lotes disponibles</h4>
              <button 
                onClick={toggleAll}
                className="text-xs text-primary hover:underline font-medium"
              >
                {selectedLotes.length === activeLotes.length && activeLotes.length > 0 ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2">
              {loadingLotes ? (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Cargando lotes...</span>
                </div>
              ) : (() => {
                if (activeLotes.length === 0) {
                  return (
                    <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                      No hay lotes activos para este material.
                    </div>
                  );
                }
                return activeLotes.map((lote: any) => (
                  <label 
                    key={lote.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLotes.includes(lote.id) 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={selectedLotes.includes(lote.id)}
                      onChange={() => toggleLote(lote.id)}
                    />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-foreground">Lote #{lote.id}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{new Date(lote.date_received).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{lote.user?.first_name}</span>
                          {lote.location && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-foreground">Loc: {lote.location.code}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">{Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}</Badge>
                    </div>
                  </label>
                ));
              })()}
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Tipo de baja *</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={tipoBajaId}
                onChange={e => setTipoBajaId(e.target.value)}
              >
                <option value="" disabled className="bg-background text-foreground">Seleccionar motivo</option>
                {tiposBaja.map(t => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detalles adicionales sobre la baja..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20">
            <span className="text-sm font-bold">Cantidad a dar de baja:</span>
            <span className="text-lg font-black">{totalSelectedQuantity.toFixed(2)}</span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            variant="destructive" 
            onClick={() => handleBaja()}
            disabled={isSubmitting || selectedLotes.length === 0 || !tipoBajaId}
          >
            {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
            Confirmar baja
          </Button>
        </div>
      </div>
    </div>
  );
};
