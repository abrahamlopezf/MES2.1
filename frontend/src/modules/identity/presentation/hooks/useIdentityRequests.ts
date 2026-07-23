import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';
import { identityKeys } from './useGenerateBatchMutation';
import { ApproveRequestDTO, RejectRequestDTO } from '../../application/dto/ApprovalDTOs';
import { IdentityReadRepository } from '../../domain/repositories/IdentityRepository';
import { InMemoryIdentityRepository } from '../../infrastructure/repositories/InMemoryIdentityRepository';

// HACK: Exportando repo de lectura global para la demo.
export const readRepo: IdentityReadRepository = new InMemoryIdentityRepository();

export const usePendingRequestsQuery = () => {
  return useQuery({
    queryKey: [...identityKeys.all, 'requests', 'pending'],
    queryFn: () => readRepo.listPendingRequests(),
  });
};

export const useApproveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ApproveRequestDTO>({
    mutationFn: (request) => identityFacade.approveRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...identityKeys.all, 'requests'] });
    },
  });
};

export const useRejectRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, RejectRequestDTO>({
    mutationFn: (request) => identityFacade.rejectRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...identityKeys.all, 'requests'] });
    },
  });
};
