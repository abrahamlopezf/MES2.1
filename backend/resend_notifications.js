const { sequelize, ConsumptionOrder, Notification, User, Role } = require('./src/database/models');

async function resendNotifications() {
  try {
    // Buscar los admin de almacén
    const admins = await User.findAll({
      include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }]
    });

    if (admins.length === 0) {
      console.log('No admins found');
      process.exit(0);
    }

    // Buscar las 2 órdenes más recientes
    const orders = await ConsumptionOrder.findAll({
      order: [['created_at', 'DESC']],
      limit: 2
    });

    const notifications = [];

    for (const order of orders) {
      for (const admin of admins) {
        notifications.push({
          recipient_id: admin.id,
          title: 'Nueva Orden de Consumo',
          message: `Se ha generado una nueva orden de consumo (${order.order_number}).?order_uuid=${order.uuid}`,
          type: 'SYSTEM',
          is_read: false
        });
      }
    }

    await Notification.bulkCreate(notifications);
    console.log(`Created ${notifications.length} notifications`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resendNotifications();
