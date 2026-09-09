import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { LoteTraceabilityBottomSheetPresenter } from './LoteTraceabilityBottomSheet.presenter';

export interface LoteTraceabilityBottomSheetContainerProps {
  loteId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const LoteTraceabilityBottomSheet: React.FC<LoteTraceabilityBottomSheetContainerProps> = ({ 
  loteId, 
  isOpen, 
  onClose 
}) => {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['lote-details', loteId],
    queryFn: async () => {
      const res = await axiosClient.get(`/warehouse/lotes/${loteId}`);
      return res.data?.data || res.data;
    },
    enabled: isOpen && !!loteId
  });

  const lote = response?.lote;
  const consumptions = response?.consumptions || [];

  return (
    <LoteTraceabilityBottomSheetPresenter
      isOpen={isOpen}
      onClose={onClose}
      lote={lote}
      consumptions={consumptions}
      isLoading={isLoading}
      isError={isError}
    />
  );
};
