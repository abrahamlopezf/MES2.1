const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: 'postgres',
    logging: env.nodeEnv === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  }
);

const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida correctamente');
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testDatabaseConnection,
};