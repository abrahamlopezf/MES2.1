# Mejoras pendientes

## Próximos cambios solicitados por el cliente

1. [ ] Permitir transferir un contenedor de mezcla entre extrusoras, conservando su identidad, consumos y trazabilidad por turno.
2. [ ] Permitir que Telares consuma racks con distintos PTI cuando sean compatibles con la ficha técnica del producto.
3. [ ] En Laminado, registrar hasta tres rollos de salida con sus especificaciones y asignar un QR propio a cada rollo.

## Frontend

- [ ] Dividir el bundle inicial de Vite mediante carga diferida por rutas. El build actual transforma 1,861 módulos y genera un bundle JavaScript principal de aproximadamente 3.67 MB (962 KB comprimido), por lo que la consola permanece en `transforming...` durante unos 22 segundos sin mostrar progreso intermedio. Revisar la carga diferida y la división de chunks sin cambiar el comportamiento de las rutas.
