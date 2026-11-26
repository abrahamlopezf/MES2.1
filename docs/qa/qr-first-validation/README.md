# Auditoría QR-First y genealogía industrial

**Corte documental:** 2026-11-26 · **Alcance:** auditoría estructural QR-first y RBAC; se implementó un filtro local para centralizar creación de lotes QR, sin escrituras en base de datos ni operaciones productivas.

Este conjunto distingue evidencia estructural, pruebas automatizadas existentes y recorridos industriales ejecutados. La presencia de un modelo o endpoint no se considera prueba de funcionamiento integral. No se realizaron operaciones productivas ni se accedió a servicios remotos.

## Documentos

1. [Requisitos y fuentes](01_QR_FIRST_REQUIREMENTS.md)
2. [Matriz por módulo](02_MODULE_COMPLIANCE_MATRIX.md)
3. [Ciclo de vida y resolución contextual](03_QR_LIFECYCLE_AND_CONTEXT.md)
4. [Auditoría de genealogía](04_TRACEABILITY_GENEALOGY_AUDIT.md)
5. [Pruebas E2E y visuales](05_E2E_AND_VISUAL_VALIDATION.md)
6. [Hallazgos y faltantes](06_DEFECTS_AND_MISSING_FEATURES.md)
7. [Decisiones de Producto](07_PRODUCT_OWNER_DECISIONS.md)
8. [Plan recomendado](08_IMPLEMENTATION_ROADMAP.md)
9. [Informe ejecutivo](09_EXECUTIVE_REPORT.md)
10. [Requisitos RBAC por área](10_RBAC_AREA_REQUIREMENTS.md)
11. [Matriz de permisos](11_ROLE_PERMISSION_MATRIX.md)
12. [Política de lotes QR centralizados](12_CENTRALIZED_QR_BATCH_POLICY.md)
13. [Protección de costos](13_FINANCIAL_DATA_PROTECTION.md)
14. [Resultados de pruebas RBAC/QR](14_RBAC_AND_QR_TEST_RESULTS.md)
15. [Cambios de implementación y hallazgos](15_REQUIRED_IMPLEMENTATION_CHANGES.md)

Las fuentes principales y su evaluación están enlazadas en cada documento. El expediente no contiene capturas sanitizadas nuevas; véase `evidence/README.md`.

## Estados usados

- **Implementado y verificado:** existe evidencia de ejecución específica que cubre el requisito.
- **Implementado parcialmente:** parte del flujo está demostrada; faltan casos o enlaces.
- **Implementado sin validación:** se observó código o UI, pero no una ejecución verificable.
- **Pendiente de definición / bloqueado:** depende de una regla industrial o acceso legítimo todavía no confirmado.
- **No ejecutado:** esta intervención no corrió ese escenario.

No se calcula porcentaje global porque no hay inventario de pruebas ejecutadas suficiente para sostenerlo.
