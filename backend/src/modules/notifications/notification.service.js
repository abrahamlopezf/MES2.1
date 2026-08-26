const { Notification, User } = require('../../database/models');

const getNotifications = async (userId) => {
  const notifications = await Notification.findAll({
    where: { recipient_id: userId },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  return notifications;
};

const getUnreadCount = async (userId) => {
  const count = await Notification.count({
    where: { recipient_id: userId, is_read: false },
  });

  return { count };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, recipient_id: userId },
  });

  if (!notification) {
    const error = new Error('Notificación no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  await notification.update({
    is_read: true,
    read_at: new Date(),
  });

  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.update(
    { is_read: true, read_at: new Date() },
    { where: { recipient_id: userId, is_read: false } }
  );

  return { message: 'Todas las notificaciones han sido marcadas como leídas.' };
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
