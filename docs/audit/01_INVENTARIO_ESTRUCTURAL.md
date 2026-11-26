# 01 — Inventario Estructural y Diagnóstico Inicial (Fases 0 y 1)

## 1. Identificación de la Raíz y Aplicaciones del Repositorio

- **Raíz real del repositorio Git**: `c:\Users\maicr\OneDrive\Desktop\Demo`
- **Remoto configurado**: `origin` $\rightarrow$ `https://github.com/abrahamlopezf/MES2.1.git`
- **Rama activa**: `main` (commit `9321f41 ExceptionShift`, alineada con `origin/main`)
- **Arquitectura multi-paquete en monorrepo**:
  1. **Raíz (`./package.json`)**: Paquete privado auxiliar que declara únicamente `@playwright/cli` (`^0.1.23`) y `@playwright/test` (`^1.64.1`) para pruebas e inspección de navegador.
  2. **Backend (`./backend/package.json` — `Demo-Backend v1.0.0`)**: API RESTful en Node.js (CommonJS), Express `^5.2.1`, Sequelize `^6.37.8` y PostgreSQL (`pg ^8.22.0`).
  3. **Frontend (`./frontend/package.json` — `frontend v0.0.0`)**: Single Page Application (SPA) en React `^19.2.7`, Vite `^5.2.0` (`5.4.21` instalada), TypeScript/JSX, TailwindCSS `^4.3.2`, TanStack Query `^5.101.2`, Zustand `^5.0.14` y Vitest `^1.4.0` (`1.6.1` instalada).

---

## 2. Versiones, Tecnologías, Puntos de Entrada y Comandos

### 2.1 Entorno y Herramientas Detectadas
| Componente | Versión / Tecnología | Ubicación de Evidencia |
|---|---|---|
| **Runtime Node.js** | `v24.22.3` (CI usa Node `22`) | Entorno local / `.github/workflows/*.yml` |
| **Gestor de Paquetes** | `npm 11.19.1` | `package-lock.json`, `backend/package-lock.json`, `frontend/package-lock.json` |
| **Control de Versiones** | `git version 2.56.1.windows.1` | `.git/` |
| **Servidor HTTP Backend** | Express `^5.2.1`, Helmet `^8.2.0`, CORS `^2.8.6`, Morgan `^1.11.0` | `backend/package.json`, `backend/src/app.js` |
| **ORM y Base de Datos** | Sequelize `^6.37.8`, `sequelize-cli ^6.6.5`, `pg ^8.22.0` | `backend/package.json`, `backend/.sequelizerc` |
| **Seguridad y Criptografía** | `jsonwebtoken ^9.0.3`, `bcrypt ^6.0.0`, `crypto` nativo (AES-GCM/CBC para QR) | `backend/src/shared/utils/crypto.utils.js` |
| **Validación Backend** | `joi ^18.2.3` (11 validadores) y `zod ^4.4.3` (14 esquemas) | `backend/package.json` |
| **Generación Documental** | `pdfkit ^0.19.1`, `qrcode ^1.5.4`, `xlsx ^0.18.5` | `backend/package.json` |
| **Framework UI Frontend** | React `^19.2.7`, React Router DOM `^7.18.0`, Radix UI / Shadcn | `frontend/package.json`, `frontend/components.json` |
| **Estado y Fetching Frontend** | TanStack React Query `^5.101.2`, Axios `^1.18.1`, Zustand `^5.0.14` | `frontend/package.json` |
| **Formularios Frontend** | React Hook Form `^7.54.2`, `@hookform/resolvers ^5.4.0`, Zod `^3.24.1` | `frontend/package.json` |

### 2.2 Puntos de Entrada y Comandos Oficiales
- **Backend**:
  - Punto de entrada de servidor: `backend/src/server.js` $\rightarrow$ carga `backend/src/app.js` $\rightarrow$ monta `/api` desde `backend/src/routes/index.js` e inicializa `backend/src/database/models/index.js`.
  - Comandos (`backend/package.json`): `npm run dev` (`nodemon src/server.js`), `npm start` (`node src/server.js`), `npm run db:migrate`, `npm run db:migrate:undo`, `npm run db:seed`, `npm run db:seed:catalog`.
  - Pruebas unitarias: `node --test test/*.test.js src/database/tests/*.test.js src/modules/extrusion/services/*.test.js src/modules/warehouse/*.test.js`.
- **Frontend**:
  - Punto de entrada: `frontend/index.html` $\rightarrow$ `frontend/src/main.jsx` $\rightarrow$ `frontend/src/app/router.jsx`.
  - Comandos (`frontend/package.json`): `npm run dev` (`vite`), `npm run build` (`vite build`), `npm run lint`, `npm run preview`, `npm test` (`vitest`), `npm run coverage` (`vitest run --coverage`).

---

## 3. Resumen de Clasificación Oficial (13 Categorías — 1,431 Archivos)

| Clasificación Oficial | Acción Oficial | Cantidad de Archivos | Tamaño Total (Bytes) | % de Archivos |
|---|---|---:|---:|---:|
| **CRÍTICO** | Conservar | 196 | 856,386 | 13.70 % |
| **FUNCIONAL** | Conservar | 709 | 5,423,460 | 49.55 % |
| **CONFIGURACIÓN** | Conservar | 28 | 509,318 | 1.96 % |
| **PRUEBA ACTIVA** | Conservar | 34 | 143,874 | 2.38 % |
| **DOCUMENTACIÓN VIGENTE** | Conservar | 36 | 3,879,092 | 2.52 % |
| **GENERADO O REPRODUCIBLE** | Evaluar | 11 | 22,805,072 | 0.77 % |
| **DUPLICADO** | Investigar | 8 | 19,725 | 0.56 % |
| **EXPERIMENTAL** | Investigar | 42 | 196,607 | 2.94 % |
| **OBSOLETO** | Verificar antes de eliminar | 87 | 287,782 | 6.08 % |
| **TEMPORAL** | Verificar antes de eliminar | 17 | 2,058,330 | 1.19 % |
| **SIN REFERENCIAS APARENTES** | Investigar | 124 | 278,124 | 8.67 % |
| **INDETERMINADO** | Conservar | 3 | 159,479 | 0.21 % |
| **ELIMINACIÓN SEGURA** | Respaldar y eliminar | 136 | 22,307,413 | 9.50 % |
| **TOTAL ANALIZADO** | — | **1431** | **58,924,662** | **100.00 %** |

---

## 4. Directorios Masivos Excluidos del Análisis Individual

En cumplimiento de la Fase 1 (*"Excluye del análisis individual las dependencias instaladas y otros directorios generados masivamente, pero identifica su propósito y evalúa si están siendo rastreados incorrectamente por Git"*):

| Directorio Masivo | Propósito | ¿Rastreado por Git? | Evaluación de Higiene Git |
|---|---|---|---|
| `.git/` | Metadatos, objetos, referencias e índice interno de Git. | N/A (Núcleo Git) | Correcto. |
| `node_modules/` (raíz) | Dependencias de `@playwright/cli` y `@playwright/test` instaladas desde `./package.json`. | **No** (Ignorado por `node_modules/` en `.gitignore`) | Correctamente ignorado, aunque innecesario tener un `package.json` en raíz solo para Playwright CLI. |
| `backend/node_modules/` | Dependencias NPM de producción y desarrollo del Backend Express/Sequelize. | **No** (Ignorado por `.gitignore`) | Correctamente ignorado (`0` archivos en `git ls-files`). |
| `frontend/node_modules/` | Dependencias NPM del Frontend React/Vite/Vitest. | **No** (Ignorado por `.gitignore`) | Correctamente ignorado (`0` archivos en `git ls-files`). |
| `frontend/dist/` | Artefactos compilados por `vite build` (`index.html` y bundles CSS/JS minificados). | **No** (Ignorado por `dist/` en `.gitignore`) | Correctamente ignorado (`0` archivos en `git ls-files`). |

---

## 5. Estado de Git y Modificaciones Pendientes de Otros Desarrolladores

Al momento de iniciar la Fase 0 se detectaron **76 archivos rastreados con modificaciones locales (`MODIFIED`)** y **25 archivos no rastreados (`UNTRACKED`)**, los cuales fueron protegidos mediante hashes SHA-256 en `pending_work_baseline.json`.

### 5.1 Archivos Rastreados con Modificaciones Pendientes (`76` archivos `M`)

| # | Ruta del Archivo | Tamaño (B) | Clasificación | Acción |
|---:|---|---:|---|---|
| 1 | `backend/error_log.txt` | 17,558,090 | GENERADO O REPRODUCIBLE | Evaluar |
| 2 | `backend/src/database/models/index.js` | 38,155 | CRÍTICO | Conservar |
| 3 | `backend/src/modules/corte/corte.controller.js` | 4,324 | FUNCIONAL | Conservar |
| 4 | `backend/src/modules/corte/corte.routes.js` | 2,747 | FUNCIONAL | Conservar |
| 5 | `backend/src/modules/corte/corte.service.js` | 39,658 | FUNCIONAL | Conservar |
| 6 | `backend/src/modules/corte/models/corteLaminadoOrder.model.js` | 1,074 | FUNCIONAL | Conservar |
| 7 | `backend/src/modules/corte/models/corteLaminadoOrderItem.model.js` | 867 | FUNCIONAL | Conservar |
| 8 | `backend/src/modules/extrusion/extrusion.controller.js` | 26,268 | FUNCIONAL | Conservar |
| 9 | `backend/src/modules/extrusion/extrusion.routes.js` | 15,615 | FUNCIONAL | Conservar |
| 10 | `backend/src/modules/extrusion/extrusion.service.js` | 468,429 | FUNCIONAL | Conservar |
| 11 | `backend/src/modules/extrusion/models/siloReceiptLot.model.js` | 1,867 | FUNCIONAL | Conservar |
| 12 | `backend/src/modules/extrusion/services/shiftBalance.js` | 8,984 | FUNCIONAL | Conservar |
| 13 | `backend/src/modules/extrusion/services/shiftBalance.test.js` | 6,621 | PRUEBA ACTIVA | Conservar |
| 14 | `backend/src/modules/extrusion/services/shiftPolicy.js` | 15,085 | FUNCIONAL | Conservar |
| 15 | `backend/src/modules/extrusion/services/shiftPolicy.test.js` | 12,716 | PRUEBA ACTIVA | Conservar |
| 16 | `backend/src/modules/globo/globo.controller.js` | 3,778 | FUNCIONAL | Conservar |
| 17 | `backend/src/modules/globo/globo.routes.js` | 2,450 | FUNCIONAL | Conservar |
| 18 | `backend/src/modules/globo/globo.service.js` | 44,403 | FUNCIONAL | Conservar |
| 19 | `backend/src/modules/laminado/laminado.controller.js` | 3,863 | FUNCIONAL | Conservar |
| 20 | `backend/src/modules/laminado/laminado.routes.js` | 2,787 | FUNCIONAL | Conservar |
| 21 | `backend/src/modules/laminado/laminado.service.js` | 51,354 | FUNCIONAL | Conservar |
| 22 | `backend/src/modules/laminado/models/laminadoSpecification.model.js` | 2,328 | FUNCIONAL | Conservar |
| 23 | `backend/src/modules/qrcodes/qrTraceabilityTree.service.js` | 56,778 | FUNCIONAL | Conservar |
| 24 | `backend/src/modules/telares/productionRules.js` | 10,611 | FUNCIONAL | Conservar |
| 25 | `backend/src/modules/telares/telares.controller.js` | 10,217 | FUNCIONAL | Conservar |
| 26 | `backend/src/modules/telares/telares.service.js` | 142,078 | FUNCIONAL | Conservar |
| 27 | `backend/src/modules/traceability/traceability.constants.js` | 2,541 | FUNCIONAL | Conservar |
| 28 | `backend/src/modules/warehouse/consumptionOrder.service.js` | 45,426 | FUNCIONAL | Conservar |
| 29 | `backend/src/modules/warehouse/lote.model.js` | 4,087 | FUNCIONAL | Conservar |
| 30 | `backend/src/modules/warehouse/warehouse.service.js` | 63,215 | FUNCIONAL | Conservar |
| 31 | `backend/src/modules/wip/rollTransformation.js` | 21,009 | FUNCIONAL | Conservar |
| 32 | `backend/src/modules/wip/specificationCatalog.js` | 9,905 | FUNCIONAL | Conservar |
| 33 | `backend/src/utils/timezone.js` | 5,095 | FUNCIONAL | Conservar |
| 34 | `backend/test-label.pdf` | 6,514 | GENERADO O REPRODUCIBLE | Evaluar |
| 35 | `backend/test/corteLaminadoFlow.local.integration.test.js` | 7,703 | PRUEBA ACTIVA | Conservar |
| 36 | `backend/test/extrusionFloor.local.integration.test.js` | 20,126 | PRUEBA ACTIVA | Conservar |
| 37 | `backend/test/telares.rules.test.js` | 14,515 | PRUEBA ACTIVA | Conservar |
| 38 | `frontend/src/design-system/components/scanner-overlay/CameraScanner.jsx` | 19,334 | FUNCIONAL | Conservar |
| 39 | `frontend/src/modules/corte/pages/CorteLaminadoOrdersPage.tsx` | 16,488 | FUNCIONAL | Conservar |
| 40 | `frontend/src/modules/extrusion/hooks/useExtrusionFloorQueries.ts` | 11,385 | FUNCIONAL | Conservar |
| 41 | `frontend/src/modules/extrusion/hooks/useExtrusionMixing.ts` | 5,430 | FUNCIONAL | Conservar |
| 42 | `frontend/src/modules/extrusion/presentation/containers/ExtrusionBoardContainer.tsx` | 18,112 | FUNCIONAL | Conservar |
| 43 | `frontend/src/modules/extrusion/presentation/containers/PtiIngressContainer.tsx` | 17,528 | FUNCIONAL | Conservar |
| 44 | `frontend/src/modules/extrusion/presentation/pages/ExtrusionReportsPage.tsx` | 14,309 | FUNCIONAL | Conservar |
| 45 | `frontend/src/modules/extrusion/presentation/pages/ExtrusionScrapControlPage.tsx` | 27,919 | FUNCIONAL | Conservar |
| 46 | `frontend/src/modules/extrusion/presentation/pages/ExtrusionShiftPage.tsx` | 2,109 | FUNCIONAL | Conservar |
| 47 | `frontend/src/modules/extrusion/presentation/presenters/ExtrusionBoardPresenter.tsx` | 52,353 | FUNCIONAL | Conservar |
| 48 | `frontend/src/modules/extrusion/presentation/presenters/ExtrusionShiftClosurePanel.tsx` | 27,058 | FUNCIONAL | Conservar |
| 49 | `frontend/src/modules/extrusion/presentation/presenters/ExtrusionShiftSessionPanel.tsx` | 23,751 | FUNCIONAL | Conservar |
| 50 | `frontend/src/modules/extrusion/presentation/presenters/PtiIngressPresenter.tsx` | 109,738 | FUNCIONAL | Conservar |
| 51 | `frontend/src/modules/extrusion/services/extrusionApi.ts` | 8,516 | FUNCIONAL | Conservar |
| 52 | `frontend/src/modules/extrusion/types/extrusion.types.ts` | 10,143 | FUNCIONAL | Conservar |
| 53 | `frontend/src/modules/globo/pages/GloboCatalogPage.tsx` | 47,121 | FUNCIONAL | Conservar |
| 54 | `frontend/src/modules/globo/pages/GloboWipPage.tsx` | 26,825 | FUNCIONAL | Conservar |
| 55 | `frontend/src/modules/globo/services/globoApi.ts` | 2,428 | FUNCIONAL | Conservar |
| 56 | `frontend/src/modules/globo/types/globo.types.ts` | 3,101 | FUNCIONAL | Conservar |
| 57 | `frontend/src/modules/identity/presentation/hooks/useGenerateBatchMutation.ts` | 1,970 | FUNCIONAL | Conservar |
| 58 | `frontend/src/modules/laminado/pages/LaminadoCatalogPage.tsx` | 48,951 | FUNCIONAL | Conservar |
| 59 | `frontend/src/modules/laminado/pages/LaminadoWipPage.tsx` | 32,608 | FUNCIONAL | Conservar |
| 60 | `frontend/src/modules/laminado/services/laminadoApi.ts` | 2,962 | FUNCIONAL | Conservar |
| 61 | `frontend/src/modules/laminado/types/laminado.types.ts` | 3,264 | FUNCIONAL | Conservar |
| 62 | `frontend/src/modules/production/presentation/components/MixingTerminalForm.tsx` | 152,591 | FUNCIONAL | Conservar |
| 63 | `frontend/src/modules/production/presentation/pages/ExtrusionDashboard.tsx` | 39,388 | FUNCIONAL | Conservar |
| 64 | `frontend/src/modules/telares/presentation/pages/TelaresCatalogPage.tsx` | 136,103 | FUNCIONAL | Conservar |
| 65 | `frontend/src/modules/telares/presentation/pages/TelaresTerminalPage.tsx` | 123,490 | FUNCIONAL | Conservar |
| 66 | `frontend/src/modules/telares/services/telaresApi.ts` | 6,066 | FUNCIONAL | Conservar |
| 67 | `frontend/src/modules/traceability/presentation/pages/TraceabilityTreePage.tsx` | 18,382 | FUNCIONAL | Conservar |
| 68 | `frontend/src/modules/warehouse/presentation/components/ConsumptionOrderDetailsModal.tsx` | 27,732 | FUNCIONAL | Conservar |
| 69 | `frontend/src/modules/warehouse/presentation/components/CreateConsumptionOrderModal.tsx` | 67,958 | FUNCIONAL | Conservar |
| 70 | `frontend/src/modules/warehouse/presentation/components/ManualEntryBottomSheet.container.tsx` | 20,476 | FUNCIONAL | Conservar |
| 71 | `frontend/src/modules/warehouse/presentation/components/ManualEntryBottomSheet.presenter.tsx` | 25,961 | FUNCIONAL | Conservar |
| 72 | `frontend/src/modules/warehouse/presentation/pages/SilosManagementPage.tsx` | 76,448 | FUNCIONAL | Conservar |
| 73 | `frontend/src/modules/warehouse/presentation/pages/WarehouseInventoryPage.tsx` | 24,099 | FUNCIONAL | Conservar |
| 74 | `frontend/src/providers/ConfirmProvider.jsx` | 4,861 | FUNCIONAL | Conservar |
| 75 | `frontend/src/shared/components/wip/PrepareRollMaterialsModal.tsx` | 26,702 | FUNCIONAL | Conservar |
| 76 | `frontend/src/utils/date.ts` | 5,189 | FUNCIONAL | Conservar |

### 5.2 Archivos No Rastreados al Inicio de la Auditoría (`25` archivos `??`)

| # | Ruta del Archivo | Tamaño (B) | Clasificación | Acción Ejecutada |
|---:|---|---:|---|---|
| 1 | `backend/src/database/migrations/20261117120000-add-lot-package-presentation.js` | 1,303 | CRÍTICO | Conservar |
| 2 | `backend/src/database/migrations/20261123110000-generalize-corte-process-orders.js` | 1,587 | CRÍTICO | Conservar |
| 3 | `backend/src/database/migrations/20261123120000-add-telares-downstream-scrap-observations.js` | 1,826 | CRÍTICO | Conservar |
| 4 | `backend/src/database/migrations/20261124120000-single-laminado-master-catalog.js` | 1,605 | CRÍTICO | Conservar |
| 5 | `backend/src/database/migrations/20261124130000-add-laminado-cut-transfer-confirmations.js` | 1,681 | CRÍTICO | Conservar |
| 6 | `backend/src/modules/materials/materialEquivalence.js` | 1,381 | FUNCIONAL | Conservar |
| 7 | `backend/src/modules/warehouse/consumptionPackageAllocator.js` | 2,544 | FUNCIONAL | Conservar |
| 8 | `backend/src/modules/wip/telaresScrapObservation.model.js` | 1,016 | FUNCIONAL | Conservar |
| 9 | `backend/src/modules/wip/telaresScrapObservation.service.js` | 4,961 | FUNCIONAL | Conservar |
| 10 | `backend/test/extrusion-pp-packages.local.integration.test.js` | 13,598 | PRUEBA ACTIVA | Conservar |
| 11 | `backend/test/extrusionShiftHandoff.local.integration.test.js` | 5,220 | PRUEBA ACTIVA | Conservar |
| 12 | `backend/test/extrusionTransfer.local.integration.test.js` | 8,523 | PRUEBA ACTIVA | Conservar |
| 13 | `backend/test/telares-shift-timezone.test.js` | 1,302 | PRUEBA ACTIVA | Conservar |
| 14 | `backend/test/telaresE2E.local.integration.test.js` | 10,967 | PRUEBA ACTIVA | Conservar |
| 15 | `backend/tmp/pdfs/lam-flow-1.png` | 131,460 | ELIMINACIÓN SEGURA | Respaldar y eliminar |
| 16 | `backend/tmp/pdfview/page-1.png` | 5,684 | ELIMINACIÓN SEGURA | Respaldar y eliminar |
| 17 | `backend/tmp/pdfview/page-2.png` | 6,367 | ELIMINACIÓN SEGURA | Respaldar y eliminar |
| 18 | `backend/tmp/pdfview/page-3.png` | 14,631 | ELIMINACIÓN SEGURA | Respaldar y eliminar |
| 19 | `backend/tmp/pdfview/page-4.png` | 15,668 | ELIMINACIÓN SEGURA | Respaldar y eliminar |
| 20 | `backend/tmp/pre-extrusion-cleanup-20261122.dump` | 2,264,757 | GENERADO O REPRODUCIBLE | Evaluar |
| 21 | `docs/MEJORAS_PENDIENTES.md` | 866 | DOCUMENTACIÓN VIGENTE | Conservar |
| 22 | `frontend/src/modules/extrusion/presentation/presenters/ExtrusionShiftSchedulePanel.tsx` | 15,777 | FUNCIONAL | Conservar |
| 23 | `frontend/src/shared/components/wip/CorteProcessPickupPanel.tsx` | 7,136 | FUNCIONAL | Conservar |
| 24 | `frontend/src/shared/components/wip/LaminadoCutTransferPanel.tsx` | 7,061 | FUNCIONAL | Conservar |
| 25 | `frontend/src/shared/components/wip/TelaresScrapObservationForm.tsx` | 3,088 | FUNCIONAL | Conservar |

---

## 6. Inventario Estructural Agrupado por Subsistema y Dominio

| Subsistema / Carpeta | Total Archivos | Críticos / Funcionales / Config / Pruebas / Docs | En Revisión (Duplicados / Exp / Obsoletos / Huérfanos / Temp) | Eliminación Segura (Ejecutada) |
|---|---:|---:|---:|---:|
| `Raíz del Repositorio (archivos sueltos)` | 27 | 6 | 21 | 0 |
| `.agents/ y .github/workflows/` | 5 | 5 | 0 | 0 |
| `.audit-telares/, img/, screenshots/` | 5 | 0 | 5 | 0 |
| `.playwright-cli/ (Depuración Playwright)` | 108 | 0 | 0 | 108 |
| `tmp/ (Raíz)` | 22 | 0 | 14 | 8 |
| `docs/ (Documentación funcional y técnica)` | 29 | 29 | 0 | 0 |
| `backend/ (Archivos sueltos en raíz de backend)` | 91 | 5 | 79 | 7 |
| `backend/scripts/ (Scripts auxiliares)` | 15 | 0 | 15 | 0 |
| `backend/test/ y backend/test-artifacts/` | 14 | 13 | 1 | 0 |
| `backend/tmp/` | 10 | 0 | 1 | 9 |
| `backend/src/config, core, middlewares, routes, services, shared, utils` | 29 | 24 | 5 | 0 |
| `backend/src/database/migrations y seeders y models y tests` | 188 | 188 | 0 | 0 |
| `backend/src/database/legacy/ (Migraciones duplicadas)` | 6 | 0 | 6 | 0 |
| `backend/src/scripts/` | 26 | 3 | 23 | 0 |
| `backend/src/modules/ (Módulos de negocio Backend)` | 300 | 259 | 41 | 0 |
| `frontend/ (Configuración raíz, public, docs, tests)` | 25 | 20 | 1 | 4 |
| `frontend/src/app, core, design-system, components, shared, testing, etc.` | 201 | 175 | 26 | 0 |
| `frontend/src/modules/ (Módulos de negocio Frontend)` | 329 | 275 | 54 | 0 |

---

## 7. Desglose Completo de Módulos en `backend/src/modules/` y `frontend/src/modules/`

### 7.1 Módulos de Backend (`backend/src/modules/`)
| Módulo Backend | Archivos Totales | Funcionales / Pruebas Activas | Sin Referencias / Duplicados | Estado en `routes/index.js` |
|---|---:|---:|---:|---|
| `backend/src/modules/areas/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/audit/` | 2 | 2 | 0 | Consumido internamente por servicios/modelos |
| `backend/src/modules/auth/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/catalogs/` | 24 | 16 | 8 | Montado en `/api` |
| `backend/src/modules/corte/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/dashboard/` | 4 | 4 | 0 | Montado en `/api` |
| `backend/src/modules/extrusion/` | 37 | 35 | 2 | Montado en `/api` |
| `backend/src/modules/formulas/` | 13 | 12 | 1 | Montado en `/api` |
| `backend/src/modules/globo/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/health/` | 3 | 3 | 0 | Montado en `/api` |
| `backend/src/modules/intermediate/` | 7 | 2 | 5 | **NO MONTADO (Huérfano)** |
| `backend/src/modules/laminado/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/materials/` | 59 | 53 | 6 | Montado en `/api` |
| `backend/src/modules/notifications/` | 4 | 4 | 0 | Montado en `/api` |
| `backend/src/modules/permissions/` | 4 | 4 | 0 | Montado en `/api` |
| `backend/src/modules/processes/` | 12 | 6 | 6 | **NO MONTADO (Huérfano)** |
| `backend/src/modules/qrcodes/` | 10 | 9 | 1 | Montado en `/api` |
| `backend/src/modules/reception/` | 4 | 4 | 0 | Montado en `/api` |
| `backend/src/modules/reports/` | 3 | 3 | 0 | Montado en `/api` |
| `backend/src/modules/roles/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/scrap/` | 21 | 11 | 10 | **NO MONTADO (Huérfano)** |
| `backend/src/modules/telares/` | 15 | 15 | 0 | Montado en `/api` |
| `backend/src/modules/traceability/` | 10 | 10 | 0 | Montado en `/api` |
| `backend/src/modules/users/` | 5 | 5 | 0 | Montado en `/api` |
| `backend/src/modules/warehouse/` | 27 | 26 | 1 | Montado en `/api` |
| `backend/src/modules/waste/` | 1 | 0 | 1 | **NO MONTADO (Huérfano)** |
| `backend/src/modules/wip/` | 5 | 5 | 0 | Consumido internamente por servicios/modelos |

### 7.2 Módulos de Frontend (`frontend/src/modules/`)
| Módulo Frontend | Archivos Totales | Funcionales / Pruebas Activas | Sin Referencias / Duplicados | Estado en `app/router.jsx` |
|---|---:|---:|---:|---|
| `frontend/src/modules/areas/` | 3 | 2 | 1 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/auth/` | 4 | 4 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/calidad/` | 1 | 0 | 1 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/catalog/` | 1 | 1 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/catalogs/` | 4 | 1 | 3 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/corte/` | 1 | 1 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/dashboard/` | 10 | 7 | 3 | Activo en `router.jsx` |
| `frontend/src/modules/dev/` | 2 | 0 | 2 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/extrusion/` | 24 | 22 | 2 | Activo en `router.jsx` |
| `frontend/src/modules/globo/` | 4 | 4 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/health/` | 2 | 2 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/identity/` | 71 | 63 | 8 | Activo en `router.jsx` |
| `frontend/src/modules/laminado/` | 4 | 4 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/materials/` | 35 | 32 | 3 | Activo en `router.jsx` |
| `frontend/src/modules/notifications/` | 3 | 3 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/permissions/` | 1 | 1 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/preparacion-formulas/` | 1 | 0 | 1 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/production/` | 51 | 42 | 9 | Activo en `router.jsx` |
| `frontend/src/modules/qrcodes/` | 16 | 5 | 11 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/reception/` | 8 | 6 | 2 | Activo en `router.jsx` |
| `frontend/src/modules/reports/` | 1 | 0 | 1 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/roles/` | 4 | 4 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/scrap/` | 2 | 0 | 2 | **No referenciado en router activo (o parcial)** |
| `frontend/src/modules/telares/` | 11 | 11 | 0 | Activo en `router.jsx` |
| `frontend/src/modules/traceability/` | 4 | 3 | 1 | Activo en `router.jsx` |
| `frontend/src/modules/users/` | 11 | 10 | 1 | Activo en `router.jsx` |
| `frontend/src/modules/warehouse/` | 50 | 47 | 3 | Activo en `router.jsx` |
