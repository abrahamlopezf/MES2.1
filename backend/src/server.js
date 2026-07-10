require('dotenv').config();

const app = require('./app');
const { testDatabaseConnection } = require('./config/database');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();