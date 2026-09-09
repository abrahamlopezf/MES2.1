import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useAuthStore } from '../../../../store/authStore';
import { BajaBottomSheetPresenter } from './BajaBottomSheet.presenter';

export interface BajaBottomSheetContainerProps {
  item: any;
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
  
  const isResolutionMode = !!resolutionRequestId;
  const canDirectDispose = hasPermission('warehouse.waste') || hasPermission('warehouse.dispose');
  const isRequestMode = !isResolutionMode && !canDirectDispose;

  const [selectedLotes, setSelectedLotes] = useState<number[]>([]);
  const [tipoBajaId, setTipoBajaId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data: requestDetails, isLoading: loadingRequest } = useQuery({
    queryKey: ['warehouse', 'dispose-request', resolutionRequestId],
    queryFn: async () => {
      if (!resolutionRequestId) return null;
      const response = await axiosClient.get(`/warehouse/inventory/dispose-request/${resolutionRequestId}`);
      return response.data.data;
    },
    enabled: isResolutionMode && isOpen
  });

  const currentMaterialId = isResolutionMode ? requestDetails?.material_id : item?.material_id;
  const currentMaterial = isResolutionMode ? requestDetails?.material : item?.material;

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['warehouse', 'lotes', currentMaterialId],
    queryFn: async () => {
      if (!currentMaterialId) return [];
      const response = await axiosClient.get(`/warehouse/inventory/${currentMaterialId}/lotes`);
      return response.data.data;
    },
    enabled: !!currentMaterialId && isOpen
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
        setSelectedLotes([]);
        setTipoBajaId('');
        setNotes('');
      }
    }
  }, [isOpen, isResolutionMode]);

  useEffect(() => {
    if (isResolutionMode && requestDetails && lotes.length > 0 && isOpen) {
      setTipoBajaId(String(requestDetails.tipo_baja_id));
      setNotes(requestDetails.notes || '');
      setSelectedLotes(requestDetails.lote_ids || []);
    }
  }, [isResolutionMode, requestDetails, lotes, isOpen]);

  const { mutate: handleCreateRequest, isPending: isCreatingRequest } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/dispose-request', {
        material_id: currentMaterialId,
        lote_ids: selectedLotes,
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
      await axiosClient.post('/warehouse/inventory/dispose', {
        material_id: currentMaterialId,
        lote_ids: selectedLotes,
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
    return selectedLotes.reduce((acc, loteId) => {
      const lote = lotes.find((l: any) => l.id === loteId);
      return acc + (lote ? Number((lote.available_amount ?? lote.amount) || 0) : 0);
    }, 0);
  }, [selectedLotes, lotes]);

  const toggleLote = (loteId: number) => {
    if (isResolutionMode) return; 
    setSelectedLotes(prev => 
      prev.includes(loteId) ? prev.filter(id => id !== loteId) : [...prev, loteId]
    );
  };

  const activeLotes = useMemo(() => {
    return lotes.filter((lote: any) => {
      if (isResolutionMode) {
        return requestDetails?.lote_ids?.includes(lote.id);
      }
      const isActive = lote.is_active === true || lote.is_active === 1 || String(lote.is_active) === '1';
      const available = Number((lote.available_amount ?? lote.amount) || 0);
      const notFrozen = lote.is_frozen === false || lote.is_frozen === 0 || String(lote.is_frozen) === '0';
      return isActive && available > 0 && notFrozen;
    });
  }, [lotes, isResolutionMode, requestDetails]);

  const toggleAll = () => {
    if (isResolutionMode) return;
    if (selectedLotes.length === activeLotes.length) {
      setSelectedLotes([]);
    } else {
      setSelectedLotes(activeLotes.map((l: any) => l.id));
    }
  };

  return (
    <BajaBottomSheetPresenter
      item={item}
      isOpen={isOpen}
      onClose={onClose}
      isResolutionMode={isResolutionMode}
      isRequestMode={isRequestMode}
      requestDetails={requestDetails}
      loadingRequest={loadingRequest}
      currentMaterial={currentMaterial}
      activeLotes={activeLotes}
      loadingLotes={loadingLotes}
      tiposBaja={tiposBaja}
      selectedLotes={selectedLotes}
      tipoBajaId={tipoBajaId}
      notes={notes}
      totalSelectedQuantity={totalSelectedQuantity}
      isSubmitting={isSubmitting}
      onToggleLote={toggleLote}
      onToggleAll={toggleAll}
      onChangeTipoBajaId={setTipoBajaId}
      onChangeNotes={setNotes}
      onResolveRequest={handleResolveRequest}
      onCreateRequest={() => handleCreateRequest()}
      onDirectDispose={() => handleDirectDispose()}
    />
  );
};
