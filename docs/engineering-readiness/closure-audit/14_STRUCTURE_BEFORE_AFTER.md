# 14 — ESTRUCTURA DEL PROYECTO ANTES Y DESPUÉS DEL SANEAMIENTO DEFINITIVO

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-25  

---

## 1. Tabla Comparativa Cuantitativa (Línea Base Original vs. Pre-Cierre vs. Post-Cierre Definitivo)

| Métrica Estructural y de Calidad | Línea Base Inicial (Auditoría #1 Fase 0) | Antes de esta Fase de Cierre (Tras Intervención #2) | Después de esta Fase de Cierre (Estado Actual) | Metodología de Medición |
| :--- | :---: | :---: | :---: | :--- |
| **Archivos totales en workspace** *(excluyendo `.git`, `node_modules`, `dist` y docs de auditoría generados)* | `1,431` | `1,304` *(1,295 + 9 archivos nuevos de blindaje)* | **`1,188`** *(1,257 incluyendo todos los docs de `audit/`, `qa/` y `engineering-readiness/`)* | Recorrido recursivo determinista con `fs.readdirSync` en `closure_audit_analyzer.js`. |
| **Carpetas totales en workspace** *(excluyendo `.git`, `node_modules`, `dist`)* | `376` | `378` *(372 + carpetas de docs)* | **`372`** *(incluyendo `closure-audit/`; **`-7` carpetas innecesarias eliminadas en Fase F** y **`-4` en Etapa 1 = `-11` carpetas eliminadas**)* | Conteo recursivo de directorios en `closure_audit_analyzer.js`. |
| **Archivos funcionales y de configuración/pruebas/docs activos** | `1,003` | `1,012` | **`1,012`** (`100%` conservados) | Cruce contra grafo de dependencias de `server.js`, `main.jsx`, `database/models/index.js` y workflows. |
| **Archivos experimentales, temporales y obsoletos en el árbol** | `278` | `151` | **`35`** (`13` en `backend/scripts/`, `21` en `backend/src/scripts/` y `1` `generate-catalog-seeder.js`, todos documentados en `FILES_PENDING_REVIEW.md`) | Clasificación individual verificada por contenido y referencias entrantes. |
| **Archivos eliminados físicamente** | `0` | `136` *(Etapa 1)* | **`252` acumulados (`136` en Etapa 1 + `116` en esta Fase de Cierre)** | Bitácoras `docs/audit/04_ARCHIVOS_ELIMINADOS.md` y `closure-audit/FILES_REMOVED.md` + manifiestos SHA-256. |
| **Carpetas eliminadas físicamente** | `0` | `4` *(Etapa 1)* | **`11` acumuladas (`4` en Etapa 1 + `7` en esta Fase de Cierre)** | Verificación en disco y registro en `closure_cleanup_vault/manifest.json`. |
| **Archivos conservados por seguridad / trabajo concurrente (`76 M` + `19 ??`)** | `95` | `95` | **`95`** (`100%` conservados; incluye las mejoras concurrentes de Codex) | Comparación triple de hashes SHA-256 contra `pending_work_baseline.json` y `readiness_recovery_vault`. |
| **Archivos pendientes de revisión (`FILES_PENDING_REVIEW.md`)** | `264` | `264` | **`184`** (`13` en `backend/scripts/`, `21` en `src/scripts/`, `2` seeder generator, `5` dumps/sql, `5` logs/pdfs runtime, `4` img/env.qa, `46` huérfanos backend, `82` huérfanos frontend) | Inventario individual en `FILES_PENDING_REVIEW.md` (`116` archivos salieron de pendiente al ser retirados en Fase F). |
| **Espacio liberado en el repositorio** | `0 B` | `22,307,413 B` (`21.27 MiB`) | **`24,548,645 B` (`23.41 MiB`) acumulados** (`+2,241,232 B` / `2.14 MiB` liberados en esta Fase de Cierre) | Suma exacta de `stat.size` en `recovery_vault` y `closure_cleanup_vault`. |
| **Imports no resueltos en el repositorio** | `59` | `59` | **`24` (`-35` imports rotos eliminados = `-59.3%`)** | Escáner estático de `require()` / `import` en `03_DEPENDENCY_ANALYSIS.md`. |
| **Conexiones directas a BD sin `dbGuard.js` (ejecutables)** | `33` | `30` ejecutables + `3` bloqueados | **`0` ejecutables** (`30` eliminados físicamente + `3` bloqueados en línea inicial con `throw new Error('[SECURITY_BLOCK]')`) | Escáner de `new Sequelize` y `new Client/Pool` en `closure_audit_analyzer.js`. |
| **Suites de pruebas automatizadas totales** | `31` (`14` unit BE + `6` int BE + `11` FE) | `33` (`+2` suites: `envIsolationGuard` y `characterization.contracts`) | **`33` suites (`132` casos de prueba totales: `95` unit/caract BE + `6` int BE + `31` FE)** | Ejecución real de `node --test` y `vitest --run`. |
| **Pruebas aprobadas (`PASS`)** | `103` (`72` BE + `31` FE) | `125` (`90` unit BE + `4` int BE + `31` FE) | **`127` (`92` unit/caract BE + `4` int BE + `31` FE)** | Conteo directo de `node:test` y `vitest --run`. |
| **Pruebas fallidas (`FAIL`)** | `3` (Telares unit) | `4` (`3` Telares unit + `1` Corte-Laminado int) | **`4` (`3` Telares unit `QA-TEL-ROUTE-001` + `1` Corte-Laminado int línea 71)** | Ejecución directa sin alterar tests. |
| **Pruebas omitidas (`SKIP`)** | `6` (integración local no corrida) | `1` (`extrusionFloor` por cola activa en EXT-4) | **`1` (`extrusionFloor.local.integration.test.js` cuando se corre con `RUN_*=1`; `6` si se corre sin flags `RUN_*=1`)** | Ejecución con flags `RUN_*=1` contra `sistema_enterprise_test`. |
| **Secretos literales detectados en contenido de archivos** | `12` scripts con credenciales | `0` en contenido | **`0` secretos literales en contenido (`1,180` archivos escaneados)** + `4` avisos de artefactos rastreados en `git ls-files` (`TRACKED_SENSITIVE_ARTIFACT`) | Ejecución de `node backend/src/scripts/security-check.js`. |
| **Estado de Master Data (`30` tablas / `2,928` filas)** | No verificada por hash | `SHA-256: 36db9b70...e241` | **`100% ÍNTEGRA (`2,928` filas, `SHA-256: 36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` en Dev y Test)** | Ejecución en vivo de `master-data-fingerprint.js`. |

---

## 2. Comparación Visual de la Estructura de Directorios (Antes vs. Después de la Fase F)

### 2.1 Elementos Eliminados de la Raíz y de `backend/` en esta Fase de Cierre

```diff
 Demo/ (Raíz del repositorio)
 ├── .agents/AGENTS.md
-├── .audit-telares/                                    [ELIMINADO EN LOTE F1: 2 PNGs temporales + carpeta]
-│   ├── flujo-banda-1.png
-│   └── flujo-ext2-1.png
-├── .codex-create-e2e-db.cjs                           [ELIMINADO EN LOTE F2: 20 scripts .codex-*.cjs en raíz]
-├── .codex-e2e-aftermix.cjs ... .codex-e2e-wipqr.cjs
-├── tmp/                                               [ELIMINADO EN LOTE F1: 14 PNGs temporales + carpetas tmp/pdfs y tmp]
-│   └── pdfs/ext1-1.png ... general-contact.png
 ├── backend/
-│   ├── .codex-e2e-server.cjs                          [ELIMINADO EN LOTE F2]
-│   ├── assign_perm.js ... verify_materials3.js        [ELIMINADOS EN LOTE F3: 70 scripts ad-hoc sueltos en backend/]
 │   ├── generate-catalog-seeder.js                     [CONSERVADO: regenera seeder oficial desde catalog_dump.json]
 │   └── src/
 │       ├── database/
-│       │   ├── legacy/                                [ELIMINADO EN LOTE F1: 6 migraciones duplicadas + carpeta]
 │       │   ├── migrations/                            [168 archivos intactos]
 │       │   ├── models/                                [77 modelos intactos]
 │       │   └── seeders/                               [Intactos]
 │       ├── scripts/
-│       │   ├── seed-supervisor-extrusion.js           [ELIMINADO EN LOTE F4: script desactivado]
-│       │   ├── update-models.js                       [ELIMINADO EN LOTE F4: parche único con 4 imports rotos]
 │       │   └── [7 scripts activos CI/CD & guardas + 21 históricos documentados en TESTS_CONSOLIDATED.md]
 │       └── shared/
-│           ├── builders/                              [ELIMINADO EN FASE F: directorio vacío]
-│           └── constants/                             [ELIMINADO EN FASE F: directorio vacío]
 └── frontend/
-    ├── vite.config.js.timestamp-1793046890367-*.mjs   [ELIMINADO EN LOTE F1: caché temporal de Vite]
     └── src/
         └── modules/qrcodes/
-            └── pages/                                 [ELIMINADO EN FASE F: directorio vacío]
```
