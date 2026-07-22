import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { EntityTable } from '@/shared/components/table/EntityTable';
import { Button } from '@/components/ui/button';

// Mock Data
const mockData = Array.from({ length: 25 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Usuario de Prueba ${i + 1}`,
  role: i % 3 === 0 ? 'Admin' : i % 2 === 0 ? 'Operador' : 'Supervisor',
  status: i % 5 === 0 ? 'Inactivo' : 'Activo',
}));

// Mock Columns
const mockColumns = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="w-4 h-4 rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="w-4 h-4 rounded border-gray-300"
      />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 font-semibold"
        >
          Nombre Completo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Rol',
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status');
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {status}
        </span>
      );
    },
  },
];

const TestTablePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  return (
    <PageContainer
      title="Prueba de Infraestructura: EntityTable"
      description="Esta página valida los estados agnósticos de la tabla (Loading, Error, Empty, Selección, Paginación, Ordenamiento)."
    >
      <div className="flex gap-3 mb-6 bg-surface p-4 rounded-xl border border-border">
        <Button variant={loading ? 'default' : 'outline'} onClick={() => setLoading(!loading)}>
          Toggle Loading
        </Button>
        <Button variant={error ? 'destructive' : 'outline'} onClick={() => setError(error ? null : new Error('No se pudo conectar a la API.'))}>
          Toggle Error
        </Button>
        <Button variant={isEmpty ? 'default' : 'outline'} onClick={() => setIsEmpty(!isEmpty)}>
          Toggle Empty
        </Button>
      </div>

      <EntityTable
        data={isEmpty ? [] : mockData}
        columns={mockColumns}
        loading={loading}
        error={error}
        empty={{
          title: 'Sin usuarios registrados',
          description: 'No hay datos mock para mostrar en este momento.',
        }}
      />
    </PageContainer>
  );
};

export default TestTablePage;
