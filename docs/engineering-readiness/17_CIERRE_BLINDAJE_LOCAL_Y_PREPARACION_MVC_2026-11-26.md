# Cierre de blindaje local y preparación MVC

**Fecha:** 26 de noviembre de 2026 (CDMX)  
**Alcance:** PostgreSQL local DEV/QA, árbol de trabajo TraceFlow MES y pruebas locales. No se usó Neon ni servicios remotos. No hubo commits, despliegues, merges, cambios a Master Data ni operaciones de limpieza sobre datos operativos.

## Resumen ejecutivo

El aislamiento entre `sistema_enterprise` y `sistema_enterprise_test` está demostrado con identidades de runtime y migración independientes, restricciones de conexión cruzada y bloqueo de escrituras maestras en QA. Después de las pruebas reversibles, DEV y QA conservan las 2,928 filas maestras y la misma huella SHA-256.

No se cierra todo el blindaje ni se autoriza aún una refactorización funcional general: la credencial local de administración no está guardada en el archivo local esperado, quedan posibles secretos históricos sin rotar, tres pruebas de rutas de Telares discrepan con la regla todavía indefinida del cliente, la caracterización global tiene 112 errores ESLint y la auditoría visual/multicorrida quedó incompleta.

## Evidencia de seguridad y datos

| Control | Resultado | Evidencia |
|---|---|---|
| Perfil DEV | APROBADO | `traceflow_app_local` conectado a `sistema_enterprise` en `127.0.0.1:5432`; sin privilegios administrativos. |
| Perfil QA | APROBADO | `traceflow_app_test` conectado a `sistema_enterprise_test` en `127.0.0.1:5432`; escrituras de Master Data bloqueadas. |
| Cruce de bases | APROBADO | `traceflow_app_local` no conecta a QA y `traceflow_app_test` no conecta a DEV. `PUBLIC` no conserva CONNECT/TEMPORARY ni USAGE/CREATE del esquema TraceFlow. |
| Migraciones | APROBADO con diferencia pendiente | `traceflow_dev_migrator` y `traceflow_qa_migrator` separados, sin permisos admin/globales. CLI reporta 163 migraciones en DEV y 164 en QA; no se ejecutó ninguna. |
| Verificación de privilegios | APROBADO | `npm run db:verify:privileges`: 20/20 comprobaciones. DDL migrador se probó dentro de transacción y se revirtió; ningún objeto temporal persistió. |
| Guardas de ambiente | APROBADO | `npm run dev:check`: 8/8; tests negativos rechazan host/URL remota ficticia, credenciales faltantes, base incorrecta y conexión efectiva no coincidente. |
| Master Data | APROBADO | 30 tablas, 2,928 filas, SHA-256 DEV=QA=`36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`. |
| Respaldos | APROBADO estructuralmente | Dumps locales custom con SHA-256 y manifiesto; `pg_restore --list` los leyó. No se restauraron sobre DEV/QA. Restauración aislada previa está documentada en el informe 16. |
| Escáner de árbol | APROBADO | `npm run security:check`: cero hallazgos en 1,229 archivos. |
| Historial Git | PENDIENTE DE REVISIÓN/ROTACIÓN | Diff histórico con filtros externos desactivados devolvió 25 rutas candidatas a patrones amplios de credenciales; la búsqueda no imprimió los valores ni certificó vigencia. La lista local temporal está en `backend/tmp/history-scan-paths.txt`. |
| Artefactos sensibles | APROBADO en disco/índice actual | `backend/error_log.txt`, `backend/master_data_dump.sql`, `error_log.txt` y `frontend/.env.qa` siguen disponibles localmente e ignorados. Los cuatro son eliminaciones staged; no hay commit. |
| Credencial administrativa local | BLOQUEADO | El secreto previo del rol `postgres` no está en `backend/.env.admin.local`; el password del rol no se modificó. No volver a aprovisionar roles hasta recuperar esa clave desde el gestor seguro del propietario. |

El usuario efectivo en runtime no usa `postgres`. La base conserva el rol `postgres` administrativo local. Las ACL NTFS de los archivos locales de secretos aún no han sido auditadas.

## Pruebas automatizadas

| Suite | Resultado | Observación |
|---|---|---|
| Guardas de aislamiento | APROBADO 10/10 | Incluye configuraciones remotas ficticias y verificación post-conexión. |
| Backend unitario | 93/96 APROBADO | Las tres fallidas pertenecen a `QA-TEL-ROUTE-001` (`TELARES → GLOBO → CORTE`). No se cambiaron reglas ni expectativas. |
| Integración local QA | 5 aprobadas, 0 fallidas, 1 omitida | Corte→Laminado, paquetes PP, relevo, traslado de mezcla y E2E de Telares pasaron. Se omitió cola/ingreso a rack de Extrusión porque EXT-04 ya tiene mezcla activa; no se tocó. Fixtures transaccionales revertidos. |
| Frontend Vitest | APROBADO 31/31 en 11 archivos | Sin cambio de expectativa. |
| Vite build | APROBADO | 1,863 módulos; JS principal 3.708 MB / 971 KB gzip y advertencia de chunk >500 KB. Último build 28.64 s; builds fríos anteriores tardaron 44.93 s y 1m38s. No quedó detenido: lo costoso es la transformación inicial. |
| ESLint | FALLIDO como gate | 112 errores y 11 advertencias en 166 archivos. Conteo de errores por regla: `no-unused-vars` 84; `react-hooks/rules-of-hooks` 18; `react-refresh/only-export-components` 6; `no-extra-boolean-cast` 2; `no-empty` 2. Advertencias: 11 `react-hooks/exhaustive-deps`. |

Se corrigieron cuatro problemas mecánicos con semántica equivalente: la clave duplicada `WORKFLOW_CANCELLED`, la expresión de desarrollo de `UniversalActionBar` a `import.meta.env.DEV`, dos expresiones truncadas en el dashboard de producción no importado en rutas activas y sus imports demostrablemente no usados. ESLint enfocado en esos tres archivos quedó limpio. No se aplicó autofix global. Los 18 errores de hooks condicionales están en `ReceptionProvider.jsx` y `RolesPage.jsx`; podrían alterar el orden de hooks y necesitan corrección y pruebas por módulo.

## Resultado funcional por módulo

| Módulo / flujo | Resultado | Evidencia / límite |
|---|---|---|
| Almacén – paquetes FIFO y PP | APROBADO en integración | Escenario transaccional QA aprobado. Falta una corrida visual autenticada completa desde la recepción por interfaz. |
| Centro de mezcla / Extrusión | PARCIAL | Paquetes, handoff y traslado entre extrusoras pasaron. No se pudo ejecutar la preparación completa de cola/rack porque EXT-04 mantiene mezcla activa en datos operativos. No limpiar ni reescribir ese estado. |
| Relevo de turno | APROBADO parcialmente | La prueba QA pasó. Lectura DEV del cierre `2026-11-22`, código interno `TURNO_4`: EXT-02 494.840 kg, EXT-04 494.840 kg, total handoff 989.680 kg; no son valores constantes. Código interno histórico conservado. Falta validar exhaustivamente reportes, cambios de día y toda zona horaria en UI. |
| Telares | APROBADO en integración, rutas pendientes | `telaresE2E.local.integration.test.js` pasó. Tres unit tests siguen discrepantes porque el cliente indicó que Globo aplica a ciertos rollos, sin identificar las fichas. |
| Corte → Laminado | APROBADO en integración local | El escenario de orden, picking y recepción QR pasó. Se quitó el lock `FOR UPDATE` al leer especificación maestra; los locks siguen en órdenes y rollos operativos. Lista pendiente de evaluar: contratos de picking desde UI. |
| Laminado | PARCIAL | Flujo QA anterior de transferencia cubierto en integración; no hubo inspección visual autenticada completa de catálogo, ODC, inicio, scrap y salida durante esta intervención. |
| Liner/Globo | NO COMPLETADO | Sin simulación industrial multicorrida ni revisión visual completa. |
| Corte / rutas alternas | PENDIENTE DE REGLA | Solo se probó contrato Corte→Laminado; no se inventaron productos/rutas. |

Chrome mostraba una sesión previa de Superadministrador y un dashboard, pero al conectar el backend QA las solicitudes del dashboard devolvieron `401`; la vista visible no constituye evidencia de sesión autenticada contra QA. Al intentar navegar a Inventario, Computer Use se detuvo porque no pudo comprobar con suficiente confianza el URL actual de Chrome. Por esa política no se reintentó la automatización. La fase visual autenticada está BLOQUEADA, no aprobada.

## Matriz de las fases solicitadas

| Fase | Estado | Evidencia / pendiente |
|---:|---|---|
| 1. Mínimo privilegio PostgreSQL | PARCIAL | Roles, ACL y denegaciones cruzadas demostrados; falta recuperar secreto administrativo local y revisar ACL NTFS. |
| 2. Seguridad del repositorio | PARCIAL | Árbol actual sin hallazgos; cuatro archivos sensibles permanecen locales e ignorados, staged como eliminaciones. Revisión/rotación de credenciales históricas pendiente. |
| 3. Diagnóstico ESLint | EJECUTADO | 112 errores, 11 advertencias clasificados; cuatro errores mecánicos corregidos. No se ocultaron controles. |
| 4. Discrepancias de rutas Telares | PENDIENTE DE REGLA | Cliente dice “solo ciertos rollos”; falta catálogo concreto. Tres pruebas quedan fallidas. |
| 5. Corte→Laminado PICKED | EJECUTADO/APROBADO EN QA | Correcciones técnicas estrechas y regresión de integración aprobada; no validación visual de la UI. |
| 6. Aislamiento de fixtures | PARCIAL | Cinco escenarios QA usan transacción reversible; fixture de cola omitido por mezcla activa existente. |
| 7. Auditoría visual autenticada | BLOQUEADA/PARCIAL | Dashboard observado; herramienta no dejó continuar por URL de Chrome no verificable. No se recorrieron acciones de los módulos. |
| 8. Simulación multicorrida ≥20 | NO EJECUTADA | Requiere reglas confirmadas, recursos QA seguros y pruebas visuales; no se fabricaron datos para alcanzar el conteo. |
| 9. Validación turnos | PARCIAL | Unit tests de horario, cruce día/nocturno y handoff; balances históricos confirmados. Código interno TURNO_4 no fue renombrado. |
| 10. Caracterización previa MVC | PARCIAL | Contratos HTTP, ORM y dominio están probados; falta inventario endpoint-por-endpoint de todos los módulos. |
| 11. Plan MVC | EJECUTADO COMO DOCUMENTACIÓN | Roadmap incremental ya existe; no se inició refactorización. |
| 12. Validación final | PARCIAL | Seguridad, privilegios, backend, frontend, integración y build ejecutados; lint y 3 rutas fallan; E2E visual/multicorrida incompletos. |
| 13. Documentación consolidada | EJECUTADO | Informes 16 y 17 actualizados, además de registros QA y remediación de secretos. |
| 14. Gates de calidad | PARCIAL | Ver matriz siguiente; gates 7–9 aún no pasan. |

## Puertas de calidad

| Gate | Estado | Evidencia |
|---:|---|---|
| 1. Aislamiento local | APROBADO | Guardas y `dev:check` 8/8. |
| 2. Mínimo privilegio PostgreSQL | APROBADO con pendiente operativa | 20/20; el secreto admin local falta para futura administración, no se necesita para runtime. |
| 3. Protección Master Data | APROBADO | Lectura permitida; QA no puede mutar columnas maestras; huellas iguales. |
| 4. Credenciales y repositorio | PARCIAL | Scanner 0 en árbol actual; 25 candidatos históricos sin rotación; artefactos excluidos del índice actual. |
| 5. Backend unitario | FALLIDO PARCIAL | 93/96; 3 rutas Telares dependen de regla pendiente. |
| 6. Integraciones | APROBADO PARCIAL | 5/5 ejecutadas pasan; 1 omitida por dato operativo activo. |
| 7. Auditoría visual autenticada | BLOQUEADO | Control de navegador detuvo navegación por no poder validar URL. |
| 8. Multicorrida | NO EJECUTADO | No se hicieron 20 corridas ni se tocaron operaciones preexistentes. |
| 9. Contratos/caracterización | PARCIAL | 10 caracterizaciones pasan dentro de suite; cobertura exhaustiva aún no levantada. |
| 10. Preparación MVC | PARCIAL | Roadmap y evidencia listos, lint y reglas de negocio pendientes. |

## Preparación para MVC

**No se inició refactorización MVC.** La primera unidad candidata de bajo riesgo sigue siendo extraer consultas de solo lectura de `catalogs.controller.js` hacia servicios/repositorios, conforme a `11_REFACTORING_ROADMAP.md`. No se debe ejecutar junto con varias áreas a la vez.

Antes de iniciar esa unidad, se requiere un estado de trabajo aislado (el árbol actual tiene numerosas modificaciones staged/unstaged/new y no es seguro usar `git checkout` como rollback), pruebas de contrato específicas verdes y confirmación de que esa unidad no depende de las rutas Globo pendientes. Esta es una recomendación de secuenciación, no una autorización para comenzar; en esta intervención la refactorización permaneció expresamente fuera de alcance.

Mantener bloqueados hasta resolver sus condiciones:

- **Telares / producciónRules y transferencias a Globo:** no cambiar rutas hasta recibir la lista de fichas autorizadas.
- **Almacén / ODC → WIP:** revisar `QA-ODC-PACK-001` (prioridad de empaque, equivalencias, FIFO y excedente) antes de refactorizar despacho.
- **Extrusión / cola, cierre de turno y custodia:** no tocar registros activos; la prueba de cola sigue omitida y el sistema conserva una mezcla operativa en EXT-04.
- **Laminado/Corte/Globo:** no declarar multicorrida ni salida real completa hasta cubrir materiales, QR, consumo, scrap, custodia y destino en UI+API+PostgreSQL.
- **Administración de bases:** no reaprovisionar roles ni cambiar PostgreSQL `postgres` sin recuperar el secreto local desde el propietario.

## Estado de Git y alcance de cambios

El repositorio contiene modificaciones preexistentes extensas. Se conservó el estado staged/unstaged/new; únicamente los cuatro archivos sensibles estaban staged como eliminaciones antes de esta revisión. `git diff --check` no reportó whitespace roto, solo avisos CRLF. No se hizo commit, push, merge, rebase, despliegue, limpieza ni reescritura de historial.

Los artefactos funcionales añadidos o afinados para esta intervención se documentan en `16_LOCAL_PG_LEAST_PRIVILEGE_2026-11-26.md`; entre ellos `dbGuard.js`, configuración Sequelize CLI, scripts de fingerprint/dev-check/backup/roles/privilegios/integración/seguridad, guardas de ambiente y pruebas asociadas. Se agregaron pruebas de caracterización y regresión de Corte→Laminado. En frontend, solo se corrigieron los tres archivos mecánicos enumerados en el apartado ESLint.

## Decisión final

**¿En condiciones de autorizar la primera unidad incremental? Parcialmente.** La infraestructura local ya separa DEV y QA con evidencia suficiente para planear un refactor aislado de una consulta de catálogo de solo lectura. La intervención MVC todavía no comenzó y no debe iniciarse sobre el árbol actual compartido hasta crear un espacio de trabajo aislado y registrar sus contratos previos. No están autorizados por esta evidencia cambios a rutas Globo, consumo FIFO/ODC, turno/custodia, ni operaciones productivas multicorrida.
