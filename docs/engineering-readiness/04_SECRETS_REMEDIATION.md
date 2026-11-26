# 04 — Remediación de Credenciales y Plan de Rotación (Fase 3)

## Estado local verificado al 26/11/2026

- El escáner del árbol actual terminó con cero hallazgos en 1,229 archivos. Esto solo describe el árbol actual.
- El análisis de parches históricos, sin mostrar valores, dejó 25 rutas candidatas a revisión por patrones amplios de credenciales. No se certificó en esta intervención si cada coincidencia es una credencial real o un ejemplo, ni si sigue vigente.
- Las credenciales detectadas en historial no se rotaron: los servicios remotos están fuera de alcance y no se realizaron llamadas remotas.
- Los cuatro artefactos sensibles están presentes localmente e ignorados por Git; constan como eliminaciones staged en el índice actual. No se hizo commit.
- El runtime TraceFlow dejó de usar `postgres`; las cuentas limitadas DEV/QA fueron comprobadas. El secreto administrativo local no está disponible actualmente en `backend/.env.admin.local`; no se cambió la contraseña del rol `postgres`.

Por tanto, **no declarar credenciales históricas revocadas**. Para cerrar este punto: el responsable debe revisar la lista local de candidatos `backend/tmp/history-scan-paths.txt` sin copiar secretos a chats/tickets, cotejar servicios con sus administradores y rotar en el propietario correspondiente. Para Neon/Render/GitHub, hacer la rotación coordinada en el panel oficial y actualizar exclusivamente los secretos de despliegue. Para PostgreSQL local, recuperar la clave administrativa desde el gestor seguro del propietario, colocarla en el archivo local ignorado `.env.admin.local` con ACL NTFS restringida, y después revisar las cuentas de servicio. No reutilizar credenciales históricas ni imprimir valores en logs.

## 1. Remediación Autorizada Ejecutada en el Árbol de Trabajo (Fase 3.2)

Se remediaron la totalidad de los **13 archivos** que contenían credenciales literales o escalamientos peligrosos a bases de datos remotas, sustituyendo los valores fijos por validaciones fail-closed de variables de entorno:

| # | Archivo Remediado | Vulnerabilidad Previa | Remediación Aplicada |
|---:|---|---|---|
| 1 | `.codex-e2e-close-shift.cjs` | Contraseña literal hardcodeada (línea 3) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 2 | `.codex-e2e-complete-batch.cjs` | Contraseña literal hardcodeada (línea 3) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 3 | `.codex-e2e-odc-multi.cjs` | Contraseña literal hardcodeada (línea 2) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 4 | `.codex-e2e-odc-run.cjs` | Contraseña literal hardcodeada (línea 2) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 5 | `.codex-e2e-odc-topoff.cjs` | Contraseña literal hardcodeada (línea 2) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 6 | `.codex-e2e-open-shift2.cjs` | Contraseña literal hardcodeada (línea 1) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 7 | `.codex-e2e-run-api.cjs` | Contraseña literal hardcodeada (línea 3) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 8 | `.codex-e2e-turn-handoff-resume.cjs` | Contraseña literal hardcodeada (línea 1) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 9 | `.codex-e2e-turn-handoff.cjs` | Contraseña literal hardcodeada (línea 2) | Exige `process.env.E2E_TEST_PASSWORD`; lanza excepción explícita si está ausente. |
| 10 | `backend/scripts/migrate-master-data.js` | Contraseña de PostgreSQL literal como fallback (`process.env.DB_PASSWORD \|\| '...'`) y `TRUNCATE` remoto sobre Neon | Eliminado el fallback literal; exige `DB_PASSWORD` y bloquea ejecución con `[SECURITY_GUARD]` a menos que exista autorización explícita. |
| 11 | `backend/scripts/create_admin_extrusion.js` | Contraseña literal por defecto al crear `admin_extrusion` (línea 73) | Exige `process.env.ADMIN_EXTRUSION_INITIAL_PASSWORD` ($\ge 12$ caracteres) sin valor predeterminado. |
| 12 | `backend/set_pwd.js` | Contraseña literal por defecto asignada a `nexus`, `admin_alm`, `admin` | Exige `process.env.LOCAL_RESET_PASSWORD` ($\ge 12$ caracteres), usa query parametrizada (`:hash`) e invoca `assertLocalDatabaseOnly(process.env)`. |
| 13 | `backend/scripts/sync-neon.js` | Forzaba `process.env.NODE_ENV = 'production'` y ejecutaba `sequelize.sync({ alter: true })` contra `DATABASE_URL` | Bloqueado permanentemente con `[SECURITY_GUARD]`. |
| 14 | `backend/.env` (Local) | Contenía `DATABASE_URL` apuntando a Neon Cloud | Vaciadas `DATABASE_URL=` y `REMOTE_DATABASE_URL=`; fijado `APP_ENV=local`. |

---

## 2. Evidencia del Escáner Automatizado de Secretos (`security-check.js`)

Se implementó [`backend/src/scripts/security-check.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/scripts/security-check.js) y se ejecutó sobre todo el árbol de código y configuración:

```json
{
  "scannedFilesCount": 1203,
  "findingsCount": 0,
  "findings": []
}
```
`✅ [SECURITY_CHECK_PASSED] 1203 archivos auditados sin secretos expuestos.`

---

## 3. Matriz de Clasificación y Procedimiento de Rotación de Credenciales (Fase 3.3)

> [!WARNING]
> **Eliminar una credencial del código actual NO equivale a revocarla**, ya que los commits anteriores del historial de Git (`git log`) aún contienen los valores literales. La rotación de credenciales remotas debe ser ejecutada por el administrador mediante el siguiente procedimiento:

| # | Servicio Afectado | Ambiente | Tipo de Credencial | Archivos donde Estuvo Expuesta | ¿Presente en Historial Git? | Nivel de Riesgo | Procedimiento Exacto de Rotación (Intervención Humana) |
|---:|---|---|---|---|---|---|---|
| 1 | **Neon Cloud PostgreSQL** (`ep-icy-shadow-*.us-east-1.aws.neon.tech/neondb`) | Nube (UAT / Producción) | Rol y contraseña de base de datos PostgreSQL (`DATABASE_URL`) | `backend/.env` (local) y 3 scripts locales eliminados en Fase 4 previa (`check_neon_status.js`, `clean_neon_production.js`, `verify_neon_post_cleanup.js`) | No en `HEAD`, pero estuvo en disco local sin cifrar | **CRÍTICO** | 1. Ingresar a Neon Console $\rightarrow$ Project $\rightarrow$ Roles.<br>2. Ejecutar **Reset Password** sobre el rol de base de datos.<br>3. Actualizar el secreto `DATABASE_URL` únicamente en GitHub Repository Secrets (`Environments: uat / production`) y en el panel de Render/hosting.<br>4. **Nunca volver a copiar `DATABASE_URL` de Neon en `backend/.env` local**. |
| 2 | **PostgreSQL Local** (`127.0.0.1:5432`) | Local (`development`) | Contraseña del superusuario `postgres` | `backend/scripts/migrate-master-data.js` (línea 9, commit histórico) | **Sí** (en historial de `main`) | **ALTO** | 1. Ejecutar en PostgreSQL local: `ALTER USER postgres WITH PASSWORD '<nueva_clave_local>';`<br>2. Asignar contraseñas locales propias a `traceflow_app_local` y `traceflow_app_test`.<br>3. Actualizar `DB_PASSWORD` en `backend/.env` local. |
| 3 | **Cuentas Operativas y Administrativas de Aplicación MES** (`nexus`, `admin`, `admin_alm`, `admin_extrusion`, `supervisor_extrusion`, `supervisor_extrusion_e2e`) | Local / Demo / Nube (si se aprovisionaron con ese valor) | Contraseñas de inicio de sesión JWT (`/api/auth/login`) | `.codex-e2e-*.cjs` (9 archivos), `backend/scripts/create_admin_extrusion.js`, `backend/set_pwd.js` | **Sí** (en historial de `main`) | **ALTO** | 1. En cualquier base de datos remota (Neon), actualizar los hashes `bcrypt` de estos usuarios y activar `must_change_password = true`.<br>2. En GitHub Secrets, rotar `DEMO_SUPERVISOR_PASSWORD` y `DEMO_GLOBAL_PASSWORD`. |
