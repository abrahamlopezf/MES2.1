import { FilterX, Plus, QrCode } from 'lucide-react';

import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardContent,
  TFCardHeader,
  TFCardTitleGroup,
} from '../../../components/tf-ui';

import QrCodeMobileCard from './QrCodeMobileCard';

const QrListSection = ({
  qrs = [],
  children,
  onViewEvents,
  onCancel,
  canReadEvents,
  canCancel,
  canGenerate,
  onGenerate,
  hasActiveFilters,
  onClearFilters,
}) => {
  return (
    <TFCard>
      <TFCardHeader>
        <TFCardTitleGroup
          eyebrow="Listado"
          title="Códigos disponibles"
          description="Consulta los códigos QR generados, asignados y usados dentro del sistema."
        />

        <TFBadge variant="primary">
          {qrs.length} registros
        </TFBadge>
      </TFCardHeader>

      <TFCardContent>
        {qrs.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-[2rem] border border-dashed border-[rgba(31,58,95,0.16)] bg-slate-50/80 p-8 text-center">
            <div className="grid max-w-md gap-5">
              <div className="mx-auto grid size-20 place-items-center rounded-[2rem] bg-[rgba(31,58,95,0.10)] text-[var(--color-primary)]">
                <QrCode className="size-10" />
              </div>

              <div className="grid gap-2">
                <h3 className="m-0 text-2xl font-black text-[var(--color-primary)]">
                  {hasActiveFilters
                    ? 'No hay códigos con estos filtros'
                    : 'Aún no hay códigos QR'}
                </h3>

                <p className="m-0 font-semibold leading-relaxed text-[var(--color-muted)]">
                  {hasActiveFilters
                    ? 'Prueba limpiando los filtros para consultar todos los códigos disponibles.'
                    : 'Genera tu primer lote de códigos QR para iniciar la trazabilidad operativa.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {hasActiveFilters && (
                  <TFButton
                    variant="secondary"
                    icon={FilterX}
                    fullWidth
                    onClick={onClearFilters}
                  >
                    Limpiar filtros
                  </TFButton>
                )}

                {!hasActiveFilters && canGenerate && (
                  <TFButton
                    icon={Plus}
                    fullWidth
                    onClick={onGenerate}
                  >
                    Generar lote
                  </TFButton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="qr-mobile-list">
              {qrs.map((qr) => (
                <QrCodeMobileCard
                  key={qr.id}
                  qr={qr}
                  onViewEvents={onViewEvents}
                  onCancel={onCancel}
                  canReadEvents={canReadEvents}
                  canCancel={canCancel}
                />
              ))}
            </div>

            <div className="qr-desktop-table">
              {children}
            </div>
          </>
        )}
      </TFCardContent>
    </TFCard>
  );
};

export default QrListSection;