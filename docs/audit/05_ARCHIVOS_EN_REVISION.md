# 05 — Archivos en Revisión (Conservados por Precaución o Gobernanza de Git)

## 1. Criterio de Conservación

En estricto cumplimiento de las directivas de la intervención:
1. **"Ante cualquier incertidumbre, conserva el archivo. Prefiere conservar diez archivos dudosos antes que eliminar un archivo necesario."**
2. **"Durante esta auditoría no modifiques `.gitignore`, el índice de Git ni el historial del repositorio."**
3. **"No sobrescribir ni revertir cambios existentes realizados por otros desarrolladores."**

Todos los archivos listados en este documento fueron **conservados físicamente en el árbol de trabajo** por al menos una de las siguientes razones técnicas:
- Están **rastreados actualmente en el índice de Git** (`git ls-files`), por lo que su eliminación física sin ejecutar `git rm` dejaría el árbol de trabajo con decenas de estados `D` (borrados no confirmados) mezclados con los `76` archivos `M` de trabajo activo del equipo.
- Presentan **modificaciones locales pendientes (`M`)** en el árbol de trabajo (`backend/error_log.txt`, `backend/test-label.pdf`).
- Constituyen **respaldos de base de datos o volcados de catálogos** (`.sql`, `.dump`, `.json`) cuya eliminación definitiva requiere validación humana del equipo de infraestructura.
- Son **módulos de código fuente sin referencias entrantes aparentes** (huérfanos en `backend/src/` o `frontend/src/`) que contienen lógica de dominio o contratos de fases previas/futuras y cuya remoción pertenece a la fase de reestructuración MVC.

---

## 2. Resumen por Categoría de Revisión

| Grupo | Cantidad de Archivos | Tamaño Total (Bytes) | Estado en Git | Clasificación | Acción Recomendada en Siguiente Intervención |
|---|---:|---:|---|---|---|
| **G1. Scripts experimentales `.codex-e2e-*.cjs` en raíz y `backend/`** | 21 | 34,668 | `TRACKED_CLEAN` | `EXPERIMENTAL` / `RIESGO SEGURIDAD` | Consolidados en `INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`. Eliminar con `git rm` y rotar contraseñas de usuarios QA/demo. |
| **G2. Scripts ad-hoc sueltos en raíz de `backend/*.js`** | 49 | 99,792 | `TRACKED_CLEAN` | `OBSOLETO` / `EXPERIMENTAL` | Consolidados en `INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`. Eliminar con `git rm` los scripts puntuales ya superados por migraciones/seeders. |
| **G3. Scripts auxiliares en `backend/scripts/` y `backend/src/scripts/`** | 30 | 265,671 | `TRACKED_CLEAN` | `EXPERIMENTAL` / `FUNCIONAL CI` | **Conservar 3 scripts usados por GitHub Actions** (`validate-migration.js`, `provision-demo-users.js`, `verify-catalog-seed.js`) y 2 de regresión aislada (`test-odc-fifo-fulfillment.js`, `test-warehouse-to-telares-integrity.js`); depurar el resto con `git rm`. |
| **G4. Migraciones duplicadas en `backend/src/database/legacy/`** | 6 | 17,117 | `TRACKED_CLEAN` | `DUPLICADO` | Son copias exactas (mismo SHA-256) de las 6 migraciones del 7 y 27 de julio en `backend/src/database/migrations/`. Eliminar `backend/src/database/legacy/` con `git rm -r`. |
| **G5. Artefacto temporal de Vite y logs/archivos generados rastreados por Git** | 6 | 17,999,605 | `TRACKED_CLEAN` / `MODIFIED` | `TEMPORAL` / `GENERADO` | `frontend/vite.config.js.timestamp-*.mjs`, `error_log.txt`, `backend/error_log.txt` (`M`), `backend/validation_error.txt`, `backend/test-label.pdf` (`M`), `backend/test-artifacts/WIP-extrusion-QR-hijos-local.pdf`. Dejar de rastrear (`git rm --cached` o `git rm`) y añadir a `.gitignore`. |
| **G6. Capturas PNG temporales de PDFs y auditorías visuales rastreadas en Git** | 19 | 2,194,648 | `TRACKED_CLEAN` | `TEMPORAL` / `GENERADO` | `tmp/pdfs/*.png` (14), `.audit-telares/*.png` (2), `screenshots/usability/movil-login-390x844.png` (1), `img/Extrusion.jpeg` y `img/Telares.jpeg` (2). Eliminar de Git con `git rm` e ignorar `tmp/` y `.audit-telares/`. |
| **G7. Respaldos y volcados de base de datos (`.sql`, `.dump`, `.json`)** | 5 | 5,148,583 | `IGNORED` (3), `UNTRACKED` (1), `TRACKED_CLEAN` (1) | `RESPALDO / GENERADO` | Resguardar fuera del repositorio; ejecutar `git rm --cached backend/master_data_dump.sql` e ignorar `*.dump` y `backend/tmp/` en `.gitignore`. |
| **G8. Módulos y archivos huérfanos en `backend/src/` y `frontend/src/`** | 128 (`46` backend + `82` frontend) | ~312,400 | `TRACKED_CLEAN` | `SIN REFERENCIAS APARENTES` | Evaluar en Fase de Reestructuración MVC (`07_AUDITORIA_MVC.md` y `08_PROPUESTA_REESTRUCTURACION.md`). No eliminar sin validar si forman parte del roadmap (ej. `intermediate`, `processes`, `scrap`, DDD layers en frontend). |

---

## 3. Detalle Individual por Grupo

### G1. Scripts Experimentales `.codex-e2e-*.cjs` (21 archivos — Rastreados en Git)

Creados el 9 de noviembre de 2026 durante una sesión de pruebas manuales contra una copia local de base de datos (`sistema_enterprise_ext_e2e_20261109`, puerto `5433`) y un servidor Express temporal en el puerto `4001`.
- **Problema crítico**: 9 de estos archivos contienen contraseñas en texto plano y están versionados en `main`.
- **Acción**: Su lógica y casos de negocio ya quedaron documentados en [`INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`](./INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md) y cubiertos por las pruebas de integración reversibles en `backend/test/extrusion*.local.integration.test.js`. Deben eliminarse mediante `git rm` en el commit de saneamiento.

| Ruta del Archivo | Tamaño (B) | Estado Git | Hallazgo Principal |
|---|---:|---|---|
| `.codex-create-e2e-db.cjs` | 1,080 | `TRACKED_CLEAN` | Clona BD `sistema_enterprise` en `sistema_enterprise_ext_e2e_20261109` (puerto 5433). |
| `.codex-e2e-aftermix.cjs` | 1,875 | `TRACKED_CLEAN` | Consulta SQL post-mezcla (`MIX-EXT-1794258338807`). |
| `.codex-e2e-check.cjs` | 1,844 | `TRACKED_CLEAN` | Consulta fórmulas 15, 16, 17 y sesiones de turno. |
| `.codex-e2e-close-shift.cjs` | 2,051 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 3)**. Prueba cierre de merma y turno vía HTTP `:4001`. |
| `.codex-e2e-complete-batch.cjs` | 1,795 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 3)**. Prueba consumo completo de contenedor dividido. |
| `.codex-e2e-create-supervisor2.cjs` | 778 | `TRACKED_CLEAN` | Inserta usuario `supervisor_extrusion_e2e` clonando hash del usuario ID 51. |
| `.codex-e2e-formula.cjs` | 1,309 | `TRACKED_CLEAN` | Consulta ingredientes y WIP de fórmulas 15, 16 y 17. |
| `.codex-e2e-inspect.cjs` | 1,669 | `TRACKED_CLEAN` | Inspecciona tablas, silos y fórmula 15 en puerto 5433. |
| `.codex-e2e-odc-info.cjs` | 938 | `TRACKED_CLEAN` | Consulta área EXTRUSION, usuarios de almacén y columnas de `lotes`. |
| `.codex-e2e-odc-multi.cjs` | 2,408 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 2)**. Prueba ODC multi-insumo y QR hijo. |
| `.codex-e2e-odc-run.cjs` | 2,885 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 2)**. Prueba creación y surtido FIFO de ODC. |
| `.codex-e2e-odc-topoff.cjs` | 1,641 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 2)**. Prueba ODC complementaria de masterbatch. |
| `.codex-e2e-open-shift2.cjs` | 876 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 1)**. Prueba apertura de `TURNO_2`. |
| `.codex-e2e-run-api.cjs` | 2,450 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 3)**. Prueba `/extrusion/queue` y creación de rack. |
| `.codex-e2e-schema.cjs` | 1,302 | `TRACKED_CLEAN` | Lista columnas de 12 tablas operativas en puerto 5433. |
| `.codex-e2e-shift-setup.cjs` | 967 | `TRACKED_CLEAN` | Inserta sesión sintética cerrada `2026-11-05 TURNO_2`. |
| `.codex-e2e-supervisors.cjs` | 597 | `TRACKED_CLEAN` | Consulta usuarios con rol `SUPERVISOR_EXTRUSION`. |
| `.codex-e2e-turn-handoff-resume.cjs` | 2,067 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 1)**. Prueba cierre de turno y recepción de relevo. |
| `.codex-e2e-turn-handoff.cjs` | 3,641 | `TRACKED_CLEAN` | **Credencial hardcodeada (línea 2)**. Prueba preparación de mezcla y relevo entre supervisores. |
| `.codex-e2e-wipqr.cjs` | 1,187 | `TRACKED_CLEAN` | Consulta inventario WIP de extrusión con códigos QR. |
| `backend/.codex-e2e-server.cjs` | 309 | `TRACKED_CLEAN` | Wrapper que inicia `src/server.js` en puerto 4001 contra BD `sistema_enterprise_ext_e2e_20261109`. |

---

### G2. Scripts Ad-Hoc Sueltos en `backend/*.js` (49 archivos — Rastreados en Git)

Estos 49 scripts fueron creados entre julio y noviembre de 2026 para diagnósticos puntuales, parches manuales de datos, generación inicial de catálogos y pruebas manuales previas a la suite `node:test`. Ninguno es importado por la aplicación (`0` referencias entrantes en `backend/src/`), salvo `backend/generate-catalog-seeder.js` que documenta cómo regenerar el seeder `20260826120000-production-catalog-data.js` a partir de `catalog_dump.json`.

- **Subgrupo G2-A — Diagnóstico y consulta puntual (15 archivos)**: `check-db.js`, `check-db2.js`, `check-locks.js`, `check-prod.js`, `check-prod2.js`, `check.js`, `check_areas.js`, `check_fk.js`, `check_mat.js`, `check_perms.js`, `check_qr.js`, `check_sync.js`, `count.js`, `debugDiscrepancy.js`, `fetch-logs.js`, `find_duplicates.js`, `find_missing.js`, `read-excel.js`, `read-headers.js`.
- **Subgrupo G2-B — Mutación manual, limpieza y sincronización de datos (18 archivos)**: `assign_perm.js`, `clean_prod.js`, `clean_qa_users.js`, `cleanup-master-data.js`, `cleanup-rest.js`, `dedup_types.js`, `do_sync.js`, `fix-constraints.js`, `fix-inventory.js`, `fix_and_sync.js`, `fix_materials.js`, `fix_uuid.js`, `reactivate.js`, `resend_notifications.js`, `reset-db.js`, `run-migrations.js`, `seed_rank.js`, `set_pwd.js` *(contiene contraseña por defecto hardcodeada)*, `sync-master-data.js`, `sync_seq.js`, `terminate-locks.js`, `update_trace.js`, `update_types.js`, `verify_materials2.js`, `verify_materials3.js`.
- **Subgrupo G2-C — Generadores históricos de código/seeders (4 archivos)**: `generate-catalog-seeder.js`, `generate_catalogs.js` *(contiene 8 plantillas de imports no resueltos)*, `generate_dump.js`, `generate_seeders_from_text.js` *(referencia `raw_materials.tsv` inexistente)*.
- **Subgrupo G2-D — Pruebas manuales sueltas en raíz de `backend/` (23 archivos)**: `qa_test.js`, `test-audit.js`, `test-concurrency.js`, `test-const.js`, `test-consumptions.js`, `test-core-integrity.js`, `test-dashboard.js`, `test-events.js`, `test-joi.js`, `test-manual-entry.js`, `test-pdf.js`, `test-perf.js`, `test-prod-api.js`, `test-production-integration.js`, `test-put.js`, `test-query.js`, `test-raw.js`, `test-report.js`, `test-req.js`, `test-roles.js`, `test-stats.js`, `test-triggers.js`, `test-warehouse-integration.js`.

Todos ellos están documentados individualmente en [`INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`](./INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md).

---

### G3. Scripts en `backend/scripts/` (15 archivos) y `backend/src/scripts/` (18 archivos)

> [!CAUTION]
> **Tres scripts en `backend/src/scripts/` son CRÍTICOS para los workflows de GitHub Actions y NUNCA deben eliminarse**:
> 1. `backend/src/scripts/validate-migration.js` — Ejecutado por `.github/workflows/migrations.yml` y `.github/workflows/seed-catalogs.yml`.
> 2. `backend/src/scripts/provision-demo-users.js` — Ejecutado por `.github/workflows/provision-demo-users.yml`.
> 3. `backend/src/scripts/verify-catalog-seed.js` — Ejecutado por `.github/workflows/seed-catalogs.yml`.

Del resto de scripts en ambas carpetas:
- **`backend/scripts/migrate-master-data.js`** (6,012 B): **Riesgo alto de seguridad** — contiene una contraseña de base de datos codificada como fallback en la línea 9 y ejecuta `SET session_replication_role = replica` seguido de `TRUNCATE` sobre Neon. Debe eliminarse con `git rm`.
- **`backend/scripts/create_admin_extrusion.js`** (4,499 B): Contiene contraseña fija para `admin_extrusion`. Ya superado por `provision-demo-users.js`.
- **`backend/scripts/sync-neon.js`** (534 B): Fuerza `process.env.NODE_ENV = 'production'` y ejecuta `db.sequelize.sync({ alter: true })` contra `DATABASE_URL` (peligroso en entornos con migraciones controladas por Sequelize CLI).
- **`backend/src/scripts/seed-supervisor-extrusion.js`** (250 B): Ya está desactivado internamente (`process.exitCode = 1` con mensaje que redirige a `provision-demo-users.js`). Candidato directo a `git rm`.
- **`backend/src/scripts/update-models.js`** (1,858 B): Script de parcheo único que inyectó `GloboSpecification` y `LaminadoSpecification` en `database/models/index.js` (cambio ya aplicado en `index.js` líneas 987-1002). Candidato directo a `git rm`.

---

### G4. Migraciones Duplicadas en `backend/src/database/legacy/` (6 archivos)

| Archivo en `backend/src/database/legacy/` | Copia Exacta en `backend/src/database/migrations/` | Tamaño (B) | Hash SHA-256 (Idéntico en ambos) |
|---|---|---:|---|
| `20260707050000-create-material-categories.js` | `20260707050000-create-material-categories.js` | 1,838 | `42900619343e797456cb55d507bedf561592c2d23a6945b9c3d7f530926a6b61` |
| `20260707050100-create-materials.js` | `20260707050100-create-materials.js` | 3,155 | `7cd6ff4f769233650f60bed77cff253f0f304684dee887bbbc90383a332ac256` |
| `20260707060000-create-material-stocks.js` | `20260707060000-create-material-stocks.js` | 2,175 | `1a5873c954e87fd6a4fb6569339ac7fd21b149393473e44a6f03d5f81ff` |
| `20260707060100-create-material-lots.js` | `20260707060100-create-material-lots.js` | 3,174 | `4c8afc4a929d60ff096c857e0ec943211ca8c0f18d9d5e546170e68952bdafd3` |
| `20260707060200-create-material-stock-movements.js` | `20260707060200-create-material-stock-movements.js` | 3,416 | `5303b57eee77e454c445663995e1507b741757cc36329e9eb53e8de45027030d` |
| `20260727000000-update-materials-catalog.js` | `20260727000000-update-materials-catalog.js` | 3,359 | `acb0cc3625822c6aaaa6d637c4326e85101165b108b4b76d18d790f1ed71bfca` |

- **Verificación**: `backend/.sequelizerc` apunta exclusivamente a `src/database/migrations`. Ningún archivo del proyecto importa `src/database/legacy`. Se conservaron en esta fase únicamente por estar rastreados en Git (`TRACKED_CLEAN`); deben eliminarse con `git rm -r backend/src/database/legacy`.

---

### G5, G6 y G7. Artefactos Generados, Logs, Imágenes Temporales y Respaldos de Base de Datos

| Archivo / Directorio | Tamaño (B) | Estado Git | Motivo de Conservación Temporal y Acción Requerida |
|---|---:|---|---|
| `frontend/vite.config.js.timestamp-1793046890367-5c51820afde588.mjs` | 3,159 | `TRACKED_CLEAN` | Artefacto temporal de Vite con sourcemap local (`C:\Users\maicr\...`). Rastreado en Git: eliminar con `git rm` y añadir `*.timestamp-*.mjs` a `.gitignore`. |
| `backend/error_log.txt` | 17,558,090 | `MODIFIED` (`M`) | Log generado por `error.middleware.js`. Tiene cambios locales en `git status`. Ejecutar `git checkout -- backend/error_log.txt && git rm --cached backend/error_log.txt` y añadir `*error_log.txt` a `.gitignore`. |
| `error_log.txt` (raíz) | 1,476 | `TRACKED_CLEAN` | Log generado en raíz por `error.middleware.js`. Eliminar con `git rm error_log.txt`. |
| `backend/validation_error.txt` | 91 | `TRACKED_CLEAN` | Archivo escrito en cada error 400 por `validation.middleware.js`. Eliminar con `git rm --cached backend/validation_error.txt` y añadir a `.gitignore`. |
| `backend/test-label.pdf` | 6,514 | `MODIFIED` (`M`) | PDF de etiqueta generado por pruebas y modificado en el árbol actual. Descartar cambio y dejar de rastrear con `git rm --cached`. |
| `backend/test-artifacts/WIP-extrusion-QR-hijos-local.pdf` | 79,017 | `TRACKED_CLEAN` | Evidencia PDF generada en prueba local de QR hijos. Evaluar si se mueve a documentación o se elimina con `git rm`. |
| `tmp/pdfs/*.png` (14 archivos) | 1,443,319 | `TRACKED_CLEAN` | Páginas PNG rasterizadas de los PDFs de fórmulas de Extrusión (cuyos originales ya existen en `docs/Extrusión/`). Eliminar con `git rm -r tmp/pdfs` e ignorar `tmp/`. |
| `.audit-telares/*.png` (2 archivos) | 611,852 | `TRACKED_CLEAN` | Páginas PNG rasterizadas de diagramas de flujo de Telares y Extrusión 2 (originales en `docs/`). Eliminar con `git rm -r .audit-telares`. |
| `screenshots/usability/movil-login-390x844.png` | 20,870 | `TRACKED_CLEAN` | Captura de pantalla de login móvil. Evaluar con el equipo de UX o eliminar con `git rm -r screenshots`. |
| `img/Extrusion.jpeg` y `img/Telares.jpeg` | 138,609 | `TRACKED_CLEAN` | Fotografías/imágenes de referencia en raíz (`0` referencias desde `frontend/`). Evaluar con producto antes de remover del repositorio. |
| `backend/master_data_dump.sql` | 430,755 | `TRACKED_CLEAN` | Dump SQL generado por `backend/generate_dump.js`. Rastreado en Git pese a `*.sql` en `.gitignore`. Ejecutar `git rm --cached backend/master_data_dump.sql`. |
| `backend/backup_neon_pre_cleanup.sql` | 688,363 | `IGNORED` | Respaldo SQL local de Neon (15 oct 2026). **Conservado por seguridad de datos**. Mover a almacenamiento seguro externo. |
| `backend/backup_pre_cleanup_production.sql` | 1,596,967 | `IGNORED` | Respaldo SQL local de Producción (15 oct 2026). **Conservado por seguridad de datos**. Mover a almacenamiento seguro externo. |
| `backend/tmp/pre-extrusion-cleanup-20261122.dump` | 2,264,757 | `UNTRACKED` | Respaldo binario `pg_dump` del 22 nov 2026. **Conservado por seguridad de datos**. Añadir `*.dump` y `backend/tmp/` a `.gitignore`. |
| `backend/catalog_dump.json` | 167,741 | `IGNORED` | Exportación JSON consumida por `backend/generate-catalog-seeder.js`. Ignorado correctamente en `.gitignore`. Conservar localmente si se regeneran seeders. |
