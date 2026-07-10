'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      action: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },

      entity_type: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },

      entity_id: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },

      module: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      before_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      after_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      ip_address: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },

      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['entity_type']);
    await queryInterface.addIndex('audit_logs', ['entity_id']);
    await queryInterface.addIndex('audit_logs', ['module']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};