# Auditoría QA integral — TraceFlow MES

**Estado: ejecutada parcialmente, no aprobada para una corrida industrial completa.** El entorno local se verificó y se hizo una prueba UI real de recepción y ODC Almacén → WIP Globo. La conciliación detectó un defecto P1 en el respeto de presentaciones/FIFO. Las otras áreas se revisaron en modo lectura. No se modificó código funcional ni Master Data.

## Resumen ejecutivo

- API, Vite y PostgreSQL locales respondieron. La conexión observada fue `sistema_enterprise` en `127.0.0.1:5432`, `NODE_ENV=development`.
- Se tomó respaldo previo. Las huellas de 30 tablas maestras coinciden después de la prueba.
- La interfaz permitió registrar una recepción de prueba y crear/surtir ODC para Globo usando captura manual del QR impreso. La interfaz prometió un paquete de 10 kg, pero el surtido tomó solo 1 kg desde un lote equivalente anterior sin presentación y no entregó los 9 kg restantes al WIP. Defecto `QA-ODC-PACK-001`.
- La acción lateral “Recepción” se reprodujo dos veces abriendo el escáner QR sin navegar a la pantalla de recepción (`QA-WH-NAV-001`).
- Existía un turno de Extrusión abierto y vencido del 23/11, con 494.840 kg de mezcla activa en cada una de las Extrusoras 2 y 4. No se modificó para proteger registros preexistentes. Bloquea una prueba limpia hacia Telares.
- En esta continuación se verificaron dos relevos consecutivos sin QR: SUPREL recibió Turno 2 (25/11) con 989.680 kg digitales; el turno quedó listo para entrega y `supervisor_extrusion` recibió Turno 3 exactamente a las 22:00 programadas. La UI y el dashboard mostraron al supervisor entrante, las dos mezclas y los saldos preservados (494.840 kg cada una); tras recargar, Turno 3 siguió abierto. No se agregó producción, consumo ni merma. El test backend de integración cubre la recepción digital en transacción con rollback. La consulta SQL directa fue rechazada con `EACCES` al socket local; persistencia corroborada por la UI tras recargar y por datos del dashboard servidos por el backend.
- Revisión de lectura encontró fechas `—` en salidas recientes del QR viajero y rutas históricas que difieren del rótulo de algunas fichas actuales (`QA-TEL-UI-001`, pendiente de confirmar con genealogía persistida).
- Pruebas: backend reglas Extrusión 38/38; reglas Telares 33/36; frontend Vitest 31/31; build pasa con chunk grande; lint falla con 127 problemas.

## Estado por área

| Área | Alcance hecho | Estado |
|---|---|---|
| Almacén | Recepción QA, ODC Globo, escaneo manual QR, movimiento e inventario/WIP conciliados | Parcial; defecto P1 |
| Extrusión y Mezclas | Turno observado; no se preparó ni consumió mezcla | Bloqueada por turno previo con mezcla activa |
| Telares | Catálogo, terminal, formulario de scrap e historial QR en lectura | Parcial; sin producción nueva |
| Laminado | Catálogo y WIP en lectura | Parcial; sin producción nueva |
| Lainer/Globo | Catálogo, estación, WIP y ODC en lectura; ODC QA llegó a WIP | Parcial; sin proceso productivo/PTI |

Cobertura funcional total y tasa de aprobación E2E no calculables. El muestreo no cubre todas las acciones ni una corrida multiárea.

## Veredicto

**No declarar lista una corrida real ni 100% funcional.** El relevo digital sin QR está corregido y verificado. Primero corregir y repetir el defecto de empaque/FIFO; después completar las corridas de Extrusión y Telares con genealogía y revisar las áreas restantes.

En esta continuación se aplicó el cambio funcional del relevo digital sin QR y el ajuste del texto guía. Se iniciaron dos sesiones de turno locales y se transfirieron únicamente los saldos digitales ya registrados; no hubo migraciones, limpieza, reversas, commits, push ni despliegues. El lote QA de recepción permanece disponible; el movimiento de 1 kg al WIP Globo desde el lote preexistente permanece como evento auditable.

Ver matriz, registro de defectos, reporte multicorrida, conciliación, trazabilidad y UX en los archivos de esta carpeta.
