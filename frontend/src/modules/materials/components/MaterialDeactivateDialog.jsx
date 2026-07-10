import { AlertTriangle } from 'lucide-react';

import {
  TFButton,
  TFDialog,
  TFDialogContent,
  TFDialogDescription,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
} from '../../../components/tf-ui';

const MaterialDeactivateDialog = ({
  open,
  material,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <TFDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <TFDialogContent>
        <TFDialogHeader>
          <TFDialogTitle>Desactivar material</TFDialogTitle>

          <TFDialogDescription>
            Esta acción ocultará el material para futuras operaciones, pero conservará
            su historial y trazabilidad.
          </TFDialogDescription>
        </TFDialogHeader>

        <div className="rounded-3xl border border-[rgba(197,48,48,0.18)] bg-[rgba(197,48,48,0.08)] p-5">
          <div className="flex items-start gap-3 text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 size-7 shrink-0" />

            <div className="grid gap-1">
              <strong className="text-lg font-black">
                Revisa antes de continuar
              </strong>

              <p className="m-0 text-sm font-bold leading-relaxed">
                Material seleccionado:{' '}
                <span className="font-black">
                  {material?.code} — {material?.name}
                </span>
              </p>

              <p className="m-0 text-sm font-semibold leading-relaxed text-[var(--color-muted)]">
                Si el material ya fue usado en movimientos, registros o trazabilidad,
                no se eliminará físicamente. Solo pasará a estado inactivo.
              </p>
            </div>
          </div>
        </div>

        <TFDialogFooter>
          <TFButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Regresar
          </TFButton>

          <TFButton
            type="button"
            variant="danger"
            icon={AlertTriangle}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Desactivar
          </TFButton>
        </TFDialogFooter>
      </TFDialogContent>
    </TFDialog>
  );
};

export default MaterialDeactivateDialog;