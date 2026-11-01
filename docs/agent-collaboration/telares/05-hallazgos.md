# Hallazgos técnicos y operativos — Telares

## Corregido en esta revisión

- Globo queda bloqueado en toda salida de Telares, también en bandas/cintilla y rutas históricas mal formadas. La edición de ficha ya no sustituye rutas inválidas por Laminado automáticamente.
- `finishRollAndBackflush` valida disponibilidad con los mismos metros y kilogramos que después descuenta el backflush.
- BOM provisionales/inactivos no se pueden iniciar ni cerrar en producción. La nueva semilla de Banda/Cintilla crea referencias inactivas, sin líneas de consumo, sin gramajes estimados y sin sobrescribir rutas o catálogos existentes.
- La migración marca inactivas y provisionales las BOM sembradas históricamente con consumos no confirmados. No elimina historial ni movimientos.
- Se eliminó el cálculo local de costo con precio ficticio de $42.50/kg y base fija de 500 m. Se retiraron algunos valores sugeridos que podían aparentar ser datos confirmados.
- La ruta de salida se debe elegir explícitamente. No se inventa destino cuando falta una selección.
- Los tramos de operador siguen cubriendo metros; cuando se capturan rangos de peso, ahora deben cubrir el peso total sin huecos, traslapes ni omisiones.
- Confirmación de Planta: cada salida debe registrar metros y peso reales. Ambos son obligatorios y se validan por separado; el sistema no deduce uno del otro al cerrar el rollo.
- El consecutivo guardado del rollo ahora coincide con el código QR cuando existe colisión.
- El registro de rollo usa clave de idempotencia y huella de solicitud para que un reintento no vuelva a descontar WIP ni crear un segundo QR. Requiere la migración nueva para funcionar en la BD.

## Pendientes bloqueantes antes de operación real

1. **Consumos de PTI**: los PDFs no confirman gramos por metro, proporciones exactas ni peso unitario de todos los productos. Las fichas heredadas están protegidas como inactivas/provisionales por migración; no deben reactivarse hasta validar con Planta.
2. **Catálogo y variantes**: Antigravity detectó diferencias de denier y variantes faltantes (3.0 oz, 6.5/7.2 oz, Liquitank y 8.0 oz). No las corregimos con supuestos nuevos; se necesita validación de la especificación y PTI exacto.
3. **Transferencia a telar**: existen rutas distintas para transferencia desde carrito/WIP y montaje directo de rack. Aún falta acordar cuál será el flujo oficial y retirar o unificar las acciones redundantes.
4. **Entrega fuera de Telares**: los diagramas muestran Corte, Lonas, Almacén y Venta. No se implementó el cierre de inventario/traspaso para esos destinos. Almacén permanece intacto; no se debe afirmar que esas transferencias son E2E.
5. **Metas al iniciar corrida**: la salida terminada ya requiere metros y kg capturados. La meta de inicio todavía puede convertirse según el gramaje de la ficha; las fichas provisionales están bloqueadas, pero falta confirmar si Planta también quiere exigir ambos valores para la meta inicial.

## Revisión cruzada con Antigravity

Antigravity confirmó los hallazgos P0/P1/P2 indicados arriba mediante revisión de PDFs, migraciones, pantallas y servicios en modo solo lectura. La revisión no tuvo acceso a una BD aislada ni validó operaciones reales de producción.
