# Auditoría QA local

## Estado de la ejecución — 25 de noviembre de 2026 (CDMX)

La API local en `127.0.0.1:4000`, Vite en `localhost:5173` y PostgreSQL en `127.0.0.1:5432` respondieron. La base verificada fue `sistema_enterprise` con `NODE_ENV=development`. Se hizo respaldo antes de la prueba y se compararon 30 tablas maestras después: no hubo cambios.

La prueba E2E fue **parcial**, no una corrida productiva completa: Almacén registró un lote QA, una ODC de Globo se surtió y el material llegó al WIP de Globo. La conciliación detectó que el surtido consumió un lote FIFO equivalente sin presentación de empaque, aunque la vista previa prometía respetar un paquete de 10 kg. No se modificó código ni se intentó revertir el movimiento para no ocultar el rastro.

Extrusión ya tenía un turno abierto vencido (23/11) con dos mezclas activas. De acuerdo con el alcance de auditoría, no se cerró el turno, no se transfirieron las mezclas y no se hicieron consumos ni producción adicionales. Esto impide declarar aprobada una corrida integral Almacén → Extrusión → Telares.

## Evidencia

- `evidence/local-pre-multirun-20261125.dump`: respaldo PostgreSQL previo (formato custom), SHA256 `F592BF8C702D40BA5AFEF122746C6BB4A26309820CE93EDF099C34F4B89DF797`.
- `evidence/local-baseline-20261125.json`: conteos iniciales por tabla y huellas de 30 tablas maestras.
- `evidence/post-warehouse-qa-masterdata.json`: entorno local verificado, 30 tablas comparadas, ninguna cambió.
- `TEST_MATRIX.md`, `DEFECT_REGISTER.md`, `DATA_INTEGRITY_REPORT.md`, `MULTIRUN_REPORT.md`: resultados y límites.

Los archivos de evidencia no guardan credenciales ni copias de filas productivas.

## Alcance pendiente

Una corrida completa necesita resolver el defecto de presentaciones/FIFO registrado en `DEFECT_REGISTER.md` y autorizar explícitamente qué hacer con el turno de Extrusión preexistente y sus mezclas activas. Hasta entonces, no declarar validada producción de Extrusión, Telares, Laminado o Globo.

No se hicieron cambios de código, migraciones, commits, despliegues ni limpieza de datos.
