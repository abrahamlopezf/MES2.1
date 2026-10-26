// Forzar zona horaria oficial del sistema a CDMX (CST / UTC-6)
process.env.TZ = process.env.TZ || 'America/Mexico_City';
require('dotenv').config();

const env = {
  timezone: process.env.TIMEZONE || 'America/Mexico_City',
  timezoneStandard: process.env.TIMEZONE_STANDARD_CODE || 'CST',
  utcOffset: process.env.UTC_OFFSET || '-06:00',
  nodeEnv: process.env.NODE_ENV || 'development',

  isProduction:
    process.env.NODE_ENV === 'production',

  databaseUrl:
    process.env.DATABASE_URL || null,

  port: process.env.PORT || 4000,

  clientUrl:
    process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'sistema_enterprise',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret:
      process.env.JWT_SECRET || 'development_secret',

    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
};

module.exports = env;