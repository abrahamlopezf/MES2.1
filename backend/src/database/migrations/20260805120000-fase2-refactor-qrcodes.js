'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Remove old tracking fields that now belong to TraceabilityEvent
      const columnsToRemove = [
        'entity_type', 'entity_id', 'current_area_id',
        'assigned_by', 'assigned_at',
        'used_by', 'used_at',
        'cancelled_by', 'cancelled_at'
      ];

      for (const col of columnsToRemove) {
        const tableDesc = await queryInterface.describeTable('qr_codes');
        if (tableDesc[col]) {
          // If it's a foreign key, we need to remove the constraint first.
          // Since it's hard to guess the constraint name dynamically in all cases, 
          // we'll try to remove columns directly. Sequelize might throw if FK exists.
          // For safety, let's query the constraints.
          const constraints = await queryInterface.showConstraint('qr_codes');
          const colConstraints = constraints.filter(c => c.columnNames && c.columnNames.includes(col) && c.constraintType === 'FOREIGN KEY');
          for (const c of colConstraints) {
            await queryInterface.removeConstraint('qr_codes', c.constraintName, { transaction });
          }
          await queryInterface.removeColumn('qr_codes', col, { transaction });
        }
      }

      // 2. Add UUID column
      const tableDesc = await queryInterface.describeTable('qr_codes');
      if (!tableDesc.uuid) {
        await queryInterface.addColumn('qr_codes', 'uuid', {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          unique: true
        }, { transaction });
      }

      // 3. Clean statuses (We update existing ones to GENERATED if any)
      await queryInterface.sequelize.query(`UPDATE qr_codes SET status = 'GENERATED'`, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('qr_codes', 'uuid', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
