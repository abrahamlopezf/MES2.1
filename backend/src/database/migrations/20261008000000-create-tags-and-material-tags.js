'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('material_tags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      material_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tag_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // Add composite unique index for material_tags
    await queryInterface.addIndex('material_tags', ['material_id', 'tag_id'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('material_tags');
  }
};
