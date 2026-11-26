'use strict';

/**
 * Verificador Integral de Preparación del Ambiente Local (dev:check) — TraceFlow MES
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { validateAndResolveDbConfig } = require('../config/dbGuard');
const { runSecurityScan } = require('./security-check');
const { computeMasterDataFingerprint } = require('./master-data-fingerprint');

const ROOT = path.resolve(__dirname, '../../..');

async function runDevCheck() {
  const checks = [];
  const record = (name, ok, detail) => {
    checks.push({ name, status: ok ? 'OK' : 'FAIL', detail });
  };

  // 1. Versión de Node.js
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  record('Node.js Version (>=20)', nodeMajor >= 20, `v${process.versions.node}`);

  // 2. Lockfiles
  const hasBackendLock = fs.existsSync(path.join(ROOT, 'backend', 'package-lock.json'));
  const hasFrontendLock = fs.existsSync(path.join(ROOT, 'frontend', 'package-lock.json'));
  record('NPM Lockfiles (backend + frontend)', hasBackendLock && hasFrontendLock, `backend=${hasBackendLock}, frontend=${hasFrontendLock}`);

  // 3. Resolver cada perfil con las credenciales de su propia base.
  const profiles = [
    { label: 'DEV', appEnv: 'local', nodeEnv: 'development', dbName: 'sistema_enterprise' },
    { label: 'QA', appEnv: 'test', nodeEnv: 'test', dbName: 'sistema_enterprise_test' },
  ];
  const configs = new Map();
  for (const profile of profiles) {
    try {
      const profileEnv = { ...process.env, APP_ENV: profile.appEnv, NODE_ENV: profile.nodeEnv, DB_NAME: profile.dbName };
      const cfg = validateAndResolveDbConfig(profileEnv);
      configs.set(profile.label, { cfg, env: profileEnv });
      record(
        `Environment Isolation Guard (${profile.label})`,
        cfg.isLocalOrTest && !cfg.useDatabaseUrl && cfg.name === profile.dbName,
        `APP_ENV=${cfg.appEnv}, HOST=${cfg.host}:${cfg.port}, DB=${cfg.name}, USER=${cfg.user}`
      );
    } catch (err) {
      record(`Environment Isolation Guard (${profile.label})`, false, err.message);
    }
  }

  // 4. Escaneo de Seguridad y Secretos
  const sec = runSecurityScan();
  record('Security & Secret Scan', sec.findingsCount === 0, `Scanned=${sec.scannedFilesCount}, Findings=${sec.findingsCount}`);

  // 5. Conexión a PostgreSQL Local (DEV + TEST) y estado de migraciones
  if (configs.size === 2) {
    for (const profile of profiles) {
      const { cfg, env: profileEnv } = configs.get(profile.label);
      const dbName = profile.dbName;
      const client = new Client({
        host: cfg.host,
        port: cfg.port,
        database: dbName,
        user: cfg.user,
        password: cfg.password,
        ssl: false,
      });
      try {
        await client.connect();
        const idRes = await client.query(
          'SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS addr, inet_server_port() AS port'
        );
        const metaRes = await client.query('SELECT count(*)::int AS cnt FROM sequelize_meta');
        record(
          `PostgreSQL Local Connection (${profile.label})`,
          idRes.rows[0].db === dbName && idRes.rows[0].usr === cfg.user,
          `addr=${idRes.rows[0].addr}:${idRes.rows[0].port}, user=${idRes.rows[0].usr}, migrations_applied=${metaRes.rows[0].cnt}`
        );
      } catch (err) {
        record(`PostgreSQL Local Connection (${profile.label})`, false, err.message);
      } finally {
        await client.end().catch(() => {});
      }
    }

    // 6. Huella SHA-256 de Master Data (DEV == TEST)
    try {
      const devFp = await computeMasterDataFingerprint('sistema_enterprise', configs.get('DEV').env);
      const testFp = await computeMasterDataFingerprint('sistema_enterprise_test', configs.get('QA').env);
      const match = devFp.globalMasterDataSha256 === testFp.globalMasterDataSha256;
      record(
        'Master Data SHA-256 Parity (DEV == TEST)',
        match,
        `rows=${devFp.totalMasterRows}, sha256=${devFp.globalMasterDataSha256}`
      );
    } catch (err) {
      record('Master Data SHA-256 Parity (DEV == TEST)', false, err.message);
    }
  }

  const allPassed = checks.every((c) => c.status === 'OK');
  console.log(JSON.stringify({ allPassed, checks }, null, 2));
  if (!allPassed) {
    process.exitCode = 1;
  }
}

runDevCheck().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
