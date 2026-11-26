# ÍNDICE MAESTRO — BLINDAJE, ESTABILIZACIÓN Y PREPARACIÓN MVC (`docs/engineering-readiness/`)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Emisión:** 2026-11-25  
**Estado de Master Data (`30` tablas / `2,928` filas):** `SHA-256: 36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` (**100% ÍNTEGRA**)

---

## 1. Catálogo de Entregables Obligatorios (16 Documentos + Artefacto Criptográfico)

| # | Documento | Fase | Propósito Principal |
| :---: | :--- | :---: | :--- |
| 00 | [`00_BASELINE.md`](./00_BASELINE.md) | Fase 0 | Estado inicial de Git, verificación de hallazgos previos, inventario de 96 archivos en progreso y bóveda de recuperación (`154` archivos + dumps PostgreSQL con SHA-256). |
| 01 | [`01_LOCAL_ENVIRONMENT_SECURITY.md`](./01_LOCAL_ENVIRONMENT_SECURITY.md) | Fase 1 | Arquitectura de la guarda *fail-closed* `dbGuard.js`, separación `APP_ENV` vs `NODE_ENV`, plantillas `.env.*.example` y pruebas `envIsolationGuard.test.js` (`8/8 PASS`). |
| 02 | [`02_DATABASE_PROTECTION.md`](./02_DATABASE_PROTECTION.md) | Fase 2 | Separación entre `sistema_enterprise` (Dev) y `sistema_enterprise_test` (QA/Test), roles PostgreSQL de mínimo privilegio y 58 triggers `[QA_MASTER_DATA_GUARD]`. |
| 03 | [`03_MASTER_DATA_INTEGRITY.md`](./03_MASTER_DATA_INTEGRITY.md) | Fase 2 | Inventario detallado y hash SHA-256 individual de las 30 tablas de Master Data (`2,928` filas) y verificación de paridad tras `pg_restore` y pruebas de integración. |
| 04 | [`04_SECRETS_REMEDIATION.md`](./04_SECRETS_REMEDIATION.md) | Fase 3 | Remediación de los 12 scripts con credenciales literales, bloqueo de `sync-neon.js`, escáner `security-check.js` (`0` hallazgos en `1,203` archivos), `.gitignore` y hook `pre-commit`. |
| 05 | [`05_GITHUB_SECURITY.md`](./05_GITHUB_SECURITY.md) | Fase 4 | Endurecimiento local de `.github/workflows/migrations.yml`, `provision-demo-users.yml`, `rollback.yml` y `seed-catalogs.yml` + guía de GitHub Environments. |
| 06 | [`06_ENVIRONMENT_STRATEGY.md`](./06_ENVIRONMENT_STRATEGY.md) | Fase 5 | Estrategia operativa de los 4 ambientes (`local`, `test`, `uat`, `production`), matriz de aislamiento y flujo de promoción. |
| 07 | [`07_TESTING_BASELINE.md`](./07_TESTING_BASELINE.md) | Fase 6 | Resultados completos de pruebas unitarias (`90/93`), caracterización (`10/10`), frontend (`31/31`), integración local en `sistema_enterprise_test` y análisis forense de hallazgos QA. |
| 08 | [`08_FUNCTIONAL_CONTRACTS.md`](./08_FUNCTIONAL_CONTRACTS.md) | Fase 6 | Contratos funcionales congelados por área industrial (Almacén, Mezcla, Extrusión, Telares, Laminado, Corte, Liner/Globo, Trazabilidad) y reglas de oro (`allowed_actions`). |
| 09 | [`09_DEPENDENCY_MAP.md`](./09_DEPENDENCY_MAP.md) | Fase 7 | Mapa de dependencias reales, los 18 controladores con acceso directo a Sequelize, clasificación de los 59 imports históricos (`legacy-ui-archive`) y archivos protegidos. |
| 10 | [`10_MVC_TARGET_ARCHITECTURE.md`](./10_MVC_TARGET_ARCHITECTURE.md) | Fase 8 | Arquitectura objetivo Monolito Modular MVC + Servicios + Reglas Puras + Repositorios, estructura de carpetas y convenciones obligatorias de código. |
| 11 | [`11_REFACTORING_ROADMAP.md`](./11_REFACTORING_ROADMAP.md) | Fases 9–10 | Mapa de descomposición de los 5 monolitos principales con fronteras transaccionales y plan incremental de 8 unidades de refactorización con rollback. |
| 12 | [`12_ROLLBACK_STRATEGY.md`](./12_ROLLBACK_STRATEGY.md) | Fase 12 | Procedimientos exactos y probados de restauración de archivos (`manifest.json`) y bases de datos PostgreSQL (`pg_restore` de `sistema_enterprise_phase0.dump`). |
| 13 | [`13_CHANGELOG.md`](./13_CHANGELOG.md) | Fase 12 | Bitácora detallada de todos los archivos creados y modificados durante la intervención de blindaje y preparación. |
| 14 | [`14_READINESS_REPORT.md`](./14_READINESS_REPORT.md) | Fases 13–14 | Evaluación objetiva (`numerador/denominador`) de las 5 Compuertas de Calidad (Quality Gates 1–5) y dictamen ejecutivo final. |
| — | [`master-data-baseline.json`](./master-data-baseline.json) | Fase 2 | Artefacto JSON generado automáticamente con el conteo y hash SHA-256 de cada una de las 30 tablas de Master Data. |

---

## 2. Guía Rápida de Comandos Estandarizados

Todos los comandos pueden ejecutarse desde la raíz del proyecto (`c:\Users\maicr\OneDrive\Desktop\Demo`) o desde `backend/`:

| Comando | Descripción Operativa |
| :--- | :--- |
| `npm run dev:check` | Ejecuta las 7 verificaciones críticas del entorno local (`dbGuard`, conexión a `sistema_enterprise` y `sistema_enterprise_test`, triggers de protección, huella SHA-256 de Master Data y escaneo de secretos). |
| `npm run security:check` | Escanea todo el repositorio en busca de secretos literales, URLs de Neon Cloud o archivos `.env` rastreados. |
| `npm run test:unit` | Ejecuta las suites unitarias, de guardas de aislamiento y de caracterización del backend (`16` suites). |
| `npm run test:integration` | Ejecuta las 6 suites de integración local contra la base de datos aislada `sistema_enterprise_test` (`APP_ENV=test`). |
| `npm run test:integrity` | Ejecuta exclusivamente las suites de aislamiento de entorno (`envIsolationGuard.test.js`) y contratos de caracterización (`characterization.contracts.test.js`). |
| `npm --prefix backend run db:verify:local` | Verifica que las 30 tablas de Master Data en `sistema_enterprise` mantengan exactamente el hash global SHA-256 `36db9b70...e241`. |
| `npm run validate` | Ejecuta en cadena: `dev:check` + `security:check` + `test:integrity` + `frontend build`. |

---

## 3. Resumen de Estado de Compuertas de Calidad (Quality Gates)

- **GATE 1 — Seguridad del Ambiente Local:** ✅ **`APROBADA` (`7/7`)**
- **GATE 2 — Protección de Master Data:** ✅ **`APROBADA` (`6/6`)**
- **GATE 3 — Higiene del Repositorio y GitHub:** ⚠️ **`APROBADA CON OBSERVACIONES` (`6/7` — pendiente rotación manual de secreto histórico en consola Neon Cloud)**
- **GATE 4 — Línea Base Funcional y QA:** ⚠️ **`APROBADA CON OBSERVACIONES` (`7/10` — 3 contratos funcionales en revisión antes de refactorizar Telares/Corte/ODC)**
- **GATE 5 — Preparación para Refactorización MVC:** ✅ **`APROBADA` (`8/8`)**
