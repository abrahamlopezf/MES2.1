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
  'areas',
  'subareas',
  'roles',
  'permissions',
  'users',
  'material_locations',
  'rankings',
  'material_brands',
  'material_codes',
  'material_families',
  'material_types',
  'material_units',
  'suppliers',
  'tipos_baja',
  'materials',
  'role_permissions',
  'RolePermissions'
];

async function migrate() {
  const localClient = new Client(localConfig);
  const neonClient = new Client({ connectionString: neonUrl });

  try {
    await localClient.connect();
    console.log('✅ Conectado a Local DB.');
    await neonClient.connect();
    console.log('✅ Conectado a Neon DB.');

    // Desactivar validación de llaves foráneas para esta sesión (vital para migraciones)
    try {
      await neonClient.query("SET session_replication_role = 'replica';");
      console.log('🛡️  Validación de llaves foráneas desactivada temporalmente.');
    } catch (e) {
      console.warn('⚠️ No se pudo desactivar llaves foráneas (quizás falten permisos).');
    }

    // Eliminamos el TRUNCATE CASCADE global para hacerlo tabla por tabla
    for (const table of tables) {
      console.log(`\n--- Migrando tabla: ${table} ---`);
      try {
        const result = await localClient.query(`SELECT * FROM "${table}"`);
        let rows = result.rows;
        let insertedCount = 0;
        let failedCount = 0;

        // Filtrar registros soft-deleted para evitar conflictos de constraint únicos en Neon
        if (rows.length > 0 && rows[0].hasOwnProperty('deleted_at')) {
          const originalLength = rows.length;
          rows = rows.filter(r => r.deleted_at === null);
          if (originalLength !== rows.length) {
            console.log(`Excluidos ${originalLength - rows.length} registros eliminados (soft-delete).`);
          }
        }
        
        if (rows.length === 0) {
          console.log(`No hay datos en ${table}. Saltando...`);
          continue;
        }

        console.log(`Encontrados ${rows.length} registros en ${table}.`);

        // Truncar la tabla en Neon antes de insertar para evitar conflictos de uniques
        try {
          await neonClient.query(`TRUNCATE TABLE "${table}" CASCADE`);
          console.log(`🧹 Tabla "${table}" limpiada en Neon.`);
        } catch (truncErr) {
          console.warn(`⚠️ No se pudo truncar "${table}", intentando insertar de todos modos...`);
        }

        // Para las tablas de join como role_permissions, las limpiamos primero
        if (table === 'role_permissions') {
          for (const row of rows) {
            try {
              delete row.id; // Neon no tiene columna id generada por Sequelize para esta tabla join
              const keys = Object.keys(row);
              const values = Object.values(row);
              const columns = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              await neonClient.query(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`, values);
              insertedCount++;
            } catch (rowErr) {
              failedCount++;
              if (failedCount <= 3) {
                console.warn(`    ⚠️ Falla en registro de ${table}: ${rowErr.message}`);
              }
            }
          }
        } else {
          for (let row of rows) {
            const insertRow = async (currentRow) => {
              const keys = Object.keys(currentRow);
              const values = Object.values(currentRow);

              const columns = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              
              const updateSets = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
              const conflictTarget = '("id")'; 

              const query = `
                INSERT INTO "${table}" (${columns}) 
                VALUES (${placeholders})
                ON CONFLICT ${conflictTarget} DO UPDATE SET ${updateSets}
              `;
              await neonClient.query(query, values);
            };

            try {
              await insertRow(row);
              insertedCount++;
            } catch (rowErr) {
              if (table === 'materials' && rowErr.message.includes('default_location_id_fkey')) {
                // Si falla por una localidad eliminada, intentar insertar con null
                try {
                  row.default_location_id = null;
                  await insertRow(row);
                  insertedCount++;
                  continue;
                } catch (retryErr) {
                  // Falló el reintento, contar como fallido general
                  rowErr = retryErr;
                }
              }

              failedCount++;
              if (failedCount <= 3) {
                console.warn(`    ⚠️ Falla en registro de ${table}: ${rowErr.message}`);
              }
            }
          }
        }
        
        console.log(`✅ ${table}: ${insertedCount} insertados, ${failedCount} fallidos.`);
      } catch (err) {
        console.error(`❌ Error general en tabla ${table}:`, err.message);
      }
    }

    console.log('\n🎉 Migración de MasterData completada exitosamente.');
  } catch (error) {
    console.error('Error general de migración:', error);
  } finally {
    try {
      await neonClient.query("SET session_replication_role = 'origin';");
      console.log('🛡️  Validación de llaves foráneas restaurada.');
    } catch (e) {}
    await localClient.end();
    await neonClient.end();
  }
}

migrate();
