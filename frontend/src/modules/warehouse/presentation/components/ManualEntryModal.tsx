import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, PackagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../design-system';
import { SearchSelect } from '../../../../design-system/components/Input/SearchSelect';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';

export const ManualEntryModal = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [materialId, setMaterialId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [entries, setEntries] = useState([{ folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
  const [notes, setNotes] = useState('');

  // Fetch materials
  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=10000`);
      return response.data;
    }
  });

  const materialsList = materialsData?.data?.items || (Array.isArray(materialsData?.data) ? materialsData.data : []);
  const materials = [...materialsList].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  // Fetch locations
  const { data: rawLocations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['warehouse', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get(`/locations?pageSize=10000`);
      return response.data.data;
    }
  });

  const locations = [...rawLocations].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.description || a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.description || b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  // Fetch suppliers
  const { data: rawSuppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['materials', 'suppliers'],
    queryFn: async () => {
      const response = await axiosClient.get(`/suppliers?pageSize=10000`);
      return response.data.data;
    }
  });

  const suppliers = [...rawSuppliers].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { mutate: handleManualEntry, isLoading: isSubmitting } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/manual-entry', {
        material_id: Number(materialId),
        location_id: Number(locationId),
        entries: entries.map(e => ({ 
          folio: e.folio, 
          quantity: Number(e.quantity),
          supplier_id: e.supplier_id ? Number(e.supplier_id) : null,
          unit_cost: e.unit_cost ? Number(e.unit_cost) : null
        })),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Ingreso manual registrado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("FRONTEND MUTATION ERROR:", error);
      toast.error(error.response?.data?.message || `Error al registrar el ingreso manual: ${error.message}`);
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
              <SearchSelect
                options={materials}
                value={materialId}
                onChange={(val) => {
                  setMaterialId(val);
                  const selectedMat = materials.find((m: any) => m.id.toString() === val);
                  if (selectedMat && selectedMat.default_location_id) {
                    setLocationId(selectedMat.default_location_id.toString());
                  }
                }}
                getLabel={(mat: any) => `${mat.internal_code} - ${mat.name}`}
                getValue={(mat: any) => mat.id.toString()}
                placeholder="Seleccionar material..."
                loading={loadingMaterials}
                searchable={true}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-foreground">Localidad *</label>
              <SearchSelect
                options={locations}
                value={locationId}
                onChange={(val) => setLocationId(val)}
                getLabel={(loc: any) => `${loc.code} - ${loc.description || loc.name}`}
                getValue={(loc: any) => loc.id.toString()}
                placeholder="Seleccionar localidad..."
                loading={loadingLocations}
                searchable={true}
              />
            </div>


            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Entradas (Folio [Opcional] y Cantidad) *</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEntries([...entries, { folio: '', quantity: '', supplier_id: '', unit_cost: '' }])}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Agregar
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {entries.map((entry, index) => (
                  <div key={index} className="flex flex-col gap-3 bg-secondary/10 p-3 rounded-lg border border-border">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Folio</label>
                        <input 
                          type="text"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Ej. FAC-001 (Opcional)"
                          value={entry.folio}
                          onChange={e => {
                            const newEntries = [...entries];
                            newEntries[index].folio = e.target.value;
                            setEntries(newEntries);
                          }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Cantidad *</label>
                        <input 
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Ej. 10.00"
                          value={entry.quantity}
                          onChange={e => {
                            const newEntries = [...entries];
                            newEntries[index].quantity = e.target.value;
                            setEntries(newEntries);
                          }}
                        />
                      </div>
                      {entries.length > 1 && (
                        <button 
                          type="button"
                          className="mt-6 p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                          onClick={() => {
                            const newEntries = entries.filter((_, i) => i !== index);
                            setEntries(newEntries);
                          }}
                          title="Eliminar entrada"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Costo Unitario *</label>
                        <input 
                          type="number"
                          min="0"
                          step="0.0001"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Ej. 12.50"
                          value={entry.unit_cost || ''}
                          onChange={e => {
                            const newEntries = [...entries];
                            newEntries[index].unit_cost = e.target.value;
                            setEntries(newEntries);
                          }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Proveedor (Opcional)</label>
                        <SearchSelect
                          options={suppliers}
                          value={entry.supplier_id}
                          onChange={(val) => {
                            const newEntries = [...entries];
                            newEntries[index].supplier_id = val;
                            setEntries(newEntries);
                          }}
                          getLabel={(sup: any) => `${sup.code} - ${sup.name}`}
                          getValue={(sup: any) => sup.id.toString()}
                          placeholder="Buscar proveedor..."
                          loading={loadingSuppliers}
                          searchable={true}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            variant="default" 
            onClick={() => handleManualEntry()}
            disabled={isSubmitting || !materialId || !locationId || entries.some(e => !e.quantity || Number(e.quantity) <= 0 || e.unit_cost === '' || Number(e.unit_cost) < 0)}
          >
            {isSubmitting && <Loader2 className="mr-2 animate-spin" size={16} />}
            Confirmar Ingreso
          </Button>
        </div>
      </div>
    </div>
  );
};
