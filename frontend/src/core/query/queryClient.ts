import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 minuto
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
