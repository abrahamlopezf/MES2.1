import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useConfirmAction } from '../../../../providers/ConfirmProvider';
import { ManualEntryBottomSheetPresenter } from './ManualEntryBottomSheet.presenter';

export interface ManualEntryBottomSheetContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualEntryBottomSheet: React.FC<ManualEntryBottomSheetContainerProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmAction();
  const [materialId, setMaterialId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [entries, setEntries] = useState([{ folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
  const [notes, setNotes] = useState('');

  // Clear state when opened
  useEffect(() => {
    if (isOpen) {
      setMaterialId('');
      setLocationId('');
      setEntries([{ folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
      setNotes('');
    }
  }, [isOpen]);

  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=10000`);
      return response.data;
    },
    enabled: isOpen
  });

  const materialsList = materialsData?.data?.items || (Array.isArray(materialsData?.data) ? materialsData.data : []);
  const materials = [...materialsList].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { data: rawLocations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['warehouse', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get(`/locations?pageSize=10000`);
      return response.data.data;
    },
    enabled: isOpen
  });

  const locations = [...rawLocations].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.description || a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.description || b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { data: rawSuppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['materials', 'suppliers'],
    queryFn: async () => {
      const response = await axiosClient.get(`/suppliers?pageSize=10000`);
      return response.data.data;
    },
    enabled: isOpen
  });

  const suppliers = [...rawSuppliers].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { mutate: handleManualEntry, isPending: isSubmitting } = useMutation({
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

  const handleMaterialChange = (val: string) => {
    setMaterialId(val);
    const selectedMat = materials.find((m: any) => m.id.toString() === val);
    if (selectedMat && selectedMat.default_location_id) {
      setLocationId(selectedMat.default_location_id.toString());
    }
  };

  const handleUpdateEntry = (index: number, field: string, value: string) => {
    const newEntries = [...entries];
    (newEntries[index] as any)[field] = value;
    setEntries(newEntries);
  };

  const handleAddEntry = () => {
    setEntries([...entries, { folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const onConfirmEntry = async () => {
    if (!materialId || !locationId || entries.some(e => !e.quantity || Number(e.quantity) <= 0 || e.unit_cost === '' || Number(e.unit_cost) < 0)) {
      toast.error('Por favor complete todos los campos obligatorios correctamente.');
      return;
    }

    const confirmed = await confirm({
      title: 'Ingreso Manual',
      message: `¿Confirmas el ingreso manual de ${entries.length} lote(s)?`,
      confirmText: 'Sí, ingresar',
      variant: 'primary'
    });

    if (!confirmed) return;

    handleManualEntry();
  };

  return (
    <ManualEntryBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      materialId={materialId}
      locationId={locationId}
      entries={entries}
      notes={notes}
      materials={materials}
      loadingMaterials={loadingMaterials}
      locations={locations}
      loadingLocations={loadingLocations}
      suppliers={suppliers}
      loadingSuppliers={loadingSuppliers}
      isSubmitting={isSubmitting}
      onChangeMaterialId={handleMaterialChange}
      onChangeLocationId={setLocationId}
      onChangeNotes={setNotes}
      onAddEntry={handleAddEntry}
      onUpdateEntry={handleUpdateEntry}
      onRemoveEntry={handleRemoveEntry}
      onConfirmEntry={onConfirmEntry}
    />
  );
};
