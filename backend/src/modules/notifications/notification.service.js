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

const notifyAdminsIfNonAdmin = async (currentUser, title, message, transaction = null) => {
  try {
    const { User, Role } = require('../../database/models');
    
    if (!currentUser) return;

    const userWithRoles = await User.findByPk(currentUser.id, {
      include: [{ model: Role, as: 'role' }],
      transaction
    });

    const isWarehouseAdmin = userWithRoles?.role?.code === 'ADMIN_ALM';
    
    if (isWarehouseAdmin) return;

    const admins = await User.findAll({
      include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }],
      transaction
    });

    if (admins.length > 0) {
      const { Notification } = require('../../database/models');
      const notifications = admins.map(admin => ({
        recipient_id: admin.id,
        title,
        message: `${message} (Realizado por: ${userWithRoles.username || 'Sistema'})`,
        type: 'SYSTEM',
        is_read: false
      }));
      await Notification.bulkCreate(notifications, { transaction });
    }
  } catch (error) {
    console.error('[Notification Service] Error enviando notificaciones a ADMIN_ALM:', error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyAdminsIfNonAdmin,
};
