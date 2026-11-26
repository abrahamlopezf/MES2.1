# Roadmap recomendado después de la validación

**No ejecutar sin autorización posterior.** No iniciar MVC ni modificar reglas durante esta auditoría.

| Orden | Paquete | Resultado requerido | Pruebas / puerta |
|---:|---|---|---|
| 0 | Preparar QA desechable y fixture sintético | DB, host, rol y huella identificados; preservar datos maestros y operaciones compartidas | Guardas local, permisos mínimos, snapshot antes/después. |
| 1 | Contrato de identidad/estado QR | Mapa único de estados existentes y transiciones permitidas por evento/área | Unitarias de máquina de estados, API negativa por status/área/rol. |
| 2 | Escaneo y salida atómica | Leer QR sin mutación; asignar identidad solo al confirmar operación; idempotencia y rollback | Concurrencia doble, QR incorrecto/usado/anulado, fallo inyectado en disposable. |
| 3 | Trazabilidad Extrusión | Mezcla, entradas lote/silo, turno, transferencia de contenedor, output PTI/rack y cantidades conectadas | API/UI/PostgreSQL con balances inicial/final y árbol antes/después. |
| 4 | Telares | Consumo parcial de varios PTI y operadores por tramo; salida con ficha/telar/turno y QR | Rollos y bandas simultáneos, FIFO/custodia/remanente y recarga UI móvil. |
| 5 | Laminado | Salidas 1–3 cuando la regla esté aceptada, cada output con QR hijo y enlace completo; consumos y scrap | Test de división, remanentes y varios outputs; reconcilia entradas = salidas + scrap/remanente. |
| 6 | Globo/Liner | Separar los procesos según flujo confirmado; recibir, consumir, transformar, QR y destino | Ruta permitida, materia prima/WIP independiente, no duplicación. |
| 7 | Resolver pendientes contractuales | Lista de fichas a Globo, estados PICKED, snapshots, reimpresión/corrección y participación | Aprobación escrita de Producto antes de cambiar pruebas o comportamiento. |
| 8 | Auditoría visual autenticada | Pasar por cada botón/estado escritorio y móvil con usuarios QA | Capturas sanitizadas, requests, fallos consola y persistencia verificada. |
| 9 | Multicorrida repetible | 20 corridas independientes distribuidas; usar casos concurrentes únicamente con precondiciones compatibles | Reportar cada corrida individualmente; no contar consultas como corridas. |
| 10 | Caracterización y arquitectura futura | Contratos antes/después congelados; seleccionar unidad de riesgo bajo | Solo iniciar MVC al aprobar puertas funcionales, seguridad y rollback. |

## Límites de cambio recomendados

Una vez aprobadas las reglas: separar primero comportamiento estable y de bajo acoplamiento con pruebas de caracterización; no extraer servicios centrales (`extrusion.service.js`, `telares.service.js`, `warehouse.service.js`, `traceability.service.js`) hasta que las cadenas y contratos afectados tengan cobertura E2E reproducible. Almacén se mantiene funcionalmente intacto.

Cada corrección de defecto debe ir en cambio aislado, acompañada de prueba de regresión antes de una extracción arquitectónica. No consolidar “limpieza” funcional y refactor en un mismo lote.
