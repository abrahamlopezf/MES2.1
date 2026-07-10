import { CalendarClock, Eye, MapPin, MoreHorizontal, QrCode, ShieldAlert } from 'lucide-react';

import { TFButton, TFCard, TFCardContent } from '../../../components/tf-ui';
import QrStatusBadge from './QrStatusBadge';

const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const QrCodeMobileCard = ({
  qr,
  onViewEvents,
  onCancel,
  canReadEvents,
  canCancel,
}) => {
  const areaName =
    qr?.currentArea?.name ||
    qr?.assignedArea?.name ||
    qr?.area?.name ||
    'Sin área';

  return (
    <TFCard className="md:hidden">
      <TFCardContent className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <QrCode className="size-6 shrink-0" />
              <strong className="break-all text-lg font-black">
                {qr?.qr_code || qr?.code || 'QR sin código'}
              </strong>
            </div>

            <QrStatusBadge status={qr?.status} />
          </div>

          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(31,58,95,0.08)] text-[var(--color-primary)]">
            <MoreHorizontal className="size-6" />
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl border border-[rgba(31,58,95,0.08)] bg-slate-50/70 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />
            <div className="grid gap-0.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Área
              </span>
              <strong className="font-black text-[var(--color-text)]">{areaName}</strong>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" />
            <div className="grid gap-0.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Creado
              </span>
              <strong className="font-black text-[var(--color-text)]">
                {formatDate(qr?.created_at || qr?.createdAt)}
              </strong>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {canReadEvents && (
            <TFButton
              variant="secondary"
              fullWidth
              icon={Eye}
              onClick={() => onViewEvents?.(qr)}
            >
              Eventos
            </TFButton>
          )}

          {canCancel && qr?.status !== 'CANCELADO' && qr?.status !== 'EN_USO' && (
            <TFButton
              variant="danger"
              fullWidth
              icon={ShieldAlert}
              onClick={() => onCancel?.(qr)}
            >
              Cancelar
            </TFButton>
          )}
        </div>
      </TFCardContent>
    </TFCard>
  );
};

export default QrCodeMobileCard;