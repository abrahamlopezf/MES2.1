# TraceFlow MES — Especificación funcional QR-First V2.0

**Estado:** Fuente funcional vigente; aplicación parcial en el código.  
**Precedencia:** Esta especificación recoge la V2.0 del cliente y reemplaza interpretaciones anteriores incompatibles. La matriz de cumplimiento en [`docs/qa/QR_FIRST_COMPLIANCE_MATRIX.md`](docs/qa/QR_FIRST_COMPLIANCE_MATRIX.md) describe evidencia de implementación; una regla aprobada no implica que esté implementada o validada.

## 1. Principios

- Todo QR identifica una unidad física inequívoca; su contenido es identidad persistente, no una copia del estado mutable.
- El QR virgen debe existir y estar entregado por Almacén antes de vincularse a producción. No se genera QR automáticamente para saltar ese flujo.
- La interfaz consulta al backend, muestra sus decisiones y ofrece las acciones autorizadas (`allowed_actions`). Cantidades, saldos, rendimientos, estados y reglas industriales se calculan en backend.
- Operaciones compuestas (asignación/entrega/vinculación QR, consumo, producción, transferencia, genealogía y actualización de solicitud) son atómicas, transaccionales, idempotentes ante reintentos seguros y protegidas contra concurrencia.
- No se altera Master Data ni se cambian reglas confirmadas para facilitar pruebas. No escribir en DEV ni conectar a Neon.

## 2. Granularidad de QR confirmada

| Proceso | Identidad QR |
|---|---|
| Almacén | Conservar el flujo actual; solicitud y entrega deben identificar los QR individuales y su historial. |
| Mezcla de Extrusión | Un QR por contenedor físico. |
| Salida de Extrusión | Un QR por rack/carrito, que puede consolidar PTI compatibles de una o más corridas. No por pieza. |
| Telares | Un QR por tela o banda terminada. |
| Laminado | Un QR por rollo producido. |
| Lainer | Un QR por rollo producido; conservar sus reglas específicas aunque comparta lógica técnica con Laminado. |
| Globo | Granularidad y proceso productivo pendientes de definición propia. No inferirlos de Lainer. |

## 3. Solicitud, entrega y uso de QR

Almacén persiste solicitud, área y usuario solicitante, cantidad, fecha/hora, estado e historial. La entrega conserva usuario y fecha/hora de almacén, y la lista exacta de QR entregados; recepción/ disponibilidad en el área se refleja según estados ya soportados por el dominio. No añadir aprobaciones, devoluciones ni estados industriales sin definición.

El área productiva solicita QR de acuerdo con la necesidad de su turno, verifica los QR disponibles, escanea un QR virgen por identidad producida, y vincula ese mismo código al elemento trazable dentro de la transacción de producción. Debe impedirse QR usado, ajeno al área, duplicado o reasignado. Los QR de contenedor de mezcla, rack, tela/banda y rollo son identidades diferentes y no se reutilizan entre ellos.

## 4. Extrusión

### Preparación y contenedores

Cada preparación base es de **500 kg**. El usuario indica solo el número de contenedores físicos; backend distribuye equitativamente `500 / N` con precisión decimal autorizada y reparte el residuo para que la suma sea exactamente 500 kg. Referencias: N=1: 500 kg; N=2: 250 kg; N=3: 166.667 kg aproximadamente; N=4: 125 kg; N=5: 100 kg. Redondeo no crea scrap, merma ni pérdida. Cada contenedor requiere su QR virgen entregado por Almacén, mantiene genealogía de fórmula/insumos/preparación, saldo, máquina, usuario, fecha y movimientos. Transferir contenedor conserva su QR y saldo.

Esta regla no autoriza alterar fórmula, ingredientes, ODC, FIFO, WIP, compatibilidad ni otras reglas existentes. Antes de implementar el cambio de cantidad base debe caracterizarse cómo el servicio actual determina el total de mezcla y confirmar el impacto sobre preparación y consumo de materiales.

### Rack/carrito y custodia

El rack/carrito recibe QR virgen de Almacén. El mismo rack puede acumular producción compatible; conserva producto PTI, kg reales, piezas solo si hay dato válido, máquina, corridas, mezclas de origen, turnos, usuarios, fechas, ubicación, custodia e historial. La custodia, conciliación y relevo siguen los flujos existentes. No se estiman piezas ni pesos medios sin factor aprobado.

## 5. Telares

Supervisor/Admin asigna telar, ficha/BOM, tela o banda y materiales compatibles. La corrida puede continuar entre turnos conservando su identidad, ficha y avance; cada turno registra su avance sin duplicar metros. Las participaciones guardan usuario, turno, corrida, telar, tramo inicial/final, metros atribuidos y tiempo. Se precargan datos ya registrados. El posible solapamiento de varios operadores en el mismo tramo sigue pendiente; no imponer exclusividad.

El PTI final usa un QR virgen recibido por Telares y el cálculo de kg de la fórmula confirmada por INTERPLAS y los parámetros de la ficha original. No reemplazar por fórmula genérica. Producto libre queda disponible sin asignación automática. Producto para venta se bloquea para transferencias productivas internas; no crear sistema comercial ni reglas de reclasificación sin confirmar.

## 6. Corte, recogida y demanda

Corte selecciona proceso destino, producto compatible del catálogo de Telares, unidad (rollos o metros), cantidad y observaciones. Se muestran todas las opciones compatibles y ninguna incompatible. Producción, disponibilidad, despacho y recepción son conceptos/estados diferenciados.

No convertir metros a rollos mediante promedios ni fraccionar un rollo. Regla confirmada previamente por el cliente: para satisfacer metros se seleccionan rollos enteros compatibles y se suma su longitud real hasta cubrir la solicitud (ejemplo 30 m + 25 m cubren 50 m); reportar cantidad solicitada y longitud real total, sin alterar las longitudes. No inferir otras políticas de excedente.

Laminado/Lainer pueden escanear varios QR en una operación de recogida. Validar compatibilidad, disponibilidad, ruta, solicitud, bloqueo de venta y unicidad de reserva; la misma pieza no puede recogerse concurrentemente dos veces. Conservar identidad original durante traslado. Para metros, distinguir explícitamente metros solicitados de la suma de longitudes reales de rollos reservados, despachados y recibidos.

## 7. Laminado y Lainer

Comparten mecanismos solo donde las reglas coincidan; conservar fórmulas, insumos, compatibilidad, fichas, parámetros, PTI y aceptación específicos. Confirmado para Laminado: un rollo de entrada puede producir N rollos de salida. El modelo debe poder representar varias entradas y salidas cuando una operación aprobada lo requiera; esto no afirma que la producción deba combinar varios insumos en cada corrida. Cada salida es un PTI/identidad individual con QR virgen propio, longitud real, peso si corresponde, ficha, usuarios/turno/fecha, corrida, entradas y consumos, solicitud, estado, ubicación e historial. No reusar QR de entrada ni duplicar consumo.

Conservar el ancho del rollo entrante para Laminado conforme a lo comunicado. Los metros solicitados se atienden mediante rollos enteros reales; medir toda salida individual. Remanente: puede guardarse bajo custodia en WIP o registrarse como merma, de acuerdo con el flujo autorizado; no seleccionar ni inferir disposición automáticamente. Merma encontrada en el proceso se registra en kg, tipo de rollo, usuario, turno y detalle. Defecto detectado en Corte debe poder rastrearse a los datos del PTI y su fabricante.

La fórmula documental de Laminado PP 75 / PE 25 es una proporción de referencia; no define tamaño de lote, unidad, factor de conversión ni rendimiento. La preparación de mezclas en contenedores QR de Laminado/Lainer sigue pendiente de confirmación.

## 8. Lainer y Globo

Lainer es un flujo lógico específico con QR por rollo. La V2.0 distingue Globo como proceso aún sin reglas de salida propias; no copiar automáticamente fórmula, insumos, QR, aceptación ni ruta de Lainer. La documentación PDF contiene fórmulas rotuladas para Laminado y Liner; la definición de proceso para Globo permanece pendiente. No activar fichas borrador/inactivas ni inventar códigos PTI.

## 9. Escáner y genealogía

El escáner general resuelve el tipo de unidad y ofrece solo información/acciones autorizadas para el usuario. Debe presentar atributos aplicables, historia, estado y ubicación, evitando valores vacíos y datos restringidos. Genealogía navegable bidireccional debe admitir múltiples padres y múltiples descendientes, registrar todos los insumos de transformación y no truncar silenciosamente la cadena. Ejemplos: lotes → preparación → contenedores → corridas/rack → Telares → rollos → Laminado/Lainer e insumos secundarios.

## 10. Pendientes que no se pueden inferir

- Pesos promedio por pieza para productos de Extrusión.
- Solapamiento y atribución cuando dos operadores trabajan simultáneamente el mismo tramo de Telares.
- Política exacta de disposición de remanentes en cada contexto.
- Configuración aprobada de PTI/fichas de Laminado, Lainer y Globo y sus criterios de aceptación faltantes.
- Procedimiento de mezclas en contenedores QR para Laminado/Lainer.
- Flujo específico de Globo, separado de Lainer.
- Estados concretos de solicitud/entrega/recepción de QR compatibles con el dominio existente.

## 11. Pruebas y criterio de validación

Caracterización antes de modificar; pruebas unitarias, integración local en una base desechable protegida, concurrencia/duplicados/reintentos/rollback, pruebas frontend y Playwright con contextos por rol. Las operaciones de negocio parten de la UI. API/SQL son evidencia complementaria. Diferenciar **implementado**, **probado técnicamente**, **validado desde interfaz por rol** y **validado industrialmente**. No aprobar una función por presencia de QR en pantalla.

No usar PostgreSQL DEV para operaciones; no Neon; no debilitar guardas o permisos. Al 2026-11-26 QA local fue revalidada con 60/60 guardas y `readyForWrites=true`; esto habilita escrituras operativas autorizadas, no DDL. Existe una diferencia de una migración entre DEV y QA; cualquier cambio de esquema debe prepararse para una base desechable coherente y no aplicarse sobre QA compartida sin autorización expresa. Preservar datos, permisos, modificaciones no relacionadas y no realizar MVC general, commits ni despliegues.
