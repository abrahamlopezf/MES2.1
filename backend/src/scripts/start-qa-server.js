'use strict';

const path = require('path');
const dotenv = require('dotenv');

const qaEnvPath = path.resolve(__dirname, '../../.env.test');
const loaded = dotenv.config({ path: qaEnvPath, override: true });
if (loaded.error) {
  throw new Error('No se inicia backend QA: falta backend/.env.test. Copia la plantilla y configura credenciales locales de mínimo privilegio.');
}

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);
if (process.env.APP_ENV !== 'test'
  || process.env.NODE_ENV !== 'test'
  || process.env.PORT !== '4001'
  || process.env.DB_NAME !== 'sistema_enterprise_test'
  || !loopbackHosts.has(String(process.env.DB_HOST || '').toLowerCase())
  || process.env.CLIENT_URL !== 'http://127.0.0.1:5174') {
  throw new Error('No se inicia backend QA: backend/.env.test no coincide con los límites loopback/QA definidos.');
}

require('../server');
