# Matriz de cumplimiento por módulo

La matriz es estática y se complementa con hallazgos previos. “Parcial” no significa que el flujo de producción haya sido completado en esta intervención.

| Área | Lote QR propio / impresión | Asignación y producción | Insumos, movimientos y custodia | Genealogía | UI / E2E | Estado global |
|---|---|---|---|---|---|---|
| Almacén | Generación central de lotes QR está expuesta por `/qr/batches`; recepción usa QR de lote | Lotes y QR se relacionan con ingresos | Recepción, FIFO, ODC y transferencias existen; sin revalidar para preservar el flujo aprobado | Entradas están representadas en `TraceableItem`/lote/órdenes; hay cadena parcial conciliada previamente en `TRACEABILITY_REPORT.md` | Informe previo concilió una ODC a WIP; presentó defecto `QA-ODC-PACK-001`. Sin recorrido nuevo | **Parcialmente validado** |
| Extrusión / Mezcla | Permisos y generador de QR multiárea existen; producción emite identidades/racks por caminos distintos | Mezcla, máquina, turno, PTI y registro de producción están modelados en servicios del área | Preparaciones enlazan lotes/silos/WIP y balances; custodia de rack y handoff tienen pruebas/informes históricos | El árbol obtiene preparación, inputs, entradas de producción, rack y fuente de lote/silo. Vínculos completos de cada output no probados | No se ejecutó; caso QA previo quedó bloqueado por turno activo/precondición de sesión | **Implementado parcialmente; corrida QR-first no verificada** |
| Telares | Usa QR virgen al finalizar rollo (`virgin_qr_code_id`); endpoint de lotes general disponible | Telar/BOM/metros/peso/turno/operador y rollo viajero | `LoomBackflushConsumption` incluye rack, producto PTI y WIP fuente; consumo y saldo necesitan prueba transaccional | QR lookup incluye rollo, telar, BOM, run, segmentos, routing logs y consumos | Reporte histórico vio viajero; registro de fecha `—` y ruta/ficha discrepante pendientes; no salida nueva | **Implementado parcialmente; genealogía y participación no validadas end-to-end** |
| Laminado | Se selecciona QR virgen para salida, de área LAMINADO | Transformación registra input, rollo, output PTI, metros/peso y QR nuevo | Consume WIP de materiales, maneja scrap y conserva transferencia a Corte/Venta en proceso transaccional | Crea `TraceabilityLink` de materiales y rollo fuente hacia salida | No hubo prueba autenticada nueva | **Implementación visible; sin validación de operación** |
| Globo/Liner | Lote de QR genérico se puede asignar; flujo de salida no verificado | Catálogo/WIP y operaciones del proceso disponibles | ODC/WIP existen según historial; falta recorrido y compatibilidad de lotes | QR lookup reconoce preparaciones/entidades; enlaces de producto no probados | No hubo prueba visual nueva; diferencia industrial Globo/Liner pendiente | **Implementado sin validación integral / definición pendiente** |
| Corte / puente a Laminado | Recibe rollos y QR de Telares; retorno de outputs laminados utiliza estados de orden | Creación de órdenes, picking y retorno con confirmación existen | Estado de custodia y movimientos requieren verificación multirol | Reporte previo de integración local aprobó un caso; test contradice visibilidad de `PICKED` | Caso reportado previamente aprobado en integración local; no ejecución aquí | **Parcial; discrepancia contractual `PICKED` abierta** |

## RBAC y acceso QR (comprobación estática + política unitaria)

| Acción | Regla | Estado |
|---|---|---|
| Crear lote QR virgen | Solo Superadmin, Admin general y Admin Almacén; backend y frontend | **Implementada localmente; política unitaria aprobada, API/UI autenticadas pendientes** |
| Leer / escanear / asignar / consultar genealogía | Conserva los permisos y flujos existentes | **Sin cambio; no se ejecutó API/UI en esta iteración** |
| Administración de usuarios por supervisores | Hay bypass explícito en rutas/servicio para Extrusión y Telares | **Discrepancia con política solicitada; fuera de alcance funcional de esta iteración** |
| Costos por área | La regla compartida permite a admins de área; middleware financiero global es más restrictivo | **Revisión por endpoint pendiente** |

La cantidad de cuentas activas locales agregada por rol y el detalle de permisos está documentada en `../../requirements/RBAC_AND_QR_BUSINESS_RULES.md`.

## Ejes que no pueden declararse aprobados

No se tiene evidencia nueva de: reimpresión vs identidad nueva, doble asignación concurrente, interrupción entre escritura de producción y QR, trazabilidad forward, permisos por área desde cada sesión, historial completo en móvil, ni recuperación de una corrida tras recargar. Véanse escenarios E2E en `05_E2E_AND_VISUAL_VALIDATION.md`.
