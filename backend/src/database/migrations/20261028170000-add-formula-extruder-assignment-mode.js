'use strict';

const generalClientCodes = [
  'F-EXT-LIQ-ROJO', 'F-EXT-LIQ-NEGRO', 'F-EXT-2-BLANCA', 'F-EXT-4-BLANCA',
  'F-EXT-5-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO',
  'F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-AMARILLO-ANTI', 'F-EXT-NATURAL',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('formulas');
    if (!columns.extruder_assignment_mode) {
      await queryInterface.addColumn('formulas', 'extruder_assignment_mode', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'FIXED',
        comment: 'EXTRUDER_1, DYNAMIC (grupo dinámico) o FIXED (extrusoras elegidas).',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE formulas
      SET extruder_assignment_mode = CASE
        WHEN code LIKE 'F-EXT-1-%' THEN 'EXTRUDER_1'
        WHEN code IN (${generalClientCodes.map((code) => `'${code}'`).join(', ')}) THEN 'DYNAMIC'
        ELSE 'FIXED'
      END,
      allowed_extruders = CASE
        WHEN code LIKE 'F-EXT-1-%' THEN '[1]'::json
        WHEN code IN (${generalClientCodes.map((code) => `'${code}'`).join(', ')}) THEN '[]'::json
        ELSE allowed_extruders
      END,
      restricted_extruders = CASE
        WHEN code LIKE 'F-EXT-1-%' OR code IN (${generalClientCodes.map((code) => `'${code}'`).join(', ')}) THEN '[]'::json
        ELSE restricted_extruders
      END
      WHERE code LIKE 'F-EXT-1-%'
         OR code IN (${generalClientCodes.map((code) => `'${code}'`).join(', ')});
    `);
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('formulas');
    if (columns.extruder_assignment_mode) {
      await queryInterface.removeColumn('formulas', 'extruder_assignment_mode');
    }
  },
};
