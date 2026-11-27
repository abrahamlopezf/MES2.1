'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('qr_identity_requests', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        area_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'areas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        requested_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        requested_quantity: { type: Sequelize.INTEGER, allowNull: false },
        notes: { type: Sequelize.TEXT, allowNull: true },
        requested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        delivered_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        delivered_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await queryInterface.addConstraint('qr_identity_requests', {
        fields: ['requested_quantity'], type: 'check', name: 'qr_identity_requests_quantity_positive', where: { requested_quantity: { [Sequelize.Op.gt]: 0 } }, transaction,
      });
      await queryInterface.addConstraint('qr_identity_requests', {
        fields: ['delivered_by', 'delivered_at'], type: 'check', name: 'qr_identity_requests_delivery_actor_timestamp_pair',
        where: Sequelize.literal('(delivered_by IS NULL) = (delivered_at IS NULL)'), transaction,
      });
      await queryInterface.addIndex('qr_identity_requests', ['area_id', 'requested_at'], { name: 'qr_identity_requests_area_requested_at_idx', transaction });
      await queryInterface.addIndex('qr_identity_requests', ['delivered_at', 'requested_at'], { name: 'qr_identity_requests_pending_idx', transaction });

      await queryInterface.createTable('qr_identity_request_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        request_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'qr_identity_requests', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        qr_code_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'qr_codes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        qr_area_assignment_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'qr_area_assignments', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        delivered_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }, { transaction });
      await queryInterface.addIndex('qr_identity_request_items', ['request_id'], { name: 'qr_identity_request_items_request_id_idx', transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('qr_identity_request_items', { transaction });
      await queryInterface.dropTable('qr_identity_requests', { transaction });
    });
  },
};
