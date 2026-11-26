# ÍNDICE MAESTRO — PREPARACIÓN FINAL Y CIERRE DE BLOQUEOS PRE-MVC (`docs/engineering-readiness/pre-mvc-final/`)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Estado:** **PREPARACIÓN PRE-MVC COMPLETADA — EN ESPERA DE AUTORIZACIÓN EXPRESA PARA INICIAR UNIDAD MVC 1**

---

## 1. Catálogo de los 15 Entregables de Preparación Final (`pre-mvc-final/`)

| # | Documento | Fase | Propósito y Contenido |
| :---: | :--- | :---: | :--- |
| 00 | [`README.md`](./README.md) | Índice | Mapa de navegación de los 15 entregables de cierre de bloqueos pre-MVC. |
| 01 | [`01_CURRENT_STATE_RECONCILIATION.md`](./01_CURRENT_STATE_RECONCILIATION.md) | Fase A | Sincronización con el árbol de trabajo actual y registro de las 5 intervenciones complementarias ya ejecutadas por Codex. |
| 02 | [`02_REMAINING_FILES_RESOLUTION.md`](./02_REMAINING_FILES_RESOLUTION.md) | Fase B | Conciliación matemática exacta del inventario pendiente (`182` archivos) y clasificación individual de los `46` archivos huérfanos de backend y `82` de frontend. |
| 03 | [`03_IMPORTS_VERIFICATION.md`](./03_IMPORTS_VERIFICATION.md) | Fase C | Contraste del escáner estático contra Node.js, Vite y Vitest (**`0` imports rotos en grafo activo**) y clasificación de las 24 referencias estáticas restantes. |
| 04 | [`04_GIT_INDEX_SANITATION.md`](./04_GIT_INDEX_SANITATION.md) | Fase D | Verificación de la desvinculación en el índice (`git rm --cached`) de los 4 archivos sensibles (`0` hallazgos en `security-check.js`) y registro de exposición histórica. |
| 05 | [`05_POSTGRESQL_PERMISSION_MATRIX.md`](./05_POSTGRESQL_PERMISSION_MATRIX.md) | Fase E | Matriz de privilegios efectivos de `PUBLIC`, `traceflow_app_local`, `traceflow_app_test`, `traceflow_dev_migrator` y `traceflow_qa_migrator`, pruebas negativas verificadas y plan SQL de ajuste fino (no ejecutado). |
| 06 | [`06_MASTER_DATA_PROTECTION_MATRIX.md`](./06_MASTER_DATA_PROTECTION_MATRIX.md) | Fase F | Diagnóstico forense de `extruder_formulas` vs. la tabla física real `extrusoras_formulas`, matriz de protección por tabla/operación y estrategia anti-evasión. |
| 07 | [`07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md`](./07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md) | Fase G | Análisis de compatibilidad, impacto y bloqueo de la migración #164 (`20261124130000-...`) y procedimiento listo (no ejecutado) para igualar DEV con QA. |
| 08 | [`08_REPRODUCIBLE_TEST_BASELINE.md`](./08_REPRODUCIBLE_TEST_BASELINE.md) | Fase H | Ejecución real de `extrusionFloor.local.integration.test.js` sobre una instancia temporal desechable (`sistema_enterprise_disposable_verify_test`) sin alterar DEV ni QA, y desglose exacto de suites vs. casos individuales. |
| 09 | [`09_PRODUCT_OWNER_DECISIONS.md`](./09_PRODUCT_OWNER_DECISIONS.md) | Fase I | Delimitación entre reglas confirmadas, implementaciones técnicas y decisiones pendientes, con 4 preguntas concretas e ilustradas con ejemplos industriales para Producto. |
| 10 | [`10_FINAL_MVC_STRUCTURE.md`](./10_FINAL_MVC_STRUCTURE.md) | Fase J | Diseño definitivo de arquitectura MVC modular proporcional (Perfiles A, B y C) con las 13 dimensiones exigidas para cada módulo del proyecto. |
| 11 | [`11_FILE_MIGRATION_MAP.md`](./11_FILE_MIGRATION_MAP.md) | Fase J | Mapa exacto de archivos que permanecen, se editan, se retiran o se dividen por fachada en las Unidades MVC 1 a 8. |
| 12 | [`12_AGENT_COORDINATION_PROTOCOL.md`](./12_AGENT_COORDINATION_PROTOCOL.md) | Fase K | Protocolo operativo de coordinación entre Codex y Antigravity (worktrees, matriz de propiedad exclusiva, pre-flight checks y condiciones de arranque). |
| 13 | [`13_VALIDATION_RESULTS.md`](./13_VALIDATION_RESULTS.md) | Validación | Resumen consolidado de validaciones actuales (`dev:check` `8/8 OK`, `security:check` `0` hallazgos, suites unitarias, integración y build frontend). |
| 14 | [`14_FINAL_MVC_AUTHORIZATION_GATE.md`](./14_FINAL_MVC_AUTHORIZATION_GATE.md) | Compuerta | Matriz final de requisitos (`APROBADO` / `PENDIENTE` / `BLOQUEADO` / `NO VERIFICABLE`) y especificación exacta de los archivos y criterios para autorizar la **Unidad MVC 1**. |
