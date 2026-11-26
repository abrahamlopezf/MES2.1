'use strict';

/**
 * Escáner Local de Seguridad de Credenciales y Archivos Sensibles — TraceFlow MES
 *
 * Verifica:
 * 1. Ausencia de credenciales literales (URLs PostgreSQL con contraseña, passwords hardcodeados,
 *    hosts de Neon Cloud) en todos los archivos de código y scripts del repositorio.
 * 2. Que backend/.env local no contenga conexiones activas hacia servidores remotos (Neon Cloud).
 * 3. Que no existan archivos .env reales, dumps (.sql, .dump) o logs en el área de staging de Git.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');

const SECRET_RULES = [
  {
    id: 'PG_URL_WITH_CREDENTIALS',
    description: 'Cadena de conexión PostgreSQL con usuario y contraseña embebidos',
    regex: /postgres(?:ql)?:\/\/[^:\s'"`]+:[^@\s'"`]+@[^\s'"`]+/gi,
  },
  {
    id: 'NEON_CLOUD_HOSTNAME',
    description: 'Hostname de base de datos remota Neon Cloud codificado en archivo',
    regex: /ep-[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech/gi,
  },
  {
    id: 'HARDCODED_PASSWORD_LITERAL',
    description: 'Asignación literal de contraseña en código o configuración',
    regex: /(?:password|passwd|pwd)\s*[:=]\s*['"](?!\[REDACTED\]|<|your_|changeme|dummy_local_password|dummy_test_password)[^'"]{4,}['"]/gi,
  },
  {
    id: 'HARDCODED_CRYPTO_SECRET',
    description: 'Asignación literal de secreto JWT/QR/criptografía en código o configuración',
    regex: /(?:JWT_SECRET|QR_ENCRYPTION_KEY|QR_SECRET|ENCRYPTION_KEY|APP_SECRET)\s*[:=]\s*['"](?!\[REDACTED\]|<|your_|changeme|dummy_local_password)[^'"]{8,}['"]/gi,
  },
];

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
]);

const SCANNABLE_EXTENSIONS = /\.(js|cjs|mjs|ts|tsx|jsx|json|yml|yaml|md|sql|txt|env\.example)$/i;
const isEnvironmentFile = (name) => name === '.env' || name.startsWith('.env.');
const isPlaceholderExample = (line) => /(?:fake[_-]?(?:user|pass|token)|fake:fake|user:pass|u:p|ep-(?:dummy|fake|test|example|inherited)|example\.(?:com|net|org)|invalid\.example)/i.test(line);
const isRealEnvironmentFile = (name) => isEnvironmentFile(name) && name !== '.env.example' && !name.endsWith('.example');

function walkCodeFiles(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walkCodeFiles(path.join(dir, entry.name), list);
    } else {
      const rel = path.relative(ROOT, path.join(dir, entry.name)).replace(/\\/g, '/');
      const name = path.basename(rel);
      if (rel.endsWith('package-lock.json') || rel.endsWith('.dump') || rel.endsWith('.pdf')) continue;
      if (SCANNABLE_EXTENSIONS.test(rel) || isEnvironmentFile(name)) {
        list.push(rel);
      }
    }
  }
  return list;
}

function runSecurityScan() {
  const findings = [];
  const files = walkCodeFiles(ROOT);

  // Ignore rules do not remove an artifact that is already tracked. Report
  // these separately from the content scan so a clean scan cannot hide them.
  let trackedFiles = [];
  try {
    trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    // Source archives without Git metadata still receive the content scan.
  }
  for (const rel of trackedFiles) {
    const baseName = path.basename(rel);
    if (/(^|\/)([^/]*\.(?:dump|sql|bak)|[^/]*(?:error|validation)_log\.txt)$/i.test(rel) || isRealEnvironmentFile(baseName)) {
      findings.push({
        file: rel,
        line: null,
        ruleId: 'TRACKED_SENSITIVE_ARTIFACT',
        description: 'Archivo de entorno, dump o log rastreado por Git; debe conservarse local y excluirse del índice.',
      });
    }
  }

  for (const rel of files) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const rule of SECRET_RULES) {
        rule.regex.lastIndex = 0;
        if (rule.regex.test(line) && !isPlaceholderExample(line)) {
          findings.push({
            file: rel,
            line: idx + 1,
            ruleId: rule.id,
            description: rule.description,
          });
        }
      }
    });
  }

  // Verificar que backend/.env no tenga DATABASE_URL o REMOTE_DATABASE_URL apuntando a un servidor remoto
  const backendEnvPath = path.join(ROOT, 'backend', '.env');
  if (fs.existsSync(backendEnvPath)) {
    const envLines = fs.readFileSync(backendEnvPath, 'utf8').split(/\r?\n/);
    envLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      if (/^(DATABASE_URL|REMOTE_DATABASE_URL|NEON_DATABASE_URL)\s*=\s*.+/.test(trimmed)) {
        const val = trimmed.split('=').slice(1).join('=').trim();
        if (val && !/127\.0\.0\.1|localhost/i.test(val)) {
          findings.push({
            file: 'backend/.env',
            line: idx + 1,
            ruleId: 'REMOTE_URL_IN_LOCAL_ENV',
            description: 'Variable de conexión remota poblada dentro de backend/.env local',
          });
        }
      }
    });
  }

  return {
    scannedFilesCount: files.length,
    findingsCount: findings.length,
    findings,
  };
}

if (require.main === module) {
  const result = runSecurityScan();
  console.log(JSON.stringify(result, null, 2));
  if (result.findingsCount > 0) {
    console.error(`❌ [SECURITY_CHECK_FAILED] Se detectaron ${result.findingsCount} hallazgos de seguridad.`);
    process.exitCode = 1;
  } else {
    console.log(`✅ [SECURITY_CHECK_PASSED] ${result.scannedFilesCount} archivos auditados sin secretos expuestos.`);
  }
}

module.exports = { runSecurityScan };
