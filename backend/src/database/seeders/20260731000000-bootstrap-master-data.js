'use strict';

const db = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // === 1. Operational Areas ===
    const areas = [
      { code: 'WH', name: 'Warehouse (Almacén Central)' },
      { code: 'EX', name: 'Extrusión' },
      { code: 'LM', name: 'Laminado' },
      { code: 'TL', name: 'Telares' },
      { code: 'CT', name: 'Corte' },
      { code: 'CF', name: 'Confección' },
      { code: 'QA', name: 'Aseguramiento de Calidad' },
      { code: 'SC', name: 'Scrap (Desperdicio)' }
    ];
    for (const item of areas) {
      await db.OperationalArea.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // === 2. Material Families ===
    const families = [
      { code: 'SEG', name: 'Seguridad Industrial' },
      { code: 'RSI', name: 'Resina Sintética' },
      { code: 'PIG', name: 'Pigmentos y Aditivos' },
      { code: 'REF', name: 'Refacciones Mecánicas' },
      { code: 'EMB', name: 'Material de Empaque' }
    ];
    for (const item of families) {
      await db.MaterialFamily.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // === 3. Material Codes ===
    const codes = [
      { code: 'GUA', name: 'Guantes' },
      { code: 'LEN', name: 'Lentes' },
      { code: 'TAP', name: 'Tapones Auditivos' },
      { code: 'POL', name: 'Polietileno' },
      { code: 'MAS', name: 'Masterbatch' },
      { code: 'BAL', name: 'Baleros' }
    ];
    for (const item of codes) {
      await db.MaterialCode.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // === 4. Material Categories ===
    const categories = [
      { code: 'MP', name: 'Materia Prima' },
      { code: 'CON', name: 'Consumibles' },
      { code: 'PT', name: 'Producto Terminado' },
      { code: 'SUB', name: 'Subensamble / WIP' },
      { code: 'REF', name: 'Refacciones' }
    ];
    for (const item of categories) {
      await db.MaterialCategory.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // === 5. Material Types ===
    const types = [
      { code: 'SOL', name: 'Sólido' },
      { code: 'LIQ', name: 'Líquido' },
      { code: 'GAS', name: 'Gas' },
      { code: 'GEL', name: 'Gel / Pasta' }
    ];
    for (const item of types) {
      await db.MaterialType.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // === 6. Material Brands ===
    const brands = [
      { code: '3M', name: '3M México' },
      { code: 'TRU', name: 'Truper' },
      { code: 'BRA', name: 'Braskem Idesa' },
      { code: 'DOW', name: 'Dow Chemical' }
    ];
    for (const item of brands) {
      await db.MaterialBrand.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    console.log('✅ Catálogos Bootstrap sembrados correctamente de forma idempotente.');
  },

  down: async (queryInterface, Sequelize) => {
    // En seeders idempotentes o iniciales, el down puede ser no destructivo
    // o simplemente borrar los catálogos (pero rompería Materiales).
    console.log('Down no implementado para catálogos fundacionales por seguridad relacional.');
  }
};
