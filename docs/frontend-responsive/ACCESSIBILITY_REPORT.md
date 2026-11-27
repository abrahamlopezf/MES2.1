# Informe de accesibilidad — revisión inicial

## Comprobado

- Documento con idioma español (`lang="es"`).
- Preferencia visual accesible con etiqueta visible y un `<select>` nativo en Perfil: Automática, Clara, Oscura.
- Login renderiza su contenido y acciones a 320 CSS px sin scroll horizontal, en tema oscuro.
- Los estilos globales mantienen indicadores de foco y selectores `:focus` para diálogo/viewport; quitar `transform` evita una causa de stacking context en `body`.

## No auditado en esta fase

- Contraste medido por token/estado en todas las vistas y ambos temas.
- Recorrido completo con teclado/lector de pantalla, orden de foco, trampas/restauración de foco en modales.
- Nombres accesibles de cada acción icon-only, errores asociados, tablas complejas, gráficos, cámara y estados de carga/vacío.
- Zoom 200/400%, texto grande, Windows contrast themes y `prefers-reduced-motion` por ruta.

Estado: hallazgos globales puntuales aplicados; no equivale a certificación WCAG.
