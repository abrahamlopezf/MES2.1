const fs = require('fs');
const { sequelize } = require('./src/database/models');

const catalogTables = [
  'areas',
  'subareas',
  'rankings',
  'scrap_catalog',
  'scrap_types',
  'scrap_causes',
  'material_units',
  'material_families',
  'material_codes',
  'material_brands',
  'material_types',
  'operational_areas',
  'tipos_baja',
  'material_locations',
  'materials'
];

const authTables = [
  'permissions',
  'roles',
  'role_permissions',
  'users'
];

const masterDataTables = [...authTables, ...catalogTables];

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    let sqlDump = `-- MasterData and Users (Filtered) Dump
-- Generated automatically
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;

    // Truncate Master Data catalogs (auth tables are left intact)
    sqlDump += `-- Truncate Master Data catalogs (Auth tables are NOT truncated)
TRUNCATE TABLE ${catalogTables.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;

`;

    for (const table of masterDataTables) {
      console.log(`Exporting table: ${table}`);
      
      let query = `SELECT * FROM "${table}"`;
      
      // Filter users
      if (table === 'users') {
        // Only superadmin, admin_general, admin_alm, warehouseman
        query = `
          SELECT u.* 
          FROM "users" u
          JOIN "roles" r ON u.role_id = r.id
          WHERE r.code IN ('SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_ALM', 'WAREHOUSEMAN')
        `;
      }
      
      const [rows] = await sequelize.query(query);
      if (rows.length === 0) continue;
      
      const columns = Object.keys(rows[0]);
      const chunk_size = 100;
      
      sqlDump += `-- Data for Name: ${table}; Type: TABLE DATA\n`;
      
      for (let i = 0; i < rows.length; i += chunk_size) {
        const chunk = rows.slice(i, i + chunk_size);
        const values = chunk.map(row => {
          return '(' + columns.map(col => {
            let val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'number') return val;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ') + ')';
        });
        
        sqlDump += `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES\n${values.join(',\n')} ON CONFLICT DO NOTHING;\n`;
      }
      
      sqlDump += '\n';
      
      // We don't reset sequence explicitly if we rely on IDs.
      // But we should reset sequences to max ID if we are inserting explicit IDs!
      const [seq] = await sequelize.query(`
        SELECT c.relname as seq_name
        FROM pg_class c
        WHERE c.relkind = 'S' AND c.relname = '${table}_id_seq'
      `);
      
      if (seq.length > 0) {
        sqlDump += `SELECT setval('public."${seq[0].seq_name}"', (SELECT COALESCE(MAX(id), 1) FROM "${table}"));\n\n`;
      }
    }

    fs.writeFileSync('master_data_dump.sql', sqlDump);
    console.log("Dump saved to master_data_dump.sql");
  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    await sequelize.close();
  }
}

run();
