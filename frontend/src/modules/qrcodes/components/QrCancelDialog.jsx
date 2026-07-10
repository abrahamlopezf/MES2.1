import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  TFButton,
  TFDialog,
  TFDialogContent,
  TFDialogDescription,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
  TFTextarea,
} from '../../../components/tf-ui';

const QrCancelDialog = ({
  open,
  qr,
  isLoading,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) return;
    setReason('');
  }, [open]);

  const handleConfirm = () => {
    onConfirm?.({
      reason: reason.trim() || 'Cancelación manual desde administración QR.',
    });
  };

  return (
    <TFDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <TFDialogContent>
        <TFDialogHeader>
          <TFDialogTitle>Cancelar código QR</TFDialogTitle>
          <TFDialogDescription>
            Esta acción marcará el código QR como cancelado y no podrá usarse en operación.
          </TFDialogDescription>
        </TFDialogHeader>

        <div className="grid gap-5">
          <div className="rounded-3xl border border-[rgba(197,48,48,0.18)] bg-[rgba(197,48,48,0.08)] p-5">
            <div className="flex items-start gap-3 text-[var(--color-danger)]">
              <AlertTriangle className="mt-0.5 size-7 shrink-0" />

              <div className="grid gap-1">
                <strong className="text-lg font-black">
                  Revisa antes de continuar
                </strong>

                <p className="m-0 text-sm font-bold leading-relaxed">
                  Código seleccionado:{' '}
                  <span className="break-all">
                    {qr?.qr_code || qr?.code || 'Sin código'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <TFTextarea
            label="Motivo de cancelación"
            name="cancel_reason"
            placeholder="Ej. Código dañado, impreso incorrectamente o cancelado por control interno."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            helperText="Este motivo quedará registrado como parte del historial operativo."
          />
        </div>

        <TFDialogFooter>
          <TFButton
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Regresar
          </TFButton>

          <TFButton
            variant="danger"
            icon={AlertTriangle}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Cancelar QR
          </TFButton>
        </TFDialogFooter>
      </TFDialogContent>
    </TFDialog>
  );
};

export default QrCancelDialog;