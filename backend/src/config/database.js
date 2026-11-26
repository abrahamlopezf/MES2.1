const { Sequelize } = require('sequelize');
const env = require('./env');
const {
  validateAndResolveDbConfig,
  verifyPostgresConnectionIdentity,
} = require('./dbGuard');

// Re-validar en el punto de creación de Sequelize (fail-closed)
const activeDbConfig = validateAndResolveDbConfig(process.env);

const sequelize = activeDbConfig.useDatabaseUrl
  ? new Sequelize(activeDbConfig.databaseUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      timezone: 'America/Mexico_City',
      logging: false,

      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },

      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      define: {
        schema: 'public',
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    })
  : new Sequelize(env.db.name, env.db.user, env.db.password, {
      host: env.db.host,
      port: env.db.port,
      dialect: 'postgres',
      timezone: 'America/Mexico_City',

      logging: env.nodeEnv === 'development' && env.appEnv === 'local' ? console.log : false,

      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      define: {
        schema: 'public',
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });

const testDatabaseConnection = async () => {
  try {
    const resolved = validateAndResolveDbConfig(process.env);
    await sequelize.authenticate();
    const identity = await verifyPostgresConnectionIdentity(sequelize, resolved);

    console.log(
      `✅ PostgreSQL conectado correctamente [APP_ENV=${resolved.appEnv} | DB=${identity.db} | HOST=${identity.addr || resolved.host}:${identity.port || resolved.port}].`
    );
    return identity;
  } catch (error) {
    console.error('❌ Error al conectar o verificar identidad de PostgreSQL');
    console.error(error.message);

    throw error;
  }
};

module.exports = {
  sequelize,
  testDatabaseConnection,
};
