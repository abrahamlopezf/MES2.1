import api from '@/api/axiosClient';

export const fetchNotifications = async () => {
  const { data } = await api.get('/notifications');
  return data.data;
};

export const fetchUnreadCount = async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.count;
};

export const markAsRead = async (id: number) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await api.patch('/notifications/mark-all-read');
  return data;
};
