import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';
import { TransferCustodyRequestDTO, CustodySnapshotDTO, CustodyTimelineDTO } from '../../application/dto/CustodyDTOs';

export const useTransferCustodyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, TransferCustodyRequestDTO>({
    mutationFn: (request) => identityFacade.transferCustody(request),
    onSuccess: (_, variables) => {
      // Invalidar snapshot para que se refresque la UI
      queryClient.invalidateQueries({ queryKey: ['custodySnapshot', variables.identityTokenId] });
      queryClient.invalidateQueries({ queryKey: ['custodyTimeline', variables.identityTokenId] });
    }
  });
};

export const useCustodySnapshotQuery = (identityTokenId: string) => {
  return useQuery<CustodySnapshotDTO | null, Error>({
    queryKey: ['custodySnapshot', identityTokenId],
    queryFn: () => identityFacade.getCustodySnapshot(identityTokenId),
    enabled: !!identityTokenId,
  });
};

export const useCustodyTimelineQuery = (identityTokenId: string) => {
  return useQuery<CustodyTimelineDTO | null, Error>({
    queryKey: ['custodyTimeline', identityTokenId],
    queryFn: () => identityFacade.getCustodyTimeline(identityTokenId),
    enabled: !!identityTokenId,
  });
};
