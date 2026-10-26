process.env.TZ = process.env.TZ || 'America/Mexico_City';
require('dotenv').config();

const common = {
  dialect: 'postgres',
  timezone: 'America/Mexico_City',
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_enterprise',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,

    ...common,
  },

  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: `${process.env.DB_NAME || 'sistema_enterprise'}_test`,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,

    ...common,
  },

  production: {
    use_env_variable: 'DATABASE_URL',

    dialect: 'postgres',

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },

    logging: false,

    ...common,
  },
};