// Forzar zona horaria oficial del sistema a CDMX (CST / UTC-6)
process.env.TZ = process.env.TZ || 'America/Mexico_City';
require('dotenv').config();

const { validateAndResolveDbConfig } = require('./dbGuard');

const dbConfig = validateAndResolveDbConfig(process.env);

const env = {
  timezone: process.env.TIMEZONE || 'America/Mexico_City',
  timezoneStandard: process.env.TIMEZONE_STANDARD_CODE || 'CST',
  utcOffset: process.env.UTC_OFFSET || '-06:00',
  appEnv: dbConfig.appEnv,
  nodeEnv: dbConfig.nodeEnv,

  isLocal: dbConfig.appEnv === 'local',
  isTest: dbConfig.appEnv === 'test',
  isUat: dbConfig.appEnv === 'uat',
  isProduction: dbConfig.appEnv === 'production',
  isRemoteEnv: dbConfig.isRemoteEnv,

  databaseUrl: dbConfig.databaseUrl,

  port: Number(process.env.PORT) || 4000,

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host: dbConfig.host,
    port: dbConfig.port,
    name: dbConfig.name,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (dbConfig.isRemoteEnv ? null : 'development_secret'),

    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
};

if (env.isRemoteEnv && (!env.jwt.secret || Buffer.byteLength(env.jwt.secret) < 32)) {
  throw new Error('JWT_SECRET debe tener al menos 32 bytes en ambientes remotos (UAT / Producción).');
}

module.exports = env;
