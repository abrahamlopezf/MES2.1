const consumptionOrderService = require('./consumptionOrder.service');
const { sequelize } = require('../../database/models');
const { notifyAdmins } = require('../notifications/notification.service');
const { generateConsumptionOrderPdf } = require('./printer/consumptionOrderPdf');
const { decryptQrData } = require('../../shared/utils/crypto.utils');

exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, notes, requesting_area_id } = req.body;
    const requested_by = req.user.id; // from auth middleware

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
    const { status } = req.query;
    const filters = {};
    if (status) filters.status = status;

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

    const decryptedQrCode = decryptQrData(qr_code);

    const order = await consumptionOrderService.scanFulfillmentItem(uuid, decryptedQrCode, resolved_by, t);
    
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
    res.json(order);
  } catch (error) {
    console.error('[Cancel Order Error]', error);
    res.status(400).json({ error: error.message });
  }
};
