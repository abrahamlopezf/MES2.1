import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useAuthStore } from '../../../../store/authStore';
import { useConfirmAction } from '../../../../providers/ConfirmProvider';
import { BajaBottomSheetPresenter } from './BajaBottomSheet.presenter';

export interface BajaBottomSheetContainerProps {
  item?: any; // Opcional, si se abre desde una fila para precargar material
  resolutionRequestId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BajaBottomSheet: React.FC<BajaBottomSheetContainerProps> = ({ 
  item, 
  resolutionRequestId, 
  isOpen,
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { confirm } = useConfirmAction();
  
  const isResolutionMode = !!resolutionRequestId;
  const canDirectDispose = hasPermission('warehouse.waste') || hasPermission('warehouse.dispose');
  const isRequestMode = !isResolutionMode && !canDirectDispose;
  const isMaterialLocked = !!item?.material_id;

  const [step, setStep] = useState<'SELECT_METHOD' | 'SCANNING' | 'FORM'>('SELECT_METHOD');
  const [items, setItems] = useState<{ id?: string; qrCode?: string; lote_id: number; folio?: string; material_id: number; maxQuantity: number; quantity: number; materialName: string }[]>([]);
  const [tipoBajaId, setTipoBajaId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [loteSearch, setLoteSearch] = useState('');

  const { data: requestDetails, isLoading: loadingRequest } = useQuery({
    queryKey: ['warehouse', 'dispose-request', resolutionRequestId],
    queryFn: async () => {
      if (!resolutionRequestId) return null;
      const response = await axiosClient.get(`/warehouse/inventory/dispose-request/${resolutionRequestId}`);
      return response.data.data;
    },
    enabled: isResolutionMode && isOpen
  });

  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=10000`);
      return response.data;
    },
    enabled: isOpen && !isResolutionMode
  });

  const materialsList = materialsData?.data?.items || (Array.isArray(materialsData?.data) ? materialsData.data : []);
  const materials = [...materialsList].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { data: tiposBaja = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['warehouse', 'tipo-baja'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/tipo-baja`);
      return response.data.data;
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      if (!isResolutionMode) {
        setTipoBajaId('');
        setNotes('');
        setScanInput('');
        setSelectedMaterialId('');
        setIsScanning(false);
        setLoteSearch('');
        setItems([]);
        
        if (item?.material_id) {
          setSelectedMaterialId(String(item.material_id));
          setStep('FORM');
        } else {
          setStep('SELECT_METHOD');
        }
      }
    }
  }, [isOpen, isResolutionMode, item]);

  useEffect(() => {
    if (isResolutionMode && requestDetails && isOpen) {
      setTipoBajaId(String(requestDetails.tipo_baja_id));
      setNotes(requestDetails.notes || '');
      
      const lotes = requestDetails.lote_ids || [];
      const mappedItems = lotes.map((l: any) => {
        if (typeof l === 'object') {
          return {
            lote_id: l.lote_id,
            material_id: l.material_id || requestDetails.material_id,
            quantity: l.quantity,
            maxQuantity: l.quantity, 
            materialName: requestDetails.material?.name || 'Material',
            folio: 'Lote ' + l.lote_id
          };
        }
        return null;
      }).filter(Boolean);
      
      if (mappedItems.length > 0) setItems(mappedItems);
      setStep('FORM');
    }
  }, [isResolutionMode, requestDetails, isOpen]);

  const { mutate: handleCreateRequest, isPending: isCreatingRequest } = useMutation({
    mutationFn: async () => {
      const payloadItems = items.map(i => ({
        material_id: i.material_id,
        lote_id: i.lote_id,
        quantity: i.quantity
      }));
      await axiosClient.post('/warehouse/inventory/dispose-request', {
        items: payloadItems,
        tipo_baja_id: Number(tipoBajaId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Solicitud de baja enviada a autorización');
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al solicitar la baja');
    }
  });

  const { mutate: handleDirectDispose, isPending: isDisposing } = useMutation({
    mutationFn: async () => {
      const payloadItems = items.map(i => ({
        material_id: i.material_id,
        lote_id: i.lote_id,
        quantity: i.quantity
      }));
      await axiosClient.post('/warehouse/inventory/dispose', {
        items: payloadItems,
        tipo_baja_id: Number(tipoBajaId),
        notes
      });
    },
    onSuccess: () => {
      toast.success('Baja registrada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar la baja');
    }
  });

  const { mutate: handleResolveRequest, isPending: isResolving } = useMutation({
    mutationFn: async (status: 'APPROVED' | 'REJECTED') => {
      await axiosClient.post(`/warehouse/inventory/dispose-resolve/${resolutionRequestId}`, {
        status
      });
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === 'APPROVED' ? 'Baja aprobada exitosamente' : 'Baja rechazada, lotes reactivados');
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al resolver la solicitud');
    }
  });

  const isSubmitting = isCreatingRequest || isDisposing || isResolving;

  const totalSelectedQuantity = useMemo(() => {
    return items.reduce((acc, currentItem) => acc + (Number(currentItem.quantity) || 0), 0);
  }, [items]);

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
         
         if (parsedQty <= 0) {
           confirm({
             title: 'Lote no disponible',
             message: `El lote escaneado (${inventory.folio || inventory.lote_id}) ya no cuenta con cantidad disponible (fue consumido o dado de baja). Por favor, escanee otro lote.`,
             confirmText: 'Entendido',
             variant: 'danger',
             hideCancel: true
           });
           setScanInput('');
           if (step === 'SCANNING') setStep('SELECT_METHOD');
           return;
         }

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
         if (step === 'SCANNING') setStep('FORM');
      } else {
         toast.error('El QR escaneado no está asociado a un lote en inventario válido.');
      }
    } catch (e) {
      toast.error('Error al resolver QR. Verifique que exista y esté activo.');
    }
  };

  const handleAddMaterial = async (materialId: string) => {
    if (!materialId) return;
    const material = materials.find((m: any) => m.id === Number(materialId));
    if (!material) return;

    if (items.some(i => i.material_id === material.id)) {
      toast.error('Este material ya está en la lista.');
      return;
    }

    try {
      const response = await axiosClient.get(`/warehouse/inventory/${material.id}/lotes`);
      const lotes = response.data.data || response.data || [];
      
      const activeLotes = lotes.filter((lote: any) => {
        const isActive = lote.is_active === true || lote.is_active === 1 || String(lote.is_active) === '1';
        const available = Number((lote.available_amount ?? lote.amount) || 0);
        const notFrozen = lote.is_frozen === false || lote.is_frozen === 0 || String(lote.is_frozen) === '0';
        return isActive && available > 0 && notFrozen;
      });

      // Ordenar FIFO (por created_at ascendente)
      const sortedLotes = activeLotes.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (sortedLotes.length === 0) {
        toast.error('No hay lotes disponibles para dar de baja de este material.');
        return;
      }

      const newItems = sortedLotes.map((l: any) => ({
        lote_id: l.id,
        folio: l.folio || 'N/A',
        material_id: material.id,
        materialName: material.name,
        maxQuantity: Number(l.available_amount || l.amount),
        quantity: 0 // Por defecto en 0 para que el usuario capture la cantidad de cada lote
      }));

      setItems(prev => [...prev, ...newItems]);
      if (!isMaterialLocked) {
        setSelectedMaterialId('');
      }
    } catch (e) {
      toast.error('Error al obtener lotes del material.');
    }
  };

  useEffect(() => {
    if (isOpen && !isResolutionMode && item?.material_id && materials?.length > 0 && items.length === 0) {
      handleAddMaterial(String(item.material_id));
    }
  }, [isOpen, isResolutionMode, item, materials]);

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

  const executeAction = (actionFn: () => Promise<void>) => {
    confirm({
      title: 'Confirmar Baja',
      message: '¿Está seguro de procesar esta baja de inventario? Esta acción afectará el inventario actual.',
      confirmText: 'Sí, procesar baja',
      variant: 'danger',
      action: actionFn
    });
  };

  return (
    <BajaBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      isResolutionMode={isResolutionMode}
      isRequestMode={isRequestMode}
      loadingRequest={loadingRequest}
      tiposBaja={tiposBaja}
      items={items}
      materials={materials}
      tipoBajaId={tipoBajaId}
      notes={notes}
      totalSelectedQuantity={totalSelectedQuantity}
      isSubmitting={isSubmitting}
      scanInput={scanInput}
      step={step}
      onSetStep={setStep}
      isScanning={isScanning}
      selectedMaterialId={selectedMaterialId}
      isMaterialLocked={isMaterialLocked}
      loteSearch={loteSearch}
      onChangeLoteSearch={setLoteSearch}
      onChangeTipoBajaId={setTipoBajaId}
      onChangeNotes={setNotes}
      onScanInput={setScanInput}
      onScanSubmit={handleScan}
      onToggleScanning={() => {
        if (step === 'FORM') setIsScanning(!isScanning);
        else setStep('SCANNING');
      }}
      onChangeSelectedMaterial={(id) => {
        handleAddMaterial(id);
      }}
      onUpdateQuantity={updateItemQuantity}
      onRemoveItem={removeItem}
      onResolveRequest={handleResolveRequest}
      onCreateRequest={() => executeAction(() => handleCreateRequest())}
      onDirectDispose={() => executeAction(() => handleDirectDispose())}
    />
  );
};
