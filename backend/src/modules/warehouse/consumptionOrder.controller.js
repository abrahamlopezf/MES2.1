const consumptionOrderService = require('./consumptionOrder.service');
const { sequelize } = require('../../database/models');
const { Op } = require('sequelize');
const { notifyAdmins } = require('../notifications/notification.service');
const { generateConsumptionOrderPdf } = require('./printer/consumptionOrderPdf');
const { decryptQrData } = require('../../shared/utils/crypto.utils');
const { getUserAreaId, getUserAreaCode, isAdmin } = require('../../shared/security/accessRules');

const WAREHOUSE_ADMIN_ROLES = ['ADMIN_ALM', 'ADMIN_ALMACEN'];
const PROCESS_AREA_CODES = new Set([
  'EXTRUSION', 'TELARES', 'LAMINADO', 'GLOBO', 'CORTE', 'CONFECCION',
  'IMPRENTA', 'PEGADO', 'ENSAMBLADO', 'ETIQUETADO', 'DOBLADO', 'PRENSADO',
]);

const canManageAllOrders = (user) => {
  const roleCode = String(user?.role?.code || '').toUpperCase();
  return isAdmin(user) || WAREHOUSE_ADMIN_ROLES.includes(roleCode);
};

const canAccessOrder = (user, order) => {
  if (canManageAllOrders(user)) return true;
  const userAreaId = getUserAreaId(user);
  return Number(order.requested_by) === Number(user.id)
    || (userAreaId != null && Number(order.requesting_area_id) === Number(userAreaId));
};

const denyOrderAccess = (res) => res.status(404).json({ error: 'Orden no encontrada' });

exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, notes, requesting_area_id } = req.body;
    const requested_by = req.user.id; // from auth middleware

    const areaCode = getUserAreaCode(req.user);
    const userAreaId = getUserAreaId(req.user);
    const canRequestAnyArea = isAdmin(req.user);
    if (!canRequestAnyArea && (!PROCESS_AREA_CODES.has(areaCode)
      || userAreaId == null
      || Number(requesting_area_id) !== Number(userAreaId))) {
      await t.rollback();
      return res.status(403).json({ error: 'Solo puedes solicitar consumos para tu propia área de producción.' });
    }

    const order = await consumptionOrderService.createOrder(
      { requested_by, requesting_area_id, items, notes },
      t
    );

    await t.commit();

    // Fire notification to ADMIN_ALM
    try {
      const { Notification, User, Role } = require('../../database/models');
      const admins = await User.findAll({
        include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }]
      });
      
      const notifications = admins.map(admin => ({
        recipient_id: admin.id,
        title: 'Nueva Orden de Consumo',
        message: `Se ha generado una nueva orden de consumo (${order.order_number}).?order_uuid=${order.uuid}`,
        type: 'SYSTEM',
        is_read: false
      }));
      
      await Notification.bulkCreate(notifications);
    } catch(err) {
      console.error('Notification error', err);
    }

    res.status(201).json(order);
  } catch (error) {
    await t.rollback();
    console.error('[Create Order Error]', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { status, area_id } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (area_id) filters.requesting_area_id = area_id;

    // Restricción por rol: Si no es admin global o admin de almacén, solo puede ver las ODC creadas por él o para su área
    const roleCode = req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '');
    const isGlobalOrWarehouseAdmin = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode);
    const userAreaId = req.user?.areaId || req.user?.area_id || req.user?.role?.area_id || req.user?.role?.area?.id;

    if (!isGlobalOrWarehouseAdmin) {
      const orConditions = [{ requested_by: req.user.id }];
      if (userAreaId) {
        orConditions.push({ requesting_area_id: userAreaId });
      }
      filters[Op.or] = orConditions;
    }

    const orders = await consumptionOrderService.getOrders(filters);
    res.json(orders);
  } catch (error) {
    console.error('[Get Orders Error]', error);
    res.status(500).json({ error: error.message });
  }
};

exports.scanItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { uuid } = req.params;
    const { qr_code } = req.body;
    const resolved_by = req.user.id;

    if (!qr_code) {
      throw new Error('El código QR es requerido.');
    }

    // Accept both signed AGY envelopes and the raw codes printed on existing
    // warehouse lot labels. Raw values are not trusted here: the service must
    // resolve them to an active, non-empty inventory lot before any stock moves.
    const scannedQrValue = String(qr_code).trim();
    const resolvedQrValue = scannedQrValue.startsWith('AGY:')
      ? decryptQrData(scannedQrValue)
      : scannedQrValue;

    const order = await consumptionOrderService.scanFulfillmentItem(uuid, resolvedQrValue, resolved_by, t);
    
    await t.commit();
    res.json(order);
  } catch (error) {
    await t.rollback();
    console.error('[Scan Item Error]', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { uuid } = req.params;
    const order = await consumptionOrderService.getOrderDetails(uuid);
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (!canAccessOrder(req.user, order)) return denyOrderAccess(res);

    res.json(order);
  } catch (error) {
    console.error('[Get Order Details Error]', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { uuid } = req.params;
    const { status } = req.body;
    const resolved_by = req.user.id;

    const order = await consumptionOrderService.updateOrderStatus(uuid, status, resolved_by, t);

    // If SURTIDA, we should actually deduct the inventory. 
    // In this simplified version, let's assume the Lote is modified here or in the service.
    // For now we just update the status.

    await t.commit();
    res.json(order);
  } catch (error) {
    await t.rollback();
    console.error('[Update Order Error]', error);
    res.status(400).json({ error: error.message });
  }
};

exports.printOrder = async (req, res) => {
  try {
    const { uuid } = req.params;
    const order = await consumptionOrderService.getOrderDetails(uuid);
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (!canAccessOrder(req.user, order)) return denyOrderAccess(res);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ORD-${order.order_number}.pdf`);

    await generateConsumptionOrderPdf(order, res);
  } catch (error) {
    console.error('[Print Order Error]', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason } = req.body;
    const operatorId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'El motivo de cancelación es obligatorio.' });
    }

    const order = await consumptionOrderService.cancelOrder(uuid, reason, operatorId);
    
    // Notify ADMIN_ALM
    try {
      const { Notification, User, Role } = require('../../database/models');
      const admins = await User.findAll({
        include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }]
      });
      
      const notifications = admins.map(admin => ({
        recipient_id: admin.id,
        title: 'Orden de Consumo Cancelada',
        message: `La orden de consumo ${order.order_number} ha sido cancelada por el almacén. Motivo: ${reason}`,
        type: 'SYSTEM',
        is_read: false
      }));
      
      if (notifications.length > 0) {
        await Notification.bulkCreate(notifications);
      }
    } catch(err) {
      console.error('Notification error on cancel', err);
    }

    res.json(order);
  } catch (error) {
    console.error('[Cancel Order Error]', error);
    res.status(400).json({ error: error.message });
  }
};
