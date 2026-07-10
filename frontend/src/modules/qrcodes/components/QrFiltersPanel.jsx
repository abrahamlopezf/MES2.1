import { Filter, RotateCcw, Search } from 'lucide-react';

import {
  TFButton,
  TFCard,
  TFCardContent,
  TFCardHeader,
  TFCardTitleGroup,
  TFInput,
  TFSelect,
} from '../../../components/tf-ui';

import { QR_STATUS_OPTIONS } from '../constants/qrUi';

const QrFiltersPanel = ({
  searchTerm,
  statusFilter,
  areaFilter,
  areas = [],
  onSearchChange,
  onStatusChange,
  onAreaChange,
  onClearFilters,
}) => {
  const areaOptions = [
    { value: '', label: 'Todas las áreas' },
    ...areas.map((area) => ({
      value: String(area.id),
      label: area.name,
    })),
  ];

  return (
    <TFCard>
      <TFCardHeader>
        <TFCardTitleGroup
          eyebrow="Filtros"
          title="Buscar códigos QR"
          description="Filtra por código, estado o área asignada."
        />

        <TFButton
          variant="secondary"
          icon={RotateCcw}
          onClick={onClearFilters}
        >
          Limpiar
        </TFButton>
      </TFCardHeader>

      <TFCardContent>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <TFInput
            label="Buscar"
            name="qr_search"
            icon={Search}
            placeholder="Código QR, lote o dato relacionado"
            value={searchTerm}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />

          <TFSelect
            label="Estado"
            name="qr_status"
            value={statusFilter}
            onChange={(event) => onStatusChange?.(event.target.value)}
            options={QR_STATUS_OPTIONS.filter((option) => option.value !== '')}
            placeholder="Todos los estados"
          />

          <TFSelect
            label="Área"
            name="qr_area"
            value={areaFilter}
            onChange={(event) => onAreaChange?.(event.target.value)}
            options={areaOptions.filter((option) => option.value !== '')}
            placeholder="Todas las áreas"
          />
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm font-bold text-[var(--color-muted)]">
          <Filter className="size-5 text-[var(--color-primary)]" />
          <span>
            Los filtros ayudan a encontrar códigos rápidamente en operación móvil.
          </span>
        </div>
      </TFCardContent>
    </TFCard>
  );
};

export default QrFiltersPanel;