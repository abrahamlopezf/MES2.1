const fs = require('fs');
const path = require('path');

const migrationsDir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations';

const monolithic = path.join(migrationsDir, '20260730120000-rebuild-master-data.js');
if (fs.existsSync(monolithic)) {
  fs.unlinkSync(monolithic);
}

const mig1a = `module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Asegurar extensión pgcrypto para UUID gen_random_uuid()
    try { await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); } catch(e) {}

    try { await queryInterface.removeConstraint('stock_units', 'stock_units_material_id_fkey'); } catch(e) {}
    try { await queryInterface.removeConstraint('traceable_items', 'traceable_items_material_id_fkey'); } catch(e) {}
    
    const tablesToDrop = [
      'material_stock_movements',
      'material_lots',
      'material_stocks',
      'materials',
      'material_subcategories',
      'material_categories'
    ];
    for (const table of tablesToDrop) {
      try { await queryInterface.dropTable(table, { cascade: true }); } catch (e) {}
    }
  },
  down: async (queryInterface, Sequelize) => {}
};`;

const mig1b = `module.exports = {
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
};`;

const mig1c = `module.exports = {
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
};`;

fs.writeFileSync(path.join(migrationsDir, '20260730120000-fase1a-drop-master-data.js'), mig1a);
fs.writeFileSync(path.join(migrationsDir, '20260730120001-fase1b-rebuild-catalogs.js'), mig1b);
fs.writeFileSync(path.join(migrationsDir, '20260730120002-fase1c-rebuild-material.js'), mig1c);

console.log('Migraciones Fase 1 generadas con fixes de Soft Delete, pgcrypto e índices.');
