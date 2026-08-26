const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const notificationService = require('./notification.service');

const getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.id);
    return successResponse(res, 'Notificaciones obtenidas correctamente.', notifications, 200);
  } catch (error) {
    return errorResponse(res, error.message, [], error.statusCode || 500);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return successResponse(res, 'Conteo obtenido.', result, 200);
  } catch (error) {
    return errorResponse(res, error.message, [], error.statusCode || 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.id);
    return successResponse(res, 'Notificación marcada como leída.', result, 200);
  } catch (error) {
    return errorResponse(res, error.message, [], error.statusCode || 500);
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return successResponse(res, result.message, {}, 200);
  } catch (error) {
    return errorResponse(res, error.message, [], error.statusCode || 500);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
