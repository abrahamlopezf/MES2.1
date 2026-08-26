import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from '../api/notifications.api';

export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: fetchUnreadCount,
    refetchInterval: 5000, // Poll every 5 seconds for real-time feel
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
