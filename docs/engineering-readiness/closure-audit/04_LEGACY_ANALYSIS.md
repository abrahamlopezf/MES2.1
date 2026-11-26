# 04 — INVESTIGACIÓN PRIORITARIA DE CARPETAS Y ARCHIVOS LEGACY (FASE D)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Investigación:** 2026-11-25  

---

## 1. Verificación Independiente de `frontend/src/legacy-ui-archive/`

### 1.1 Hallazgo Principal (Corrección de Inexactitud Documental Previa)
El documento anterior `docs/engineering-readiness/09_DEPENDENCY_MAP.md` mencionó que los 59 imports no resueltos pertenecían a una carpeta denominada `frontend/src/legacy-ui-archive/`.

Al ejecutar una verificación independiente en el sistema de archivos, en el índice de Git (`git ls-files`), en el historial de commits (`git log --stat`) y en la totalidad de archivos de configuración (`vite.config.js`, `tsconfig.json`, `package.json`, `router.jsx`):

1. **La ruta `frontend/src/legacy-ui-archive/` NO existe físicamente en el repositorio ni en `git ls-files`** (`legacyUiFileCount: 0`, `externalReferencesToLegacyUi: []`).
2. Ese nombre fue una **etiqueta conceptual errónea** utilizada al resumir el documento `docs/audit/03_MAPA_DE_DEPENDENCIAS.md` (Sección 5), donde los 59 imports no resueltos estaban distribuidos en realidad entre:
   - `22` imports en scripts `.codex-*.cjs` en la raíz del proyecto,
   - `13` imports en scripts generadores/parches de `backend/` (`generate_catalogs.js`, `generate_seeders_from_text.js`, `update-models.js`),
   - `5` imports en rutas de `backend/src/modules/catalogs/`,
   - `3` imports comentados en `frontend/src/core/api/apiClient.ts`, y
   - `16` imports en archivos huérfanos de capas DDD incompletas dentro de `frontend/src/modules/{identity,production,warehouse,catalogs}` y `frontend/src/design-system/components/scanner-overlay/ScannerOverlay.jsx`.

---

## 2. Auditoría Exhaustiva de Todas las Carpetas Legacy, Temporales y Huérfanas Reales del Repositorio

Se aplicó el protocolo completo de la **Fase D** (verificación de imports estáticos, dinámicos, alias `@/*`, React Router, Vite, TypeScript, tests, CSS, scripts, workflows y carga indirecta) sobre todas las carpetas legacy, temporales o con código histórico reales del repositorio:

| # | Carpeta / Subsistema Analizado | Archivos | Tamaño (Bytes) | Referencias Externas Activas | Contiene Lógica o Diseño Único Necesario | Acción Ejecutada en Fase D / F |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | `backend/src/database/legacy/` | `6` | `17,117` | **`0`** (`backend/.sequelizerc` apunta exclusivamente a `src/database/migrations`) | **No.** Las 6 migraciones (`20260707050000` a `20260727000000`) son copias **100% idénticas byte por byte (mismo SHA-256)** de las 6 migraciones homónimas existentes en `backend/src/database/migrations/`. | ✅ **Respaldada en `closure_cleanup_vault` y ELIMINADA físicamente (archivos + directorio).** |
| **2** | `tmp/` y `tmp/pdfs/` (raíz) | `14` | `1,443,319` | **`0`** en código, tests, CSS, HTML o workflows | **No.** Son capturas PNG temporales rasterizadas a partir de los PDFs de fórmulas de Extrusión cuyos documentos originales siguen intactos en `docs/Extrusión/`. | ✅ **Respaldada en `closure_cleanup_vault` y ELIMINADA físicamente (14 archivos + 2 directorios).** |
| **3** | `.audit-telares/` (raíz) | `2` | `611,852` | **`0`** en código, tests, CSS, HTML o workflows | **No.** Son 2 imágenes PNG rasterizadas temporalmente (`flujo-banda-1.png` y `flujo-ext2-1.png`) de diagramas cuyos PDFs originales permanecen en `docs/`. | ✅ **Respaldada en `closure_cleanup_vault` y ELIMINADA físicamente (2 archivos + 1 directorio).** |
| **4** | Directorios vacíos (`backend/src/shared/builders`, `backend/src/shared/constants`, `frontend/src/modules/qrcodes/pages`) | `0` | `0` | **`0`** | **No.** Carpetas vacías remanentes de iteraciones previas. | ✅ **ELIMINADOS los 3 directorios vacíos.** |
| **5** | Módulos backend no montados en `routes/index.js`: `backend/src/modules/intermediate/` (`7`), `processes/` (`12`), `scrap/` (`21`), `waste/` (`1`), `catalogs/storageLocation*` (`6`), `catalogs/warehouse` (`2`) | `49` | `~142,000` | Parciales: varios de sus modelos (`ScrapContainer`, `ScrapMovement`, `ProcessRun`, `IntermediateMaterial`) **SÍ están registrados dentro de los 77 modelos de `backend/src/database/models/index.js`** | **Sí (Acoplamiento con `database/models/index.js`).** Eliminar estos archivos sin modificar simultáneamente `backend/src/database/models/index.js` rompería el arranque del ORM y el contrato de los 77 modelos. | 🛡️ **CONSERVADOS en `FILES_PENDING_REVIEW.md`** (Su desacoplamiento requiere editar `database/models/index.js` durante la Refactorización MVC). |
| **6** | Capas DDD huérfanas y pantallas no montadas en `frontend/src/modules/` y `frontend/src/components/layout/` (`82` archivos huérfanos en `frontend/src/`) | `82` | `~170,400` | **`0`** desde `frontend/src/main.jsx` y `frontend/src/app/router.jsx` (verificado con `vite build`), pero residen dentro de carpetas de módulos funcionales activos (`modules/identity`, `modules/production`, `modules/warehouse`, `design-system`). | **Parcial.** Contienen contratos de dominio TypeScript (`AggregateRoot`, `DomainPorts`, `ValueObjects`, `QualityStationScreen`, `FinancialDashboard`) cuya adopción o descarte corresponde a la definición de arquitectura frontend. | 🛡️ **CONSERVADOS en `FILES_PENDING_REVIEW.md`** en cumplimiento de la Restricción #2 ("No modificar código fuente funcional") y la directiva de Fase D ("Si persiste cualquier duda, conserva únicamente los elementos cuya retirada no pueda certificarse y documenta el motivo"). |

---

## 3. Detalle de la Carpeta Legacy Retirada: `backend/src/database/legacy/`

Antes de retirar `backend/src/database/legacy/`, se comprobó matemáticamente que cada uno de sus 6 archivos tenía una copia idéntica en `backend/src/database/migrations/`:

| # | Archivo Retirado en `backend/src/database/legacy/` | Archivo Activo Conservado en `backend/src/database/migrations/` | Tamaño (Bytes) | Hash SHA-256 (Idéntico en Ambos) |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `20260707050000-create-material-categories.js` | `20260707050000-create-material-categories.js` | `1,838` | `42900619343e797456cb55d507bedf561592c2d23a6945b9c3d7f530926a6b61` |
| 2 | `20260707050100-create-materials.js` | `20260707050100-create-materials.js` | `3,155` | `7cd6ff4f769233650f60bed77cff253f0f304684dee887bbbc90383a332ac256` |
| 3 | `20260707060000-create-material-stocks.js` | `20260707060000-create-material-stocks.js` | `2,175` | `1a5873c954e87fd6a4fb6569339ac7fd21b149393473e44a6f03d5f81ffa0cf5` |
| 4 | `20260707060100-create-material-lots.js` | `20260707060100-create-material-lots.js` | `3,174` | `4c8afc4a929d60ff096c857e0ec943211ca8c0f18d9d5e546170e68952bdafd3` |
| 5 | `20260707060200-create-material-stock-movements.js` | `20260707060200-create-material-stock-movements.js` | `3,416` | `5303b57eee77e454c445663995e1507b741757cc36329e9eb53e8de45027030d` |
| 6 | `20260727000000-update-materials-catalog.js` | `20260727000000-update-materials-catalog.js` | `3,359` | `acb0cc3625822c6aaaa6d637c4326e85101165b108b4b76d18d790f1ed71bfca` |
