'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const usersTableInfo = await queryInterface.describeTable('users', { transaction });
      const hasAreaId = !!usersTableInfo.area_id;

      if (!hasAreaId) {
        console.log('NOTICE: users.area_id does not exist, skipping drop.');
        return;
      }

      // 1. Detectar si a pesar de todo quedó alguna inconsistencia antes de eliminar area_id
      // Usamos IS DISTINCT FROM para detectar cualquier diferencia, incluyendo NULL vs NOT NULL
      const [results] = await queryInterface.sequelize.query(`
        SELECT u.id as user_id, u.area_id as user_area_id, r.id as role_id, r.area_id as role_area_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.area_id IS DISTINCT FROM r.area_id
      `, { transaction });

      if (results && results.length > 0) {
        console.error('INCONSISTENCIES FOUND:', results);
        throw new Error('Migration aborted: Found users with an area_id different from their role area_id (or one is NULL). Please resolve these inconsistencies before dropping users.area_id.');
      }

      // 2. Eliminar la columna
      await queryInterface.removeColumn('users', 'area_id', { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const usersTableInfo = await queryInterface.describeTable('users', { transaction });
      if (!usersTableInfo.area_id) {
        await queryInterface.addColumn('users', 'area_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'areas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }, { transaction });
      }
    });
  },
};
