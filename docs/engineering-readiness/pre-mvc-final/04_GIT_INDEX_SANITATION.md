# 04 — SANEAMIENTO LOCAL DEL ÍNDICE DE GIT (`git rm --cached`) Y EXPOSICIÓN HISTÓRICA (FASE D)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Verificación:** 2026-11-26  
**Referencia Previa:** [`../closure-audit/10_SECURITY_VERIFICATION.md`](../closure-audit/10_SECURITY_VERIFICATION.md)

---

## 1. Verificación Previa y Estado de los 4 Archivos Sensibles en el Índice de Git

Conforme al protocolo de la Fase D (*"Antes de ejecutar esta operación: Verifica que no haya cambios concurrentes. Inspecciona el estado staged y unstaged. Comprueba si Codex ya realizó la operación. Confirma que están cubiertos por las reglas de exclusión existentes"*), se ejecutó una inspección no destructiva sobre los 4 archivos:

| # | Archivo Auditado | ¿Codex ya ejecutó `git rm --cached`? | Estado en `git status --porcelain=v1` | Presencia en `git ls-files --stage` | ¿Conservado Físicamente en Disco? | Tamaño Físico Actual (Bytes) | Regla de Exclusión Verificada (`git check-ignore -v --no-index`) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `backend/error_log.txt` | ✅ **Sí** | `D  backend/error_log.txt` *(staged for index removal)* | `""` *(0 entradas en índice)* | ✅ **Sí (`true`)** | `17,562,242` | `.gitignore:25:*error_log.txt` |
| **2** | `error_log.txt` | ✅ **Sí** | `D  error_log.txt` *(staged for index removal)* | `""` *(0 entradas en índice)* | ✅ **Sí (`true`)** | `1,476` | `.gitignore:25:*error_log.txt` |
| **3** | `backend/master_data_dump.sql` | ✅ **Sí** | `D  backend/master_data_dump.sql` *(staged for index removal)* | `""` *(0 entradas en índice)* | ✅ **Sí (`true`)** | `430,755` | `.gitignore:40:*.sql` |
| **4** | `frontend/.env.qa` | ✅ **Sí** | `D  frontend/.env.qa` *(staged for index removal)* | `""` *(0 entradas en índice)* | ✅ **Sí (`true`)** | `88` | `.gitignore:9:.env.*` |

---

## 2. Verificación Posterior de Higiene del Índice y Escaneo de Seguridad

1. **No repetición de comandos sobre el índice:**
   - Al comprobar que el agente concurrente **Codex** ya había ejecutado `git rm --cached` sobre los 4 archivos (documentado también en `15_CONTINUACION_BLINDAJE_AUDITORIA_2026-11-25.md`, línea 87), no se re-ejecutó el comando, evitando cualquier interferencia sobre el índice de Git.
2. **Ausencia de otros archivos en el área de `staging`:**
   - Se verificó mediante `git diff --cached --name-status` que **los únicos 4 elementos en estado `staged` en todo el repositorio son exactamente las 4 desvinculaciones (`D`) autorizadas**:
     - `D  backend/error_log.txt`
     - `D  backend/master_data_dump.sql`
     - `D  error_log.txt`
     - `D  frontend/.env.qa`
   - Ninguna eliminación de los 115 archivos rastreados retirados en la Fase F ni ninguna modificación de código (`M`) fue agregada al área de staging.
3. **Resultado del Escáner de Seguridad (`node backend/src/scripts/security-check.js`):**
   - Archivos auditados: **`1,209`**.
   - Hallazgos detectados (`findingsCount`): **`0` (`[]`)**.
   - Estado devuelto: **`✅ [SECURITY_CHECK_PASSED] 1209 archivos auditados sin secretos expuestos`** (`exit code 0`).

---

## 3. Registro de Exposición Histórica de Credenciales (Sin Mostrar Valores)

Aunque el árbol de trabajo actual y el índice activo de Git reportan **0 credenciales expuestas**, los siguientes elementos existieron en commits históricos del repositorio (`HEAD` `9321f41` y anteriores) y requieren acción humana fuera de este entorno local:

| # | Ruta Histórica en Git (`git log`) | Tipo de Credencial / Configuración Expuesta en Historial | Estado en Árbol Actual | Acción Humana Independiente Requerida |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `backend/scripts/migrate-master-data.js` | Contraseña literal de PostgreSQL / Neon Cloud usada como fallback en versiones previas del script. | **Eliminada del archivo** y script bloqueado con `[SECURITY_BLOCK]`. | **Rotar la contraseña del rol de base de datos en la consola de Neon Cloud** y actualizar el secreto `DATABASE_URL` en los ambientes remotos (Render / GitHub Secrets). |
| 2 | `.codex-e2e-*.cjs` (`9` scripts en raíz) y `backend/set_pwd.js` | Contraseñas literales de cuentas operativas/demo (`supervisor_extrusion`, `supervisor_extrusion_e2e`, `admin_alm`, `nexus`). | **Archivos retirados físicamente del árbol activo** (respaldados de forma sanitizada en `closure_cleanup_vault`). | **Rotar las contraseñas de usuarios demo/operativos** en cualquier base de datos remota (UAT / Producción) donde hayan sido aprovisionadas con esos valores. |
| 3 | `frontend/.env.qa` | URL pública del servicio backend desplegado en Render (`VITE_API_URL`). | **Desvinculado del índice de Git (`git rm --cached`)** e ignorado por `.gitignore:9:.env.*`. | Incluir la eliminación del índice (`D  frontend/.env.qa`) en el commit de saneamiento de GitHub. |
| 4 | `backend/master_data_dump.sql`, `backend/error_log.txt`, `error_log.txt` | Volcado SQL de catálogos maestros y trazas de errores de ejecución local. | **Desvinculados del índice de Git (`git rm --cached`)** e ignorados por `.gitignore`. | Incluir las 3 desvinculaciones del índice en el commit de saneamiento de GitHub. |
