import { Building2 } from 'lucide-react';

import Badge from '../../../components/ui/Badge';
import Table from '../../../components/ui/Table';

const AreasTable = ({ areas = [] }) => {
  const columns = [
    {
      key: 'area',
      label: 'Área',
      render: (row) => (
        <div className="table-user-cell">
          <strong>{row.name}</strong>
          <span>{row.code}</span>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (row) => row.description || 'Sin descripción',
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: () => (
        <div className="role-permissions-preview">
          <Building2 size={20} />
          <span>Área operativa</span>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={areas}
      getRowKey={(row) => row.id}
      emptyMessage="No hay áreas registradas."
    />
  );
};

export default AreasTable;