import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, PackagePlus, Loader2 } from 'lucide-react';
import { Button } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';

export const ManualEntryModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [materialId, setMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch materials
  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=1000`);
      return response.data;
    }
  });

  const materials = [...(materialsData?.data || [])].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  // Fetch locations
  const { data: rawLocations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['warehouse', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get(`/locations`);
      return response.data.data;
    }
  });

  const locations = [...rawLocations].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.description || a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.description || b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { mutate: handleManualEntry, isLoading: isSubmitting } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/manual-entry', {
        material_id: Number(materialId),
        quantity: Number(quantity),
        location_id: Number(locationId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Ingreso manual registrado exitosamente');
      queryClient.invalidateQueries(['warehouse', 'inventory']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar el ingreso manual');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col max-h-[80dvh] sm:max-h-[90dvh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/10 shrink-0">
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <PackagePlus size={20} />
            Ingreso Manual (Lote Virtual)
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content — scrollable en mobile con teclado virtual */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Material *</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={materialId}
                onChange={e => setMaterialId(e.target.value)}
                disabled={loadingMaterials}
              >
                <option value="" disabled className="bg-background text-foreground">
                  {loadingMaterials ? 'Cargando materiales...' : 'Seleccionar material'}
                </option>
                {materials.map(mat => (
                  <option key={mat.id} value={mat.id} className="bg-background text-foreground">
                    {mat.internal_code} - {mat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Cantidad *</label>
              <input 
                type="number"
                min="0.01"
                step="0.01"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="0.00"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Localidad *</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={loadingLocations}
              >
                <option value="" disabled className="bg-background text-foreground">
                  {loadingLocations ? 'Cargando localidades...' : 'Seleccionar localidad'}
                </option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id} className="bg-background text-foreground">
                    {loc.code} - {loc.description || loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Notas (Opcional)</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Motivo del ingreso manual..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-end gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            variant="default" 
            onClick={() => handleManualEntry()}
            disabled={isSubmitting || !materialId || !quantity || Number(quantity) <= 0 || !locationId}
          >
            {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
            Confirmar Ingreso
          </Button>
        </div>
      </div>
    </div>
  );
};
