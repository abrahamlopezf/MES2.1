# 03 — Preguntas Técnicas y Operativas para el Cliente (INTERPLAS MÉXICO)

De acuerdo con la regla de **Cero Invención Industrial**, los siguientes puntos no están especificados de forma explícita en los dos diagramas PDF ni en `ESPECIFICACIÓN DE TELA.pdf` y se mantienen desacoplados/configurables como `PENDIENTE DE CONFIRMACIÓN`:

---

### Pregunta 1 — Relación Exacta de Consumo (Kg o Bobinas de PTI por Rollo/Caja en Tejido de Banda y Cintilla)
- **PREGUNTA**: ¿Cuál es el peso neto estándar (en kg) y el consumo teórico por rollo de 80 metros para las Bandas de **2" (4500 lb)**, **3" (4500 lb)** y **1 ½" (1700 lb)**, así como la proporción exacta de denier 4600 vs. denier 3000 cuando se combinan en el telar de banda?
- **MOTIVO**: El Diagrama 2 (`EXTRUSORA 1 -> TEJIDO DE BANDA`) especifica ancho, resistencia (4500 lb / 1700 lb / 3000 lb), longitud por rollo (80 mts), rollos por tarima (100 / 150) y peso por caja en cintilla (~120 kg), pero no indica el gramaje lineal (`g/m`) ni los kg exactos de cinta denier 4600 y 3000 por rollo de 80 m.
- **IMPACTO**: El motor de backflushing (`finishRollAndBackflush`) deduce del WIP de la fileta (`LoomPtiWip`) según el consumo configurado en los componentes del BOM (`consumption_g_per_m` o `required_quantity`).
- **OPCIONES**:
  - **A)** Capturar el peso real de cada rollo/caja en báscula al cierre en la terminal y usar una relación base configurable en el catálogo BOM (`1 kg PTI por 1 kg de salida` más factor de merma si aplica).
  - **B)** Definir un gramaje lineal fijo (`g/m`) por modelo de banda (2", 3", 1.5") en el catálogo de fichas técnicas.
- **RECOMENDACIÓN**: **Opción A + fichas marcadas con `is_provisional: true`** hasta que Ingeniería de Planta confirme los gramos por metro oficiales de cada banda.
- **PRIORIDAD**: **Alta**

---

### Pregunta 2 — Manejo Operativo de Merma en Telares (Restos de Bobina / Enredos / Puntas de Fileta)
- **PREGUNTA**: ¿En qué momento y bajo qué criterio se registra la merma generada en Telares (por ejemplo, puntas de bobina en fileta, ruptura de cinta o recorte de orilla): por rollo terminado, al vaciar/recargar la fileta, o al cierre de turno de Telares?
- **MOTIVO**: En Extrusión existe un flujo formal de cierre de turno con merma por color y transición, pero en los diagramas de Telares no se especifica si el desperdicio de hilo/cinta se pesa por telar al final del turno o si se absorbe en el índice de transformación.
- **IMPACTO**: Si la merma física de cinta en la fileta no se descuenta de `LoomPtiWip`, el saldo teórico de bobinas/kg en fileta puede diferir gradualmente del conteo físico en piso.
- **OPCIONES**:
  - **A)** Registrar merma/ajuste de fileta al cierre de turno o al recargar fileta mediante supervisor.
  - **B)** Registrar merma puntual por evento en el telar descontando del lote FIFO activo en `LoomPtiWip`.
- **RECOMENDACIÓN**: **Opción A** (corte/ajuste por turno supervisado) para no frenar al operador de piso en cada cambio de rollo.
- **PRIORIDAD**: **Media**

---

### Pregunta 3 — Unidad de Trazabilidad del QR Viajero en Tejido de Banda (Por Rollo Individual de 80 m vs. Por Tarima de 100/150 Rollos)
- **PREGUNTA**: En los Telares de Banda (Telares 18–21), ¿la etiqueta QR Viajero se imprime por cada rollo individual de 80 m, por lote/parada de telar, o por tarima embalada (100 rollos en 2" y 3", 150 rollos en 1 ½", y caja de ~120 kg en Cintilla 13 mm)?
- **MOTIVO**: El Diagrama 2 indica *"presentación por rollo de 80 mts y embalaje en tarima con 100 rollos"* (o 150 rollos / caja de 120 kg).
- **IMPACTO**: Define la frecuencia de escaneo/impresión del operador en los Telares 18–21 y cómo lo recibe Almacén, Corte de Banda o Venta.
- **OPCIONES**:
  - **A)** Emitir el registro y etiqueta QR por rollo/caja o por lote de salida según los metros/kilos reportados en la terminal (actualmente soportado con `units_per_pallet` y `packaging_type` impresos en la etiqueta).
  - **B)** Agrupar múltiples rollos de 80 m en un QR maestro de tarima al completar 100 o 150 unidades.
- **RECOMENDACIÓN**: **Opción A** para las pruebas de mañana (ya incluye los metadatos de tarima/empaque en el QR) y habilitar agrupación por tarima si el cliente confirma que etiqueta por tarima cerrada.
- **PRIORIDAD**: **Media**
