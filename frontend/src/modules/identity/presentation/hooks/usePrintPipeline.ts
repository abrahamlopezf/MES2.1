import { useMutation } from '@tanstack/react-query';
import { identityFacade } from '../../infrastructure/di/IdentityModuleDI';
import { CreatePrintJobRequestDTO, PrintJobResponseDTO } from '../../application/dto/PrintDTOs';

export const useCreatePrintJobMutation = () => {
  return useMutation<PrintJobResponseDTO, Error, CreatePrintJobRequestDTO>({
    mutationFn: (request) => identityFacade.printBatch(request),
    // En un caso real, onMutate o onSuccess podrían conectar a SignalR / WebSockets
    // para escuchar el evento `PrintCompleted` emitido por el Worker.
  });
};
