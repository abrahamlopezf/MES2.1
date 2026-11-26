# Auditoría UX industrial — revisión de solo lectura

## Navegación y estados observados

- **Almacén:** el acceso lateral “Recepción”, pulsado dos veces desde Inventario, abrió el escáner global sin navegar a recepción. El formulario de ingreso sí se pudo abrir mediante su acción específica.
- **Telares:** el catálogo carga 18 fichas y lista máquinas/filetas (21). El terminal muestra telar seleccionado, capacidad/WIP y las fichas elegibles. La etapa “Continuar a corrida” queda deshabilitada sin selección/condiciones cumplidas, como protección esperada. El control de scrap es un formulario independiente por telar, fecha y turno.
- **Historial QR:** muestra rollo, telar, producción, nómina y ruta, pero en los registros consultados la fecha se presenta como “—”. No se abrió el detalle de genealogía.
- **Laminado:** el catálogo mostró una ficha de prueba local, con etiqueta que advierte que no es especificación aprobada del cliente. WIP mostró cero rollos en piso, dos insumos y siete finalizados.
- **Globo:** el catálogo mostró dos especificaciones inactivas de ejemplo. WIP cargó 51 kg de insumos y dos rollos en tránsito, sin rollos físicos en custodia.
- En catálogos/WIP hubo un estado de carga inicial de pocos segundos; después aparecieron los datos. No se concluye bloqueo persistente.

## Riesgos de comprensión

- El texto de rutas en fichas y la ruta persistida que se resume en QR no siempre coincide para algunos rollos de prueba. Puede ser un snapshot histórico válido o un problema de visualización; requiere comparar genealogía persistida antes de corregir (`QA-TEL-UI-001`).
- La ODC mostró una cantidad de paquete distinta a lo que realmente se transfirió al WIP; es un problema funcional/UX de severidad alta (`QA-ODC-PACK-001`).
- Los mensajes de escáner dependen de permiso de cámara. En la prueba se usó entrada manual de QR, por lo que el permiso/hardware queda pendiente.

## Límites

La revisión fue escritorio, con sesión Superadmin local y navegación de lectura. No se probaron todos los botones, errores, permisos por rol, operación móvil ni accesibilidad con usuarios finales. No emitir una calificación UX global con esta muestra.
