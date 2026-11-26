# 12 — ESTRATEGIA Y PROCEDIMIENTOS VERIFICADOS DE ROLLBACK Y RECUPERACIÓN

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-25  
**Estado de Verificación:** **PROBADO Y VERIFICADO MEDIANTE `pg_restore` Y HASH SHA-256**

---

## 1. Inventario de la Bóveda de Recuperación (`readiness_recovery_vault`)

Antes de realizar cualquier modificación de la Fase 1 en adelante, se construyó una bóveda de recuperación completa fuera del árbol de Git:

- **Ruta Absoluta de la Bóveda:**  
  `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\`

| Artefacto en la Bóveda | Ruta Relativa en Bóveda | Tamaño (Bytes) | Hash SHA-256 Verificado | Contenido Protegido |
| :--- | :--- | :---: | :--- | :--- |
| **Manifiesto Maestro** | `manifest.json` | `39,582` | Verificable por archivo | Inventario JSON con ruta original, tamaño y hash SHA-256 de los **154 archivos** respaldados (`25,305,884 bytes`). |
| **Copia Íntegra de Archivos** | `files/*` | `25,305,884` | 154 hashes individuales | Los 76 archivos modificados (`M`), los 19 archivos nuevos funcionales (`??`), `backend/.env`, `frontend/.env`, `.gitignore`, `.github/workflows/*.yml`, scripts remediados, `docs/audit/*` y `docs/qa/*`. |
| **Parche Git Inicial** | `git_diff_initial.patch` | `461,409` | `b802e78bdeb23d6e5cd88639b2ed4c1f7692ea7a5c587fda84fcf61a507cf1c5` | Diferencia completa de los archivos de código modificados antes de iniciar el blindaje. |
| **Backup Nativo PostgreSQL** | `db_backups/sistema_enterprise_phase0.dump` | `2,287,895` | `858e78f60cb1076348242f44c6d83a9c6d7474158272148a99679e0343d7d9cc` | Volcado completo (`pg_dump -Fc`) de `sistema_enterprise` con las 77 tablas, 163 migraciones y 2,928 registros de Master Data. |
| **Esquema SQL Puro** | `db_backups/sistema_enterprise_phase0_schema.sql` | `1,236,107` | `649c3ca775aa504a5f93e3d5f524bbce78da6e028b5dd26f0852ca710bd39695` | DDL completo (`pg_dump --schema-only`) de la base de datos local. |

---

## 2. Procedimiento 1 — Restauración de Archivos de Configuración o Código

### 2.1 Restaurar un archivo individual desde la bóveda (PowerShell)

Si se requiere revertir cualquiera de los archivos intervenidos (por ejemplo, `backend/.env`, `.gitignore` o un workflow de `.github/workflows/`) a su estado exacto de Fase 0:

```powershell
$VaultRoot = "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault"
$RepoRoot  = "c:\Users\maicr\OneDrive\Desktop\Demo"
$RelPath   = "backend\.env" # Cambiar por el archivo relativo que se desea restaurar

Copy-Item -Path (Join-Path $VaultRoot "files\$RelPath") -Destination (Join-Path $RepoRoot $RelPath) -Force
```

### 2.2 Verificar integridad SHA-256 contra `manifest.json`

```powershell
node -e "
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vault = 'C:/Users/maicr/.gemini/antigravity/brain/fff425d7-4fc2-4dfd-a64f-39c04a64fce9/scratch/readiness_recovery_vault';
const manifest = JSON.parse(fs.readFileSync(path.join(vault, 'manifest.json'), 'utf8'));
let ok = 0;
for (const item of manifest.files) {
  const buf = fs.readFileSync(path.join(vault, 'files', item.relativePath));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== item.sha256) throw new Error('Mismatch on ' + item.relativePath);
  ok++;
}
console.log('Verified ' + ok + '/' + manifest.files.length + ' files in recovery vault.');
"
```

---

## 3. Procedimiento 2 — Restauración Completa de Base de Datos PostgreSQL Local

Este procedimiento fue **ejecutado y comprobado en vivo** durante la Fase 2 para aprovisionar `sistema_enterprise_test` a partir de `sistema_enterprise_phase0.dump`.

### 3.1 Restaurar sobre `sistema_enterprise_test` (Ambiente de Pruebas Local)

```powershell
$env:PGPASSWORD = "<TU_DB_PASS_LOCAL>"
$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$DumpFile = "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\db_backups\sistema_enterprise_phase0.dump"

# 1. Verificar el hash SHA-256 del archivo .dump antes de restaurar
Get-FileHash -Path $DumpFile -Algorithm SHA256
# Debe coincidir con: 858E78F60CB1076348242F44C6D83A9C6D7474158272148A99679E0343D7D9CC

# 2. Restaurar limpiando objetos previos exclusivamente en la BD local indicada
& "$PgBin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -d sistema_enterprise_test --clean --if-exists --no-owner --no-privileges $DumpFile

# 3. Reinstalar triggers de protección de Master Data en sistema_enterprise_test
node backend/src/scripts/setup-local-db-isolation.js
```

### 3.2 Restaurar de emergencia sobre `sistema_enterprise` (Ambiente de Desarrollo Local)

En caso de que una prueba o intervención futura corrompa datos en `sistema_enterprise`:

```powershell
$env:PGPASSWORD = "<TU_DB_PASS_LOCAL>"
$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$DumpFile = "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\db_backups\sistema_enterprise_phase0.dump"

# 1. Terminar conexiones locales activas hacia sistema_enterprise
& "$PgBin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'sistema_enterprise' AND pid <> pg_backend_pid();"

# 2. Restaurar desde el dump verificado de Fase 0
& "$PgBin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -d sistema_enterprise --clean --if-exists --no-owner --no-privileges $DumpFile

# 3. Comprobar integridad de Master Data (SHA-256)
npm --prefix backend run db:verify:local
```

---

## 4. Procedimiento 3 — Verificación Post-Restauración de Master Data

Tras cualquier operación de restauración de base de datos, es obligatorio ejecutar el verificador determinista de Master Data:

```powershell
npm --prefix backend run db:verify:local
```

**Criterio de Éxito Obligatorio:**
- Tablas maestras evaluadas: **`30`**
- Total de filas maestras: **`2,928`**
- Hash Global SHA-256 esperado:  
  **`36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`**
