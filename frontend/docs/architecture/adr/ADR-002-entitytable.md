# ADR-002: Arquitectura de Tablas Universales (EntityTable)

**Estado:** Aprobado (Sprint A)
**Fecha:** 2026-07-19

## Contexto y Motivación
El ERP contendrá docenas de tablas de datos diferentes (Usuarios, Roles, Inventario, Trazabilidad QR, Scrap, etc.). Permitir que cada módulo construya su propia tabla inevitablemente causará discrepancias en la experiencia de usuario (sorting, paginación, loading states) y duplicación masiva de lógica.

## Decisión
Todo módulo debe delegar el renderizado de datos tabulares a un componente centralizado (`EntityTable`), construido sobre **TanStack Table** y Shadcn UI. 
Este componente opera de manera estrictamente **Stateless** (Regla #31). No muta datos, no interactúa con React Query, no evalúa permisos RBAC, ni conoce la lógica de los módulos de dominio.

## Contrato de Interfaz Congelado
Para evitar que el componente base sufra de mutaciones que rompan docenas de módulos en el futuro, el contrato de Props de `EntityTable` se documenta como estricto y cualquier alteración incompatible requerirá migración coordinada o una nueva versión principal del componente:

```typescript
export interface EntityTableEmptyState {
  title: string;
  description?: string;
}

export interface EntityTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: Error | null;
  empty?: EntityTableEmptyState;
}
```

## Consecuencias
- **Positivas:** 
  - UX idéntica en todo el sistema.
  - Mantenimiento centralizado (un bug corregido en EntityTable lo arregla en todo el ERP).
  - Los módulos solo inyectan `columns`, `data` y `actions` (Desacoplamiento total).
- **Negativas / Riesgos:**
  - El componente puede volverse "god object" si se inyecta demasiada lógica condicional; por ello debe mantenerse agnóstico a la lógica de negocio (Regla #15).
