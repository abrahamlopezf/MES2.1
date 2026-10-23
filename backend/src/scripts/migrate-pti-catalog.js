const { sequelize } = require('../database/models');

async function migrate() {
  console.log('--- Iniciando migración de Catálogo PTI y cost_index en Fórmulas ---');
  
  // 1. Agregar cost_index a formulas si no existe
  await sequelize.query(`
    ALTER TABLE formulas 
    ADD COLUMN IF NOT EXISTS cost_index DECIMAL(8, 4) DEFAULT 1.1500;
  `);
  console.log('✔ Columna cost_index agregada/verificada en tabla formulas.');

  // 2. Crear tabla pti_products
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS pti_products (
      id SERIAL PRIMARY KEY,
      code VARCHAR(60) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      specifications TEXT,
      unit_weight_kg DECIMAL(10, 3) NOT NULL DEFAULT 6.800,
      unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      formula_id INTEGER NOT NULL REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      material_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✔ Tabla pti_products creada/verificada.');

  // 3. Crear índices para optimizar búsquedas
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_pti_products_formula ON pti_products(formula_id);
    CREATE INDEX IF NOT EXISTS idx_pti_products_active ON pti_products(is_active);
  `);
  console.log('✔ Índices para pti_products creados.');

  // 4. Si la tabla pti_products está vacía, sembrar productos iniciales enlazados a fórmulas
  const [existingPti] = await sequelize.query(`SELECT COUNT(*) as count FROM pti_products;`);
  if (parseInt(existingPti[0].count, 10) === 0) {
    const [formulas] = await sequelize.query(`SELECT id, code, name FROM formulas LIMIT 5;`);
    if (formulas.length > 0) {
      const f1 = formulas[0];
      const f2 = formulas[1] || formulas[0];
      const f3 = formulas[2] || formulas[0];

      await sequelize.query(`
        INSERT INTO pti_products (code, name, specifications, unit_weight_kg, unit_price, formula_id, is_active)
        VALUES 
          ('PTI-RAF-AMARILLA-01', 'Bobina Rafia 1000D Amarilla', 'Ancho: 2.5mm, Tenacidad: 5.5 g/den, Calibre estándar cinturón', 6.800, 195.00, ${f1.id}, true),
          ('PTI-RAF-BLANCA-01', 'Bobina Rafia 950D Blanca Anti-UV', 'Ancho: 2.2mm, Tratamiento UV 1.5%, Para sacos de exportación', 6.500, 205.00, ${f2.id}, true),
          ('PTI-CINT-NEGRO-01', 'Carrete Cinta Reforzada Negra', 'Ancho: 3.0mm, Tenacidad alta resistencia 6.0 g/den', 7.200, 220.00, ${f3.id}, true)
        ON CONFLICT (code) DO NOTHING;
      `);
      console.log('✔ Semillas iniciales del Catálogo de PTI insertadas correctamente.');
    }
  }

  console.log('--- Migración completada con éxito ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error ejecutando migración:', err);
  process.exit(1);
});
