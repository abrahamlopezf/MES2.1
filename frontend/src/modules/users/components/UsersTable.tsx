import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Edit3 } from 'lucide-react';

import { EntityTable } from '@/shared/components/table/EntityTable';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { User } from '../types/user';

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
}

const UsersTable: React.FC<UsersTableProps> = ({ users = [], onEdit }) => {
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'numeroNomina',
        header: 'No. Nómina',
        cell: ({ row }) => <strong className="font-medium text-foreground">{row.original.numeroNomina}</strong>,
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.username}</span>,
      },
      {
        accessorKey: 'nombreCompleto',
        header: 'Nombre Completo',
        cell: ({ row }) => (
          <span className="text-foreground font-semibold">
            {row.original.nombres} {row.original.apellidos}
          </span>
        ),
      },
      {
        accessorKey: 'area',
        header: 'Área',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.areaNombre}
          </span>
        ),
      },
      {
        accessorKey: 'rol',
        header: 'Rol',
        cell: ({ row }) => (
          <Badge variant={row.original.rolNombre.toUpperCase().includes('ADMIN') ? 'default' : 'secondary'}>
            {row.original.rolNombre}
          </Badge>
        ),
      },
      {
        accessorKey: 'telefono',
        header: 'Teléfono',
        cell: ({ row }) => <span className="text-sm">{row.original.telefono || 'N/A'}</span>,
      },
      {
        accessorKey: 'correo',
        header: 'Correo',
        cell: ({ row }) => <span className="text-sm">{row.original.correo}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status;
          
          if (status === 'ACTIVE') {
            return (
              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
                Activo
              </Badge>
            );
          }
          if (status === 'PENDING') {
            return (
              <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                Pendiente
              </Badge>
            );
          }
          return (
            <Badge variant="destructive">
              Inactivo
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center gap-2 justify-end">
              <PermissionGate
                permission="users.update"
                fallback={<span className="text-xs text-muted-foreground">Sin acciones</span>}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEdit(user)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </PermissionGate>
            </div>
          );
        },
      },
    ],
    [onEdit]
  );

  return (
    <EntityTable
      data={users}
      columns={columns}
      empty={{
        title: 'No hay usuarios registrados.',
        description: 'No pudimos encontrar datos para los filtros aplicados.',
      }}
    />
  );
};

export default UsersTable;
