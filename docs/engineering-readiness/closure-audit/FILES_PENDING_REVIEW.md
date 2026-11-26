# FILES_PENDING_REVIEW — ELEMENTOS CONSERVADOS POR PRECAUCIÓN Y PENDIENTES DE REVISIÓN (FASE F)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-25  
**Criterio Rector:** *"Ante una incertidumbre funcional, acoplamiento con el ORM, trabajo concurrente de otro agente o restricción de no modificar código fuente funcional, conserva el elemento y documenta el motivo."*

---

## 1. Resumen de Elementos Pendientes de Revisión

| Grupo | Descripción | Cantidad de Archivos | Tamaño Total (Bytes) | Motivo Principal de Conservación | Etapa en que Debe Resolverse |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **P1** | Grupo P1 — Scripts Auxiliares e Históricos en `backend/scripts/` (`15` archivos) | `15` | `158984` | Contienen 3 scripts recién bloqueados por el agente concurrente Codex (`migrate-master-data.js`, `masterdata-neon/inspec... | Saneamiento Git / Refactor MVC |
| **P2** | Grupo P2 — Scripts de Flujos Manuales y Diagnóstico en `backend/src/scripts/` (`21` archivos) | `21` | `162938` | Scripts de pruebas manuales de flujos de 13 pasos, híbrido silos, backflush de telares y diagnósticos históricos (excluy... | Saneamiento Git / Refactor MVC |
| **P3** | Grupo P3 — Generador y Volcado del Seeder de Catálogos (`2` archivos) | `2` | `179042` | `backend/generate-catalog-seeder.js` lee `backend/catalog_dump.json` para regenerar el seeder oficial `20260826120000-pr... | Saneamiento Git / Refactor MVC |
| **P4** | Grupo P4 — Respaldos Locales de Base de Datos (`.sql` y `.dump` — `5` archivos) | `5` | `7266873` | Volcados de datos y respaldos previos (`backup_neon_pre_cleanup.sql`, `backup_pre_cleanup_production.sql`, `master_data_... | Saneamiento Git / Refactor MVC |
| **P5** | Grupo P5 — Logs Escritos en Runtime por Middlewares y Artefactos con Estado `M` (`5` archivos) | `5` | `17649422` | `backend/error_log.txt` (`M` en línea base) y `error_log.txt` son escritos por `fs.appendFileSync` en `backend/src/middl... | Saneamiento Git / Refactor MVC |
| **P6** | Grupo P6 — Imágenes Estáticas de Referencia y Configuración QA Rastreada (`4` archivos) | `4` | `159519` | `img/Extrusion.jpeg`, `img/Telares.jpeg`, `screenshots/usability/movil-login-390x844.png` (imágenes de referencia visual... | Saneamiento Git / Refactor MVC |
| **P7** | Grupo P7 — Módulos y Modelos Huérfanos en `backend/src/` (`46` archivos) | `46` | `74234` | Rutas no montadas en `backend/src/routes/index.js` (`intermediate`, `processes`, `scrap`, `waste`, `catalogs/storageLoca... | Saneamiento Git / Refactor MVC |
| **P8** | Archivos huérfanos en `frontend/src/` (Capas DDD incompletas y pantallas no montadas en `router.jsx`) | `82` | `~170,400` | Residen dentro de `frontend/src/` (Restricción #2 prohíbe alterar código fuente funcional; su consolidación pertenece al Refactor Frontend). | Refactorización MVC / Frontend |
| **TOTAL** | **8 Grupos Documentados** | **`180`** | **`~25821412`** | **100% Inventariados sin riesgo de pérdida** | — |

---

## Grupo P1 — Scripts Auxiliares e Históricos en `backend/scripts/` (`15` archivos)

**Justificación técnica:** Contienen 3 scripts recién bloqueados por el agente concurrente Codex (`migrate-master-data.js`, `masterdata-neon/inspect.js`, `seed-manual-entry-permission.js` con `[SECURITY_BLOCK]`), `sync-neon.js` bloqueado, y utilidades históricas de importación de materiales (`parsed-materials.json`, `raw-materials.txt`). Conservados para no generar conflicto con el trabajo concurrente de Codex y para su retiro con `git rm` en un commit dedicado.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/scripts/clean-qa-data.js` | 1951 | `TRACKED_CLEAN` | `ee7a187a988591198a8281331f76fcefa95606e5fecb54730c7859dd82f3ec94` |
| 2 | `backend/scripts/create_admin_extrusion.js` | 4794 | `M` | `5c20a9bc58b4b61ab51fdd84d762cf8fbce9b8d1613ad5fd772f616eec310ceb` |
| 3 | `backend/scripts/fix-admin-alm-permissions.js` | 1121 | `TRACKED_CLEAN` | `a55f046ed6ef72f6898ee253a9eed54c995191fc1a61f8844edaa6345273baec` |
| 4 | `backend/scripts/masterdata-neon/inspect.js` | 6779 | `M` | `bfaabb6d3b226b4e5581a085bc12fb2f11c52524050823e48255162d8051ea6c` |
| 5 | `backend/scripts/masterdata-neon/restore-prueba.js` | 1123 | `TRACKED_CLEAN` | `7f3002eb2134b7e654515c8402b7b2eb2642c2a7624f577742be4c8f50ce76bd` |
| 6 | `backend/scripts/migrate-master-data.js` | 6690 | `M` | `3a6adbfe289995ce0fafa21cb9a175ae0ed4882bc165d6216bb6238ddaf9bc75` |
| 7 | `backend/scripts/parse-materials.js` | 3466 | `TRACKED_CLEAN` | `0d3c4fa05863e9dc5f47aa546e729f1f8b23ee12df52614b9447f30716b9c229` |
| 8 | `backend/scripts/parsed-materials.json` | 79031 | `TRACKED_CLEAN` | `379d794b3a717ccb1abc9220ba1e6e7ba2be929e0ebc89dde5830e27d6aec6ba` |
| 9 | `backend/scripts/qa-warehouse-flow.js` | 7146 | `TRACKED_CLEAN` | `004969fcd335666f4aeb69b92ab990b768cd6ea231ca77c9cebdc5c4c0d945bd` |
| 10 | `backend/scripts/raw-materials.txt` | 23227 | `TRACKED_CLEAN` | `2461b811da6ab4af75a587bda735bc2330e372e8dca9bc503c3f185612c798e1` |
| 11 | `backend/scripts/seed-manual-entry-permission.js` | 2448 | `M` | `09da84d880d069d7219604e34672b603db096d8a5925ef5ec5ee6f3842e939b8` |
| 12 | `backend/scripts/seed-materials.js` | 2593 | `TRACKED_CLEAN` | `ebb35a28a2e151cd59a9e2c8b3c8feffab999663a2acd87f5b895e44e4db2ea0` |
| 13 | `backend/scripts/sync-excel.js` | 9745 | `TRACKED_CLEAN` | `86ededa5ee7e050e6bb4b0073d21845dae928ca5003944e208a304c96fc69434` |
| 14 | `backend/scripts/sync-master-data.js` | 8163 | `TRACKED_CLEAN` | `579b654f4b2f072db961286b017b28aee2ea587118b9082a415d666511d9dbd6` |
| 15 | `backend/scripts/sync-neon.js` | 707 | `M` | `2dd0d38a77fdddfea512e94230025f991bb5398b4b1b379e90c5bb7290a04693` |

---

## Grupo P2 — Scripts de Flujos Manuales y Diagnóstico en `backend/src/scripts/` (`21` archivos)

**Justificación técnica:** Scripts de pruebas manuales de flujos de 13 pasos, híbrido silos, backflush de telares y diagnósticos históricos (excluyendo los 7 scripts activos de CI/CD y verificación local y los 2 ya retirados en Lote F4). Documentados en `TESTS_CONSOLIDATED.md`; conservados en revisión mientras el equipo QA confirma si desea portar algún escenario adicional a `backend/test/`.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/src/scripts/add-cart-columns.js` | 1030 | `TRACKED_CLEAN` | `ba6739a369008f75f4115d7121fbecc93e0e90f6f1a5da59a287aa0039838e65` |
| 2 | `backend/src/scripts/align-client-extrusion-formulas.js` | 4244 | `TRACKED_CLEAN` | `4929e73bf0bad14a3d19fd93e1506d25bb6e6f724033278e6211104b0e4297af` |
| 3 | `backend/src/scripts/backfill-child-qrs.js` | 3322 | `TRACKED_CLEAN` | `2aadb11faf31a6b8990301ba775dc9c89f70cfacade787aacd87d602c8f48edb` |
| 4 | `backend/src/scripts/check-db.js` | 432 | `TRACKED_CLEAN` | `39806471f28d4db4dd777684fe1d4de5cd273250a1ae51ae5e85c73997327f77` |
| 5 | `backend/src/scripts/check-formulas.js` | 798 | `TRACKED_CLEAN` | `5e882444373931716985383a6dac5e65810a1e8b35ef90ff25611c6a7b4ad252` |
| 6 | `backend/src/scripts/check-qr.js` | 1095 | `TRACKED_CLEAN` | `9f1f6812518a28912666723d41b2b53546dac5a760702e3ad01536142bf0b60f` |
| 7 | `backend/src/scripts/check-users.js` | 353 | `TRACKED_CLEAN` | `0495d9bafbe7ff1dd0bfbe12417bde32cd582b1e25bdbabd05f6df993077eb90` |
| 8 | `backend/src/scripts/inspect_telares_infra.js` | 2383 | `TRACKED_CLEAN` | `457b02880d8694bc1803078c0eedd1f92a593a6bbd3cf5d6877cacef629a7531` |
| 9 | `backend/src/scripts/migrate-pti-catalog.js` | 2999 | `TRACKED_CLEAN` | `0d7bb1872d4a4eee3329a6a08f4f3bcc6a36eff60ab2978f5230fba2d108d566` |
| 10 | `backend/src/scripts/run-full-13-step-flow.js` | 23569 | `TRACKED_CLEAN` | `8ad8bf4de8f3979c46819cc5798766556e4a1ff865f68dc667efa1b460d9b792` |
| 11 | `backend/src/scripts/seed-updated-extrusion-formulas.js` | 28909 | `TRACKED_CLEAN` | `669432414193706d321b0b4611aeefcd29f4dc89f49f81e5f446e731cc099ccc` |
| 12 | `backend/src/scripts/test-full-line-extrusion.js` | 16161 | `TRACKED_CLEAN` | `585255c9bfee4f902fd62bd97fce183a6aac40e0512e40bfdc39b1681c45a822` |
| 13 | `backend/src/scripts/test-mix-containers-and-queue.js` | 2419 | `TRACKED_CLEAN` | `28b6389f87a4e3019ffb72b6c0b65e470b30d13370873e109f76a999cf6012b8` |
| 14 | `backend/src/scripts/test-odc-fifo-fulfillment.js` | 5660 | `TRACKED_CLEAN` | `b70c8fa07695ab810a7ffb77650fcbe21b8e7e2fb5da4cd9678086158e1b1a45` |
| 15 | `backend/src/scripts/test-points-1-to-7.js` | 10242 | `TRACKED_CLEAN` | `d4f9bf9e267ccb7e8d19580234d76c7af2af1007d88e078e320a7be6099f7c3d` |
| 16 | `backend/src/scripts/test-pti-endpoints.js` | 3725 | `TRACKED_CLEAN` | `672667fe85b6541948dca141f338d140d597a27d8df52161ffc9470b91ecab3b` |
| 17 | `backend/src/scripts/test-routing-globo-laminado.js` | 3393 | `TRACKED_CLEAN` | `cf439ab49576ac4e6a8139c87afcd4c92ceed7bbeb483acc98855cec187fffbb` |
| 18 | `backend/src/scripts/test-silo-hybrid-extrusion.js` | 12158 | `TRACKED_CLEAN` | `c476a3d637b2749d245155ef2908a8dd7d6c89231b844469d5eb9070665417b3` |
| 19 | `backend/src/scripts/test-telares-backflush-flow.js` | 14366 | `TRACKED_CLEAN` | `e96e4a878d4f182171cffd8ea3a6975fc555062809232f7f8430f4a4b5f431d0` |
| 20 | `backend/src/scripts/test-transform-flow.js` | 7144 | `TRACKED_CLEAN` | `8b74deb9088362df4fa700b9d45b2f69ba0591c89b2ca1c4fe73c8d9e0bf1bfa` |
| 21 | `backend/src/scripts/test-warehouse-to-telares-integrity.js` | 18536 | `TRACKED_CLEAN` | `15a8714f9a3e7201c23b809e626088fdcd1c1107e5f0ce24fe1dfea490d7f9b3` |

---

## Grupo P3 — Generador y Volcado del Seeder de Catálogos (`2` archivos)

**Justificación técnica:** `backend/generate-catalog-seeder.js` lee `backend/catalog_dump.json` para regenerar el seeder oficial `20260826120000-production-catalog-data.js` utilizado por `npm run db:seed:catalog`. Conservados por seguridad operativa.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/catalog_dump.json` | 167741 | `IGNORED` | `dbaf5e713a3dab9b0ab627a934d4b6cdb5a59fa7110ca25f1760151a5c2e21a8` |
| 2 | `backend/generate-catalog-seeder.js` | 11301 | `TRACKED_CLEAN` | `84f65b45e95ace132ff3abb81c39383ca84ac2fc91f23af9f047e1c7e3221d29` |

---

## Grupo P4 — Respaldos Locales de Base de Datos (`.sql` y `.dump` — `5` archivos)

**Justificación técnica:** Volcados de datos y respaldos previos (`backup_neon_pre_cleanup.sql`, `backup_pre_cleanup_production.sql`, `master_data_dump.sql`, `pre-extrusion-cleanup-20261122.dump`, `local-pre-multirun-20261125.dump`). Conservados estrictamente por protección de datos; requieren autorización del DBA antes de moverlos a almacenamiento externo y ejecutar `git rm --cached backend/master_data_dump.sql`.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/backup_neon_pre_cleanup.sql` | 688363 | `IGNORED` | `f73791bffcedd59b1c83c16053ab691d227538bb1313833f8eb62e829d0bb7bc` |
| 2 | `backend/backup_pre_cleanup_production.sql` | 1596967 | `IGNORED` | `8cfdd0d2163eff32f43503527a379915889084c538cc3dfbcd97c9be9238bc08` |
| 3 | `backend/master_data_dump.sql` | 430755 | `D` | `0ef3eba15267d1d4ca6ac8961b05569c5e1028323f6007b5057ef21cb103d361` |
| 4 | `backend/tmp/pre-extrusion-cleanup-20261122.dump` | 2264757 | `IGNORED` | `2d82f02bb4592bf8f460a93b742c7a0b9f099311f97d28b502b16d26d33f5740` |
| 5 | `docs/qa/evidence/local-pre-multirun-20261125.dump` | 2286031 | `IGNORED` | `f592bf8c702d40ba5afef122746c6bb4a26309820ce93edf099c34f4b89df797` |

---

## Grupo P5 — Logs Escritos en Runtime por Middlewares y Artefactos con Estado `M` (`5` archivos)

**Justificación técnica:** `backend/error_log.txt` (`M` en línea base) y `error_log.txt` son escritos por `fs.appendFileSync` en `backend/src/middlewares/error.middleware.js`; `backend/validation_error.txt` (`M`) es escrito por `fs.writeFileSync` en `validation.middleware.js`; `backend/test-label.pdf` (`M` en línea base) y `backend/test-artifacts/WIP-extrusion-QR-hijos-local.pdf` son evidencias PDF. No deben retirarse hasta refactorizar ambos middlewares en la etapa MVC y ejecutar `git rm --cached`.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/error_log.txt` | 17562242 | `D` | `7fd2cfbc6b39baf2498b2f23cff7cdf9187f5f0815424a4971c9a088e6f7bbc1` |
| 2 | `backend/test-artifacts/WIP-extrusion-QR-hijos-local.pdf` | 79017 | `TRACKED_CLEAN` | `307f402b60ac39b3b44b12627a5541c7046a2a205542410c1d5c11817fea32a5` |
| 3 | `backend/test-label.pdf` | 6514 | `M` | `4ad9b37e5068b0ffe7d2d05a3f27c1c76c9fc11e0786de2c3c21b118bb06f72e` |
| 4 | `backend/validation_error.txt` | 173 | `M` | `7c1d6086c6c456b427bbe4c980cef67c854525d814d1562d548f454517d81768` |
| 5 | `error_log.txt` | 1476 | `D` | `517dcc912597a4aac735819d7d1bf6fcef663a572256ab6b868053301962b998` |

---

## Grupo P6 — Imágenes Estáticas de Referencia y Configuración QA Rastreada (`4` archivos)

**Justificación técnica:** `img/Extrusion.jpeg`, `img/Telares.jpeg`, `screenshots/usability/movil-login-390x844.png` (imágenes de referencia visual de planta/UX) y `frontend/.env.qa` (configuración rastreada en Git). Conservados hasta decisión de Producto/DevOps.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `frontend/.env.qa` | 40 | `D` | `c6ea9f5df7d7e750d4b9dcf55c64e5827260ac1501d51e61b3113d9d647af076` |
| 2 | `img/Extrusion.jpeg` | 70846 | `TRACKED_CLEAN` | `14ef98b2062e7870ee3f0bfc7e8cc00c0ab9a0aac258ac0010e2376555e59553` |
| 3 | `img/Telares.jpeg` | 67763 | `TRACKED_CLEAN` | `d30656c06fc5f18d5aa00d5cc8ab520818306a765f836aa1936f7276dd7d6bce` |
| 4 | `screenshots/usability/movil-login-390x844.png` | 20870 | `TRACKED_CLEAN` | `5823f951ac4c6ae4ce34b742f5f023899c17e14a968a1a71e7832121775f4f91` |

---

## Grupo P7 — Módulos y Modelos Huérfanos en `backend/src/` (`46` archivos)

**Justificación técnica:** Rutas no montadas en `backend/src/routes/index.js` (`intermediate`, `processes`, `scrap`, `waste`, `catalogs/storageLocation*`, `catalogs/warehouse`) y helpers sin importadores directos. Varios de sus modelos están registrados dentro de `backend/src/database/models/index.js` (`77` modelos), por lo que retirarlos en esta fase rompería la carga del ORM y violaría la Restricción #2 ("No modificar código fuente funcional"). Deben resolverse en la Refactorización MVC.

| # | Ruta del Archivo | Tamaño (B) | Estado Git | Hash SHA-256 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/src/config/jwt.js` | 0 | `TRACKED_CLEAN` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 2 | `backend/src/middlewares/errorHandler.js` | 1760 | `TRACKED_CLEAN` | `4fa9f33e5ea74f064616c410930040584a0d2296e8bff370fc5c63525753e6f2` |
| 3 | `backend/src/modules/catalogs/storageLocation/storageLocation.model.js` | 2505 | `TRACKED_CLEAN` | `6f1ccd77705f89ad36874a00f3cdb2fba3f4ad7788459a2a932197d44d766209` |
| 4 | `backend/src/modules/catalogs/storageLocation/storageLocation.routes.js` | 1220 | `TRACKED_CLEAN` | `d79306e7301d640cbac8312dd35016d25bacb13c369ed508b6105f2f79dedbf5` |
| 5 | `backend/src/modules/catalogs/storageLocationStatus/storageLocationStatus.model.js` | 1079 | `TRACKED_CLEAN` | `db71412f262a39ce115e7af57f3603130ac8dee9e22d18cf035b9c667a5885a3` |
| 6 | `backend/src/modules/catalogs/storageLocationStatus/storageLocationStatus.routes.js` | 1274 | `TRACKED_CLEAN` | `00ba101f0ac3858369a076fac47b5031760fa2bab97ebe4b723621bc9bb10067` |
| 7 | `backend/src/modules/catalogs/storageLocationType/storageLocationType.model.js` | 1068 | `TRACKED_CLEAN` | `9f09768b8c9e6c3799cda6bcb2af77d42a62baeec76f7b1014cf0ccd8064ac49` |
| 8 | `backend/src/modules/catalogs/storageLocationType/storageLocationType.routes.js` | 1256 | `TRACKED_CLEAN` | `a28c132d8d8d412ffcd027885fd0cef43b5046340f90ab84931c5ea00dee4e62` |
| 9 | `backend/src/modules/catalogs/warehouse/warehouse.model.js` | 1123 | `TRACKED_CLEAN` | `7a809223c9edd7ce9abb8a3db5b20122dcd5218c925e711ecd792badb78cc65e` |
| 10 | `backend/src/modules/catalogs/warehouse/warehouse.routes.js` | 1215 | `TRACKED_CLEAN` | `16459fe4267952cb330bc9a440f488a0e78a720497bcab1593f00e3c53651ac6` |
| 11 | `backend/src/modules/extrusion/models/extrusionPtiSaleExit.model.js` | 1071 | `TRACKED_CLEAN` | `4baf7c8026caf0387ea0aed4f65a815034dd17cb0754aa6b7e907efdc6c3ab96` |
| 12 | `backend/src/modules/extrusion/models/extrusionPtiWarehouseTransfer.model.js` | 1825 | `TRACKED_CLEAN` | `7814618671fc2aaffd85c91753bd0b8620b681841d601258cdfe38e937893984` |
| 13 | `backend/src/modules/formulas/formulas.constants.js` | 474 | `TRACKED_CLEAN` | `f27e13b69ec98fd9a68400f9196b2b21f5550abec8d95fc11859223dbaef89a5` |
| 14 | `backend/src/modules/intermediate/intermediate.routes.js` | 1867 | `TRACKED_CLEAN` | `c0077f50212af24a661403d8f4c74b7dfa902d9a6acfc6a089b866b601b0a46d` |
| 15 | `backend/src/modules/intermediate/intermediateMaterial.model.js` | 2772 | `TRACKED_CLEAN` | `88b3a7332cef1eb95da5313dd72bff4799dfc0f3d472353b107e446ac592a379` |
| 16 | `backend/src/modules/intermediate/intermediateStock.model.js` | 1760 | `TRACKED_CLEAN` | `6b57bec161231d6034ed6f3f26212f1939e3dc8666c1a1cad7bb406e5b92896f` |
| 17 | `backend/src/modules/intermediate/intermediateStockMovement.model.js` | 2963 | `TRACKED_CLEAN` | `41905eecb0ea4d37597c7c23d685cf634cfa646281f78312923b8d36ba3f75eb` |
| 18 | `backend/src/modules/intermediate/storageRack.model.js` | 1634 | `TRACKED_CLEAN` | `434653b0805ddb9734d442b44732f3648575d1f4579c5a3f5681c7f44c72120d` |
| 19 | `backend/src/modules/materials/materialCategory/materialCategory.routes.js` | 1197 | `TRACKED_CLEAN` | `00724c3f4ddc82f7118aef44abcf0c97613385bacc53fa6ef45cc30e9dfc1fff` |
| 20 | `backend/src/modules/materials/materialCategory.model.js` | 1195 | `TRACKED_CLEAN` | `b4232d54bc25227b9fc2c809c7c5a84263da443490de4d6a546b4cd2f35801a3` |
| 21 | `backend/src/modules/materials/materials.constants.js` | 370 | `TRACKED_CLEAN` | `e50758fe34616e8592b92705dc9df3191efcc59222068aab5ffdd226faadfbd0` |
| 22 | `backend/src/modules/materials/materials.routes.js` | 3275 | `TRACKED_CLEAN` | `08f1ea2fa42f7fec65975192a0cb6c063ab9cee8df4f5e5dd9803085e862c283` |
| 23 | `backend/src/modules/materials/materialSubcategory.model.js` | 969 | `TRACKED_CLEAN` | `89fee5cdcfaacc7b14c41e0b1dcc79951300cc82942896fcfa8dadc31584fb6f` |
| 24 | `backend/src/modules/materials/operationalArea.model.js` | 1099 | `TRACKED_CLEAN` | `e7ae948cff9f03fc0d540b743bc7e074c8c3f78ff90ae35d6207adcc54a188ae` |
| 25 | `backend/src/modules/processes/processOutputItem.model.js` | 991 | `TRACKED_CLEAN` | `09b6083455af04dc2d27c3c5d630aa3476cd1bf0334bfae1bbdea2c8be561349` |
| 26 | `backend/src/modules/processes/processRun.model.js` | 1552 | `TRACKED_CLEAN` | `f7b1b28796765ecb28caaec546f1c58d6eee0563790dfc86ceaf0fc46c2ac809` |
| 27 | `backend/src/modules/processes/processRun.routes.js` | 1483 | `TRACKED_CLEAN` | `6b8ef997abdd72d36f728f4f27ae25653d5b493e1195e1b03ad8bbc4d64caa5f` |
| 28 | `backend/src/modules/processes/processRunInput.model.js` | 1510 | `TRACKED_CLEAN` | `650a9e7ce20ece399b3bf2ba6475adced275f8274b807f66d94372f33a103bdb` |
| 29 | `backend/src/modules/processes/processRunOutput.model.js` | 2812 | `TRACKED_CLEAN` | `45f10f7b89732ad30a6f3dde6b3abb69b2a56c5cc5cf89f3fa5f5573c51a508c` |
| 30 | `backend/src/modules/processes/processRunTelares.routes.js` | 1732 | `TRACKED_CLEAN` | `60d938e8fb4ecc99dafd87b0ee7bc4863f0e5e72168377da6ee386ce8afefac6` |
| 31 | `backend/src/modules/qrcodes/qrEvent.model.js` | 1185 | `TRACKED_CLEAN` | `02811d2f43fa6785eefcc0197282c2426baf025fce5e4d62bae424693c905ef8` |
| 32 | `backend/src/modules/scrap/scrap.dashboard.routes.js` | 1093 | `TRACKED_CLEAN` | `18496de974839f86cf74ace3969dfc0a6564ff636b6341b00c70284902872d1c` |
| 33 | `backend/src/modules/scrap/scrap.report.routes.js` | 517 | `TRACKED_CLEAN` | `03440530c93b8d599582cc60ebec4bd47d50fbf8449468441780110ac37dc6f5` |
| 34 | `backend/src/modules/scrap/scrap.routes.js` | 1756 | `TRACKED_CLEAN` | `9b4d2ace8efba3e3c058214e19699a5cc07af9166c383c5a38f7f2b659dc7484` |
| 35 | `backend/src/modules/scrap/scrap.service.js` | 10750 | `TRACKED_CLEAN` | `760431cfc39980a376d38c6866a63f9cb8cb2184e509e2eb3c02107c17b38767` |
| 36 | `backend/src/modules/scrap/scrapCatalog.model.js` | 1218 | `TRACKED_CLEAN` | `330292df27bf2dc3db322a2bea5be66e9850d14885065587b468c79635ffc7ae` |
| 37 | `backend/src/modules/scrap/scrapContainer.model.js` | 3111 | `TRACKED_CLEAN` | `bd65ffbfb0c57cdd0da126a3be208b819b4f5dd334da98dcc24ca1d10abbb37b` |
| 38 | `backend/src/modules/scrap/scrapContainerStock.model.js` | 1052 | `TRACKED_CLEAN` | `95b1c491647ec1dfa6e7ea59210a526f339e4c675dd56e5d470f418e8ae6ba77` |
| 39 | `backend/src/modules/scrap/scrapMovement.model.js` | 1294 | `TRACKED_CLEAN` | `37eb302514e9ed1f1d810122333a7a83e2376bb21d771050c68b42bc63dea5f2` |
| 40 | `backend/src/modules/scrap/scrapStockMovement.model.js` | 1476 | `TRACKED_CLEAN` | `75aa918b25b58a27baf67729416cb022ab5e8bf75c8d525cba939c99ad90a1e2` |
| 41 | `backend/src/modules/scrap/scrapType.model.js` | 1438 | `TRACKED_CLEAN` | `04e3a8a0704b2eae8053b36a9716ced28d83330fa36cda4de120a0772e818f56` |
| 42 | `backend/src/modules/warehouse/stockUnit.model.js` | 1437 | `TRACKED_CLEAN` | `71e759bb899cab471ff7fbe96ff4ec9fe7c915c4ffc4b278a5c5c1b29948a83d` |
| 43 | `backend/src/modules/waste/wasteReason.model.js` | 0 | `TRACKED_CLEAN` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 44 | `backend/src/shared/helpers/buildScrapMovement.helper.js` | 806 | `TRACKED_CLEAN` | `80a4033ab6c3f9eaa608cd2b8b227bf7cec30a296526f5f7c67d7f16d189b830` |
| 45 | `backend/src/shared/helpers/inventoryStatus.helper.js` | 460 | `TRACKED_CLEAN` | `5868f65ee60362d15bdfda5aef6766eb2785e56b2ed777745f52e524d6937ee2` |
| 46 | `backend/src/shared/utils/transactionRetry.js` | 1590 | `TRACKED_CLEAN` | `c2fd58e38b3b402af30fe5c21c94ab17bd78f0f3572a972e29b05b66f344d5fe` |

---

## Grupo P8 — Archivos Huérfanos en `frontend/src/` (`82` archivos)

El listado individual de los 82 archivos huérfanos de `frontend/src/` (componentes UI no enlazados en `router.jsx` y capas DDD experimentales en `modules/identity`, `modules/production` y `modules/warehouse`) se encuentra detallado en [`docs/audit/03_MAPA_DE_DEPENDENCIAS.md`](../../audit/03_MAPA_DE_DEPENDENCIAS.md) (Sección 6.2) y sus 16 imports no resueltos están inventariados en [`03_DEPENDENCY_ANALYSIS.md`](./03_DEPENDENCY_ANALYSIS.md) (Sección 2.2.B).
