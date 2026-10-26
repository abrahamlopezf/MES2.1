'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('viajero_rolls', 'shift_supervisor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('viajero_roll_operator_segments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      viajero_roll_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'viajero_rolls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      operator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      shift_number: { type: Sequelize.INTEGER, allowNull: false },
      meters_start: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      meters_end: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      weight_start_kg: { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      weight_end_kg: { type: Sequelize.DECIMAL(12, 3), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      recorded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('viajero_roll_operator_segments', ['viajero_roll_id'], { name: 'idx_viajero_roll_operator_segments_roll' });
    await queryInterface.addIndex('viajero_roll_operator_segments', ['operator_id', 'shift_number'], { name: 'idx_viajero_roll_operator_segments_operator_shift' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('viajero_roll_operator_segments');
    await queryInterface.removeColumn('viajero_rolls', 'shift_supervisor_id');
  },
};
