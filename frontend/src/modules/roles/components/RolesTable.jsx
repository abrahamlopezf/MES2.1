import { Edit3, Power, ShieldCheck } from 'lucide-react';

import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';

const getRoleBadgeVariant = (roleCode) => {
  if (roleCode === 'SUPERADMIN') return 'primary';
  if (roleCode === 'ADMIN') return 'warning';
  if (roleCode === 'FINANCE') return 'success';
  return 'neutral';
};

const RolesTable = ({
  roles = [],
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      key: 'role',
      label: 'Rol',
      render: (row) => (
        <div className="table-user-cell">
          <strong>{row.name}</strong>
          <span>{row.code}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (row) => (
        <Badge variant={row.is_system ? 'primary' : 'neutral'}>
          {row.is_system ? 'Base del sistema' : 'Personalizado'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'permissions',
      label: 'Permisos',
      render: (row) => (
        <div className="role-permissions-preview">
          <ShieldCheck size={20} />
          <span>{row.permissions?.length || 0} permisos</span>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Nivel',
      render: (row) => (
        <Badge variant={getRoleBadgeVariant(row.code)}>
          {row.code}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (row) => {
        const canManageSystemRole = !row.is_system;
        const canDeactivate = canDelete && canManageSystemRole && row.is_active;

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
              <span className="muted-text">Solo lectura</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={roles}
      getRowKey={(row) => row.id}
      emptyMessage="No hay roles registrados."
    />
  );
};

export default RolesTable;