# Ciclo de vida del QR y resolución por contexto

## Estados que sí existen en código

`backend/src/modules/qrcodes/qr.constants.js:1-29` define `UNASSIGNED`, `ASSIGNED`, `ACTIVE`, `CONSUMED`, `ARCHIVED`, `CANCELADO` y `DANADO`; el lote usa `CREATED`, `ASSIGNED`, `PARTIALLY_USED`, `USED`, `CANCELLED`. No se presume que estos nombres correspondan uno a uno con “virgen”, “asociado” o “bloqueado”. Las convenciones también varían entre `qrDomain.service.js` (`GENERATED`, `UNASSIGNED`, `ASSIGNED`) y `traceability.service.js` (valores como `DISPONIBLE`, `GENERADO`, `FINALIZADO`): confirmar normalización y enum físico antes de cambios.

## Flujo estructural observado

1. `POST /qr/batches` crea lote y N códigos en una transacción; marca el área si está asignada e inserta eventos. El servicio inicia códigos con `UNASSIGNED` aunque el lote tenga área (`qrcodes.service.js:283-425`).
2. `POST /qr/assign` valida área y selección disponible, actualiza estado y crea eventos dentro de una transacción (`qrcodes.service.js:693-789`).
3. `POST /qr/validate` valida existencia, área y estado; crea evento de validación, pero el código revisado no modifica por sí mismo cantidad o custodia (`qrcodes.service.js:791-843`).
4. `GET /traceability/scan/:qrCode` busca QR, asignación, artículo trazable, movimientos, vínculos y eventos; calcula `allowed_actions` para presentar consulta/acciones (`traceability.service.js:460-690`).
5. La relación única `TraceableItem.qr_code_id` da una protección de unicidad por producto, y `assignQrCodes` emplea transacción. Las rutas de producción concretas tienen que revisarse separadamente para acreditar bloqueo y protección de concurrencia.

## Resolución y mutación

- Las rutas incluyen lectura/lookup, validación y mutaciones de asignación, cancelación, recepción, preparación, inicio de corrida y registro de salida (`qrcodes.routes.js`, `traceability.routes.js`). No usar “escanear”, “validar QR” y “recibir/consumir” como si fueran la misma acción.
- `getAllowedActions` da acciones según área asignada, status, rol y presencia de `TraceableItem`; sin embargo `scanQrCode` recibe `scannedCode` y `user`, no un parámetro de área/operación explícito. La comprobación visual en un área productiva real debe confirmar cómo el frontend incorpora ese contexto y qué respuesta restringe el servidor.
- `useSmartScanner.ts` consume `/qr/lookup/:code`, inspecciona `qr_kind` / `actionsByArea` y navega al flujo sugerido. La navegación del cliente no sustituye autorización de endpoints.
- La lectura en ventana general debe ser de solo lectura. Verificar con diff de saldos, asignaciones, eventos, movimientos y estados antes/después, usando QR sintético en QA desechable.

## Riesgos que requieren prueba, no conclusión anticipada

1. Comparar estados usados por dominios legacy y QR-first para detectar transiciones incompatibles.
2. Confirmar si QR generado pero preasignado a área puede utilizarse directamente; el servicio deja `UNASSIGNED` en lote nuevo.
3. Probar simultaneidad sobre el mismo QR con lock/constraint en cada flujo de producción, no solo en `/qr/assign`.
4. Confirmar impresión repetida conserva la misma identidad y serial.
5. Comprobar que cancelación/interrupción no deje una salida huérfana ni QR consumido sin objeto.

## Entidades distintas

`QrCode` es la etiqueta/identidad serializada; `QrBatch` agrupa generación; `PtiRack` es rack/carrito; `TraceableItem` modela unidad con cantidad/custodia; `TraceabilityMovement` registra traslado/cantidad y saldo posterior; `TraceabilityLink` modela transformación/transferencia entre unidades; `TraceabilityEvent` conserva eventos; `ViajeroRoll` representa rollo tejido. La UI no debe llamar al rack “producto” sin conocer la semántica de la acción.
