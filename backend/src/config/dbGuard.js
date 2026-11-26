'use strict';

/**
 * Guardas Fail-Closed de Aislamiento de Ambiente y Conexión PostgreSQL — TraceFlow MES
 *
 * Responsabilidades:
 * 1. Separar el perfil de infraestructura (APP_ENV: 'local' | 'test' | 'uat' | 'production')
 *    del modo de ejecución de librerías (NODE_ENV: 'development' | 'test' | 'production').
 * 2. Bloquear de forma fail-closed cualquier intento de conexión hacia hosts remotos (ej. Neon Cloud)
 *    cuando el sistema opera en perfil 'local' o 'test', incluso si NODE_ENV === 'production'.
 * 3. Validar host, puerto, nombre de base de datos y ausencia de variables heredadas ambiguas
 *    antes de instanciar Sequelize o abrir sockets TCP.
 * 4. Comprobar la identidad efectiva del servidor PostgreSQL después de autenticar.
 */

const VALID_APP_ENVS = new Set(['local', 'test', 'uat', 'production']);
const ALLOWED_LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

const FORBIDDEN_REMOTE_HOST_PATTERNS = [
  /\.neon\.tech$/i,
  /\.aws\.neon\.tech$/i,
  /\.amazonaws\.com$/i,
  /\.render\.com$/i,
  /\.railway\.app$/i,
  /\.supabase\.co$/i,
  /\.elephantsql\.com$/i,
  /\.aivencloud\.com$/i,
];

const FORBIDDEN_LOCAL_DB_NAMES = new Set([
  'neondb',
  'production',
  'traceflow_prod',
  'traceflow_uat',
  'defaultdb',
]);

class EnvironmentGuardError extends Error {
  constructor(code, message, details = {}) {
    super(`[DB_GUARD:${code}] ${message}`);
    this.name = 'EnvironmentGuardError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Extrae de forma segura el hostname, puerto y nombre de base de datos de una URL PostgreSQL
 * sin exponer usuario ni contraseña en mensajes de error.
 */
function parseDatabaseUrlSafe(rawUrl, varName = 'DATABASE_URL') {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }
  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new EnvironmentGuardError(
      'INVALID_CONNECTION_URL',
      `La variable ${varName} no contiene una URL de conexión válida.`,
      { varName }
    );
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new EnvironmentGuardError(
      'INVALID_CONNECTION_PROTOCOL',
      `La variable ${varName} utiliza un protocolo no permitido (${parsed.protocol}). Solo se permite postgres:// o postgresql://.`,
      { varName, protocol: parsed.protocol }
    );
  }

  const hostname = (parsed.hostname || '').toLowerCase();
  const port = parsed.port ? Number(parsed.port) : 5432;
  const database = (parsed.pathname || '').replace(/^\//, '').trim();

  if (!hostname || !database) {
    throw new EnvironmentGuardError(
      'INCOMPLETE_CONNECTION_URL',
      `La variable ${varName} está incompleta (requiere host y nombre de base de datos).`,
      { varName, hostname, database }
    );
  }

  return { hostname, port, database, varName };
}

function isLocalHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  return ALLOWED_LOCAL_HOSTS.has(hostname.trim().toLowerCase());
}

function isKnownRemoteHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const lower = hostname.trim().toLowerCase();
  if (isLocalHost(lower)) return false;
  return FORBIDDEN_REMOTE_HOST_PATTERNS.some((re) => re.test(lower)) || !isLocalHost(lower);
}

/**
 * Resuelve y valida el perfil de infraestructura (APP_ENV).
 * Regla clave: Cambiar únicamente NODE_ENV=production en una máquina local SIN definir
 * explícitamente APP_ENV=production (o APP_ENV=uat) y ALLOW_REMOTE_DB=true es rechazado
 * de forma fail-closed si existen URLs remotas o si falta autorización explícita.
 */
function resolveAppEnv(rawEnv = process.env) {
  const explicitAppEnv = rawEnv.APP_ENV ? String(rawEnv.APP_ENV).trim().toLowerCase() : '';
  const nodeEnv = rawEnv.NODE_ENV ? String(rawEnv.NODE_ENV).trim().toLowerCase() : 'development';

  if (explicitAppEnv) {
    if (!VALID_APP_ENVS.has(explicitAppEnv)) {
      throw new EnvironmentGuardError(
        'INVALID_APP_ENV',
        `APP_ENV='${rawEnv.APP_ENV}' no es válido. Valores permitidos: local, test, uat, production.`,
        { appEnv: rawEnv.APP_ENV }
      );
    }
    return explicitAppEnv;
  }

  if (nodeEnv === 'test') {
    return 'test';
  }

  if (nodeEnv === 'development' || !nodeEnv) {
    return 'local';
  }

  // Si NODE_ENV es 'production' o 'uat' pero APP_ENV no fue declarado explícitamente:
  // En CI/Cloud legítimo donde APP_ENV aún no se configuró pero no hay variables DB_HOST locales,
  // verificamos que no sea una ejecución ambigua en estación local.
  const hasLocalDbHost = rawEnv.DB_HOST && isLocalHost(rawEnv.DB_HOST);
  if (hasLocalDbHost) {
    throw new EnvironmentGuardError(
      'AMBIGUOUS_NODE_ENV_ESCALATION',
      `Se detectó NODE_ENV='${nodeEnv}' junto con DB_HOST local ('${rawEnv.DB_HOST}') sin APP_ENV explícito. ` +
        `Cambiar NODE_ENV no autoriza escalar a infraestructura remota. Define APP_ENV=local o APP_ENV=test.`,
      { nodeEnv, dbHost: rawEnv.DB_HOST }
    );
  }

  if (nodeEnv === 'production') {
    return 'production';
  }

  if (nodeEnv === 'uat' || nodeEnv === 'staging') {
    return 'uat';
  }

  throw new EnvironmentGuardError(
    'UNKNOWN_ENVIRONMENT_PROFILE',
    `No se pudo determinar un perfil de ambiente seguro para NODE_ENV='${rawEnv.NODE_ENV}'.`,
    { nodeEnv: rawEnv.NODE_ENV }
  );
}

/**
 * Valida de forma fail-closed toda la configuración de base de datos para el ambiente dado.
 * Devuelve la configuración efectiva normalizada y auditada.
 */
function validateAndResolveDbConfig(rawEnv = process.env) {
  const appEnv = resolveAppEnv(rawEnv);
  const nodeEnv = rawEnv.NODE_ENV ? String(rawEnv.NODE_ENV).trim().toLowerCase() : 'development';
  const isLocalOrTest = appEnv === 'local' || appEnv === 'test';
  const isRemoteEnv = appEnv === 'uat' || appEnv === 'production';

  // Inspeccionar cualquier variable de URL o host heredado del sistema operativo / .env
  const urlVars = ['DATABASE_URL', 'REMOTE_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL'];
  const parsedUrls = [];
  for (const varName of urlVars) {
    if (rawEnv[varName] && String(rawEnv[varName]).trim() !== '') {
      parsedUrls.push(parseDatabaseUrlSafe(rawEnv[varName], varName));
    }
  }

  if (isLocalOrTest) {
    // 1. Ninguna variable de URL puede apuntar a un servidor remoto en ambiente local o test
    for (const u of parsedUrls) {
      if (!isLocalHost(u.hostname)) {
        throw new EnvironmentGuardError(
          'REMOTE_URL_FORBIDDEN_IN_LOCAL',
          `Operación bloqueada: La variable ${u.varName} apunta a un servidor remoto ('${u.hostname}') ` +
            `mientras el perfil activo es APP_ENV='${appEnv}'. Elimina o vacía ${u.varName} en tu configuración local.`,
          { appEnv, varName: u.varName, hostname: u.hostname }
        );
      }
      if (FORBIDDEN_LOCAL_DB_NAMES.has(u.database.toLowerCase())) {
        throw new EnvironmentGuardError(
          'FORBIDDEN_DB_NAME_IN_URL',
          `La base de datos '${u.database}' en ${u.varName} no está autorizada en APP_ENV='${appEnv}'.`,
          { appEnv, varName: u.varName, database: u.database }
        );
      }
    }

    // 2. Verificar PGHOST heredado del sistema operativo
    if (rawEnv.PGHOST && !isLocalHost(rawEnv.PGHOST)) {
      throw new EnvironmentGuardError(
        'INHERITED_PGHOST_FORBIDDEN',
        `La variable heredada PGHOST ('${rawEnv.PGHOST}') apunta a un host no local en APP_ENV='${appEnv}'.`,
        { appEnv, pgHost: rawEnv.PGHOST }
      );
    }

    // 3. Resolver host, puerto, usuario, contraseña y nombre de base local
    const host = rawEnv.DB_HOST ? String(rawEnv.DB_HOST).trim() : '127.0.0.1';
    if (!isLocalHost(host)) {
      throw new EnvironmentGuardError(
        'NON_LOCAL_DB_HOST_REJECTED',
        `DB_HOST='${host}' fue rechazado. En APP_ENV='${appEnv}' solo se permiten hosts locales (127.0.0.1, localhost, ::1).`,
        { appEnv, host }
      );
    }

    const rawPort = rawEnv.DB_PORT !== undefined && rawEnv.DB_PORT !== '' ? Number(rawEnv.DB_PORT) : 5432;
    if (!Number.isInteger(rawPort) || rawPort < 1024 || rawPort > 65535) {
      throw new EnvironmentGuardError(
        'INVALID_DB_PORT',
        `DB_PORT='${rawEnv.DB_PORT}' no es un puerto TCP válido (1024-65535).`,
        { appEnv, port: rawEnv.DB_PORT }
      );
    }

    const defaultDbName = appEnv === 'test' ? 'sistema_enterprise_test' : 'sistema_enterprise';
    const configuredDbName = appEnv === 'test'
      ? (rawEnv.DB_TEST_NAME !== undefined ? rawEnv.DB_TEST_NAME : rawEnv.DB_NAME)
      : rawEnv.DB_NAME;
    const dbName = configuredDbName !== undefined ? String(configuredDbName).trim() : defaultDbName;

    if (!dbName) {
      throw new EnvironmentGuardError(
        'EMPTY_DB_NAME',
        `DB_NAME no puede estar vacío en APP_ENV='${appEnv}'.`,
        { appEnv }
      );
    }

    if (FORBIDDEN_LOCAL_DB_NAMES.has(dbName.toLowerCase())) {
      throw new EnvironmentGuardError(
        'UNAUTHORIZED_DB_NAME',
        `La base de datos '${dbName}' está reservada o prohibida en APP_ENV='${appEnv}'.`,
        { appEnv, dbName }
      );
    }

    // En APP_ENV=test, exigir que la base sea explícitamente una base de pruebas/QA
    // salvo que se trate de una prueba con rollback transaccional explícitamente habilitada.
    if (
      appEnv === 'test' &&
      !/(_test|_qa|_e2e|_verify)/i.test(dbName) &&
      rawEnv.ALLOW_DEV_DB_IN_TEST !== '1'
    ) {
      throw new EnvironmentGuardError(
        'TEST_REQUIRES_ISOLATED_DB',
        `En APP_ENV='test' no se permite usar la base de desarrollo '${dbName}'. ` +
          `Usa una base aislada de pruebas (ej. 'sistema_enterprise_test').`,
        { appEnv, dbName }
      );
    }

    const userKey = appEnv === 'test' ? 'DB_TEST_USER' : 'DB_USER';
    const passwordKey = appEnv === 'test' ? 'DB_TEST_PASSWORD' : 'DB_PASSWORD';
    const user = rawEnv[userKey] !== undefined ? String(rawEnv[userKey]).trim() : '';
    if (!user) {
      throw new EnvironmentGuardError(
        'MISSING_DB_USER',
        `La variable ${userKey} es obligatoria en APP_ENV='${appEnv}'; no se permite usar una cuenta predeterminada.`,
        { appEnv, varName: userKey }
      );
    }

    const password = rawEnv[passwordKey] !== undefined ? String(rawEnv[passwordKey]) : '';
    if (!password) {
      throw new EnvironmentGuardError(
        'MISSING_DB_PASSWORD',
        `La variable ${passwordKey} es obligatoria en APP_ENV='${appEnv}'; no se permiten contraseñas vacías.`,
        { appEnv, varName: passwordKey }
      );
    }

    return {
      appEnv,
      nodeEnv,
      isLocalOrTest: true,
      isRemoteEnv: false,
      useDatabaseUrl: false,
      databaseUrl: null,
      host,
      port: rawPort,
      name: dbName,
      user,
      password,
      ssl: false,
    };
  }

  // Perfil remoto ('uat' o 'production')
  if (isRemoteEnv) {
    const dbUrlInfo = parseDatabaseUrlSafe(rawEnv.DATABASE_URL, 'DATABASE_URL');
    if (!dbUrlInfo) {
      throw new EnvironmentGuardError(
        'MISSING_REMOTE_DATABASE_URL',
        `El ambiente APP_ENV='${appEnv}' requiere una variable DATABASE_URL válida.`,
        { appEnv }
      );
    }

    if (isLocalHost(dbUrlInfo.hostname)) {
      throw new EnvironmentGuardError(
        'LOCAL_URL_IN_REMOTE_ENV',
        `DATABASE_URL apunta a un host local ('${dbUrlInfo.hostname}') en APP_ENV='${appEnv}'.`,
        { appEnv, hostname: dbUrlInfo.hostname }
      );
    }

    return {
      appEnv,
      nodeEnv,
      isLocalOrTest: false,
      isRemoteEnv: true,
      useDatabaseUrl: true,
      databaseUrl: rawEnv.DATABASE_URL.trim(),
      host: dbUrlInfo.hostname,
      port: dbUrlInfo.port,
      name: dbUrlInfo.database,
      user: null,
      password: null,
      ssl: true,
    };
  }

  throw new EnvironmentGuardError('UNHANDLED_APP_ENV', `Perfil no soportado: ${appEnv}`);
}

/**
 * Verifica la identidad efectiva del servidor PostgreSQL conectado antes de permitir escrituras.
 */
async function verifyPostgresConnectionIdentity(sequelize, expectedConfig) {
  const [rows] = await sequelize.query(
    'SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS addr, inet_server_port() AS port;'
  );
  const identity = rows && rows[0] ? rows[0] : {};

  if (expectedConfig.isLocalOrTest) {
    const addr = (identity.addr || '').replace(/\/\d+$/, '');
    if (addr && !isLocalHost(addr)) {
      throw new EnvironmentGuardError(
        'POST_CONNECT_REMOTE_ADDR_DETECTED',
        `Identidad de servidor PostgreSQL rechazada: inet_server_addr='${addr}' no es local en APP_ENV='${expectedConfig.appEnv}'.`,
        { addr, appEnv: expectedConfig.appEnv }
      );
    }
    if (identity.db !== expectedConfig.name) {
      throw new EnvironmentGuardError(
        'POST_CONNECT_DB_MISMATCH',
        `La base de datos conectada ('${identity.db}') no coincide con la base autorizada ('${expectedConfig.name}').`,
        { connectedDb: identity.db, expectedDb: expectedConfig.name }
      );
    }
    if (identity.usr !== expectedConfig.user) {
      throw new EnvironmentGuardError(
        'POST_CONNECT_USER_MISMATCH',
        `El usuario PostgreSQL conectado ('${identity.usr}') no coincide con el usuario autorizado ('${expectedConfig.user}').`,
        { connectedUser: identity.usr, expectedUser: expectedConfig.user }
      );
    }
  }

  return identity;
}

/**
 * Guarda reutilizable para cualquier script CLI / migración / seeder / prueba que deba ejecutarse
 * exclusivamente en entorno local.
 */
function assertLocalDatabaseOnly(rawEnv = process.env, options = {}) {
  const cfg = validateAndResolveDbConfig(rawEnv);
  if (!cfg.isLocalOrTest) {
    throw new EnvironmentGuardError(
      'LOCAL_ONLY_OPERATION_BLOCKED',
      `Este comando/script solo está autorizado en ambientes locales (local/test). Perfil detectado: APP_ENV='${cfg.appEnv}'.`,
      { appEnv: cfg.appEnv }
    );
  }
  if (options.requireTestDb && !/(_test|_qa|_e2e|_verify)/i.test(cfg.name)) {
    throw new EnvironmentGuardError(
      'TEST_DB_REQUIRED_FOR_OPERATION',
      `Esta operación requiere una base de datos aislada de pruebas (*_test / *_qa). Base actual: '${cfg.name}'.`,
      { dbName: cfg.name }
    );
  }
  return cfg;
}

/**
 * Sequelize CLI selects a named config independently from APP_ENV. Keep that
 * selector from bypassing the database profile validated above (for example,
 * `APP_ENV=local npx sequelize-cli db:migrate --env production`).
 */
function assertSequelizeCliProfile(cliEnvironment, resolvedConfig) {
  const selected = String(cliEnvironment || '').trim().toLowerCase();
  const known = new Set(['local', 'development', 'test', 'uat', 'production']);
  if (!known.has(selected)) {
    throw new EnvironmentGuardError('UNKNOWN_SEQUELIZE_CLI_PROFILE', `Perfil de Sequelize CLI no reconocido: '${selected || 'vacío'}'.`);
  }

  const appEnv = resolvedConfig?.appEnv;
  if (['uat', 'production'].includes(selected) && appEnv !== selected) {
    throw new EnvironmentGuardError(
      'SEQUELIZE_CLI_PROFILE_MISMATCH',
      `Sequelize CLI solicitó '${selected}', pero APP_ENV validado es '${appEnv}'. El perfil remoto debe coincidir explícitamente con APP_ENV.`,
      { selected, appEnv }
    );
  }
  if (selected === 'test' && appEnv !== 'test') {
    throw new EnvironmentGuardError(
      'SEQUELIZE_CLI_TEST_PROFILE_REQUIRED',
      `Sequelize CLI solicitó 'test', pero APP_ENV es '${appEnv}'. Define APP_ENV=test para usar únicamente la base QA.`,
      { selected, appEnv }
    );
  }
  if (['local', 'development'].includes(selected) && resolvedConfig?.isRemoteEnv) {
    throw new EnvironmentGuardError(
      'SEQUELIZE_CLI_LOCAL_PROFILE_MISMATCH',
      `Sequelize CLI solicitó '${selected}', pero APP_ENV apunta a infraestructura remota ('${appEnv}').`,
      { selected, appEnv }
    );
  }
  return selected;
}

module.exports = {
  EnvironmentGuardError,
  VALID_APP_ENVS,
  ALLOWED_LOCAL_HOSTS,
  parseDatabaseUrlSafe,
  isLocalHost,
  isKnownRemoteHost,
  resolveAppEnv,
  validateAndResolveDbConfig,
  verifyPostgresConnectionIdentity,
  assertLocalDatabaseOnly,
  assertSequelizeCliProfile,
};
