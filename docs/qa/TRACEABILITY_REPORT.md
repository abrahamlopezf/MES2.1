# Informe de trazabilidad

**Estado: conciliación de una transferencia ODC a WIP ejecutada; trazabilidad industrial punta a punta pendiente.**

## Cadena comprobada

La ODC QA `ORD-202611-036` (id 83) se siguió desde la interfaz hasta la base: solicitó Masterbatch Blanco para Globo, obtuvo el lote fuente `LOT-MB-BCO-09006`, generó movimiento id 161 y el WIP id 168 quedó vinculado al lote id 7 y QR hijo id 1321 por 1 kg. Esta cadena detectó que el material fuente fue un código equivalente `MAS-001` en lugar del código elegido en pantalla `MP-MAS-008`, y que el lote fuente no tenía presentación. Ver `QA-ODC-PACK-001`.

## Evidencia de rastreador de Telares

El historial real de UI mostró rollos con metraje/peso, telar, turno, nómina y ruta. La fecha fue `—` en los registros recientes. Para algunas salidas de prueba, la ruta mostrada en el identificador descriptivo de la ficha no coincide con la ruta histórica visualizada. No se consultó la genealogía detallada ni se compararon esos registros directamente en DB, por lo que no se concluye pérdida de trazabilidad.

## Cadenas no probadas en este recorrido

| Cadena | Estado |
|---|---|
| Recepción → lote/Factura → FIFO por empaque → ODC → WIP de Globo | Parcial; encontró defecto de asignación/paquete |
| Lote → mezcla → extrusora → PTI/rack → turno | Pendiente; turno preexistente bloquea corrida segura |
| PTI/rack → telar → operadores/rangos → rollo QR | Pendiente; no se generó salida nueva |
| Rollo → Laminado/Globo → nuevas salidas QR → Corte/Venta/Almacén | Pendiente; sin operación productiva |
| Doble envío, concurrencia, compensaciones y roll split | Pendiente |

No se afirma integridad global de genealogía, QRs, lotes o costos más allá de los registros conciliados arriba.
