import { Edit3, Power } from 'lucide-react';

import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';

const getStatusBadge = (isActive) => {
  return isActive ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="danger">Inactivo</Badge>
  );
};

const UsersTable = ({
  users = [],
  currentUser,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      key: 'name',
      label: 'Nombre',
      render: (row) => (
        <div className="table-user-cell">
          <strong>
            {row.first_name} {row.last_name}
          </strong>
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      key: 'username',
      label: 'Usuario',
      render: (row) => <strong>{row.username}</strong>,
    },
    {
      key: 'role',
      label: 'Rol',
      render: (row) => (
        <Badge variant={row.role?.code === 'SUPERADMIN' ? 'primary' : 'neutral'}>
          {row.role?.name || 'Sin rol'}
        </Badge>
      ),
    },
    {
      key: 'area',
      label: 'Área',
      render: (row) => row.area?.name || 'Sin área',
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => getStatusBadge(row.is_active),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (row) => {
        const isCurrentUser = Number(row.id) === Number(currentUser?.id);
        const canDeactivate = canDelete && !isCurrentUser && row.is_active;

        return (
          <div className="table-actions">
            {canUpdate && (
              <Button
                size="sm"
                variant="secondary"
                icon={Edit3}
                onClick={() => onEdit(row)}
              >
                Editar
              </Button>
            )}

            {canDeactivate && (
              <Button
                size="sm"
                variant="danger"
                icon={Power}
                onClick={() => onDelete(row)}
              >
                Desactivar
              </Button>
            )}

            {!canUpdate && !canDeactivate && (
              <span className="muted-text">Sin acciones</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={users}
      getRowKey={(row) => row.id}
      emptyMessage="No hay usuarios registrados."
    />
  );
};

export default UsersTable;