import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../../../api/axiosClient';
import { InfoBottomSheetPresenter } from './InfoBottomSheet.presenter';

export interface InfoBottomSheetContainerProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

export const InfoBottomSheet: React.FC<InfoBottomSheetContainerProps> = ({ item, isOpen, onClose }) => {
  const navigate = useNavigate();

  // Encapsulated data fetching logic
  const { data: lotes, isLoading } = useQuery({
    queryKey: ['warehouse', 'inventory', item?.material?.id, 'lotes'],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${item.material?.id}/lotes`);
      return response.data.data;
    },
    enabled: !!item?.material?.id && isOpen
  });

  // Data processing logic
  const activeLotes = lotes 
    ? lotes.filter((lote: any) => lote.is_active !== false && lote.is_active !== 0 && Number(lote.available_amount ?? lote.amount) > 0)
    : [];
  
  const lastLotes = activeLotes.slice(0, 3);

  // Navigation handlers
  const handleViewAllLotes = () => {
    onClose();
    navigate(`/warehouse/materials/${item.material?.id}/lotes`);
  };

  return (
    <InfoBottomSheetPresenter
      item={item}
      lotes={lastLotes}
      isLoading={isLoading}
      isOpen={isOpen}
      onClose={onClose}
      onViewAllLotes={handleViewAllLotes}
    />
  );
};
