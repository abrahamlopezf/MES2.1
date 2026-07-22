import { Plus, QrCode, RefreshCw, ScanLine, Shuffle } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
} from '../../../components/tf-ui';

const QrModuleHeader = ({
  total = 0,
  canGenerate,
  canAssign,
  onGenerate,
  onAssign,
  onValidate,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <TFCard className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary-foreground/10" />
      <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-primary-foreground/10 blur-sm" />

      <TFCardContent className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid gap-4">
          <div className="flex w-fit items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 font-black backdrop-blur-md">
            <QrCode className="size-5" />
            <span>Motor QR</span>
          </div>

          <div className="grid gap-2">
            <h2 className="m-0 text-4xl font-black leading-none tracking-tight sm:text-5xl">
              Códigos QR
            </h2>

            <p className="m-0 max-w-3xl text-base font-semibold leading-relaxed text-primary-foreground/90 sm:text-lg">
              Genera, asigna, valida y consulta códigos QR para controlar la
              trazabilidad operativa desde almacén hasta procesos posteriores.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TFBadge variant="neutral" className="bg-primary-foreground/20 text-primary-foreground border-transparent">
              {total} códigos visibles
            </TFBadge>

            <TFBadge variant="success" className="bg-primary-foreground/20 text-primary-foreground border-transparent">
              Trazabilidad activa
            </TFBadge>

            {isRefreshing && (
              <TFBadge variant="primary" className="bg-primary-foreground/20 text-primary-foreground border-transparent">
                Sincronizando
              </TFBadge>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:min-w-64">
          <TFButton
            variant="secondary"
            fullWidth
            icon={RefreshCw}
            className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onRefresh}
            isLoading={isRefreshing}
          >
            Actualizar
          </TFButton>

          <TFButton
            variant="secondary"
            fullWidth
            icon={ScanLine}
            className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onValidate}
          >
            Validar QR
          </TFButton>

          {canGenerate && (
            <TFButton
              variant="secondary"
              fullWidth
              icon={Plus}
              className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onGenerate}
            >
              Generar lote
            </TFButton>
          )}

          {canAssign && (
            <TFButton
              variant="secondary"
              fullWidth
              icon={Shuffle}
              className="border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onAssign}
            >
              Asignar QR
            </TFButton>
          )}
        </div>
      </TFCardContent>
    </TFCard>
  );
};

export default QrModuleHeader;