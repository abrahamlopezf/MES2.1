module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('materials', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      uuid: { type: Sequelize.UUID, defaultValue: Sequelize.fn('gen_random_uuid'), allowNull: false },
      
      family_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'material_families', key: 'id' } },
      material_code_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'material_codes', key: 'id' } },
      internal_consecutive: { type: Sequelize.STRING(10), allowNull: false },
      internal_code: { type: Sequelize.STRING(50), allowNull: false },
      
      name: { type: Sequelize.STRING(200), allowNull: false }, // Commercial Name
      description: { type: Sequelize.STRING(500), allowNull: true }, // Observations
      
      category_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'material_categories', key: 'id' } },
      brand_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'material_brands', key: 'id' } },
      type_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'material_types', key: 'id' } },
      
      // TODO: FK -> material_units.id
      // Será enlazado cuando exista Unit como catálogo oficial (Fase 1.5).
      base_unit_id: { type: Sequelize.INTEGER, allowNull: true }, 
      stock_unit_id: { type: Sequelize.INTEGER, allowNull: true }, 
      
      primary_image_path: { type: Sequelize.STRING(255), allowNull: true },
      
      qr_template_id: { type: Sequelize.INTEGER, allowNull: true }, // FK added during Traceability Phase
      
      traceability_level: { type: Sequelize.ENUM('NONE', 'LOT', 'UNIT'), defaultValue: 'NONE' },
      
      minimum_stock: { type: Sequelize.DECIMAL(18,6), allowNull: true, defaultValue: 0 },
      maximum_stock: { type: Sequelize.DECIMAL(18,6), allowNull: true },
      reorder_point: { type: Sequelize.DECIMAL(18,6), allowNull: true, defaultValue: 0 },
      
      status: { type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'BLOCKED', 'DISCONTINUED', 'OBSOLETE'), defaultValue: 'DRAFT' },
      
      version: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    // Create Indexes
    await queryInterface.addIndex('materials', ['uuid'], { unique: true, where: { deleted_at: null } });
    await queryInterface.addIndex('materials', ['internal_code'], { unique: true, where: { deleted_at: null } });
    
    // Unique Logical Identity Index (Soft Delete Safe)
    await queryInterface.addIndex('materials', ['family_id', 'material_code_id', 'internal_consecutive'], { unique: true, where: { deleted_at: null } });

    await queryInterface.addIndex('materials', ['status']);
    await queryInterface.addIndex('materials', ['status', 'category_id']);
    await queryInterface.addIndex('materials', ['status', 'family_id']);
    await queryInterface.addIndex('materials', ['family_id']);
    await queryInterface.addIndex('materials', ['material_code_id']);
    await queryInterface.addIndex('materials', ['category_id']);
    await queryInterface.addIndex('materials', ['name']);

    // Re-link stock_units to materials
    try {
      await queryInterface.addConstraint('stock_units', {
        fields: ['material_id'],
        type: 'foreign key',
        name: 'stock_units_material_id_fkey',
        references: { table: 'materials', field: 'id' },
        onDelete: 'restrict',
        onUpdate: 'cascade'
      });
    } catch(e) {}
  },
  down: async (queryInterface, Sequelize) => {
    try { await queryInterface.removeConstraint('stock_units', 'stock_units_material_id_fkey'); } catch(e) {}
    await queryInterface.dropTable('materials', { cascade: true });
  }
};