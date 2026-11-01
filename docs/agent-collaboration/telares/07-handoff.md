# Handoff — estado de Telares

## Hecho en el código local

- Se preservaron las modificaciones compartidas que ya estaban en el árbol de trabajo.
- Rutas de Telares sin Globo, validación de rutas históricas, disponibilidad alineada con el backflush y cobertura opcional de los rangos de peso.
- Fichas provisionales/inactivas protegidas frente a producción; referencias de Banda/Cintilla sin consumos estimados.
- Idempotencia en el registro de rollo para evitar una segunda salida al reintentar la misma solicitud.
- Suites unitarias y build frontend pasan; ver `06-pruebas.md`.

## No hecho / no afirmar como listo

- No se ejecutaron migraciones, no se usó una BD real, no se hizo E2E, no se publicó, no se hizo commit.
- No se tocaron datos de Almacén.
- No están cerrados los destinos de Almacén/Lonas/Venta como transferencias completas.
- No se confirmó la relación de consumo de PTI ni la unidad primaria de salida.
- Hace falta unificar el flujo carrito → WIP del telar frente al montaje directo de rack.

## Próximos pasos seguros

1. Preparar una BD aislada y comparar las migraciones pendientes con `SequelizeMeta` antes de ejecutar cualquiera.
2. Cargar la nueva migración y verificar que la BD de prueba deja las fichas no confirmadas inactivas/provisionales y no cambia rutas existentes.
3. Probar con usuarios de prueba la transferencia de rack/carrito, inicio de corrida, cierre con QR, reintento de la misma petición, backflush FIFO y rechazo de Globo.
4. Obtener confirmación de Planta para unidades/gramajes, PTI y destinos. Activar fichas sólo después de esa confirmación.
5. Resolver la interfaz de transferencia final sin modificar el módulo de Almacén.
