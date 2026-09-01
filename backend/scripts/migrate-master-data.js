require('dotenv').config();
const { Client } = require('pg');

const localConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sistema_enterprise',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'QhBv47RkNK$1096',
};

const neonUrl = process.env.DATABASE_URL;

// Tablas a migrar en orden (para respetar llaves foráneas)
const tables = [
  'Areas',
  'Subareas',
  'Roles',
  'Permissions',
  'Users',
  'Locations',
  'Rankings',
  'Brands',
  'Codes',
  'Families',
  'Categories',
  'Units',
  'Suppliers',
  'TipoBajas',
  'Materials',
  'RolePermissions', // Se pasa al final para asegurar que Roles y Permissions ya existan
];

async function migrate() {
  const localClient = new Client(localConfig);
  const neonClient = new Client({ connectionString: neonUrl });

  try {
    await localClient.connect();
    console.log('✅ Conectado a Local DB.');
    await neonClient.connect();
    console.log('✅ Conectado a Neon DB.');

    // Desactivar triggers (como foreign keys) temporalmente en la sesión de Neon 
    // ayuda a que no explote si algo se inserta en desorden, 
    // pero con PG a veces no se puede sin ser superusuario, así que mantenemos el orden.

    for (const table of tables) {
      console.log(`\n--- Migrando tabla: ${table} ---`);
      try {
        const result = await localClient.query(`SELECT * FROM "${table}"`);
        const rows = result.rows;
        
        if (rows.length === 0) {
          console.log(`No hay datos en ${table}. Saltando...`);
          continue;
        }

        console.log(`Encontrados ${rows.length} registros en ${table}.`);

        // Para las tablas de join como RolePermissions, las limpiamos primero
        if (table === 'RolePermissions') {
          await neonClient.query(`DELETE FROM "${table}"`);
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const columns = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            await neonClient.query(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`, values);
          }
        } else {
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);

            const columns = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            // Construir el UPDATE para ON CONFLICT
            const updateSets = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
            const conflictTarget = '("id")'; 

            const query = `
              INSERT INTO "${table}" (${columns}) 
              VALUES (${placeholders})
              ON CONFLICT ${conflictTarget} DO UPDATE SET ${updateSets}
            `;
            await neonClient.query(query, values);
          }
        }
        
        console.log(`✅ ${table} migrada correctamente.`);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.warn(`⚠️ Tabla ${table} no existe en la base de datos. Saltando...`);
        } else {
          console.error(`❌ Error al migrar tabla ${table}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Migración de MasterData completada exitosamente.');
  } catch (error) {
    console.error('Error general de migración:', error);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

migrate();
