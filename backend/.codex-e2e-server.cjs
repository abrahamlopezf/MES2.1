require('dotenv').config({ path: require('path').join(__dirname, '.env') });
Object.assign(process.env, { NODE_ENV:'development', DATABASE_URL:'', DB_HOST:'127.0.0.1', DB_PORT:'5433', DB_NAME:'sistema_enterprise_ext_e2e_20261109', PORT:'4001', CLIENT_URL:'http://127.0.0.1:5174' });
require('./src/server');
