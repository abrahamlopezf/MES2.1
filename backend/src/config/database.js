const { Sequelize } = require('sequelize');
const env = require('./env');

const isProduction =
  env.isProduction &&
  env.databaseUrl;

const sequelize = isProduction
  ? new Sequelize(env.databaseUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
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

      logging:
        env.nodeEnv === 'development'
          ? console.log
          : false,

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
    await sequelize.authenticate();

    console.log('✅ PostgreSQL conectado correctamente.');
  } catch (error) {
    console.error('❌ Error al conectar PostgreSQL');
    console.error(error);

    throw error;
  }
};

module.exports = {
  sequelize,
  testDatabaseConnection,
};