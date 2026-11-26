# 09 — Auditoría y Plan de Saneamiento del Repositorio GitHub

## 1. Diagnóstico del Estado Actual del Repositorio Git

- **Repositorio remoto**: `origin` $\rightarrow$ `https://github.com/abrahamlopezf/MES2.1.git`
- **Rama activa**: `main` (sincronizada con `origin/main` en el commit `9321f41 ExceptionShift`)
- **Ramas locales/remotas**: Únicamente existe `main` (`remotes/origin/main`). No existen ramas `develop`, `uat`, `staging` ni ramas de feature remotas activas.
- **Archivos rastreados en el índice (`git ls-files`)**: **1,262 archivos**.
- **Trabajo activo no confirmado en el árbol de trabajo**:
  - **76 archivos rastreados modificados (`M`)**: Cambios funcionales en curso en `corte`, `extrusion`, `globo`, `laminado`, `qrcodes`, `telares`, `traceability`, `warehouse`, `wip`, además de 2 artefactos generados (`backend/error_log.txt` y `backend/test-label.pdf`).
  - **20 archivos/rutas no rastreados (`??`)**:
    - `5` migraciones nuevas en `backend/src/database/migrations/20261117*..20261124*`
    - `4` módulos nuevos en `backend/src/modules/` (`materialEquivalence.js`, `consumptionPackageAllocator.js`, `telaresScrapObservation.model.js`, `telaresScrapObservation.service.js`)
    - `5` pruebas nuevas en `backend/test/`
    - `4` componentes nuevos en `frontend/src/`
    - `1` documento en `docs/MEJORAS_PENDIENTES.md`
    - `1` respaldo de base de datos en `backend/tmp/pre-extrusion-cleanup-20261122.dump`

> [!IMPORTANT]
> Durante esta auditoría **no se modificó `.gitignore`, ni el índice de Git (`.git/index`), ni el historial de commits**, respetando estrictamente la Fase 6 y las Restricciones #13, #14 y #15.

---

## 2. Diferenciación Técnica de Acciones en Git

Es fundamental que el equipo distinga cuatro operaciones que **NO son equivalentes**:

| Operación | Comando / Mecanismo | Efecto en Disco Local | Efecto en Índice Git (Próximo Commit) | Efecto en Historial de Commits Pasados | Cuándo Usarla |
|---|---|---|---|---|---|
| **1. Eliminar un archivo físicamente** | `Remove-Item <ruta>` o `git rm <ruta>` | **Borra el archivo** del disco local. | Si estaba rastreado y se usa `git rm`, agenda su eliminación para el próximo commit. Si estaba ignorado, Git no se ve afectado. | **Ninguno** (el archivo sigue existiendo en commits anteriores). | Para archivos temporales, obsoletos o scripts experimentales descartados (`tmp/pdfs/*.png`, `.codex-e2e-*.cjs`). |
| **2. Ignorar un archivo mediante `.gitignore`** | Agregar patrón en `.gitignore` | **Conserva el archivo** en el disco local. | **Solo surte efecto sobre archivos NO rastreados**. Si el archivo ya estaba en `git ls-files`, `.gitignore` lo ignora por completo y Git sigue rastreándolo. | **Ninguno**. | Para prevenir que archivos locales futuros (`.env.*`, `*.dump`, `backend/tmp/`) entren al repositorio. |
| **3. Dejar de rastrear un archivo conservándolo localmente** | `git rm --cached <ruta>` + regla en `.gitignore` | **Conserva el archivo intacto** en el disco local del desarrollador. | Elimina el archivo del índice de Git; en el próximo commit/push desaparecerá de GitHub, pero no del disco local. | **Ninguno** (permanece en commits históricos). | Para volcados o archivos que se desean conservar en la máquina local pero sacar de GitHub (`backend/master_data_dump.sql`, `backend/error_log.txt`). |
| **4. Eliminar información del historial de Git** | `git filter-repo` o `BFG Repo-Cleaner` + `git push --force` | Reescribe el repositorio local. | Reescribe todos los hashes SHA-1 de los commits afectados. | **Elimina el contenido de todos los commits pasados**, invalidando clones existentes de otros desarrolladores. | Únicamente tras rotar/revocar credenciales críticas si se requiere purgar secretos o binarios gigantes de la historia. |

---

## 3. Reporte de Exposición de Credenciales y Secretos (Sin Mostrar Valores)

Se ejecutó un escaneo automatizado de patrones de credenciales sobre los 1,431 archivos del proyecto. A continuación se reportan las ubicaciones exactas sin exponer ningún valor sensible:

### 3.1 Secretos en Archivos Rastreados por Git (Expuestos en el Repositorio / Historial de GitHub)

| Archivo | Línea(s) | Tipo de Secreto Detectado | Estado en Git | Riesgo y Acción Obligatoria |
|---|---:|---|---|---|
| `.codex-e2e-close-shift.cjs` | 3 | Contraseña literal de cuenta `supervisor_extrusion` en payload `/auth/login` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseña del usuario en BD y eliminar archivo con `git rm`. |
| `.codex-e2e-complete-batch.cjs` | 3 | Contraseña literal de cuenta `supervisor_extrusion` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseña y eliminar con `git rm`. |
| `.codex-e2e-odc-multi.cjs` | 2 | Contraseña literal utilizada para `supervisor_extrusion` y `admin_alm` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseñas y eliminar con `git rm`. |
| `.codex-e2e-odc-run.cjs` | 2 | Contraseña literal utilizada para `supervisor_extrusion` y `admin_alm` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseñas y eliminar con `git rm`. |
| `.codex-e2e-odc-topoff.cjs` | 2 | Contraseña literal utilizada para `supervisor_extrusion` y `admin_alm` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseñas y eliminar con `git rm`. |
| `.codex-e2e-open-shift2.cjs` | 1 | Contraseña literal de cuenta `supervisor_extrusion_e2e` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseña y eliminar con `git rm`. |
| `.codex-e2e-run-api.cjs` | 3 | Contraseña literal de cuenta `supervisor_extrusion` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseña y eliminar con `git rm`. |
| `.codex-e2e-turn-handoff-resume.cjs` | 1 | Contraseña literal de `supervisor_extrusion_e2e` y `supervisor_extrusion` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseñas y eliminar con `git rm`. |
| `.codex-e2e-turn-handoff.cjs` | 2 | Contraseña literal de `supervisor_extrusion` y `supervisor_extrusion_e2e` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseñas y eliminar con `git rm`. |
| `backend/scripts/migrate-master-data.js` | 9 | Contraseña literal de PostgreSQL como valor por defecto (`process.env.DB_PASSWORD \|\| '...'`) | `TRACKED_CLEAN` | **CRÍTICO** — Cambiar la contraseña del usuario `postgres` donde se haya utilizado ese valor y eliminar el script con `git rm`. |
| `backend/scripts/create_admin_extrusion.js` | 88 | Contraseña literal por defecto al crear el usuario `admin_extrusion` | `TRACKED_CLEAN` | **ALTO** — Rotar contraseña de `admin_extrusion` en los ambientes donde exista y eliminar el script con `git rm`. |
| `backend/set_pwd.js` | 6 | Contraseña literal asignada por SQL a `nexus`, `admin_alm` y `admin` | `TRACKED_CLEAN` | **ALTO** — Verificar que `nexus`, `admin_alm` y `admin` en UAT/Producción no utilicen esa contraseña y eliminar el script con `git rm`. |

### 3.2 Secretos en Archivos Locales Ignorados por Git

| Archivo | Línea(s) | Tipo de Secreto Detectado | Estado Actual | Acción Recomendada |
|---|---:|---|---|---|
| `backend/.env` | 27, 33, 36, 48, 52, 55 | `DB_PASSWORD` local, `DATABASE_URL` (cadena de conexión completa a Neon Cloud), `REMOTE_DATABASE_URL` (Neon Cloud), `JWT_SECRET`, `QR_ENCRYPTION_KEY`, `QR_LEGACY_DECRYPTION_KEY` | `IGNORED` (Conservar local) | **CRÍTICO**: Comentar o vaciar `DATABASE_URL` y `REMOTE_DATABASE_URL` en el `.env` de desarrollo local para impedir que una ejecución accidental con `NODE_ENV=production` altere la base de datos en la nube de Neon. Rotar las credenciales de Neon antes de separar UAT y Producción. |
| `backend/check_neon_status.js` | 2 | Cadena de conexión PostgreSQL con usuario y contraseña de Neon Cloud en texto plano | **Eliminado en Lote 4** (Respaldado en `recovery_vault`) | Rotar la contraseña del rol de base de datos de Neon Cloud en la consola de Neon. |
| `backend/clean_neon_production.js` | 3 | Cadena de conexión PostgreSQL con usuario y contraseña de Neon Cloud en texto plano | **Eliminado en Lote 4** (Respaldado en `recovery_vault`) | Rotar la contraseña del rol de base de datos de Neon Cloud. |
| `backend/verify_neon_post_cleanup.js` | 3 | Cadena de conexión PostgreSQL con usuario y contraseña de Neon Cloud en texto plano | **Eliminado en Lote 4** (Respaldado en `recovery_vault`) | Rotar la contraseña del rol de base de datos de Neon Cloud. |

> [!WARNING]
> **La eliminación de un archivo con `git rm` NO borra la credencial del historial de commits previos.** Cualquier contraseña o cadena de conexión que haya estado en un archivo rastreado o en un script local debe considerarse **comprometida** y debe **revocarse y rotarse inmediatamente** en la base de datos y en los paneles de usuarios.

---

## 4. Archivos Rastreados Innecesariamente en Git

1. **Logs y salidas de runtime rastreadas**:
   - `backend/error_log.txt` (**17,558,090 bytes / 17.56 MB**, actualmente modificado `M`)
   - `error_log.txt` (en raíz, **1,476 bytes**)
   - `backend/validation_error.txt` (**91 bytes**)
2. **Dumps de base de datos rastreados**:
   - `backend/master_data_dump.sql` (**430,755 bytes**) — Rastreado a pesar de que `.gitignore` contiene `*.sql`.
3. **Cachés de compilación y PDFs de prueba rastreados**:
   - `frontend/vite.config.js.timestamp-1793046890367-5c51820afde588.mjs` (**3,159 bytes**)
   - `backend/test-label.pdf` (**6,514 bytes**, actualmente modificado `M`)
   - `backend/test-artifacts/WIP-extrusion-QR-hijos-local.pdf` (**79,017 bytes**)
4. **Imágenes temporales de inspección de PDFs rastreadas**:
   - `tmp/pdfs/*.png` (`14` archivos, **1,443,319 bytes**)
   - `.audit-telares/*.png` (`2` archivos, **611,852 bytes**)
5. **Configuraciones de entorno rastreadas**:
   - `frontend/.env.qa` (**40 bytes**, contiene `VITE_API_URL=http://127.0.0.1:4000/api`) — Actualmente está rastreado en Git porque `.gitignore` solo ignora `.env` y `.env.*.local`, no `.env.qa`.
6. **Dependencias de Playwright en raíz**:
   - `package.json` y `package-lock.json` en la raíz del proyecto solo instalan `@playwright/cli` y `@playwright/test` para depuración local interactiva, duplicando un tercer `node_modules/` en la raíz además de `backend/node_modules/` y `frontend/node_modules/`.

---

## 5. Propuesta de `.gitignore` Actualizado (Para Aplicar en la Intervención de Saneamiento)

```gitignore
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env (Ignorar todos los archivos .env excepto las plantillas .env.example)
.env
.env.*
!.env.example
!backend/.env.example
!frontend/.env.example

# Builds & Vite temp
dist/
build/
*.timestamp-*.mjs

# Logs y salidas de error de middlewares
logs/
*.log
*error_log.txt
debug_error.txt
backend/validation_error.txt
backend/db-status.txt
backend/prod-check*.txt
backend/gh_logs.json

# OS & Editor
.DS_Store
Thumbs.db
.vscode/
.idea/

# Base de datos, respaldos y dumps locales (NUNCA versionar)
*.sqlite
*.sql
*.dump
*.bak
backend/catalog_dump.json
backend/seed_check.txt

# Directorios temporales y artefactos de pruebas locales
tmp/
backend/tmp/
.playwright/
.playwright-cli/
.audit-telares/
.codex-e2e-*.cjs
.codex-create-e2e-db.cjs
backend/.codex-e2e-server.cjs
backend/test-label.pdf

# Scripts ad-hoc locales de limpieza/verificación
backend/*_cleanup*.js
backend/*_status*.js
backend/verify_*.js
backend/clean_*.js
```

---

## 6. Instrucciones Precisas de Ejecución para el Saneamiento de GitHub

Cuando el equipo autorice la ejecución del saneamiento de Git, deberá ejecutarse en el siguiente orden exacto:

### Paso 1: Confirmar primero el trabajo funcional en curso
No mezclar el commit funcional de Extrusión/Telares/Laminado/Corte con el commit de saneamiento estructural:
```powershell
# Revisar y agregar únicamente los cambios funcionales y migraciones nuevas:
git add backend/src frontend/src backend/test docs/MEJORAS_PENDIENTES.md
git commit -m "feat(mes): consolidate extrusion, telares, laminado and corte operational flows"
```

### Paso 2: Dejar de rastrear archivos que deben conservarse localmente (`git rm --cached`)
```powershell
# Descartar modificaciones de archivos generados y sacarlos del índice de Git sin borrarlos del disco si se desean conservar:
git checkout -- backend/error_log.txt backend/test-label.pdf
git rm --cached backend/error_log.txt error_log.txt backend/validation_error.txt backend/master_data_dump.sql backend/test-label.pdf
```

### Paso 3: Eliminar del repositorio los artefactos temporales, duplicados y scripts con credenciales (`git rm`)
```powershell
# 1. Eliminar artefacto temporal de Vite y carpetas de renders PNG temporales:
git rm frontend/vite.config.js.timestamp-1793046890367-5c51820afde588.mjs
git rm -r tmp/pdfs .audit-telares

# 2. Eliminar migraciones duplicadas en database/legacy (idénticas a database/migrations):
git rm -r backend/src/database/legacy

# 3. Eliminar scripts experimentales .codex-e2e-* de la raíz y backend:
git rm .codex-create-e2e-db.cjs .codex-e2e-*.cjs backend/.codex-e2e-server.cjs

# 4. Eliminar scripts obsoletos con credenciales hardcodeadas o ya desactivados:
git rm backend/scripts/migrate-master-data.js backend/scripts/create_admin_extrusion.js backend/scripts/sync-neon.js backend/set_pwd.js backend/src/scripts/seed-supervisor-extrusion.js backend/src/scripts/update-models.js
```

### Paso 4: Actualizar `.gitignore` y crear el commit de saneamiento
```powershell
# Aplicar el nuevo .gitignore propuesto en la Sección 5 y confirmar:
git add .gitignore docs/audit
git commit -m "chore(repo): remove tracked logs, duplicate legacy migrations and temporary e2e scripts"
```
