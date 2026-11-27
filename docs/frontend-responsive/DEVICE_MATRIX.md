# Matriz de dispositivos y viewports

## Cobertura automatizada actual

Playwright con Microsoft Edge headless emuló los 27 perfiles declarados en `e2e/responsive/public-shell.spec.cjs` (26 dimensiones CSS únicas; 1024×768 aparece en tablet y desktop). Login se probó en Claro y Oscuro, más seis combinaciones Automáticas (mobile/tablet/desktop × sistema claro/oscuro). Los 74 casos completos incluyen otros flujos públicos y redirects sin sesión.

Esto es emulación CSS en Edge desktop. No equivale a pruebas en Android/iOS ni certifica Safari, Chrome móvil, viewport dinámico por teclado, densidad/pixel ratio, safe areas, zoom del SO, rotación real o hardware.

## Viewports cubiertos en el código

- Móvil: 320×568, 360×640, 375×667, 375×812, 390×844, 393×852, 412×915, 430×932, 480×960.
- Tablet: 500×838, 600×960, 640×1024, 768×1024, 800×1340, 838×500, 960×600, 1024×640, 1024×768, 1340×800.
- Desktop: 1024×600, 1024×768, 1280×720, 1280×800, 1366×768, 1440×900, 1600×900, 1920×1080.

## Pendiente físico

Android, iOS, Samsung Galaxy Tab A11, monitor ≤21 pulgadas, Windows scaling/zoom, teclado virtual, cámara, safe areas y ambas orientaciones. No se reportan pruebas físicas realizadas.
