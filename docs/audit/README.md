# Auditoría, Saneamiento y Preparación Estructural — TraceFlow MES

## 1. Propósito de este directorio

Este directorio (`docs/audit/`) concentra la evidencia técnica, los inventarios verificables, los análisis de dependencias, la consolidación documental de pruebas auxiliares, los diagnósticos arquitectónicos (MVC y Frontend Runtime) y los planes de acción derivados de la intervención de **Auditoría, Saneamiento y Preparación Estructural** ejecutada sobre el repositorio **TraceFlow MES** (`MES2.1`).

Toda la intervención se ejecutó bajo las **18 restricciones absolutas** de preservación funcional:
- **0 modificaciones** a código fuente funcional, reglas de negocio, controladores, servicios, modelos, rutas, middlewares o componentes visuales.
- **0 modificaciones** a esquemas de base de datos, migraciones, seeders o archivos `.env`.
- **0 modificaciones** a `.gitignore`, al índice de Git (`.git/index`), al historial de commits o al repositorio remoto en GitHub (`origin/main`).
- Respeto absoluto e integridad verificada por hash **SHA-256** sobre los **96 archivos de trabajo activo pendientes** en el árbol de trabajo (`76` archivos rastreados con estado `M` y `20` archivos no rastreados con estado `??`, incluyendo `19` archivos funcionales/documentales y `1` respaldo de base de datos en `backend/tmp/`).

---

## 2. Índice de Entregables

| # | Archivo | Fase Relacionada | Descripción Técnica |
|---|---|---|---|
| 00 | [`00_RESUMEN_EJECUTIVO.md`](./00_RESUMEN_EJECUTIVO.md) | Todas (0 a 8) | Síntesis ejecutiva con métricas exactas, hallazgos críticos, espacio recuperado, estado de validaciones y niveles de preparación. |
| 01 | [`01_INVENTARIO_ESTRUCTURAL.md`](./01_INVENTARIO_ESTRUCTURAL.md) | Fase 0 y Fase 1 | Inventario recursivo completo de las **381 carpetas** y **1,431 archivos** iniciales, tecnologías, versiones, estado de Git y clasificación individual según la matriz de 13 categorías. |
| 02 | [`02_ESTRUCTURA_ANTES_DESPUES.md`](./02_ESTRUCTURA_ANTES_DESPUES.md) | Fase 1 y Fase 4 | Comparativa estructural del árbol del repositorio antes (`1,431` archivos / `376` carpetas no excluidas) y después de la limpieza controlada (`1,295` archivos / `372` carpetas, excluyendo los nuevos entregables en `docs/audit/`). |
| 03 | [`03_MAPA_DE_DEPENDENCIAS.md`](./03_MAPA_DE_DEPENDENCIAS.md) | Fase 2 | Grafo estático y dinámico de dependencias (`require`, `import`, alias de Vite/TypeScript, rutas Express, registro de 77 modelos Sequelize, scripts de `package.json`, workflows de GitHub Actions) y listado de los **59 imports no resueltos** y **128 módulos huérfanos**. |
| 04 | [`04_ARCHIVOS_ELIMINADOS.md`](./04_ARCHIVOS_ELIMINADOS.md) | Fase 4 | Registro individualizado de los **136 archivos** y **4 directorios temporales** eliminados en 4 lotes controlados (**22,307,413 bytes / 21.27 MiB** recuperados), con hash SHA-256, tamaño, clasificación y ruta en la bóveda de recuperación. |
| 05 | [`05_ARCHIVOS_EN_REVISION.md`](./05_ARCHIVOS_EN_REVISION.md) | Fase 1, 2 y 4 | Catálogo de elementos conservados por precaución (**143 archivos** rastreados u operativos dudosos: scripts `.codex-e2e-*.cjs`, scripts raíz en `backend/*.js`, migraciones duplicadas en `backend/src/database/legacy/`, respaldos `.sql`/`.dump`, logs rastreados y módulos huérfanos) que requieren decisión humana o commit previo antes de su remoción en Git. |
| 06 | [`INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`](./INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md) | Fase 3 | Clasificación de las **31 suites automatizadas activas** (`20` backend + `11` frontend) y consolidación técnica exhaustiva de los **106 scripts auxiliares, experimentales, diagnósticos y E2E manuales** del repositorio. |
| 07 | [`07_AUDITORIA_MVC.md`](./07_AUDITORIA_MVC.md) | Fase 5 | Diagnóstico arquitectónico profundo del Backend (Express/Sequelize) y Frontend (React/Vite/TS) con ubicación exacta, evidencia, impacto, nivel de riesgo, dependencias afectadas y prioridad de cada hallazgo. |
| 08 | [`08_PROPUESTA_REESTRUCTURACION.md`](./08_PROPUESTA_REESTRUCTURACION.md) | Fase 5 | Propuesta de arquitectura objetivo pragmática (MVC modular con capa de Servicios/Repositorios en Backend y Feature-Sliced Runtime alineado a las 20 Reglas de Oro en Frontend) y plan de migración incremental sin tiempo de inactividad. |
| 09 | [`09_SANEAMIENTO_GITHUB.md`](./09_SANEAMIENTO_GITHUB.md) | Fase 6 | Auditoría de higiene de Git y seguridad: diferenciación técnica entre borrado físico, `.gitignore`, `git rm --cached` y purga de historial; reporte de hallazgos de credenciales sin exponer valores; y guía paso a paso de saneamiento. |
| 10 | [`10_ESTRATEGIA_DE_AMBIENTES.md`](./10_ESTRATEGIA_DE_AMBIENTES.md) | Fase 7 | Diseño de arquitectura para los 3 ambientes independientes (**LOCAL**, **UAT** y **PRODUCCIÓN**): aislamiento de bases de datos, variables de entorno, CORS, JWT/QR keys, flujos CI/CD y promoción de artefactos con aprobación humana. |
| 11 | [`11_VALIDACIONES_Y_REGRESIONES.md`](./11_VALIDACIONES_Y_REGRESIONES.md) | Fase 0 y Fase 8 | Comparativa entre la línea base inicial y la validación post-limpieza: compilación de Vite, pruebas de Vitest, pruebas unitarias de Node.js, validación sintáctica VM de 667 archivos JS, carga de 77 modelos Sequelize y verificación SHA-256 de archivos funcionales. |
| 12 | [`12_PLAN_DE_RECUPERACION.md`](./12_PLAN_DE_RECUPERACION.md) | Fase 0 y Fase 4 | Documentación del mecanismo de recuperación verificable fuera del árbol de Git (`recovery_vault`), manifiestos SHA-256 y comandos exactos en PowerShell/Node.js para restaurar cualquier archivo individual, lote o estado completo. |
| 13 | [`13_PLAN_DE_TRABAJO_SIGUIENTE.md`](./13_PLAN_DE_TRABAJO_SIGUIENTE.md) | Post-Auditoría | Hoja de ruta priorizada para las siguientes intervenciones autorizadas: (1) Cierre de cambios en curso y rotación de secretos, (2) Saneamiento de Git/GitHub, (3) Separación de ambientes Local/UAT/Prod, y (4) Reestructuración MVC controlada. |

---

## 3. Convenciones utilizadas en esta documentación

1. **Seguridad de credenciales (Restricción #16)**: Ningún documento incluye valores de contraseñas, tokens JWT, llaves de cifrado QR ni cadenas de conexión `DATABASE_URL`/`REMOTE_DATABASE_URL`. Los hallazgos de seguridad referencian exclusivamente la ruta del archivo, el número de línea y el nombre de la variable o patrón detectado.
2. **Integridad cuantitativa**: Todos los conteos, tamaños en bytes y porcentajes provienen de mediciones deterministas sobre el sistema de archivos y el índice de Git al momento de la auditoría.
3. **Trazabilidad de evidencias**: Cada hallazgo arquitectónico o estructural cita los archivos y líneas exactas del repositorio.
