# 10 — REVISIÓN INTEGRAL DE SEGURIDAD, SECRETOS Y HOOKS (FASE I)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Revisión:** 2026-11-25  
**Política de Confidencialidad:** **CERO VALORES DE SECRETOS EXPUESTOS EN ESTE DOCUMENTO** (únicamente se documentan rutas, tipos de credenciales y acciones requeridas).

---

## 1. Verificación de los 12 Scripts Identificados Previamente con Credenciales Literales

En la auditoría inicial se detectaron **12 archivos rastreados** que contenían contraseñas literales o cadenas de conexión con credenciales hacia Neon Cloud. A continuación se documenta su estado exacto al cierre de esta intervención:

| # | Ruta Original del Script | Tipo de Credencial que Contenía | Acción Ejecutada | Estado Actual en el Espacio de Trabajo |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `.codex-e2e-close-shift.cjs` | Contraseña literal de usuario operativo (`supervisor_extrusion`) | Remediado en Fase 3 $\rightarrow$ **Respaldado en `closure_cleanup_vault` y retirado físicamente del árbol en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 2 | `.codex-e2e-complete-batch.cjs` | Contraseña literal de usuario operativo (`supervisor_extrusion`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 3 | `.codex-e2e-odc-multi.cjs` | Contraseña literal de usuarios (`supervisor_extrusion`, `admin_alm`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 4 | `.codex-e2e-odc-run.cjs` | Contraseña literal de usuarios (`supervisor_extrusion`, `admin_alm`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 5 | `.codex-e2e-odc-topoff.cjs` | Contraseña literal de usuarios (`supervisor_extrusion`, `admin_alm`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 6 | `.codex-e2e-open-shift2.cjs` | Contraseña literal de usuario (`supervisor_extrusion_e2e`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 7 | `.codex-e2e-run-api.cjs` | Contraseña literal de usuario (`supervisor_extrusion`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 8 | `.codex-e2e-turn-handoff-resume.cjs` | Contraseña literal de usuario (`supervisor_extrusion_e2e`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 9 | `.codex-e2e-turn-handoff.cjs` | Contraseña literal de usuarios (`supervisor_extrusion`, `supervisor_extrusion_e2e`) | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F2).** | ✅ **Retirado del árbol activo** |
| 10 | `backend/set_pwd.js` | Contraseña literal por defecto para actualización masiva SQL | Remediado en Fase 3 $\rightarrow$ **Respaldado y retirado físicamente en Fase F (Lote F3).** | ✅ **Retirado del árbol activo** |
| 11 | `backend/scripts/migrate-master-data.js` | Contraseña de PostgreSQL / Neon Cloud codificada como fallback (`process.env.DB_PASSWORD \|\| '...'`) | Eliminada credencial literal y **bloqueada su ejecución con `throw new Error('[SECURITY_BLOCK]...')` al inicio del archivo**. | 🛡️ **Sin credencial literal y bloqueado en línea 4** |
| 12 | `backend/scripts/create_admin_extrusion.js` | Contraseña literal fija para cuenta `admin_extrusion` | Eliminada credencial literal (exige `process.env.ADMIN_EXTRUSION_PASSWORD`) y protegido por `assertLocalDatabaseOnly`. | 🛡️ **Sin credencial literal** |

*(Adicionalmente, `backend/scripts/sync-neon.js`, `backend/scripts/masterdata-neon/inspect.js` y `backend/scripts/seed-manual-entry-permission.js` se encuentran bloqueados en sus primeras líneas mediante `throw new Error('[SECURITY_BLOCK]...')`).*

---

## 2. Auditoría por Superficie de Exposición (Archivos Activos, Ignorados, Historial Git, Respaldos y Logs)

| Superficie Auditada | Hallazgos Detectados (Sin Exponer Valores) | Nivel de Riesgo | Acción Necesaria |
| :--- | :--- | :---: | :--- |
| **1. Archivos de código fuente activos (`backend/src/`, `frontend/src/`)** | **`0` credenciales literales** en código activo. | **Bajo** | Mantener escaneo pre-commit. |
| **2. Archivos `.env` locales ignorados (`backend/.env`, `frontend/.env`)** | - `backend/.env` (ignorado por Git): contiene `DB_PASSWORD` local (`127.0.0.1`), `JWT_SECRET` local y `QR_ENCRYPTION_KEY` local. `DATABASE_URL` y `REMOTE_DATABASE_URL` están vacíos.<br>- `frontend/.env` (ignorado por Git): contiene únicamente `VITE_API_URL=http://localhost:4000/api`. | **Bajo (Esperado en desarrollo local)** | Nunca rastrear `backend/.env` ni `frontend/.env`. |
| **3. Archivo `frontend/.env.qa` (RASTREADO en Git)** | Contiene `VITE_API_URL=https://mes-backend-3oux.onrender.com/api` (no contiene contraseñas ni tokens, pero expone la URL del servicio en Render y está versionado en `git ls-files`). Detectado por `security-check.js` (`TRACKED_SENSITIVE_ARTIFACT`). | **Medio-Bajo** | Ejecutar `git rm --cached frontend/.env.qa` con autorización humana. |
| **4. Logs y Dumps SQL rastreados en el índice de Git (`git ls-files`)** | `security-check.js` detecta 3 artefactos rastreados en `git ls-files`:<br>- `backend/error_log.txt` (`17.56 MB`, rastreado y modificado `M`): contiene stack traces locales e históricos.<br>- `error_log.txt` (`1.48 KB`, retirado en disco o rastreado en índice): stack traces.<br>- `backend/master_data_dump.sql` (`430 KB`, rastreado): sentencias `INSERT` de catálogos maestros. | **Medio** | Ejecutar `git rm --cached backend/error_log.txt error_log.txt backend/master_data_dump.sql backend/validation_error.txt` y modificar `error.middleware.js` / `validation.middleware.js` en la fase MVC para no escribir archivos de log en la raíz del paquete. |
| **5. Respaldos SQL/Dump ignorados en `backend/` y `docs/qa/evidence/`** | - `backend/backup_neon_pre_cleanup.sql` (`688 KB`, ignorado)<br>- `backend/backup_pre_cleanup_production.sql` (`1.60 MB`, ignorado)<br>- `backend/tmp/pre-extrusion-cleanup-20261122.dump` (`2.26 MB`, ignorado)<br>- `docs/qa/evidence/local-pre-multirun-20261125.dump` (`2.29 MB`, ignorado)<br>Contienen volcados de datos e hashes bcrypt de usuarios de prueba/operativos. | **Medio (Solo local)** | Trasladar a almacenamiento seguro externo fuera del árbol del proyecto cuando el administrador lo autorice. |
| **6. Historial de Git (`git log`)** | Los commits anteriores a esta intervención (`HEAD` `9321f41` y previos) contienen en el historial de objetos de `.git/` las versiones antiguas de `.codex-e2e-*.cjs` y `backend/scripts/migrate-master-data.js` con la contraseña histórica de Neon Cloud y contraseñas de usuarios de prueba. | **ALTO (En repositorio remoto GitHub)** | **Acción Humana Obligatoria:** Rotar inmediatamente la contraseña del rol de base de datos en la consola de Neon Cloud y las contraseñas de usuarios en ambientes remotos; posteriormente evaluar `git filter-repo` o BFG Repo-Cleaner. |

---

## 3. Evaluación Técnica de `security-check.js` (Cobertura y Limitaciones)

Un resultado de `0` hallazgos de contenido **no constituye por sí solo una certificación absoluta de ausencia de secretos**. A continuación se documentan objetivamente las capacidades y limitaciones de `backend/src/scripts/security-check.js`:

### 3.1 Qué SÍ detecta `security-check.js`
1. URLs de conexión PostgreSQL con credenciales literales (PG_URL_WITH_CREDENTIALS).
2. Hostnames de Neon Cloud con patrón `ep-*.aws.neon.tech` (`NEON_CLOUD_HOSTNAME`).
3. Asignaciones literales directas a identificadores `password`, `passwd`, `pwd` de 4 o más caracteres (`HARDCODED_PASSWORD_LITERAL`).
4. Asignaciones literales directas a `JWT_SECRET`, `QR_ENCRYPTION_KEY`, `QR_SECRET`, `ENCRYPTION_KEY`, `APP_SECRET` (`HARDCODED_CRYPTO_SECRET`).
5. Variables `DATABASE_URL`, `REMOTE_DATABASE_URL` o `NEON_DATABASE_URL` no locales dentro de `backend/.env` (`REMOTE_URL_IN_LOCAL_ENV`).
6. Archivos `.env*` reales (no `.example`), `*.dump`, `*.sql`, `*.bak`, `*error_log.txt` o `*validation_log.txt` que estén **rastreados en el índice de Git (`git ls-files`)** (`TRACKED_SENSITIVE_ARTIFACT`).

### 3.2 Limitaciones de `security-check.js` (Lo que NO detecta)
1. **No escanea el historial de commits de Git (`git log -p`)**: Solo inspecciona el árbol de trabajo actual y la lista `git ls-files`.
2. **No detecta secretos por entropía de Shannon ni tokens con nombres de variable atípicos**: Si un secreto se almacena en una variable llamada `const k = '...'` o `const token = '...'` sin usar las palabras clave de las 4 expresiones regulares, no será marcado.
3. **No inspecciona archivos binarios o comprimidos (`.dump`, `.pdf`, `.xlsx`)**: Excluye explícitamente `package-lock.json`, `.dump` y `.pdf` del escaneo de contenido por líneas (aunque sí alerta si un `.dump` o `.sql` está en `git ls-files`).
4. **Modo `--staged`**: Aunque `.git/hooks/pre-commit` invoca `node backend/src/scripts/security-check.js --staged`, actualmente `runSecurityScan()` en `security-check.js` escanea siempre todos los archivos de `ROOT` y `git ls-files` (lo cual es aún más estricto que solo `--staged`, pero fallará mientras los 4 artefactos `TRACKED_SENSITIVE_ARTIFACT` sigan en `git ls-files` hasta que se ejecute `git rm --cached`).

---

## 4. Reproducibilidad del Hook `pre-commit` y Estado Real de GitHub Environments

1. **¿Es el hook `.git/hooks/pre-commit` reproducible automáticamente para otros desarrolladores al clonar el repositorio?**
   - **NO.** Git no versiona el directorio `.git/hooks/`. Por lo tanto, `.git/hooks/pre-commit` protege **únicamente esta estación de trabajo local**.
   - Para que sea reproducible en las máquinas de otros desarrolladores sin intervención manual, en la fase de configuración deberá agregarse un script versionado (ej. `scripts/install-git-hooks.js` invocado desde `"prepare"` en `package.json` o `git config core.hooksPath .githooks`), además de ejecutar `npm run security:check` como paso obligatorio en un workflow de GitHub Actions en cada Pull Request.
2. **¿Existen realmente las protecciones de GitHub Environments (`uat` y `production`) en GitHub?**
   - **Solo están declaradas en los archivos YAML locales (`.github/workflows/*.yml`)** mediante la propiedad `environment: ${{ inputs.target_environment }}` y las compuertas de confirmación de texto (`confirm_execution`).
   - Como no se ha hecho `git push` ni se tiene acceso administrativo a la configuración del repositorio remoto en GitHub (`Settings -> Environments`), **la creación de los Environments `uat` y `production` con *Required Reviewers* y secretos aislados en la plataforma GitHub debe ser ejecutada manualmente por el administrador del repositorio antes de activar despliegues remotos**.
