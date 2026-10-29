'use strict';

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();
    try {
      const formulaColumns = await queryInterface.describeTable('formulas', { transaction });
      const hasLegacyOutputPti = Boolean(formulaColumns.output_pti_id);

      if (hasLegacyOutputPti) {
        const [multiplyReferencedPtis] = await sequelize.query(`
          SELECT p.id AS pti_id, p.code AS pti_code, ARRAY_AGG(f.code ORDER BY f.id) AS formula_codes
          FROM formulas f
          JOIN pti_products p ON p.id = f.output_pti_id
          WHERE f.output_pti_id IS NOT NULL
          GROUP BY p.id, p.code
          HAVING COUNT(*) > 1
          ORDER BY p.id;
        `, { transaction });
        if (multiplyReferencedPtis.length) {
          const details = multiplyReferencedPtis.map((row) => `${row.pti_code} -> ${row.formula_codes.join(', ')}`).join('; ');
          throw new Error(`No se migró el enlace PTI-Fórmula: hay PTI referenciados por más de una fórmula. Corrige esos vínculos y reintenta. ${details}`);
        }

        const [conflicts] = await sequelize.query(`
          SELECT f.id AS formula_id, f.code AS formula_code, p.id AS pti_id, p.code AS pti_code, p.formula_id AS current_formula_id
          FROM formulas f
          JOIN pti_products p ON p.id = f.output_pti_id
          WHERE f.output_pti_id IS NOT NULL
            AND p.formula_id IS NOT NULL
            AND p.formula_id <> f.id
          ORDER BY f.id, p.id;
        `, { transaction });

        if (conflicts.length) {
          const details = conflicts.map((row) => `${row.formula_code} -> ${row.pti_code} (actual: formula ${row.current_formula_id})`).join('; ');
          throw new Error(`No se migró el enlace PTI-Fórmula: existen vínculos contradictorios. Corrígelos en el catálogo PTI y vuelve a ejecutar. ${details}`);
        }
      }

      const prospectiveLinks = hasLegacyOutputPti
        ? `
          SELECT p.id AS pti_id, COALESCE(p.formula_id, f.id) AS formula_id
          FROM pti_products p
          LEFT JOIN formulas f ON f.output_pti_id = p.id
          WHERE COALESCE(p.formula_id, f.id) IS NOT NULL
        `
        : `
          SELECT p.id AS pti_id, p.formula_id
          FROM pti_products p
          WHERE p.formula_id IS NOT NULL
        `;
      const [duplicates] = await sequelize.query(`
        SELECT formula_id, ARRAY_AGG(pti_id ORDER BY pti_id) AS pti_ids, COUNT(*)::int AS link_count
        FROM (${prospectiveLinks}) AS links
        GROUP BY formula_id
        HAVING COUNT(*) > 1
        ORDER BY formula_id;
      `, { transaction });

      if (duplicates.length) {
        const details = duplicates.map((row) => `fórmula ${row.formula_id}: PTI ${row.pti_ids.join(', ')}`).join('; ');
        throw new Error(`No se migró la relación 1:1 porque hay fórmulas con varios PTI. Revisa esos registros antes de reintentar. ${details}`);
      }

      if (hasLegacyOutputPti) {
        await sequelize.query(`
          UPDATE pti_products p
          SET formula_id = f.id
          FROM formulas f
          WHERE f.output_pti_id = p.id
            AND p.formula_id IS NULL;
        `, { transaction });
      }

      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_pti_products_formula_id
        ON pti_products (formula_id)
        WHERE formula_id IS NOT NULL;
      `, { transaction });

      if (hasLegacyOutputPti) {
        await sequelize.query('ALTER TABLE formulas DROP COLUMN output_pti_id;', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const transaction = await sequelize.transaction();
    try {
      const formulaColumns = await queryInterface.describeTable('formulas', { transaction });
      if (!formulaColumns.output_pti_id) {
        await sequelize.query(`
          ALTER TABLE formulas
          ADD COLUMN output_pti_id INTEGER NULL REFERENCES pti_products(id) ON UPDATE CASCADE ON DELETE SET NULL;
        `, { transaction });
      }
      await sequelize.query(`
        UPDATE formulas f
        SET output_pti_id = p.id
        FROM pti_products p
        WHERE p.formula_id = f.id;
      `, { transaction });
      await sequelize.query('DROP INDEX IF EXISTS uq_pti_products_formula_id;', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
