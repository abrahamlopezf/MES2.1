'use strict';

const catalog = [
  [1, 'Rafia', 'Blanco, Amarillo, Verde, Azul, Naranja, Rojo, Negro', 4600, 28, 12],
  [1, 'Rafia', 'Blanco, Azul', 3000, 28, 12],
  [1, 'Rafia', 'Negro', 5190, 23, 14],
  [2, 'Trama', 'Blanco', 2000, 94, 5],
  [2, 'Trama', 'Blanco', 1800, 94, 5],
  [2, 'Trama', 'Verde óptico', 2200, 94, 5],
  [2, 'Trama', 'Blanco, Antiestático', 2000, 94, 5],
  [2, 'Trama', 'Rojo', 2200, 94, 5],
  [2, 'Trama - Urdimbre', 'Blanco', 1200, 140, 3],
  [2, 'Trama - Urdimbre', 'Amarillo antiestático', 1200, 140, 3],
  [2, 'Trama - Urdimbre', 'Verde óptico y negro', 1200, 140, 3],
  [2, 'Urdimbre', 'Blanco', 2300, 140, 3],
  [2, 'Urdimbre', 'Rojo', 2300, 140, 3],
  [2, 'Urdimbre', 'Negro', 2300, 140, 3],
  [4, 'Urdimbre', 'Blanco, Natural', 1800, 146, 2.5],
  [4, 'Urdimbre', 'Blanco', 2100, 146, 2.5],
  [4, 'Urdimbre', 'Blanco, Verde Óptico', 2300, 146, 2.5],
  [4, 'Urdimbre', 'Rojo, Negro, Azul,Verde, Morado', 2300, 117, 3.0],
  [5, 'Trama', 'Blanco', 1800, 106, 5.0],
  [5, 'Trama', 'Blanco', 2000, 106, 5.0],
  [5, 'Trama', 'Blanco', 2300, 106, 5.0],
  [5, 'Trama', 'Verde Óptico', 2000, 106, 5.0],
  [5, 'Trama', 'Rojo', 2300, 106, 5.0],
];

const codes = catalog.map((_, index) => `PTI-CINTA-${String(index + 1).padStart(3, '0')}`);

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE formulas
          ADD COLUMN IF NOT EXISTS cost_index DECIMAL(8,4) NOT NULL DEFAULT 1.1500;
        ALTER TABLE pti_products
          ADD COLUMN IF NOT EXISTS extrusion_machine_number INTEGER,
          ADD COLUMN IF NOT EXISTS tape_type VARCHAR(80),
          ADD COLUMN IF NOT EXISTS color VARCHAR(240),
          ADD COLUMN IF NOT EXISTS denier INTEGER,
          ADD COLUMN IF NOT EXISTS tape_count INTEGER,
          ADD COLUMN IF NOT EXISTS tape_count_tolerance INTEGER NOT NULL DEFAULT 10,
          ADD COLUMN IF NOT EXISTS tape_width_mm DECIMAL(8,2),
          ADD COLUMN IF NOT EXISTS transformed_cost_index DECIMAL(8,4) NOT NULL DEFAULT 1.0000;
        ALTER TABLE pti_products ALTER COLUMN unit_weight_kg DROP NOT NULL;
        ALTER TABLE pti_products ALTER COLUMN unit_weight_kg DROP DEFAULT;
        ALTER TABLE pti_racks
          ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          ADD COLUMN IF NOT EXISTS unit_weight_kg DECIMAL(10,3),
          ADD COLUMN IF NOT EXISTS unit_cost_per_kg DECIMAL(14,6);
        ALTER TABLE pti_racks ALTER COLUMN unit_weight_kg DROP NOT NULL;
        ALTER TABLE pti_racks ALTER COLUMN unit_weight_kg DROP DEFAULT;
        ALTER TABLE extrusion_production_entries
          ADD COLUMN IF NOT EXISTS transformed_cost_index_snapshot DECIMAL(8,4),
          ADD COLUMN IF NOT EXISTS pti_transformed_cost_per_kg DECIMAL(14,6);
      `, { transaction });

      for (let index = 0; index < catalog.length; index += 1) {
        const [machine, tapeType, color, denier, tapeCount, width] = catalog[index];
        const code = codes[index];
        const name = `${tapeType} ${denier}D ${width} mm - ${color}`;
        await queryInterface.sequelize.query(
          `INSERT INTO pti_products (
            code, name, specifications, unit_weight_kg, unit_price,
            extrusion_machine_number, tape_type, color, denier,
            tape_count, tape_count_tolerance, tape_width_mm,
            transformed_cost_index, formula_id, material_id,
            is_active, created_at, updated_at
          )
          VALUES (
            :code, :name, NULL, NULL, 0,
            :machine, :tapeType, :color, :denier,
            :tapeCount, 10, :width,
            1, NULL, NULL,
            true, NOW(), NOW()
          )
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            extrusion_machine_number = EXCLUDED.extrusion_machine_number,
            tape_type = EXCLUDED.tape_type,
            color = EXCLUDED.color,
            denier = EXCLUDED.denier,
            tape_count = EXCLUDED.tape_count,
            tape_count_tolerance = EXCLUDED.tape_count_tolerance,
            tape_width_mm = EXCLUDED.tape_width_mm,
            transformed_cost_index = EXCLUDED.transformed_cost_index,
            is_active = true,
            updated_at = NOW();`,
          {
            replacements: { code, name, machine, tapeType, color, denier, tapeCount, width },
            transaction,
          }
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('pti_products', { code: codes }, { transaction });
      await queryInterface.sequelize.query(`
        ALTER TABLE extrusion_production_entries
          DROP COLUMN IF EXISTS transformed_cost_index_snapshot,
          DROP COLUMN IF EXISTS pti_transformed_cost_per_kg;
        ALTER TABLE pti_racks DROP COLUMN IF EXISTS unit_cost_per_kg;
        ALTER TABLE pti_products
          DROP COLUMN IF EXISTS extrusion_machine_number,
          DROP COLUMN IF EXISTS tape_type,
          DROP COLUMN IF EXISTS color,
          DROP COLUMN IF EXISTS denier,
          DROP COLUMN IF EXISTS tape_count,
          DROP COLUMN IF EXISTS tape_count_tolerance,
          DROP COLUMN IF EXISTS tape_width_mm,
          DROP COLUMN IF EXISTS transformed_cost_index;
      `, { transaction });
    });
  },
};
