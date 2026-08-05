module.exports = {
  up: async (queryInterface, Sequelize) => {
    const commonFields = {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.fn('gen_random_uuid'), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      version: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    };

    const catalogs = ['material_families', 'material_codes', 'material_categories', 'material_brands', 'material_types', 'operational_areas'];
    for (const cat of catalogs) {
      await queryInterface.createTable(cat, { ...commonFields });
      
      // Índices ÚNICOS con soporte para Soft Delete
      await queryInterface.addIndex(cat, ['uuid'], { unique: true, where: { deleted_at: null } });
      await queryInterface.addIndex(cat, ['code'], { unique: true, where: { deleted_at: null } });
      
      // Índices de búsqueda
      await queryInterface.addIndex(cat, ['name']);
    }
  },
  down: async (queryInterface, Sequelize) => {
    const catalogs = ['material_families', 'material_codes', 'material_categories', 'material_brands', 'material_types', 'operational_areas'];
    for (const cat of catalogs.reverse()) {
      await queryInterface.dropTable(cat, { cascade: true });
    }
  }
};