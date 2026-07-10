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

const CategoryDeactivateDialog = ({
  open,
  category,
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
          <TFDialogTitle>Desactivar categoría</TFDialogTitle>

          <TFDialogDescription>
            Esta acción ocultará la categoría para nuevos registros. Si tiene
            materiales activos relacionados, el backend puede bloquear la operación.
          </TFDialogDescription>
        </TFDialogHeader>

        <div className="rounded-3xl border border-[rgba(183,121,31,0.22)] bg-[rgba(183,121,31,0.12)] p-5">
          <div className="flex items-start gap-3 text-[var(--color-warning)]">
            <AlertTriangle className="mt-0.5 size-7 shrink-0" />

            <div className="grid gap-1">
              <strong className="text-lg font-black">
                Categoría seleccionada
              </strong>

              <p className="m-0 text-sm font-bold leading-relaxed">
                <span className="font-black">
                  {category?.code} — {category?.name}
                </span>
              </p>

              <p className="m-0 text-sm font-semibold leading-relaxed text-[var(--color-muted)]">
                Recomendación: desactiva primero los materiales activos asociados,
                o conserva la categoría activa si seguirá siendo usada.
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

export default CategoryDeactivateDialog;