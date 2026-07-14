const { sequelize } = require('../../config/database');

/**
 * Ejecuta una transacción con reintentos automáticos en caso de Deadlocks o errores transitorios.
 * @param {Function} callback - La función que contiene la lógica de la transacción
 * @param {Number} maxRetries - Número máximo de reintentos
 * @returns {Promise<any>}
 */
const withTransactionRetry = async (callback, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await sequelize.transaction(async (transaction) => {
        return await callback(transaction);
      });
    } catch (error) {
      attempt++;
      // Postgres deadlock codes: 40P01, serialization_failure: 40001
      // MySQL deadlock codes: ER_LOCK_DEADLOCK, 1213
      const isDeadlock = 
        (error.original && error.original.code === '40P01') || 
        (error.original && error.original.code === '1213') ||
        (error.original && error.original.code === '40001') ||
        error.name === 'SequelizeUniqueConstraintError' || // a veces reintentar arregla conflictos paralelos
        error.name === 'SequelizeDatabaseError';

      if (!isDeadlock || attempt >= maxRetries) {
        throw error;
      }
      
      // Backoff exponencial con jitter: 100ms, 200ms, 400ms...
      const delay = Math.pow(2, attempt) * 100 + Math.random() * 50;
      console.warn(`[Transaction] Reintento ${attempt}/${maxRetries} tras colisión. Esperando ${Math.round(delay)}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = {
  withTransactionRetry,
};
