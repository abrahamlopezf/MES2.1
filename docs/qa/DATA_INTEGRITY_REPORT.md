# Informe de integridad y conciliación

**Estado: conciliación local parcial ejecutada.** El ambiente consultado fue PostgreSQL `sistema_enterprise` en `127.0.0.1:5432`, con backend en desarrollo. Se tomó respaldo antes de iniciar el flujo. No se limpiaron ni restauraron datos.

## Evidencia previa y datos maestros

- Respaldo: `evidence/local-pre-multirun-20261125.dump` (custom format), SHA256 `F592BF8C702D40BA5AFEF122746C6BB4A26309820CE93EDF099C34F4B89DF797`.
- Conteos y huellas base: `evidence/local-baseline-20261125.json`.
- Comparación posterior: `evidence/post-warehouse-qa-masterdata.json`; 30 tablas revisadas, `changedTables: []`, `masterDataUnchanged: true`.

## Recepción QA

`QA_RUN_20261125_WH_001` creó lote 211 para `MP-MAS-008`, 10 kg, presentación 10 kg, costo 40 MXN/kg, importe 400 MXN, ubicación DD2. El registro asociado en inventario fue 28 por 10 kg. Esa recepción continuó intacta después de surtir la ODC.

## ODC y transferencia a WIP Globo

Orden `ORD-202611-036`, ODC id 83, área Globo (id 5), estado `SURTIDA`. La interfaz mostraba que para solicitar 1 kg se reservaría un paquete de 10 kg y que los 9 kg restantes llegarían a WIP. Sin embargo, el renglón id 162 registró fulfilled=1 kg desde lote id 7 (`LOT-MB-BCO-09006`), de material id 1146 / código `MAS-001`, nombre Masterbatch Blanco, sin presentación de empaque. El insumo seleccionado en pantalla era `MP-MAS-008` (material id 1168).

El movimiento id 161 redujo en 1 kg el inventario id 13, con tipo `CONSUMPTION`, área 5, costo tratado como `WIP_TRANSFER`, y referencia a orden 83 / ítem 162. La fila WIP id 168 recibió 1 kg, lote 7 y QR hijo 1321. La transferencia de 1 kg queda rastreada y el total se conservó entre inventario y WIP; el lote fuente era preexistente y quedó afectado por esta prueba.

**Discrepancia crítica:** la reserva/preview de la interfaz no coincide con el surtido real. Se usó un lote de material equivalente por nombre pero sin empaque y no se movió al WIP la cantidad completa del empaque. El nuevo lote QA de 10 kg, que sí tenía presentación, quedó sin consumir. No se hicieron ajustes manuales ni reversa para preservar el historial. Ver `QA-ODC-PACK-001`.

## Límites

No se concilió producción de Extrusión ni Telares: el turno de Extrusión abierto vencido del 23/11 tenía mezclas activas en Extrusoras 2 y 4 (494.840 kg por contenedor). No se pesó, transfirió, consumió ni cerró ese material. No se confirmó genealogía de rollos, scrap productivo ni costos de producción en una corrida de extremo a extremo.
