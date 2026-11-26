# Requisitos QR-First y clasificación de fuentes

## Principio de evaluación

El QR identifica al objeto físico; una transferencia identifica un movimiento; una mezcla, lote o corrida identifica una operación o agrupación. No deben tratarse como sinónimos. Cuando existe transformación física, se debe poder recorrer la relación de origen a producto resultante; una transferencia del mismo objeto no necesariamente crea un producto nuevo.

## Requisitos y estado documental

| Requisito | Fuente / clasificación | Evidencia actual | Estado de validación |
|---|---|---|---|
| Lotes de QR vírgenes por área, únicos, auditables e imprimibles | Requerido por el prompt; generación estructurada | Servicio de lote transaccional y áreas/permisos en `qrcodes.service.js:283-425`; rutas de lote/impresión en `qrcodes.routes.js` | Implementado sin validación integral de impresión, interrupción y concurrencia. |
| QR de salida asignado solo al confirmar el producto físico | Requerido por el prompt; regla operativa a validar | Estados, QR por `TraceableItem.qr_code_id` único, endpoints de asociación/producción | Parcial; precedentes del proyecto registran que una lectura/selección cancelada pareció cambiar un QR. No se reprodujo en esta revisión. |
| Permisos/área/estado verificados en servidor | Requerido; implementación visible | `qrcodes.routes.js`; `qrcodes.service.js:693-843`; `traceability.service.js:118-190` | Implementado parcialmente; falta validar por rol desde UI y API en sesiones autorizadas. |
| Consulta QR no debe mutar custodia/inventario | Requerido expresamente | `/traceability/scan/:qrCode` y `scanQrCode`; existe registro de eventos solo en endpoint `/qr/validate` | No validado por ejecución. Distinguir scan de validación para operación. |
| Generación de PTI Extrusión con genealogía de mezcla/materiales | Requerido por el prompt | Modelos y árbol consultan preparaciones, consumos, lotes, silos y entries | Implementado parcialmente; faltó una corrida QR-first completa corroborada. |
| Consumo parcial de racks por Telares y remanente | Requerido por el proceso | Servicios de Telares modelan consumo y origen rack/WIP; historial previo describe reglas FIFO y custodia | Implementado sin validación E2E actual; probar múltiples PTI compatibles y remanentes. |
| Ficha, telar, turno, cantidades y personas en rollo/banda | Requerido; persona por tramos indicado en requisitos | `ViajeroRoll`, `LoomRun`, segmentos de operadores, logs y consumos | Segmentos por metros existen; exactitud productiva y consulta del QR no ejecutadas aquí. |
| Laminado recibe QR, transforma con insumos, genera QR hijo, merma y enlaces | Requerido; parte respaldada por flujo descrito por el cliente | `laminado.service.js:705-840` crea salida e `TraceabilityLink` dentro de transacción | Estructura implementada; no se verificó por UI/API/DB. |
| Globo/Liner conserva su propio flujo y genealogía | Requerido; Prompt prohíbe asumir equivalencia técnica con Globo | Módulo, catálogo, WIP y árbol existen | Implementación sin validación; reglas técnicas diferenciales pendientes de fuente industrial. |
| Recorrido recursivo de genealogía hacia atrás y adelante | Requerido | `traceability.service.js:597-651` (límite profundidad 8, 100 enlaces por nivel; listas iniciales limitadas a 10); árbol QR consulta varias entidades | Parcial estructural, no comprobado como completo. Los topes pueden truncar genealogías grandes. |
| Devoluciones, divisiones, combinaciones y reproceso | Requerido para auditabilidad industrial | Esquema genérico de enlaces permite cantidades, scrap y metadata | No demostrado para todas las operaciones; reglas y pruebas específicas faltan. |
| Códigos de Almacén se conservan | Excepción aprobada | No se modificó nada durante esta auditoría | Compatible con el alcance: solo lectura. |

## Precedencia de información

Cuando historial del cliente, pruebas y código difieren, se registran las tres versiones. No se cambia regla en esta auditoría. La ruta Telares→Globo es un ejemplo: el usuario dijo que aplica solo a algunos rollos, pero no se identificaron las fichas elegibles; la implementación permite la ruta en `ROLLO_TELA` de manera general y existen pruebas contradictorias (`QA-TEL-ROUTE-001`).

## Protección de Master Data que afecta la habilitación de pruebas

Se detectó por inspección estática una posible omisión: el fingerprint enumera `extruder_formulas`, mientras migraciones de esquema hacen referencia a la tabla física `extrusoras_formulas`. No se ejecutó consulta de catálogo ni se tocó DB. Hasta verificar cobertura efectiva del verificador y baseline con acceso read-only, no se debe usar la huella histórica como prueba de que esa tabla está protegida para corridas con escritura; usar únicamente una base QA desechable si se autoriza continuar.
