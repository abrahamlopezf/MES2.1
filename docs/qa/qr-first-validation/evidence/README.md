# Índice de evidencias

Este expediente registra evidencia estática y referencias a reportes previos. No se agregaron capturas nuevas ni extractos de datos personales.

| Evidencia | Fuente | Alcance y límite |
|---|---|---|
| E-01 Estados y eventos de QR | `backend/src/modules/qrcodes/qr.constants.js:1-35`; modelos `QrCode`, `QrBatch`, `QrEvent` | Confirma vocabulario y estructura; no confirma transiciones en runtime. |
| E-02 Generación / asignación | `backend/src/modules/qrcodes/qrcodes.service.js:283-425,693-789` | Generación y asignación usan transacciones; no demuestra concurrencia en todos los flujos. |
| E-03 Resolución contextual | `backend/src/modules/traceability/traceability.service.js:118-190,460-690` | Consulta identidad, asignación, artículo, eventos, movimientos, enlaces y acciones sugeridas; estática. |
| E-04 Árbol transversal | `backend/src/modules/qrcodes/qrTraceabilityTree.service.js:330-610,732-870` | Resuelve múltiples entidades; no equivale a una genealogía completa sin límites. |
| E-05 Trazabilidad por entidad | Modelos `traceableItem`, `traceabilityLink`, `traceabilityMovement`, `traceabilityEvent` | Los campos permiten artículos, enlaces con cantidades, movimientos y eventos. No prueba ausencia de huérfanos/ciclos. |
| E-06 Participación en Telares | `backend/src/modules/telares/telares.service.js:1386-1505,1682-1712` y `ViajeroRollOperatorSegment` | El servicio valida intervalos de metros y guarda segmentos; recorrido QR final no fue ejecutado aquí. |
| E-07 Laminado | `backend/src/modules/laminado/laminado.service.js:705-840` | Implementación transaccional visible para consumo, salida QR, item y vínculos; no es prueba E2E. |
| E-08 Invariancia Master Data | `backend/src/scripts/master-data-fingerprint.js:1-75`; migraciones `20261023000000-create-silos-and-extruders.js:40-43` y `20261104110000-configure-extruder-output-ownership.js:41-42` | Hallazgo estático confirmado: el esquema/migraciones nombran la tabla física `extrusoras_formulas`, pero el fingerprint lista `extruder_formulas`. El verificador podría contarla ausente con cero filas y aun así calcular una huella; requiere revisión autorizada antes de cualquier prueba con escritura. No se consultó PostgreSQL ni se modificó la guarda. |
| E-09 Hallazgos previos | `docs/qa/TRACEABILITY_REPORT.md`, `docs/qa/DEFECT_REGISTER.md`, `docs/engineering-readiness/pre-mvc-final/13_VALIDATION_RESULTS.md` | Evidencia histórica; estados y resultados deben fecharse y no se presentan como una nueva ejecución. |
| E-10 Evidencia previa a RBAC QR | `pre-rbac-qr/` | Copias byte a byte de los siete archivos limpios tocados antes de editar, más `SHA256SUMS.txt`; rollback solo tras comparar el hash actual y proteger cualquier cambio concurrente. |
| E-11 RBAC QR local | `backend/test/qrcodes-batch-access.test.js`; `docs/qa/qr-first-validation/14_RBAC_AND_QR_TEST_RESULTS.md` | Cuatro pruebas de allowlist/denegación; no es prueba API autenticada ni visual. |

## Seguridad de evidencia

No guardar tokens, contraseñas, datos personales, cadenas de conexión ni QRs operativos completos. Para futuras capturas, utilizar registros QA sintéticos y difuminar identificadores que permitan acceder a material real.
