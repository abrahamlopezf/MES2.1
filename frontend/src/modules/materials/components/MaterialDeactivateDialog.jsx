import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../design-system';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

const MaterialDeactivateDialog = ({
  open,
  material,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desactivar material</DialogTitle>

          <DialogDescription>
            Esta acción ocultará el material para futuras operaciones, pero conservará
            su historial y trazabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 my-4">
          <div className="flex items-start gap-3 text-destructive">
            <AlertTriangle className="mt-0.5 size-7 shrink-0" />

            <div className="grid gap-1">
              <strong className="text-lg font-black">
                Revisa antes de continuar
              </strong>

              <p className="m-0 text-sm font-bold leading-relaxed">
                Material seleccionado:{' '}
                <span className="font-black text-foreground">
                  {material?.code} — {material?.name}
                </span>
              </p>

              <p className="m-0 text-sm font-semibold leading-relaxed text-destructive/80 mt-1">
                Si el material ya fue usado en movimientos, registros o trazabilidad,
                no se eliminará físicamente. Solo pasará a estado inactivo.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="font-bold shadow-sm"
          >
            Regresar
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="font-bold shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Desactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialDeactivateDialog;