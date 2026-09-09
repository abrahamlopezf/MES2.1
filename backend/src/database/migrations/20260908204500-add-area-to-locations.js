'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add area_id column to material_locations
    await queryInterface.addColumn('material_locations', 'area_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'areas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Fetch the ALMACEN area ID
    const [areas] = await queryInterface.sequelize.query(
      `SELECT id FROM areas WHERE code = 'ALMACEN' LIMIT 1;`
    );

    if (areas && areas.length > 0) {
      const almacenId = areas[0].id;
      // 3. Assign all existing locations to ALMACEN
      await queryInterface.sequelize.query(
        `UPDATE material_locations SET area_id = ${almacenId} WHERE area_id IS NULL;`
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('material_locations', 'area_id');
  }
};
