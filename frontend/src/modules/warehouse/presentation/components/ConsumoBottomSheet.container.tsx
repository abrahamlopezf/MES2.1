import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useConfirmAction } from '../../../../providers/ConfirmProvider';
import { ConsumoBottomSheetPresenter } from './ConsumoBottomSheet.presenter';

export interface ConsumoBottomSheetContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConsumoBottomSheet: React.FC<ConsumoBottomSheetContainerProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmAction();
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ id?: string; qrCode?: string; lote_id?: number; folio?: string; material_id: number; maxQuantity: number; quantity: number; materialName: string }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Clear state when opened
  useEffect(() => {
    if (isOpen) {
      setOrderNumber('');
      setNotes('');
      setItems([]);
      setScanInput('');
      setSelectedMaterialId('');
      setIsScanning(false);
    }
  }, [isOpen]);

  const { data: materialsData } = useQuery({
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

  const { mutate: handleConsume, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      const payloadItems = items.map(i => ({
        material_id: i.material_id,
        lote_id: i.lote_id,
        qr_id: i.id,
        quantity: i.quantity
      }));
      await axiosClient.post('/warehouse/inventory/consume', {
        order_number: orderNumber,
        notes,
        items: payloadItems
      });
    },
    onSuccess: () => {
      toast.success('Consumo registrado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar el consumo');
    }
  });

  const handleScan = async (code: string) => {
    if (!code) return;
    try {
      const response = await axiosClient.get(`/qr/lookup/${encodeURIComponent(code)}`);
      const data = response.data.data || response.data;
      const inventory = data.inventory;
      const qr = data.qr;
      
      if (inventory && inventory.lote_id) {
         if (items.some(i => i.lote_id === inventory.lote_id)) {
           toast.error('Este lote ya está en la lista.');
           return;
         }

         const parsedQty = Number(inventory.quantity) || 0;
         setItems(prev => [...prev, {
           id: qr.id,
           qrCode: code,
           lote_id: inventory.lote_id,
           folio: inventory.folio || 'N/A',
           material_id: inventory.material?.id,
           materialName: inventory.material?.name || 'Material',
           maxQuantity: parsedQty,
           quantity: parsedQty 
         }]);
         setScanInput('');
      } else {
         toast.error('El QR escaneado no está asociado a un lote en inventario válido.');
      }
    } catch (e) {
      toast.error('Error al resolver QR. Verifique que exista y esté activo.');
    }
  };

  const handleAddMaterial = async () => {
    if (!selectedMaterialId) return;
    const material = materials.find((m: any) => m.id === Number(selectedMaterialId));
    if (!material) return;

    if (items.some(i => i.material_id === material.id && !i.lote_id)) {
      toast.error('Este material ya está en la lista de consumo.');
      return;
    }

    try {
      const response = await axiosClient.get(`/warehouse/inventory?material_id=${material.id}`);
      const inventoryItems = response.data?.data?.items || response.data?.items || [];
      const inventory = inventoryItems.find((i: any) => Number(i.material_id) === material.id);
      
      const maxQuantity = inventory ? Number(inventory.amount) : 0;

      if (maxQuantity <= 0) {
        toast.error('No hay inventario disponible para este material.');
        return;
      }

      setItems(prev => [...prev, {
        material_id: material.id,
        materialName: material.name,
        maxQuantity,
        quantity: 1
      }]);
      setSelectedMaterialId('');
    } catch (e) {
      toast.error('Error al obtener inventario del material.');
    }
  };

  const updateItemQuantity = (index: number, val: number) => {
    const newItems = [...items];
    if (val > newItems[index].maxQuantity) val = newItems[index].maxQuantity;
    if (val < 0) val = 0;
    newItems[index].quantity = val;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = useMemo(() => items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0), [items]);

  const onConsume = async () => {
    if (items.length === 0) {
      toast.error('Agregue al menos un material para consumir.');
      return;
    }
    if (items.some(i => i.quantity <= 0)) {
      toast.error('Las cantidades deben ser mayores a cero.');
      return;
    }

    const confirmed = await confirm({
      title: 'Consumo de Material',
      message: `¿Confirmas el consumo de ${items.length} material(es)? Esta acción afectará el inventario.`,
      confirmText: 'Sí, consumir',
      variant: 'primary'
    });

    if (!confirmed) return;

    handleConsume();
  };

  return (
    <ConsumoBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      orderNumber={orderNumber}
      notes={notes}
      items={items}
      isScanning={isScanning}
      selectedMaterialId={selectedMaterialId}
      materials={materials}
      isSubmitting={isSubmitting}
      totalQuantity={totalQuantity}
      onChangeOrderNumber={setOrderNumber}
      onChangeNotes={setNotes}
      onChangeSelectedMaterialId={setSelectedMaterialId}
      onSetIsScanning={setIsScanning}
      onScan={handleScan}
      onAddMaterial={handleAddMaterial}
      onUpdateItemQuantity={updateItemQuantity}
      onRemoveItem={removeItem}
      onConsume={onConsume}
    />
  );
};
