# Rendimiento y estabilidad de layout

## Build observada

- Vite transformó 1,870 módulos.
- CSS: 248.07 kB minificado / 34.79 kB gzip.
- JS principal: 3,714.20 kB minificado / 972.80 kB gzip.
- Vite conserva advertencia de chunk sobre 500 kB. El readiness baseline ya identificaba el bundle como grande; no se midieron diferencias de runtime ni se cambió el code splitting.

## Estabilidad responsive

En login, las mediciones DOM dieron `scrollWidth === clientWidth` en cinco viewports simulados (320×720, 375×812, 768×1024, 1024×768 y 1440×900). No es un perfil de rendimiento ni una medición de CLS.

## Pendiente

- LCP/INP/CLS con datos y red representativos, perfiles de CPU/red lenta, memoria, rutas autenticadas, listas grandes, gráficas y scanner.
- Separación segura de chunks mediante imports dinámicos, con smoke tests de cada ruta.
- Medición antes/después con baseline comparable y captura automatizada.
