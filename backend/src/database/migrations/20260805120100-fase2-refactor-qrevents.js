'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Rename table
      await queryInterface.renameTable('qr_events', 'traceability_events', { transaction });

      // Rename description to notes
      await queryInterface.renameColumn('traceability_events', 'description', 'notes', { transaction });

      // Add uuid
      await queryInterface.addColumn('traceability_events', 'uuid', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      }, { transaction });

      // Add entity_type and entity_id
      await queryInterface.addColumn('traceability_events', 'entity_type', {
        type: Sequelize.STRING(80),
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('traceability_events', 'entity_id', {
        type: Sequelize.STRING(80),
        allowNull: true
      }, { transaction });

      // Drop old columns that are no longer strictly needed in the new MES domain if we want to be clean, 
      // but from_status and to_status might be useful for history. 
      // Let's keep them in metadata or as is.

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('traceability_events', 'entity_type', { transaction });
      await queryInterface.removeColumn('traceability_events', 'entity_id', { transaction });
      await queryInterface.removeColumn('traceability_events', 'uuid', { transaction });
      await queryInterface.renameColumn('traceability_events', 'notes', 'description', { transaction });
      await queryInterface.renameTable('traceability_events', 'qr_events', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
