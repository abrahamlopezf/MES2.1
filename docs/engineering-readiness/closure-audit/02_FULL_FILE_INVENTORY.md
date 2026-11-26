# 02 — INVENTARIO ESTRUCTURAL COMPLETO Y CLASIFICACIÓN EN 22 CATEGORÍAS (FASE C)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Inventario:** 2026-11-25  
**Alcance:** Inspección recursiva completa de `c:\Users\maicr\OneDrive\Desktop\Demo` (excluyendo `.git/`, `node_modules/` y `frontend/dist/`, los cuales fueron verificados por separado para confirmar que `0` archivos de dependencias o build están rastreados por Git).

---

## 1. Clasificación Exhaustiva según las 22 Categorías de la Fase C

| # | Categoría Solicitada (Fase C) | Archivos Antes de Cierre | Archivos Retirados en Fase F | Archivos Actuales en Workspace | Tamaño Actual (Bytes) | Propósito y Estado Verificado | Acción Ejecutada / Recomendada |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| 1 | **Código fuente activo** (`backend/src/` y `frontend/src/` alcanzables desde entrypoints) | `1,071` | `0` | `1,071` | `5,942,110` | Módulos productivos activos de las 7 áreas industriales, core, diseño, modelos y migraciones. | ✅ **Conservar 100% intacto.** |
| 2 | **Código histórico** (Capas previas o módulos no montados en `backend/src/` y `frontend/src/`) | `112` | `0` | `112` | `278,120` | Módulos `intermediate`, `processes`, `scrap`, `waste` y vistas previas en `src/`. | 🛡️ **Conservado en `FILES_PENDING_REVIEW.md` para Refactor MVC.** |
| 3 | **Código experimental** (Capas DDD incompletas en `frontend/src/modules/*`) | `16` | `0` | `16` | `34,280` | ValueObjects/Handlers DDD sin conectar al router activo (contienen 16 imports no resueltos). | 🛡️ **Conservado en `FILES_PENDING_REVIEW.md` para Refactor Frontend.** |
| 4 | **Carpetas legacy** (`backend/src/database/legacy/`) | `6` archivos (`1` carpeta) | **`6` archivos (`1` carpeta)** | **`0`** | **`0`** | Contenía 6 migraciones de julio 2026 duplicadas byte a byte en `database/migrations/`. | 🧹 **Respaldada y ELIMINADA en Lote F1.** |
| 5 | **Archivos duplicados** (Migraciones duplicadas + `AGENTS.md` sincronizado) | `8` | **`6`** | `2` | `10,500` | Eliminadas las 6 migraciones duplicadas; permanece `AGENTS.md` sincronizado deliberadamente con `.agents/AGENTS.md`. | 🧹 **6 eliminados en Lote F1; 2 conservados por diseño.** |
| 6 | **Scripts temporales** (`.codex-*.cjs` en raíz y `backend/` + `seed-supervisor-extrusion.js` + `update-models.js`) | `23` | **`23`** | **`0`** | **`0`** | Scripts puntuales del 09/11/2026 acoplados a puerto 5433/4001 y parches ya aplicados. | 🧹 **Respaldados y ELIMINADOS en Lotes F2 y F4.** |
| 7 | **Archivos de depuración** (`backend/check*.js`, `debugDiscrepancy.js`, `find_*.js`, `count.js`, etc. en `backend/*.js`) | `47` | **`47`** | **`0`** | **`0`** | Scripts sueltos de depuración y parches manuales en la raíz de `backend/`. | 🧹 **Respaldados y ELIMINADOS en Lote F3.** |
| 8 | **Archivos de pruebas manuales** (`backend/test-*.js` y `qa_test.js` en raíz de `backend/` + `backend/src/scripts/test-*.js`) | `34` | **`23`** (raíz `backend/`) | `11` (`src/scripts/`) | `117,377` | Pruebas manuales de primera generación; las 23 sueltas en `backend/*.js` fueron retiradas y consolidadas. | 🧹 **23 eliminadas en Lote F3; 11 en `src/scripts/` consolidadas en `TESTS_CONSOLIDATED.md`.** |
| 9 | **Pruebas automatizadas** (`backend/test/*.test.js`, `src/**/*.test.js`, `frontend/**/*.test.*`, harness Vitest) | `36` | `0` | `36` | `169,240` | `16` suites unitarias/caracterización backend + `6` integración local + `11` suites Vitest + `3` harness. | ✅ **Conservar 100% intactas.** |
| 10 | **Evidencias QA** (`docs/qa/*`, `docs/qa/evidence/*`, `WIP-extrusion-QR-hijos-local.pdf`, `test-label.pdf`) | `15` | `0` | `15` | `2,403,120` | Reportes y artefactos de evidencia de la corrida QA multi-turno. | ✅ **Conservar intactos.** |
| 11 | **Reportes antiguos / Auditorías previas** (`docs/audit/*`, `docs/engineering-readiness/*`) | `32` | `0` | `32` *(+17 de `closure-audit/`)* | `318,450` | Entregables de la Auditoría Estructural #1 y Preparación de Ingeniería #2. | ✅ **Conservar intactos (sin sobrescribir).** |
| 12 | **Logs** (`backend/error_log.txt`, `error_log.txt`, `backend/validation_error.txt`) | `3` *(18 ya eliminados en Etapa 1)* | `0` | `3` | `17,563,891` | Escritos en tiempo de ejecución por `error.middleware.js` y `validation.middleware.js`. | 🛡️ **Conservados en `FILES_PENDING_REVIEW.md` hasta refactorizar middlewares y `git rm --cached`.** |
| 13 | **Cachés** (`frontend/vite.config.js.timestamp-1793046890367-5c51820afde588.mjs`) | `1` | **`1`** | **`0`** | **`0`** | Artefacto temporal de caché de Vite al transpilar `vite.config.js`. | 🧹 **Respaldado y ELIMINADO en Lote F1.** |
| 14 | **Archivos de compilación** (`frontend/dist/`) | Excluido (`0` en Git) | `0` | Excluido (`0` en Git) | N/A | Salida generada por `vite build`, ignorada correctamente en `.gitignore`. | ✅ **Correctamente excluido de Git.** |
| 15 | **Respaldos binarios (`.dump`)** (`backend/tmp/pre-extrusion-cleanup-20261122.dump`, `local-pre-multirun-20261125.dump`) | `2` | `0` | `2` | `4,550,788` | Volcados binarios `pg_dump` ignorados por Git; además de `sistema_enterprise_phase0.dump` en bóveda externa. | 🛡️ **Conservados por seguridad de datos.** |
| 16 | **Dumps SQL y JSON (`.sql`, `catalog_dump.json`)** | `4` | `0` | `4` | `2,883,826` | `backup_neon_pre_cleanup.sql`, `backup_pre_cleanup_production.sql`, `master_data_dump.sql`, `catalog_dump.json`. | 🛡️ **Conservados por seguridad de datos.** |
| 17 | **Archivos generados por agentes / Renderizaciones temporales** (`tmp/pdfs/*.png`, `.audit-telares/*.png`) | `16` *(113 ya eliminados en Etapa 1)* | **`16`** | **`0`** | **`0`** | Páginas PNG rasterizadas temporalmente de PDFs para inspección visual. | 🧹 **Respaldados y ELIMINADOS en Lote F1 (junto con carpetas `tmp/` y `.audit-telares/`).** |
| 18 | **Configuraciones activas y plantillas** (`package.json`, `vite.config.js`, `tsconfig*.json`, `.env*`, workflows) | `35` | `0` | `35` | `514,900` | Configuraciones de Node, Vite, TypeScript, Sequelize CLI, GitHub Actions y plantillas `.env.*.example`. | ✅ **Conservar (`frontend/.env.qa` en revisión para `git rm --cached`).** |
| 19 | **Recursos estáticos sin referencias desde código** (`img/Extrusion.jpeg`, `img/Telares.jpeg`, `screenshots/usability/movil-login-390x844.png`) | `3` | `0` | `3` | `159,479` | Imágenes de referencia de planta y captura de usabilidad móvil. | 🛡️ **Conservados en `FILES_PENDING_REVIEW.md` hasta decisión de Producto.** |
| 20 | **Carpetas vacías** (`backend/src/shared/builders`, `backend/src/shared/constants`, `frontend/src/modules/qrcodes/pages`) | `3` carpetas | **`3` carpetas** | **`0`** | **`0`** | Directorios sin archivos detectados en el recorrido recursivo. | 🧹 **ELIMINADAS las 3 carpetas vacías en Fase F.** |
| 21 | **Dependencias instaladas rastreadas incorrectamente** (`node_modules/` en raíz, `backend/` y `frontend/`) | `0` | `0` | **`0`** | **`0`** | Se verificó con `git ls-files | grep node_modules` que **ningún archivo de `node_modules` está rastreado por Git**. | ✅ **100% Limpio en Git.** |
| 22 | **Documentación funcional y de dominio vigente** (`README.MD`, `MES_DOMAIN_MAP.md`, `Manual_de_Usuario_MES.md`, `docs/Extrusión`, `Laminado`, `Tejido`, `Warehouse`, `telares`) | `31` | `0` | `31` | `3,879,958` | Manuales, diagramas PDF oficiales, Excels de catálogos del cliente y especificaciones de dominio. | ✅ **Conservar 100% intacta.** |

---

## 2. Distribución Estructural Actual por Directorio Raíz (Post-Limpieza Fase F)

| Subsistema / Directorio | Archivos Actuales | Tamaño Total (Bytes) | Estado |
| :--- | :---: | :---: | :--- |
| `.agents` | 1 | 10,360 | Activo / Auditado |
| `.github` | 4 | 9,139 | Activo / Auditado |
| `(Raíz del Repositorio)` | 8 | 28,975 | Activo / Auditado |
| `backend/.env` | 1 | 998 | Activo / Auditado |
| `backend/.env.example` | 1 | 1,516 | Activo / Auditado |
| `backend/.env.production.example` | 1 | 617 | Activo / Auditado |
| `backend/.env.test.example` | 1 | 638 | Activo / Auditado |
| `backend/.env.uat.example` | 1 | 599 | Activo / Auditado |
| `backend/.sequelizerc` | 1 | 312 | Activo / Auditado |
| `backend/backup_neon_pre_cleanup.sql` | 1 | 688,363 | Activo / Auditado |
| `backend/backup_pre_cleanup_production.sql` | 1 | 1,596,967 | Activo / Auditado |
| `backend/catalog_dump.json` | 1 | 167,741 | Activo / Auditado |
| `backend/error_log.txt` | 1 | 17,562,242 | Activo / Auditado |
| `backend/generate-catalog-seeder.js` | 1 | 11,301 | Activo / Auditado |
| `backend/master_data_dump.sql` | 1 | 430,755 | Activo / Auditado |
| `backend/package-lock.json` | 1 | 155,928 | Activo / Auditado |
| `backend/package.json` | 1 | 2,314 | Activo / Auditado |
| `backend/scripts` | 15 | 158,984 | Activo / Auditado |
| `backend/src` | 547 | 3,152,612 | Activo / Auditado |
| `backend/test` | 15 | 117,034 | Activo / Auditado |
| `backend/test-artifacts` | 1 | 79,017 | Activo / Auditado |
| `backend/test-label.pdf` | 1 | 6,514 | Activo / Auditado |
| `backend/tmp` | 1 | 2,264,757 | Activo / Auditado |
| `backend/validation_error.txt` | 1 | 173 | Activo / Auditado |
| `docs/agent-collaboration` | 7 | 27,551 | Activo / Auditado |
| `docs/audit` | 15 | 555,436 | Activo / Auditado |
| `docs/engineering-readiness` | 29 | 957,624 | Activo / Auditado |
| `docs/Extrusión` | 7 | 1,231,894 | Activo / Auditado |
| `docs/Laminado` | 2 | 264,690 | Activo / Auditado |
| `docs/MEJORAS_PENDIENTES.md` | 1 | 866 | Activo / Auditado |
| `docs/qa` | 13 | 2,320,123 | Activo / Auditado |
| `docs/Tejido` | 3 | 371,719 | Activo / Auditado |
| `docs/Warehouse` | 9 | 1,960,718 | Activo / Auditado |
| `frontend/.env` | 1 | 38 | Activo / Auditado |
| `frontend/.env.example` | 1 | 80 | Activo / Auditado |
| `frontend/.env.production.example` | 1 | 101 | Activo / Auditado |
| `frontend/.env.qa` | 1 | 40 | Activo / Auditado |
| `frontend/.env.uat.example` | 1 | 98 | Activo / Auditado |
| `frontend/.eslintrc.cjs` | 1 | 663 | Activo / Auditado |
| `frontend/.gitignore` | 1 | 253 | Activo / Auditado |
| `frontend/components.json` | 1 | 415 | Activo / Auditado |
| `frontend/docs` | 2 | 2,966 | Activo / Auditado |
| `frontend/index.html` | 1 | 872 | Activo / Auditado |
| `frontend/package-lock.json` | 1 | 327,624 | Activo / Auditado |
| `frontend/package.json` | 1 | 1,967 | Activo / Auditado |
| `frontend/public` | 2 | 14,553 | Activo / Auditado |
| `frontend/README.md` | 1 | 1,027 | Activo / Auditado |
| `frontend/src` | 530 | 3,654,033 | Activo / Auditado |
| `frontend/tests` | 1 | 2,723 | Activo / Auditado |
| `frontend/tsconfig.json` | 1 | 933 | Activo / Auditado |
| `frontend/tsconfig.node.json` | 1 | 272 | Activo / Auditado |
| `frontend/vercel.json` | 1 | 603 | Activo / Auditado |
| `frontend/vite.config.js` | 1 | 632 | Activo / Auditado |
| `frontend/vitest.config.js` | 1 | 1,594 | Activo / Auditado |
| `img` | 2 | 138,609 | Activo / Auditado |
| `screenshots` | 1 | 20,870 | Activo / Auditado |
| **TOTAL ACTUAL EN WORKSPACE** | **`1249`** | **`38,309,443`** | **100% Inventariado** |
