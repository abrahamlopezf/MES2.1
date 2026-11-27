# Brother DK-2205: instalación y calibración del controlador

## Medio y perfiles del sistema

El DK-2205 es papel continuo blanco de 62 mm × 30.4 m. TraceFlow genera una etiqueta por página en perfiles de 62 × 45 mm, 62 × 55 mm y 62 × 62 mm. El tamaño configurado en el controlador debe coincidir con el perfil PDF seleccionado.

## Configuración en Windows

1. Instala el controlador Brother correspondiente al **modelo exacto** de impresora QL y a la versión de Windows. No selecciones un modelo de ejemplo por semejanza; el modelo del equipo de planta aún debe confirmarse.
2. Carga el rollo continuo DK-2205 y verifica que el equipo lo detecte como papel continuo de 62 mm.
3. En Preferencias de impresión o P-touch Editor, selecciona el medio continuo de 62 mm y configura la longitud de etiqueta en 45 mm, 55 mm o 62 mm, de acuerdo con el PDF.
4. Usa orientación vertical y escala 100 % / tamaño real. Desactiva “Ajustar a página”, escalado automático y cualquier opción que reduzca el ancho del diseño.
5. Deja que la impresora controle el avance del papel y el corte entre páginas. Para esta etiqueta no agregues márgenes de diseño en el controlador; verifica que no recorte el contenido en una prueba de una sola página.
6. Imprime primero el PDF de calibración del perfil seleccionado. Mide el rectángulo físico y escanea el QR con el escáner general antes de habilitar impresión masiva.
7. Solo después de aprobar la primera etiqueta, imprime un lote pequeño. Confirma que haya un corte por página y que la segunda etiqueta conserve su identidad independiente.

Los nombres de menús, opciones de corte y tamaños predefinidos dependen del modelo y de la versión del controlador. Las instrucciones específicas de Brother para QL-1100/P-touch Editor ilustran el ajuste de longitud para el medio DK-2205; no sustituyen la guía del modelo realmente instalado.

## Referencias oficiales

- [Brother: DK-2205, especificación del rollo continuo 62 mm × 30.4 m](https://www.brother-usa.com/products/DK2205)
- [Brother Support: crear una etiqueta de longitud personalizada con DK-2205 en P-touch Editor para QL-1100](https://support.brother.com/g/b/faqend.aspx?c=us_ot&faqid=faqp00000403_003&lang=en&prod=lpql1100eus)
- [Brother: definir ancho, longitud, margen y orientación en P-touch Editor](https://help.brother-usa.com/app/answers/detail/a_id/153996/p/7550)

## Límite de validación

La validación automática de PDF comprueba dimensiones de página, número de etiquetas y lectura del QR a 300 dpi. No certifica alimentación, centrado, contraste, corte ni tolerancia física del equipo. La impresión física y el ajuste fino quedan pendientes hasta confirmar el modelo de impresora y probar el rollo real.
