import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { ChangeLocationBottomSheetPresenter } from './ChangeLocationBottomSheet.presenter';

export interface ChangeLocationBottomSheetContainerProps {
  isOpen: boolean;
  lotes: any[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangeLocationBottomSheet: React.FC<ChangeLocationBottomSheetContainerProps> = ({ 
  isOpen,
  lotes, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const [newLocationId, setNewLocationId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNewLocationId('');
    }
  }, [isOpen]);

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['materials', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get('/locations?pageSize=all');
      return response.data.data;
    },
    enabled: isOpen
  });

  const { mutate: handleChangeLocation, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      await axiosClient.post('/warehouse/inventory/change-location', {
        lote_ids: lotes.map((l: any) => l.id),
        new_location_id: Number(newLocationId)
      });
    },
    onSuccess: () => {
      toast.success('Localidad actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['material-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar localidad');
    }
  });

  const isSameLocationForAll = lotes.length > 0 && lotes.every((l: any) => l.location_id === Number(newLocationId));

  return (
    <ChangeLocationBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      lotes={lotes}
      newLocationId={newLocationId}
      locations={locations}
      loadingLocations={loadingLocations}
      isSubmitting={isSubmitting}
      isSameLocationForAll={isSameLocationForAll}
      onChangeLocationId={setNewLocationId}
      onChangeLocation={() => handleChangeLocation()}
    />
  );
};
