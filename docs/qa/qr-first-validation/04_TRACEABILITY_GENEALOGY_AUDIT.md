# Auditoría de genealogía y trazabilidad

## Estructura disponible

- `TraceableItem` es una unidad enlazada a un QR único y guarda tipo, producto/material, área origen/actual, cantidad inicial/actual, estado, referencia y metadata (`backend/src/modules/traceability/traceableItem.model.js:6-99`).
- `TraceabilityLink` guarda padre/hijo, QRs, tipo de relación, cantidad usada/generada, scrap y área de proceso (`traceabilityLink.model.js:6-79`).
- `TraceabilityMovement` guarda artículo/QR, tipo, origen/destino, cantidad, unidad, balance posterior, usuario y tiempo (`traceabilityMovement.model.js:6-78`).
- `TraceabilityEvent` y `QrEvent` ofrecen auditoría de cambios/eventos; `QrAreaAssignment` guarda asignación activa y liberación (`traceabilityEvent.model.js`, `qrEvent.model.js`, `qrAreaAssignment.model.js`).
- El modelo `ViajeroRoll` se relaciona con QR, mientras el lookup carga BOM, telar, ejecución, operadores/segmentos, routing logs y consumos de racks (`qrTraceabilityTree.service.js:362-399`).

## Qué puede reconstruir el lookup

El resolver transversal busca `QrCode`, `ViajeroRoll`, `PtiRack`, preparación y cola de Extrusión, ODC/WIP y lote/silo (`qrTraceabilityTree.service.js:330-610`). Después reúne preparaciones, entradas de producción, lotes, silos y artículos WIP relacionados (`:732-870`). Esto es evidencia de capacidad de lookup multi-entidad, no una afirmación de que toda conexión industrial tenga vínculos persistidos.

El endpoint de genealogía forma nodos recursivos a partir de `TraceabilityLink`, con profundidad máxima 8, hasta 100 enlaces por nivel; la consulta inicial limita a 10 enlaces de cada dirección (`traceability.service.js:597-651`). Esos límites pueden truncar una historia extensa y deben probarse/validarse con requisito de negocio antes de concluir suficiencia.

## Cadena objetivo vs evidencia

| Cadena | Evidencia estructural | Resultado funcional disponible |
|---|---|---|
| Recepción → lote/factura → WIP/mezcla | Modelos de lote, orden, WIP y entradas de preparación; lookup relaciona lotes y órdenes | Un caso previo Almacén→ODC→WIP de Globo conciliado; detectó discrepancia de empaque (`TRACEABILITY_REPORT.md`, `QA-ODC-PACK-001`). |
| Ingredientes → mezcla → extrusora/turno → PTI/rack | Preparación y entradas de producción se recuperan por árbol | Corrida completa QR-first no ejecutada; cadenas padre-hijo por PTI no corroboradas en DB durante esta revisión. |
| Racks PTI → consumo parcial en telar → rollo QR | Modelo de consumo del backflush incluye rack/producto/WIP fuente; `finishRollAndBackflush` toma segmentos y QR virgen | Sin salida nueva autenticada en esta revisión. No probado saldo del rack contra todos los vínculos del rollo. |
| Rollo tela → Laminado → rollo laminado QR → Corte | Servicio Laminado usa transacción, consume WIP, crea `TraceableItem`, movimiento y vínculos de materiales y rollo (`laminado.service.js:705-840`) | Integración Corte-Laminado tuvo prueba automatizada histórica, pero un contrato de visibilidad `PICKED` sigue discrepante. No hubo UI corrida. |
| Rollo tela → Globo/Liner → salida | Resolver conoce entidades y Globo tiene módulo/catálogo/WIP | Sin E2E; Globo/Liner no deben presumirse idénticos. Ruta de ficha elegible sigue pendiente. |

## Riesgos de integridad por verificar

- Identidades huérfanas: QR sin unidad donde debería existir producto físico o unidad sin QR.
- Relaciones huérfanas/cíclicas; cantidades parciales y remanentes conservados.
- Transformación muchos-a-uno / uno-a-muchos y relación de cada salida con su fuente correcta.
- Snapshot de BOM/especificación, máquina, turno, operador y ruta histórica frente a cambios posteriores de catálogo.
- Costos/lot IDs para genealogía FIFO cuando equivalencias de materiales permiten varios códigos.
- Reproceso y scrap sin doble contabilizar producción o consumo.
- Custodia por área y acciones posteriores derivadas del estado real, no solo metadata o UI.
- Límites de profundidad/lista del árbol y rendimiento para historial real.

## Conclusión

La estructura relacional es suficiente para representar buena parte de la genealogía, pero la cobertura real del grafo sigue parcialmente validada. No se verificó integridad referencial con consulta a PostgreSQL en esta intervención, ni se declara ausencia de huérfanos.
