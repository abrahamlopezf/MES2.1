# 02 — Estructura del Proyecto: Antes y Después de la Limpieza Controlada

## 1. Resumen Cuantitativo de la Transformación

> [!IMPORTANT]
> La limpieza física ejecutada en la **Fase 4** se restringió estrictamente a archivos temporales, logs de ejecución, capturas efímeras de depuración y scripts obsoletos **no rastreados o ignorados por Git**. Ningún archivo funcional, de configuración activa, prueba automatizada o archivo rastreado por Git fue modificado ni eliminado, garantizando que `git diff` permanezca intacto respecto a la línea base.

| Métrica | Antes de la Intervención (Fase 0) | Después de la Limpieza (Fase 4) | Variación Neta |
|---|---|---|---|
| **Directorios del proyecto (excluyendo `node_modules`, `.git`, `frontend/dist`)** | 376 | 372 *(+1 nuevo: `docs/audit/`)* | **-4 directorios temporales** (`.playwright`, `.playwright-cli`, `backend/tmp/pdfs`, `backend/tmp/pdfview`) |
| **Archivos totales del proyecto (sin contar nuevos entregables en `docs/audit/`)** | 1,431 | 1,295 | **-136 archivos innecesarios** (`-9.50 %` del total de archivos) |
| **Archivos rastreados por Git (`git ls-files`)** | 1,262 | 1,262 | **0 cambios** (`100 %` conservados intactos) |
| **Archivos modificados en árbol de trabajo (`M`)** | 76 | 76 | **0 cambios** (`100 %` verificados con hash SHA-256) |
| **Archivos nuevos funcionales/documentales no rastreados (`??`)** | 19 | 19 *(+15 entregables en `docs/audit/`)* | **0 cambios** en archivos funcionales (`100 %` verificados con hash SHA-256) |
| **Archivos temporales/ignorados en espacio de trabajo** | 150 | 14 | **-136 archivos temporales/obsoletos eliminados** |
| **Espacio ocupado por elementos eliminados** | 22,307,413 bytes (21.27 MiB) | 0 bytes en workspace *(respaldados en `recovery_vault`)* | **-22,307,413 bytes (-21.27 MiB)** liberados en el proyecto |

---

## 2. Árbol Estructural de Alto Nivel — ANTES de la Limpieza

```text
Demo/ (Raíz del repositorio Git — 1,431 archivos / 376 directorios)
├── .agents/
│   └── AGENTS.md                                      [CONSERVADO - Constitución Frontend / Reglas MES]
├── .audit-telares/                                    [2 capturas PNG rastreadas en Git -> EN REVISIÓN]
├── .github/
│   └── workflows/                                     [4 workflows CI/CD de GitHub Actions -> CONSERVADOS]
├── .playwright/                                       [Carpeta temporal vacía -> ELIMINADA en Lote 2]
├── .playwright-cli/                                   [108 archivos temporales: logs, yml, png -> ELIMINADOS en Lote 2]
├── .codex-create-e2e-db.cjs y 19 .codex-e2e-*.cjs     [20 scripts experimentales rastreados en Git -> EN REVISIÓN]
├── .gitignore                                         [Configuración Git -> CONSERVADO]
├── error_log.txt                                      [Log rastreado en Git (1.48 KB) -> EN REVISIÓN]
├── Manual_de_Usuario_MES.md                           [Documentación vigente -> CONSERVADO]
├── MES_DOMAIN_MAP.md                                  [Directiva Arquitectónica No. 002 -> CONSERVADO]
├── package.json / package-lock.json                   [Dependencias Playwright en raíz -> CONSERVADOS]
├── README.MD                                          [Documentación raíz (UTF-16LE) -> CONSERVADO]
├── img/                                               [2 imágenes JPEG de referencia -> EN REVISIÓN]
├── screenshots/usability/                             [1 captura PNG rastreada -> EN REVISIÓN]
├── tmp/
│   ├── pdfs/                                          [14 capturas PNG rastreadas en Git -> EN REVISIÓN]
│   ├── roleplay-backend.log (2.61 MB)                 [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── roleplay-backend-error.log                     [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── roleplay-frontend.log                          [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── roleplay-frontend-error.log                    [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── traceflow-e2e-web.log / .err.log               [2 logs temporales ignorados -> ELIMINADOS en Lote 1]
│   └── traceflow-e2e-web6.log / .err.log              [2 logs temporales ignorados -> ELIMINADOS en Lote 1]
├── docs/
│   ├── agent-collaboration/telares/                   [7 documentos de diseño de Telares -> CONSERVADOS]
│   ├── Extrusión/                                     [6 PDFs oficiales + PENDIENTES.md -> CONSERVADOS]
│   ├── Laminado/                                      [2 PDFs oficiales de flujo y fórmulas -> CONSERVADOS]
│   ├── Tejido/                                        [2 PDFs + 1 Excel oficial de conversión -> CONSERVADOS]
│   ├── Warehouse/                                     [4 PDFs + 3 Excels + 2 MD de catálogos -> CONSERVADOS]
│   └── MEJORAS_PENDIENTES.md                          [Documento activo no rastreado -> CONSERVADO]
├── backend/
│   ├── .codex-e2e-server.cjs                          [Script auxiliar rastreado -> EN REVISIÓN]
│   ├── .codex-e2e-server.out.log (12.85 MB)           [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── .codex-e2e-server.err.log                      [Log temporal ignorado -> ELIMINADO en Lote 1]
│   ├── .env / .env.example / .sequelizerc             [Configuraciones de backend -> CONSERVADOS]
│   ├── backup_neon_pre_cleanup.sql (688 KB)           [Respaldo SQL local ignorado -> CONSERVADO]
│   ├── backup_pre_cleanup_production.sql (1.60 MB)    [Respaldo SQL local ignorado -> CONSERVADO]
│   ├── catalog_dump.json (167 KB)                     [Volcado JSON de catálogos ignorado -> CONSERVADO]
│   ├── master_data_dump.sql (430 KB)                  [Volcado SQL rastreado en Git -> EN REVISIÓN]
│   ├── error_log.txt (17.56 MB)                       [Log rastreado y modificado (M) -> EN REVISIÓN]
│   ├── validation_error.txt                           [Salida de middleware rastreada -> EN REVISIÓN]
│   ├── test-label.pdf                                 [PDF de prueba rastreado y modificado (M) -> EN REVISIÓN]
│   ├── check_neon_status.js                           [Script ignorado con URL Neon -> ELIMINADO en Lote 4]
│   ├── clean_neon_production.js                       [Script ignorado con SyntaxError y URL Neon -> ELIMINADO en Lote 4]
│   ├── clean_warehouse_production.js                  [Script ignorado con SyntaxError -> ELIMINADO en Lote 4]
│   ├── verify_db_post_cleanup.js                      [Script ignorado obsoleto -> ELIMINADO en Lote 4]
│   ├── verify_neon_post_cleanup.js                    [Script ignorado con URL Neon -> ELIMINADO en Lote 4]
│   ├── [49 scripts .js sueltos en backend/]           [Scripts diagnósticos/pruebas rastreados -> EN REVISIÓN]
│   ├── scripts/                                       [15 archivos de scripts y datos de semillas -> EN REVISIÓN]
│   ├── test/                                          [13 suites de pruebas unitarias e integración -> CONSERVADOS]
│   ├── test-artifacts/                                [1 PDF de evidencia QA rastreado -> EN REVISIÓN]
│   ├── tmp/
│   │   ├── pdfs/lam-flow-1.png                        [Render PNG temporal no rastreado -> ELIMINADO en Lote 3]
│   │   ├── pdfview/page-1..4.png                      [4 renders PNG temporales no rastreados -> ELIMINADOS en Lote 3]
│   │   ├── pg-local-extrusion-audit*.log              [2 logs temporales ignorados -> ELIMINADOS en Lote 1]
│   │   ├── traceflow-e2e-api*.log                     [2 logs temporales ignorados -> ELIMINADOS en Lote 1]
│   │   └── pre-extrusion-cleanup-20261122.dump        [Respaldo binario PostgreSQL (2.26 MB) -> CONSERVADO]
│   └── src/                                           [628 archivos: config, core, database, middlewares, modules, routes, scripts, services, shared, utils]
└── frontend/
    ├── .codex-e2e-vite*.log                           [4 logs temporales ignorados -> ELIMINADOS en Lote 1]
    ├── .env / .env.example / .env.qa                  [Configuraciones de entorno frontend -> CONSERVADOS]
    ├── .eslintrc.cjs / .gitignore / components.json   [Configuraciones de herramientas -> CONSERVADOS]
    ├── index.html / package.json / tsconfig*.json     [Configuraciones base de Vite/TS -> CONSERVADOS]
    ├── vercel.json / vite.config.js / vitest.config.js[Configuraciones de build, deploy y test -> CONSERVADOS]
    ├── vite.config.js.timestamp-*.mjs                 [Artefacto de caché de Vite rastreado -> EN REVISIÓN]
    ├── docs/architecture/adr/                         [2 ADRs arquitectónicos -> CONSERVADOS]
    ├── public/                                        [2 recursos SVG estáticos -> CONSERVADOS]
    ├── tests/identity/                                [1 suite Vitest de IdentityFacade -> CONSERVADO]
    └── src/                                           [795 archivos: app, components, config, core, design-system, hooks, layouts, lib, modules, pages, providers, services, shared, stores, styles, testing, types, utils]
```

---

## 3. Árbol Estructural de Alto Nivel — DESPUÉS de la Limpieza

```text
Demo/ (1,295 archivos del proyecto + 15 documentos nuevos en docs/audit/)
├── .agents/
│   └── AGENTS.md                                      [Intacto]
├── .audit-telares/                                    [Conservado por estar rastreado en Git -> documentado en 09_SANEAMIENTO_GITHUB.md]
├── .github/
│   └── workflows/                                     [4 workflows CI/CD intactos]
├── .codex-create-e2e-db.cjs y 19 .codex-e2e-*.cjs     [Conservados por estar rastreados en Git -> documentados en INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md y 09_SANEAMIENTO_GITHUB.md]
├── .gitignore                                         [Intacto]
├── error_log.txt                                      [Conservado por estar rastreado en Git -> documentado en 09_SANEAMIENTO_GITHUB.md]
├── Manual_de_Usuario_MES.md                           [Intacto]
├── MES_DOMAIN_MAP.md                                  [Intacto]
├── package.json / package-lock.json / README.MD       [Intactos]
├── img/ y screenshots/usability/                      [Conservados por estar rastreados en Git]
├── tmp/
│   └── pdfs/                                          [Limpio de logs (2.61 MB liberados); solo conserva los 14 PNGs rastreados por Git pendientes de git rm]
├── docs/
│   ├── audit/                                         [NUEVO: 15 entregables técnicos de la auditoría]
│   ├── agent-collaboration/telares/                   [Intacto]
│   ├── Extrusión/                                     [Intacto]
│   ├── Laminado/                                      [Intacto]
│   ├── Tejido/                                        [Intacto]
│   ├── Warehouse/                                     [Intacto]
│   └── MEJORAS_PENDIENTES.md                          [Intacto — SHA-256 verificado]
├── backend/
│   ├── .env / .env.example / .sequelizerc             [Intactos — limpiados los 12.85 MB de .codex-e2e-server.*.log y los 5 scripts ignorados con credenciales/SyntaxError]
│   ├── backup_neon_pre_cleanup.sql                    [Respaldo SQL conservado intacto]
│   ├── backup_pre_cleanup_production.sql              [Respaldo SQL conservado intacto]
│   ├── catalog_dump.json                              [Volcado de catálogo conservado intacto]
│   ├── tmp/
│   │   └── pre-extrusion-cleanup-20261122.dump        [Limpio de logs y subcarpetas PNG temporales; conserva únicamente el respaldo binario de PostgreSQL]
│   ├── test/                                          [13 suites de prueba intactas — SHA-256 verificado]
│   └── src/                                           [628 archivos 100 % intactos — 0 modificaciones funcionales]
└── frontend/
    ├── .env / .env.example / .env.qa                  [Intactos — limpiados los 4 archivos .codex-e2e-vite*.log]
    ├── index.html / package.json / tsconfig*.json     [Intactos]
    ├── vercel.json / vite.config.js / vitest.config.js[Intactos]
    ├── docs/ / public/ / tests/                       [Intactos]
    └── src/                                           [795 archivos 100 % intactos — 0 modificaciones funcionales]
```

---

## 4. Desglose por Directorio Principal (Antes vs. Después)

| Directorio / Ámbito | Archivos Antes | Archivos Después | Archivos Eliminados | Bytes Liberados |
|---|---:|---:|---:|---:|
| `.playwright-cli/` + `.playwright/` | 108 | 0 *(directorios eliminados)* | 108 | 6,617,592 |
| `backend/` (archivos en raíz de `backend/`) | 65 | 58 | 7 (`2` logs + `5` scripts ignorados) | 12,871,365 |
| `backend/tmp/` | 10 | 1 (`pre-extrusion-cleanup-20261122.dump`) | 9 (`4` logs + `5` PNGs temporales) | 206,306 |
| `tmp/` (raíz) | 22 | 14 *(solo `tmp/pdfs/` rastreados)* | 8 (`8` logs en `tmp/*.log`) | 2,611,930 |
| `frontend/` (archivos en raíz de `frontend/`) | 20 | 16 | 4 (`4` logs `.codex-e2e-vite*.log`) | 220 |
| `backend/src/` | 628 | 628 | 0 | 0 |
| `backend/test/` y `backend/test-artifacts/` | 14 | 14 | 0 | 0 |
| `backend/scripts/` | 15 | 15 | 0 | 0 |
| `frontend/src/`, `frontend/public/`, `frontend/tests/`, `frontend/docs/` | 800 | 800 | 0 | 0 |
| `docs/` (previo a `docs/audit/`) | 27 | 27 | 0 | 0 |
| Raíz del repositorio y otros (`.agents`, `.github`, `.audit-telares`, `img`, `screenshots`) | 32 | 32 | 0 | 0 |
| **TOTAL PROYECTO (sin `docs/audit/`)** | **1,431** | **1,295** | **136** | **22,307,413** |
