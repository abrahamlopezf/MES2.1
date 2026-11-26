# Informe ejecutivo QR-First

**Fecha:** 26 de noviembre de 2026 · **Resultado:** **QR-FIRST PARCIALMENTE VALIDADO**.

**Actualización RBAC (26 de noviembre):** ahora existe una restricción local en backend y frontend para que solo `SUPERADMIN`, `ADMIN`/`ADMIN_GENERAL`/`ADMIN_GRAL` y `ADMIN_ALM`/`ADMIN_ALMACEN` puedan generar lotes QR. Cuatro pruebas unitarias de la política pasan y Vite compila. La API autenticada y el recorrido visual por rol no se ejecutaron; no se declara esa política lista para despliegue.

## Cobertura y severidad RBAC observada

La base local tiene: Almacén 1 Admin/1 Supervisor; Extrusión 1 Admin/2 Supervisores; Telares 0 Admin/1 Supervisor; Laminado 0 Admin/1 Supervisor; Globo/Liner 0 Admin/1 Supervisor. Corte tiene 0 Admin/0 Supervisor/0 Operadores. Por RN-RBAC-001, Telares, Laminado y Globo incumplen el mínimo administrativo; no se inventaron ni crearon usuarios. Corte requiere confirmar si se considera área operativa dentro de esta regla inicial.

Hallazgo de severidad alta: las rutas de usuarios dan bypass a supervisores de Extrusión/Telares para GET/POST/PUT; el servicio limita roles asignables a su propia área, pero eso sigue contradiciendo la regla definitiva de que supervisores no administren usuarios. No se corrigió por ser cambio funcional adicional a la única modificación permitida. Protección del último responsable no se encontró demostrada y no se probó la concurrencia; queda bloqueante antes de certificar RBAC. Costos por Admin de área necesitan filtro por insumos/PTI de su área y verificación de las respuestas servidor. Ver matriz `11_ROLE_PERMISSION_MATRIX.md`.

## Dictamen

La base técnica posee generación de lotes QR, controles de área/permiso, entidades de identidad y genealogía, escáner unificado, segmentos de operador en Telares y transformación con QR nuevo en Laminado. No existe evidencia suficiente de una corrida industrial completa desde Almacén hasta Globo/Laminado que compruebe a la vez la interfaz, las APIs y los balances persistidos. El sistema **no puede declararse QR-First validado para operación integral** con la evidencia actual.

## Estado por área

| Área | Evaluación | Evidencia principal |
|---|---|---|
| Almacén | Parcial; flujo aprobado se deja intacto. Un caso anterior conciliado encontró discrepancia FIFO/empaque. | `docs/qa/TRACEABILITY_REPORT.md`, `DEFECT_REGISTER.md` (`QA-ODC-PACK-001`). |
| Extrusión | Parcial; modelos/servicios conectan mezcla, insumos, producción y rack en lookup. Corrida QR-first de extremo a extremo no probada. | `qrTraceabilityTree.service.js`; reportes de turno y pruebas backend históricas. |
| Telares | Parcial; producción, QR virgen, consumos y operador por segmentos implementados; historial final y cantidades no comprobados juntos. | `telares.service.js`; reportes previos con inconsistencias de fecha/ruta; `QA-TEL-ROUTE-001`. |
| Laminado | Estructura de transformación transaccional visible y salida QR con links; sin UI/API/DB recorrido nuevo. | `laminado.service.js:705-840`. |
| Globo/Liner | Sin validación integral; no presumir que son el mismo proceso técnico. | Módulo y consulta QR estáticos; especificaciones/reglas aún incompletas. |

## Capacidades QR

- **Lotes, seriales y eventos:** implementados; impresión, reimpresión e interrupciones no se probaron en esta intervención.
- **Asignación de QR virgen:** transacciones y unicidad de TraceableItem aparecen en código; concurrencia de outputs productivos no probada.
- **Resolución contextual:** escáner y `allowed_actions` existen. No se ejecutaron pruebas de contexto incorrecto ni de solo lectura desde navegador.
- **Genealogía recursiva:** modelos y consulta recursiva existen; profundidad y límites de consulta pueden truncar casos grandes; cadena completa sin verificar.
- **Operador por tramo:** almacenamiento por rango de metros está implementado en Telares; recuperación del historial a partir del QR final no validada funcionalmente.

## Resultado de pruebas

- **E2E industrial/multicorrida de esta intervención:** no ejecutado; QA compartida no superó el gate de protección y no se preparó una instancia desechable.
- **Auditoría visual autenticada:** **NOT EXECUTED**; no se creó sesión sintética sin QA apta para escritura.
- **Backend actual:** 92/96 en `test:unit`; 3 discrepancias en reglas Telares→Globo pendientes de identificar fichas autorizadas, 1 fallo confirma que falta proteger `extrusoras_formulas` en QA. Un test destructivo previo fue reemplazado por verificación read-only de catálogos, sin rebajar la expectativa.
- **Frontend actual:** 49/49; Vite build exitoso con bundle principal de 3.71 MB minificado y advertencia de tamaño.
- **Controles actuales:** `dev:check` 8/8; `db:verify:privileges` 20/20; pruebas dirigidas DB guard/fingerprint/QR batch 17/17.
- **Integración/multicorridas:** no ejecutadas. Las cifras de informes anteriores son históricas y no se suman como aprobaciones actuales.

## Defectos/bloqueos principales

1. No hay prueba de atomicidad/unicidad concurrente para asignar QR al registrar producción por todos los módulos.
2. Cadena QR y conciliación de cantidades Extrusión→Telares no verificada en un recorrido completo.
3. Genealogía tiene límites de profundidad/listado y no hay comprobación de completitud ni ciclos huérfanos.
4. Ruta a Globo depende de identificar fichas elegibles (`QA-TEL-ROUTE-001`).
5. Participación por rangos de metros existe en modelo/servicio, pero no se verificó vista final por QR ni turnos múltiples.
6. Auditoría visual y multicorridas pendientes.

Los hallazgos existentes `QA-ODC-PACK-001`, `QA-CORTE-LAM-001`, `QA-TEL-UI-001` y `QA-EXT-SHIFT-001` se conservan en `docs/qa/DEFECT_REGISTER.md`; no se reabren ni re-clasifican sin nueva evidencia.

## Master Data y alcance

La discrepancia del fingerprint quedó corregida: la versión v2 usa `extrusoras_formulas`, falla cerrado ante tablas ausentes y detecta diferencias de versión. Consulta PostgreSQL local de solo lectura confirmó 44 filas/7 columnas en esa tabla, y 2,972 filas en 30 tablas con hashes iguales entre DEV y QA. La línea histórica v1 de 2,928 filas/hash anterior se conserva solo para trazabilidad; evidencia v2 en `evidence/master-data-*-v2.json`.

**Bloqueo QA de escritura:** hay 58 triggers QA activos que cubren 29 tablas; falta el par de triggers en `extrusoras_formulas`. La app QA no puede modificar los datos maestros por grants, pero no se usará QA compartida para escribir porque la política exige protección completa antes de pruebas. DEV tiene 163 migraciones y QA 164; QA tiene aplicada solo la migración de confirmación Corte→Laminado `20261124130000-add-laminado-cut-transfer-confirmations.js`.

## Actualización de evidencia 2026-11-26

Se corrigió el test de protección para que ya no intente `DELETE` destructivo ni dependa de un `t` inexistente; ahora inspecciona metadatos sin escribir y falla con el déficit real 58/60. El acceso de supervisores de Extrusión/Telares a administración de usuarios continúa siendo un incumplimiento estático de la directiva RBAC vigente y debe corregirse en trabajo funcional autorizado. No hubo pruebas API autenticadas ni cambios de comportamiento.

## Siguiente autorización

Antes de iniciar cualquier refactorización MVC, completar QA desechable aislada y E2E-01/02/05/06/07/08/09/10/11/12; resolver o aislar la regla E2E-03 con la lista oficial de fichas a Globo; y hacer la auditoría visual autenticada escritorio/móvil. Cambios funcionales quedan fuera del alcance y requieren autorización por separado.
