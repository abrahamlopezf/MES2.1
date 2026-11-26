# Informe de recorrido E2E y multicorrida

**Resultado: parcial; no aprobado como corrida productiva integral.** Se hizo un recorrido real por la interfaz local para Almacén y el surtido de una ODC hacia WIP de Globo. Se detuvo la prueba integrada antes de Extrusión/Telares por un turno previo abierto y por una discrepancia material/presentación encontrada en la conciliación.

## Acciones verificadas

| Flujo | Resultado |
|---|---|
| Verificación API, Vite y PostgreSQL local | Correcta. DB `sistema_enterprise`, `127.0.0.1:5432`, modo desarrollo. |
| Recepción de material en piso | Registró lote de QA `QA_RUN_20261125_WH_001`, 10 kg, presentación de 10 kg, costo 40 MXN/kg; el lote nuevo quedó disponible e intacto tras la ODC. |
| ODC para Globo | Se creó `ORD-202611-036` por 1 kg de Masterbatch Blanco. Vista previa prometía reservar una presentación de 10 kg y transferir el excedente de 9 kg al WIP. |
| Preparación, QR y surtido | Escaneo de cámara no se autorizó; se usó ingreso manual del QR impreso. La orden pasó a surtida y apareció un QR hijo en WIP Globo. |
| Reconciliación del surtido | Encontró discrepancia P1: se tomó 1 kg de un lote equivalente preexistente sin presentación y no se transfirieron los 9 kg excedentes prometidos. Detalles en `DEFECT_REGISTER.md` y `DATA_INTEGRITY_REPORT.md`. |
| Estado de Globo | La estación cargó, mostrando ODC y panel de operación. No se inició procesamiento ni se generó PTI. |
| Revisión de catálogos / WIP | Telares mostró 18 fichas y 21 telares; Globo cargó 2 especificaciones inactivas de ejemplo; Laminado mostró 1 ficha de prueba local. WIP Laminado mostró 0 rollos físicos, 2 insumos y 7 finalizados; WIP Globo cargó 51 kg de insumos y 2 rollos en tránsito. Solo se consultó. |
| Historial QR de Telares | Se observaron fechas `—` y rutas históricas diferentes al texto de algunas fichas actuales; se registró como riesgo pendiente en `QA-TEL-UI-001`. No se abrió ni alteró ninguna genealogía. |
| Cierre / preparación de relevo Extrusión | Con sesión Superadmin, el turno 14 (23/11) se marcó “listo para entrega”. La UI confirmó el traspaso digital sin detener ni pesar las mezclas; la sesión quedó abierta, esperando recepción. La DB confirmó `handoff_ready_at`, sin `closed_at` ni filas de handoff aceptadas. |
| Inicio por supervisor entrante | SUPREL autenticó en sesión independiente. La pantalla exigió QR de las dos mezclas activas, en contra de la regla acordada de saldo digital sin QR, por lo que no se escaneó ni se confirmó. No se inició un turno nuevo. El dashboard indicaba la recepción previa turno 13→14, no la recepción pendiente del relevo saliente 14→siguiente. |

## No ejecutado

| Escenario | Estado / razón |
|---|---|
| Extrusión: mezcla, cola, PTI, rack, scrap y cierre | Detenido. Existía un turno abierto vencido de 23/11 con dos contenedores activos; no se tocó. |
| Telares: abastecimiento de fileta, corrida, QR, participación y merma | No ejecutado. No hubo PTI limpio de Extrusión para alimentar la corrida. |
| Laminado, Liner/Globo productivo y transferencias a Corte | No ejecutado; el flujo de prueba se detuvo antes de operaciones productivas. |
| Multicorrida/concurrencia | No ejecutada. |

La ODC de QA sí cambió un lote preexistente equivalente por una transferencia auditable de 1 kg a WIP de Globo. No se intentó revertirla ni ocultarla. No se hicieron otros movimientos de Extrusión/Telares, limpieza, migraciones, commits o despliegues.

## Condiciones para continuar

1. Revisar y corregir el defecto `QA-ODC-PACK-001` en una tarea de implementación autorizada; luego repetir ODC en una base restaurable o con datos QA controlados.
2. Acordar qué hacer con el turno abierto del 23/11 y las mezclas activas de Extrusoras 2 y 4.
3. Ejecutar Extrusión → Telares con QR, balances, genealogía y participación, y después las rutas restantes.
4. Repetir conciliación de movimientos, inventarios, lotes, WIP, costos y huellas de datos maestros.
