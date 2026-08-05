require('dotenv').config();

const app = require('./app');
const { testDatabaseConnection } = require('./config/database');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testDatabaseConnection();

    try {
      const { execSync } = require('child_process');
      console.log('Running clean_frontend...');
      execSync('node ../clean_frontend.js', { stdio: 'inherit' });
      console.log('Frontend clean completed successfully.');
      // Trigger nodemon
    } catch (err) {
      console.error('Clean failed:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();