# Propuesta de esquema aditivo para QR-First V2.0

**Estatus:** Diseño de solicitudes QR implementado en modelos/servicio y migración `20261127100000-create-qr-identity-requests.js`; no se ejecutó ni aplicó. Los diseños de metros/rollos y transformación 1:N siguen siendo propuestas, no DDL listo.
**Ambiente:** El informe histórico del 26/11/2026 registró `58/60` y `readyForWrites=false`; una revalidación de solo lectura posterior el mismo día confirmó `60/60`, `readyForWrites=true`, runtime `traceflow_app_test` y 30 tablas protegidas. QA conserva una migración que no está en DEV (`20261124130000-add-laminado-cut-transfer-confirmations.js`). No aplicar DDL en QA compartida: para cambios de esquema se requiere copia QA desechable, migraciones coherentes y runtime de mínimo privilegio.

## 1. Solicitud y surtido persistente de QR vírgenes

La inspección encontró lotes y asignaciones persistentes (`qr_batches`, `qr_codes`, `qr_area_assignments`), pero no una operación backend que persista la solicitud del área y la ligue a cada QR surtido. La implementación actual agrega encabezado/ítems persistentes y reemplaza la vista de demostración con operaciones API.

### Estructura candidata

- `qr_identity_requests`: clave, área solicitante, usuario solicitante, cantidad solicitada, `requested_at`, observaciones y campos de entrega (`delivered_by`, `delivered_at`). No duplicar el estado derivable del ciclo si basta con cantidades/fechas.
- `qr_identity_request_items`: solicitud, `qr_code_id`, asignador/entregador, fecha de entrega; restricción única por `qr_code_id` para impedir entrega duplicada entre solicitudes activas. Conservar también la asignación y los eventos QR existentes.
- Índices por área/fecha y solicitud/QR; claves foráneas a área, usuario y QR; operaciones de entrega bajo transacción bloqueando solicitud y QR.

La interfaz de Almacén consulta solicitudes reales y confirma códigos individuales seleccionados; la interfaz del área muestra los códigos ligados a su solicitud. La autorización es una lista explícita de roles operativos/área que ya existen en las políticas de acceso; no agrega grants de permisos. No se propone aprobación ni devolución. El surtido es exacto, sin parciales; la entrega se registra solamente al confirmar la acción de Almacén. Recepción por el área continúa fuera del contrato.

La migración `up` y `down` usan transacción Sequelize para que PostgreSQL revierta un fallo DDL intermedio. Las pruebas actuales usan QueryInterface simulado para verificar la forma del esquema y del rollback; todavía no sustituyen la ejecución `up`/`down` contra PostgreSQL desechable.

## 2. Demanda de Corte por rollos o metros

La orden actual persiste `requested_roll_count` y crea un renglón por rollo requerido. Propuesta compatible hacia atrás:

- Añadir a `corte_laminado_orders` unidad (`ROLLS`/`METERS`) y cantidad solicitada decimal para metros; mantener `requested_roll_count` y su semántica histórica para órdenes por rollo.
- Para orden por metros, crear renglones de selección conforme se reserven rollos enteros. Las cantidades despachadas/recibidas se obtienen de las longitudes reales asociadas a esos rollos, sin longitud promedio ni corte parcial.
- Mantener compatibilidad del lector de órdenes viejas con `request_unit=ROLLS` por default de migración; no reescribir historial.
- Bloqueo de la orden y rollos al reservar; unicidad de reserva vigente por rollo, suma por longitud real y actualización de estado en la misma transacción.

Antes de codificar, decidir en el contrato si una orden por metros puede despacharse parcialmente (dejar saldo pendiente) y qué acción finaliza una solicitud cuando el total físico supera la demanda por usar rollos enteros. El ejemplo confirmado 30 m + 25 m para 50 m solo demuestra selección de rollos enteros que cubre la demanda; no define otros casos de excedente.

## 3. Evento de transformación con múltiples salidas

`laminado.service.js::transformRoll` actualmente opera con un rollo fuente y un QR de salida y muta el registro fuente. `traceability_links` admite varios vínculos, pero eso por sí solo no conserva agrupación de corrida, consumo agregado, orden y cada salida con identidad física independiente.

Diseñar primero una entidad transaccional `roll_transformations` (proceso, área, ficha, orden, corrida/turno/operador, fechas, estado e información auditada) y dos relaciones:

- `roll_transformation_inputs`: transformación, rollo de origen, cantidad realmente tomada y unidad, relación con su QR original.
- `roll_transformation_outputs`: transformación, rollo/PTI hijo, QR virgen único, cantidad real/unidad/dimensiones, vínculo a solicitud/renglón.

Las salidas deben crear identidades `viajero_rolls` independientes sin sobrescribir la fila de origen; la transformación conserva el vínculo QR/genealogía de entradas, insumos WIP y outputs. Constraint de QR único; la fuente se bloquea y consume una sola vez; fallo intermedio revierte consumo, QR y productos. El modelo permite N salidas confirmadas; solo habilitar múltiples entradas cuando un flujo aprobado lo requiera. No imponer balance metros/kg no confirmado ni tamaño de lote.

## 4. Continuidad de Telares

Primero mapear si `loom_runs`, eventos y segmentos actuales ya expresan cambios de turno. Solo si no, proponer una tabla de segmentos de turno ligada a la misma corrida (turno, entrada/salida de relevo, metros inicial/final, usuarios y tiempo). La política de tramos simultáneos queda pendiente y no puede ser fijada por el esquema.

## 5. Impacto y validación requerida antes de aplicar

- Migraciones estrictamente aditivas; preservar datos históricos y Master Data, sin alterar catálogos existentes.
- Probar `up`/`down` en una base vacía y una copia desechable restaurada; el `down` solo eliminaría tablas/columnas nuevas de esa copia.
- Añadir restricciones únicas/FK y validar que no cambien los permisos del runtime.
- Comprobar las 60 guardas, identidad QA, diferencias de migración, fingerprint Master Data antes y después, rollback transaccional y concurrencia.
- No aplicar en `sistema_enterprise`, `sistema_enterprise_test` compartida, DEV ni nube.

La estimación de qué candidatos realmente requieren DDL se resolverá después de cerrar contratos y revisar asociaciones existentes. Ninguna migración se ejecutó para preparar este documento.
