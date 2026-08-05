module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Remove category_id from materials
    try {
      await queryInterface.removeIndex('materials', ['status', 'category_id']);
    } catch(e) {}
    try {
      await queryInterface.removeIndex('materials', ['category_id']);
    } catch(e) {}
    try {
      await queryInterface.removeConstraint('materials', 'materials_category_id_fkey');
    } catch(e) {}
    try {
      await queryInterface.removeColumn('materials', 'category_id');
    } catch (e) {
      console.warn("Could not remove category_id from materials", e.message);
    }

    // 2. Add location_id to materials (OperationalArea)
    try {
      await queryInterface.addColumn('materials', 'location_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'operational_areas',
          key: 'id'
        }
      });
    } catch (e) {
      console.warn("Could not add location_id to materials", e.message);
    }

    // 3. Drop material_categories
    try {
      await queryInterface.dropTable('material_categories', { cascade: true });
    } catch (e) {
      console.warn("Could not drop material_categories", e.message);
    }

    // 4. Add family_id to material_types
    try {
      await queryInterface.bulkDelete('material_types', null, {});
      await queryInterface.addColumn('material_types', 'family_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'material_families',
          key: 'id'
        }
      });
    } catch (e) {
      console.warn("Could not add family_id to material_types", e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate material_categories (simplified)
    await queryInterface.createTable('material_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.fn('gen_random_uuid') },
      code: { type: Sequelize.STRING(50) },
      name: { type: Sequelize.STRING(100) },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    try {
      await queryInterface.addColumn('materials', 'category_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'material_categories',
          key: 'id'
        }
      });
    } catch (e) {}
    
    try {
      await queryInterface.removeColumn('materials', 'location_id');
    } catch(e) {}

    try {
      await queryInterface.removeColumn('material_types', 'family_id');
    } catch(e) {}
  }
};
