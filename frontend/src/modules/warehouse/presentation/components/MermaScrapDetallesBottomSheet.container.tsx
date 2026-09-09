import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { MermaScrapDetallesBottomSheetPresenter } from './MermaScrapDetallesBottomSheet.presenter';

export interface MermaScrapDetallesBottomSheetContainerProps {
  materialId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const MermaScrapDetallesBottomSheet: React.FC<MermaScrapDetallesBottomSheetContainerProps> = ({ 
  materialId, 
  isOpen, 
  onClose 
}) => {
  const { data: details = [], isLoading } = useQuery({
    queryKey: ['warehouse', 'merma-scrap-details', materialId],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/reports/merma-scrap/${materialId}`);
      return response.data.data;
    },
    enabled: isOpen && !!materialId
  });

  return (
    <MermaScrapDetallesBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      details={details}
      isLoading={isLoading}
    />
  );
};
