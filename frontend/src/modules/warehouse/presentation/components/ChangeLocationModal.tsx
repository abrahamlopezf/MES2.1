import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';

export const ChangeLocationModal = ({ lote, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [newLocationId, setNewLocationId] = useState<string>('');

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['materials', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get('/locations');
      return response.data.data;
    }
  });

  const { mutate: handleChangeLocation, isLoading: isSubmitting } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/change-location', {
        lote_id: lote.id,
        new_location_id: Number(newLocationId)
      });
    },
    onSuccess: () => {
      toast.success('Localidad actualizada exitosamente');
      queryClient.invalidateQueries(['material-lotes']);
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar localidad');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            Cambiar Localidad
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Lote Actual</span>
            <span className="font-bold">LOTE-{lote.id}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Localidad Actual</span>
            <span className="font-bold">{lote.location ? lote.location.code : 'Sin asignar'}</span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <label className="text-sm font-bold text-foreground">Nueva Localidad</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newLocationId}
              onChange={(e) => setNewLocationId(e.target.value)}
              disabled={loadingLocations}
            >
              <option value="">Seleccione localidad...</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleChangeLocation()} 
            disabled={isSubmitting || !newLocationId || Number(newLocationId) === lote.location_id}
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Guardar Cambio
          </Button>
        </div>
      </div>
    </div>
  );
};
