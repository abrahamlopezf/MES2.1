import Card from '../../../components/ui/Card';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import LoadingState from '../../../components/feedback/LoadingState';
import EmptyState from '../../../components/feedback/EmptyState';

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const QrEventsPanel = ({
  qr,
  events = [],
  isLoading = false,
  onClose,
}) => {
  if (!qr) return null;

  const columns = [
    {
      key: 'event_type',
      label: 'Evento',
      render: (row) => (
        <Badge variant="primary">
          {row.event_type}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => (
        <span>
          {row.from_status || '—'} → <strong>{row.to_status || '—'}</strong>
        </span>
      ),
    },
    {
      key: 'area',
      label: 'Área',
      render: (row) => row.to_area?.name || row.from_area?.name || 'Sin área',
    },
    {
      key: 'performed_by',
      label: 'Usuario',
      render: (row) =>
        row.performed_by
          ? `${row.performed_by.first_name} ${row.performed_by.last_name}`
          : 'Sin usuario',
    },
    {
      key: 'created_at',
      label: 'Fecha',
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <Card
      title={`Eventos del QR`}
      description={qr.qr_code}
      actions={
        <button
          type="button"
          className="ui-button ui-button-secondary ui-button-md"
          onClick={onClose}
        >
          Cerrar
        </button>
      }
    >
      {isLoading ? (
        <LoadingState
          title="Cargando eventos"
          message="Estamos consultando el historial del código QR."
        />
      ) : !events.length ? (
        <EmptyState
          title="Sin eventos"
          message="Este código QR aún no tiene eventos registrados."
        />
      ) : (
        <Table
          columns={columns}
          data={events}
          getRowKey={(row) => row.id}
          emptyMessage="Este QR no tiene eventos."
        />
      )}
    </Card>
  );
};

export default QrEventsPanel;