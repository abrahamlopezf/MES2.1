# 00 — Línea Base de Preparación de Ingeniería (Fase 0)

**Fecha de captura:** 25 de noviembre de 2026  
**Rama activa:** `main` (`origin/main`)  
**Último commit (`HEAD`):** `9321f41c920c0769b7947dcf3e1e886d6f510f8f` (`ExceptionShift`)  
**Entorno local:** Windows / Node.js `v24.22.3` / npm `11.19.1` / Git `2.56.1.windows.1` / PostgreSQL `18.7 (x86_64-windows)` en `127.0.0.1:5432`

---

## 1. Inventario del Espacio de Trabajo al Inicio de la Intervención

Se verificó el árbol de trabajo respetando íntegramente las modificaciones en curso del desarrollador, de la auditoría estructural previa (`docs/audit/`) y de la auditoría QA local (`docs/qa/`):

| Categoría en Git | Cantidad | Detalle Verificado |
|---|---:|---|
| **Archivos rastreados modificados (`M` unstaged)** | **76** | `35` archivos en `backend/src/` y `backend/test/`, `39` archivos en `frontend/src/`, y `2` artefactos generados (`backend/error_log.txt`, `backend/test-label.pdf`). |
| **Archivos en staging (`staged`)** | **0** | Ningún archivo en el índice de staging al iniciar. |
| **Archivos rastreados eliminados (`D`)** | **0** | Ningún archivo rastreado eliminado. |
| **Archivos funcionales/pruebas nuevos no rastreados (`??`)** | **19** | `5` migraciones en `backend/src/database/migrations/20261117*..20261124*`, `4` módulos en `backend/src/modules/`, `5` pruebas en `backend/test/`, `4` componentes en `frontend/src/` y `1` documento `docs/MEJORAS_PENDIENTES.md`. |
| **Documentación de auditorías previas (`??`)** | **25** | `15` documentos en `docs/audit/` y `10` documentos en `docs/qa/`. |
| **Respaldos locales en `backend/tmp/` (`??`)** | **1** | `backend/tmp/pre-extrusion-cleanup-20261122.dump` (`2,264,757 bytes`). |
| **Configuraciones y respaldos locales ignorados (`!!`)** | **5** | `backend/.env`, `frontend/.env`, `backend/backup_neon_pre_cleanup.sql`, `backend/backup_pre_cleanup_production.sql`, `backend/catalog_dump.json`. |

---

## 2. Estado Inicial de Configuraciones y Base de Datos Local

### 2.1 Diagnóstico Efectivo de `backend/.env` (Sin Exponer Secretos)
Al inspeccionar las variables efectivas cargadas desde `backend/.env`:
- `NODE_ENV=development`
- `PORT=4000`
- `TZ=America/Mexico_City` (`CST / UTC-6`)
- `CLIENT_URL=http://localhost:5173`
- `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_NAME=sistema_enterprise`, `DB_USER=postgres`
- **HALLAZGO CRÍTICO DE RIESGO ACTIVO**: La variable `DATABASE_URL` dentro de `backend/.env` estaba poblada con una cadena de conexión real hacia **Neon Cloud** (`ep-icy-shadow-*.us-east-1.aws.neon.tech/neondb`). Dado que `backend/src/config/database.js` seleccionaba `DATABASE_URL` siempre que `NODE_ENV === 'production' && env.databaseUrl`, cualquier comando o script que cambiara `NODE_ENV=production` se conectaba directamente a la base de datos remota en la nube.

### 2.2 Diagnóstico del Servidor PostgreSQL Local (`127.0.0.1:5432`)
- **Motor**: `PostgreSQL 18.7 on x86_64-windows, compiled by msvc-19.44.35230, 64-bit`
- **Dirección efectiva**: `127.0.0.1:5432`
- **Bases de datos relevantes existentes en el servidor local**:
  - `sistema_enterprise` (`83 MB`) — Base de datos principal de desarrollo local.
  - `sistema_enterprise_test` (`60 MB`) — Base de pruebas existente (desactualizada respecto a las últimas migraciones y catálogos de `sistema_enterprise`).
  - Copias históricas de pruebas anteriores: `sistema_enterprise_ext_e2e_20261109` (`81 MB`), `sistema_enterprise_qa_20261026` (`80 MB`), `telares_integrity_test` (`60 MB`), `traceflow_extrusion_integrity_test` (`39 MB`).
- **Roles PostgreSQL**: Únicamente existía el superusuario `postgres` (`rolsuper: true`, `rolcreatedb: true`, `rolcreaterole: true`).

---

## 3. Punto de Recuperación Verificable (Fase 0.2)

Antes de ejecutar cualquier modificación de la Fase 1 en adelante, se creó una bóveda de recuperación completa fuera del repositorio Git:

- **Ubicación de la bóveda**:
  `C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\`
- **Archivos de código, configuración y documentación respaldados**:
  - **154 archivos** (**25,305,884 bytes**) respaldados en `readiness_recovery_vault/files/` con verificación individual de hash `SHA-256` en `readiness_recovery_vault/manifest.json`.
  - Incluye todos los `76` archivos `M`, los `19` archivos funcionales `??`, `docs/audit/*`, `docs/qa/*`, `backend/.env`, `frontend/.env`, `frontend/.env.qa`, `.gitignore`, `.github/workflows/*.yml` y los scripts con credenciales que serán remediados en la Fase 3.
  - **Parche de trabajo inicial (`git_diff_initial.patch`)**: Hash `SHA-256` `b802e78bdeb23d6e5cd88639b2ed4c1f7692ea7a5c587fda84fcf61a507cf1c5`.
- **Respaldo Nativo de Base de Datos Local (`pg_dump` PostgreSQL 18.7)**:
  - **Dump completo (esquema + datos, formato custom `-Fc`)**:
    - Ruta: `readiness_recovery_vault/db_backups/sistema_enterprise_phase0.dump`
    - Tamaño: **2,287,895 bytes**
    - Hash `SHA-256`: `858e78f60cb1076348242f44c6d83a9c6d7474158272148a99679e0343d7d9cc`
  - **Dump de esquema puro (`--schema-only`)**:
    - Ruta: `readiness_recovery_vault/db_backups/sistema_enterprise_phase0_schema.sql`
    - Tamaño: **1,236,107 bytes**
    - Hash `SHA-256`: `649c3ca775aa504a5f93e3d5f524bbce78da6e028b5dd26f0852ca710bd39695`
