# Criterios frontend responsive y visuales

Esta guía amplía el sistema actual; no redefine el color semántico ni las reglas de dominio.

## Uso industrial

- Diseñar para lectura rápida, operación táctil, usuarios con distintos niveles de experiencia y condiciones de planta.
- Priorizar contraste, jerarquía, texto legible, acciones persistentes accesibles y reconocimiento por etiquetas.
- Mantener flujo QR-first, estados y acciones del backend. La interfaz no calcula cantidades ni habilita acciones fuera de `allowed_actions`.
- No usar transparencias/blur decorativo, animación excesiva ni sustituir color de dominio por motivos estéticos.

## Responsive

- Mobile-first, basado en contenido. Rangos de referencia: 320–359, 360–479, 480–639, 640–1023, 1024–1279, 1280–1535 y 1536+ CSS px.
- Permitir zoom, ajuste de texto, orientación, áreas seguras y scroll vertical natural.
- No ocultar guardar/confirmar/cancelar por causa del teclado virtual. Mantener los controles dentro del viewport visual y permitir desplazar el formulario.
- Evitar anchos mínimos rígidos, controles fuera del contenedor, scroll horizontal de página, footer fijo superpuesto y acciones dependientes solo de hover.
- Preferir hit area táctil ≥44×44 CSS px y mantener espacio entre acciones.

## Tema

- Preferencia global: Automática (sistema), Clara u Oscura.
- `themePreference` guarda selección; `theme` expone el tema resuelto claro/oscuro para consumidores legados.
- Cambiar tema sin recargar, perder valores ni variar permiso/estado de operación. Mantener diferencia visual perceptible para carga, error, vacío, deshabilitado y éxito en ambos temas.
- Colores semánticos de operación conservan el significado establecido.

## Accesibilidad y movimiento

- Etiquetas asociadas, nombre accesible en botones de icono, foco visible y secuencia de teclado coherente.
- Contraste objetivo WCAG AA: texto normal 4.5:1, texto grande 3:1; comunicar estados también con texto/forma.
- Respetar `prefers-reduced-motion`; transiciones de estado breves (≤200 ms según AGENTS).

## Estado de compatibilidad

Estos criterios son objetivos para futuras correcciones. La auditoría completa de todos los componentes y temas está pendiente; no se afirma cumplimiento total.
