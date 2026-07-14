import { AlertTriangle } from 'lucide-react';
import Button from './button.tsx';

const ConfirmDialog = ({
  open,
  title = 'Confirmar acción',
  message = '¿Seguro que deseas continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="ui-dialog-backdrop" role="presentation">
      <section
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className={`ui-dialog-icon ui-dialog-icon-${variant}`}>
          <AlertTriangle size={42} />
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>

        <div className="ui-dialog-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;