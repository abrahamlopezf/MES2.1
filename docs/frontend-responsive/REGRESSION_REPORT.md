# Informe de regresión

## Aprobado

- 65/65 pruebas frontend (18 archivos) aprobadas, incluyendo modo explícito claro, modo explícito oscuro, resolución automática, persistencia de la preferencia e ignorar valores inválidos.
- Build de producción compilada sin error.
- En Edge local, el acceso no presenta overflow horizontal a 320×720, 375×812, 768×1024, 1024×768 y 1440×900.
- Verificado en DOM que el documento declara `lang="es"`.
- Escáner de seguridad: aprobado.

## Sin regresión comprobada a nivel de operación

No se enviaron comandos a backend, no se creó ni editó inventario/lotes/mezclas, no se cambió la matriz de permisos ni la navegación de dominio. La verificación de interacciones industriales no se ejecutó, así que no se emite una afirmación de regresión operacional completa.

## Riesgos y pendientes

- Acciones sticky y comportamiento con teclado requieren prueba en teléfono real y en formularios largos.
- Perfil/tema y gráficos requieren recorrido visual en Claro/Oscuro/Automático en rutas autenticadas.
- 112 errores ESLint y 11 advertencias existentes mantienen lint fallido; no se abordaron asuntos ajenos al alcance incremental.
- Cámara QR trasera, permisos del navegador, modales, tablas y rutas de cada rol siguen pendientes.
