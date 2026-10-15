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
  const [items, setItems] = useState<{ 
    id?: string; 
    qrCode?: string; 
    lote_id?: number; 
    folio?: string; 
    material_id: number; 
    maxQuantity: number; 
    quantity: number; 
    materialName: string;
    materialDescription?: string;
    internalCode?: string;
    unitCode?: string;
  }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Auto-generate manual voucher number and clear state when opened
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      // Temporary immediate fallback while fetching sequential from server
      setOrderNumber(`VAL-MNL-${yr}${mo}-...`);
      setNotes('');
      setItems([]);
      setScanInput('');
      setSelectedMaterialId('');
      setIsScanning(false);

      axiosClient.get('/warehouse/inventory/next-consumption-order-number')
        .then(res => {
          if (res.data?.order_number) {
            setOrderNumber(res.data.order_number);
          }
        })
        .catch(err => {
          console.warn('Could not fetch next order number from backend:', err);
          const rnd = Math.floor(100 + Math.random() * 900);
          setOrderNumber(`VAL-MNL-${yr}${mo}-${rnd}`);
        });
    }
  }, [isOpen]);

  // Consulta únicamente materiales con existencia en inventario
  const { data: inventoryData } = useQuery({
    queryKey: ['warehouse', 'inventory', 'consumption-dropdown'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory?limit=1000`);
      return response.data;
    },
    enabled: isOpen
  });

  const rawInventory = inventoryData?.data?.items || inventoryData?.items || (Array.isArray(inventoryData?.data) ? inventoryData.data : []);

  const materials = useMemo(() => {
    return rawInventory
      .filter((inv: any) => Number(inv.amount) > 0 && inv.material)
      .map((inv: any) => {
        const mat = inv.material;
        const unitCode = mat.base_unit?.code || mat.stock_unit?.code || mat.unit?.code || mat.unit?.abbreviation || '';
        const internalCode = mat.internal_code || mat.material_code || 'S/C';
        const stock = Number(inv.amount);
        return {
          id: mat.id,
          internal_code: internalCode,
          name: mat.name,
          description: mat.description || '',
          stock,
          unitCode,
          label: `${internalCode} - ${mat.name} (Disp: ${stock} ${unitCode})`.trim()
        };
      })
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  }, [rawInventory]);

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
         const unitCode = inventory.material?.base_unit?.code || inventory.material?.unit?.code || '';
         setItems(prev => [...prev, {
           id: qr.id,
           qrCode: code,
           lote_id: inventory.lote_id,
           folio: inventory.folio || 'N/A',
           material_id: inventory.material?.id,
           materialName: inventory.material?.name || 'Material',
           materialDescription: inventory.material?.description || '',
           internalCode: inventory.material?.internal_code || '',
           unitCode,
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

  const handleAddMaterial = () => {
    if (!selectedMaterialId) return;
    const material = materials.find((m: any) => m.id === Number(selectedMaterialId));
    if (!material) return;

    if (items.some(i => i.material_id === material.id && !i.lote_id)) {
      toast.error('Este material ya está en la lista de consumo.');
      return;
    }

    if (material.stock <= 0) {
      toast.error('No hay inventario disponible para este material.');
      return;
    }

    setItems(prev => [...prev, {
      material_id: material.id,
      materialName: material.name,
      materialDescription: material.description,
      internalCode: material.internal_code,
      unitCode: material.unitCode,
      maxQuantity: material.stock,
      quantity: 1
    }]);
    setSelectedMaterialId('');
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
