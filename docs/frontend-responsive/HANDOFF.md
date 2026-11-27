# Handoff de auditoría responsive

## Punto de continuidad

Los cambios globales están implementados y compilados. Repositorio no está limpio: se conservaron cambios que ya existían en `docs/qa/DEFECT_REGISTER.md`, los presenters de Extrusión, el presenter de Rack, y `TelaresDashboard.tsx`, además de sus pruebas/utilidades sin seguimiento.

## Siguiente orden recomendado

1. Asegurar usuarios/entorno QA local por rol, sin usar producción: Superadmin/Admin general, almacén, supervisor de Extrusión, Telares, Laminado y Globo.
2. Comenzar por formularios operativos de alto riesgo: mezcla, ingreso PTI a rack, recepción, consumo/ODC, inventario/merma, scanner y modales de generación QR.
3. En cada ruta/rol, recorrer loading, empty, error, datos, permisos, modal abierto, campo enfocado/teclado abierto, cambio de orientación, foco y acción backend permitida.
4. Repetir en 320–430 CSS px, tablet vertical/horizontal y monitores 1024–1920; validar temas y navegadores soportados.
5. Adjuntar screenshots antes/después sin datos sensibles, probar cada corrección y cambiar estados `FIXED` a `VERIFIED` solo con evidencia.
6. Resolver baseline ESLint de forma separada y segura; medir el bundle antes de fragmentarlo.

## Límites

No usar cuentas productivas para pruebas, no disparar acciones que cambien inventario/producción, no habilitar cámara sin usuario QA ni certificación de hardware. Consultar al responsable si una regla industrial o permiso no coincide con el contrato.
