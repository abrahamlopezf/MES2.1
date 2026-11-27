# Informe de accesibilidad — avance

## Revisado en Login

- Documento con idioma español (`lang="es"`).
- Encabezado principal expuesto como H1.
- Campos de usuario y contraseña asociados a sus etiquetas y mensajes de validación.
- Botón de mostrar/ocultar contraseña con nombre accesible que cambia según estado.
- Validación vacía comprensible y visible.
- Controles y contenido no salen del viewport emulado mínimo de 320 CSS px.
- Ambos temas explícitos y el modo Automático se comprobaron mediante browser automation.

## Pruebas automatizadas

La suite Playwright verifica roles/nombres accesibles de título, inputs, botón de ingreso y toggle; valida el estado de error. 74 casos responsive y de flujo público aprobaron. No se ejecutó axe-core ni un recorrido completo con lector de pantalla.

## Pendiente

- Contraste medido por token y estado en todas las rutas/temas.
- Navegación por teclado, orden/restauración de foco y lector de pantalla.
- Diálogos, tablas, notificaciones, gráficos, cámara, overlays y acciones icon-only fuera de Login.
- Zoom 200/400%, texto ampliado, Windows High Contrast y `prefers-reduced-motion` por ruta.
- Revisión de targets táctiles y componentes third-party.

No se certifica accesibilidad integral del producto.
