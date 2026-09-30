'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🌱 Updating Rankings to Family Acronyms...');

    // 1. Delete old rankings if they are not deeply referenced, or we can just keep them.
    // Given the requirement, we will wipe existing if possible or just add the new ones.
    // It's safer to just insert the new ones. If old ones are used, deleting them might break foreign keys.
    // Let's insert the 13 new ones.
    
    // Rename old rankings to avoid unique constraint conflicts on 'name'
    try {
      await queryInterface.sequelize.query(`UPDATE rankings SET name = name || '_OLD' WHERE nomenclature IN ('MP', 'MS', 'MA')`);
    } catch (e) {
      console.log('Old rankings not found or already renamed.');
    }

    const newRankings = [
      { nomenclature: 'ELC-', name: 'ELC' },
      { nomenclature: 'HER-', name: 'Herramienta' },
      { nomenclature: 'LIM-', name: 'Limpieza' },
      { nomenclature: 'MATCONS-', name: 'Material Construccion' },
      { nomenclature: 'MATEMP-', name: 'Material Emp' },
      { nomenclature: 'MP-', name: 'Materia Prima' },
      { nomenclature: 'OTR-', name: 'OTR' },
      { nomenclature: 'PP-', name: 'PP' },
      { nomenclature: 'PQ-', name: 'PQ' },
      { nomenclature: 'PT-', name: 'PT' },
      { nomenclature: 'REF-', name: 'Refaccion' },
      { nomenclature: 'RF-', name: 'RF' },
      { nomenclature: 'SEG-', name: 'Seguridad' }
    ];

    for (const r of newRankings) {
      await queryInterface.sequelize.query(`
        INSERT INTO rankings (nomenclature, name, created_at, updated_at)
        VALUES ('${r.nomenclature}', '${r.name}', NOW(), NOW())
        ON CONFLICT (nomenclature) DO UPDATE SET name = EXCLUDED.name
      `);
    }

    // Hide old rankings from the UI if possible (maybe set is_active=false if that exists on rankings? rankings usually doesn't have is_active, so deleting them is better)
    try {
      await queryInterface.sequelize.query(`DELETE FROM rankings WHERE nomenclature IN ('MP', 'MS', 'MA')`);
      console.log('Old rankings removed.');
    } catch (e) {
      console.log('Could not remove old rankings (likely in use).');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse
  }
};
