# Impresión térmica QR · Brother DK-2205

## Perfil implementado

- Papel continuo DK-2205: 62 mm de ancho físico y 30.4 m nominales.
- Formatos: 62 × 45 mm (Compacto), 62 × 55 mm (Estándar, predeterminado) y 62 × 62 mm (Cuadrado).
- Una identidad QR existente por página PDF; generación vectorial en negro sobre blanco, corrección Q y zona silenciosa de cuatro módulos.
- Cada etiqueta muestra INTERPLAS MÉXICO, TRACEFLOW MES y el identificador completo.
- El PDF informa dimensiones físicas mediante `MediaBox`. El cálculo de consumo es teórico: no incluye espacios de avance, calibración, cortes ni desperdicio del controlador.
- El límite técnico de cada PDF es 500 etiquetas; lotes mayores se imprimen por grupos seleccionados.

## Operación en la interfaz

1. En Centro de Identidad, abre un lote o selecciona QR individuales. En Almacén, selecciona lotes con QR válido.
2. Abre la vista previa Brother DK-2205 y elige la longitud.
3. Revisa la cantidad, el avance teórico y la etiqueta en blanco y negro.
4. Descarga el PDF térmico. En el diálogo del controlador, selecciona papel continuo/personalizado compatible y escala 100% o tamaño real; desactiva “ajustar a página”.
5. La generación del PDF no confirma impresión física, entrega del lote ni asignación productiva. El historial distingue la reserva de payload, solicitud de impresión y reimpresión.

## Calibración física pendiente

El archivo [`dk2205-calibration.pdf`](dk2205-calibration.pdf) contiene una página de cada longitud. Los tres payloads e identificadores empiezan con `TEST-ONLY` y no están asociados a QR registrados. Imprimirlo y escanearlo no debe utilizarse para registrar movimientos en TraceFlow.

Con el modelo exacto de impresora QL aún pendiente, confirmar en el controlador y equipo real:

- Tamaño personalizado admitido y ancho efectivo de impresión.
- Márgenes reales, orientación y avance después de cada etiqueta.
- Corte individual disponible en el driver; CSS/PDF no controla el cortador físico.
- Medida con regla, centrado, ausencia de recorte y lectura del QR con teléfonos y escáneres de planta.
- Calidad tras adherir la etiqueta a las superficies reales y exposición normal en planta.

La prueba automatizada valida estructura, páginas, tamaños PDF y datos de entrada del QR; no demuestra calidad física, resistencia del papel, escaneo con equipo industrial ni compatibilidad de corte.
