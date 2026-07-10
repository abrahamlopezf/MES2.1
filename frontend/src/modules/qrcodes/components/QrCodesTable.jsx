import { Eye, History, Power } from 'lucide-react';

import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import QrStatusBadge from './QrStatusBadge';

const getQrStatusVariant = (status) => {
  const variants = {
    GENERADO: 'neutral',
    DISPONIBLE: 'success',
    EN_USO: 'warning',
    TRANSFERIDO: 'primary',
    FINALIZADO: 'primary',
    CANCELADO: 'danger',
    DANADO: 'danger',
  };

  return variants[status] || 'neutral';
};

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const QrCodesTable = ({
  qrCodes = [],
  canCancel = false,
  canReadEvents = false,
  onViewEvents,
  onCancel,
}) => {
  const columns = [
    {
      key: 'qr_code',
      label: 'Código QR',
      render: (row) => (
        <div className="table-user-cell">
          <strong>{row.qr_code}</strong>
          <span>{row.batch?.batch_code || 'Sin lote'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <QrStatusBadge status={row.status} />
      ),
    },
    {
      key: 'area',
      label: 'Área actual',
      render: (row) => row.current_area?.name || row.assigned_area?.name || 'Sin área',
    },
    {
      key: 'entity',
      label: 'Uso',
      render: (row) =>
        row.entity_type
          ? `${row.entity_type} #${row.entity_id || ''}`
          : 'Sin vincular',
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (row) => {
        const canCancelQr =
          canCancel &&
          row.is_active &&
          !row.entity_type &&
          !row.entity_id &&
          !['EN_USO', 'CANCELADO', 'FINALIZADO'].includes(row.status);

        return (
          <div className="table-actions">
            {canReadEvents && (
              <Button
                size="sm"
                variant="secondary"
                icon={History}
                onClick={() => onViewEvents(row)}
              >
                Eventos
              </Button>
            )}

            {canCancelQr && (
              <Button
                size="sm"
                variant="danger"
                icon={Power}
                onClick={() => onCancel(row)}
              >
                Cancelar
              </Button>
            )}

            {!canReadEvents && !canCancelQr && (
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
      data={qrCodes}
      getRowKey={(row) => row.id}
      emptyMessage="No hay códigos QR para mostrar."
    />
  );
};

export default QrCodesTable;