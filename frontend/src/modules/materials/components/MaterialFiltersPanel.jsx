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

import {
    MATERIAL_STATUS_OPTIONS,
    MATERIAL_TYPE_OPTIONS,
    MATERIAL_UNIT_OPTIONS,
} from '../constants/materialsUi';

const MaterialFiltersPanel = ({
    filters,
    families = [],
    canViewInactive,
    onFilterChange,
    onClearFilters,
}) => {
    const safeFamilies = Array.isArray(families) ? families : [];

    const familyOptions = safeFamilies.map((family) => ({
        value: String(family.uuid),
        label: family.name,
    }));

    return (
        <TFCard>
            <TFCardHeader>
                <TFCardTitleGroup
                    eyebrow="Filtros"
                    title="Buscar materiales"
                    description="Filtra por nombre, código, familia, tipo o unidad predeterminada."
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
                <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 shadow-inner flex flex-col gap-5">
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
                        <TFInput
                            label="Búsqueda principal"
                            name="search"
                            icon={Search}
                            placeholder="Buscar por código, nombre o descripción..."
                            value={filters.search}
                            onChange={(event) => onFilterChange('search', event.target.value)}
                        />

                        <TFSelect
                            label="Familia"
                            name="family_uuid"
                            placeholder="Todas las familias"
                            value={filters.family_uuid}
                            onChange={(event) =>
                                onFilterChange('family_uuid', event.target.value)
                            }
                            options={familyOptions}
                        />

                        <TFSelect
                            label="Tipo de material"
                            name="material_type"
                            placeholder="Todos los tipos"
                            value={filters.material_type}
                            onChange={(event) => onFilterChange('material_type', event.target.value)}
                            options={MATERIAL_TYPE_OPTIONS}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.5fr]">
                        <TFSelect
                            label="Unidad de medida"
                            name="default_unit"
                            placeholder="Todas las unidades"
                            value={filters.default_unit}
                            onChange={(event) => onFilterChange('default_unit', event.target.value)}
                            options={MATERIAL_UNIT_OPTIONS}
                        />

                        {canViewInactive ? (
                            <TFSelect
                                label="Estado del registro"
                                name="status"
                                placeholder="Solo activos"
                                value={filters.status}
                                onChange={(event) => onFilterChange('status', event.target.value)}
                                options={MATERIAL_STATUS_OPTIONS}
                            />
                        ) : (
                            <div className="hidden lg:block" />
                        )}
                        <div className="hidden lg:block" />
                    </div>
                </div>

                <div className="mt-6 flex items-start sm:items-center gap-3 rounded-xl bg-primary/10 px-5 py-4 text-sm font-bold text-primary border border-primary/20 shadow-sm">
                    <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                        <Filter className="size-5" />
                    </div>
                    <span className="leading-relaxed">
                        El catálogo maestro previene capturas libres y estandariza el flujo para la recepción en almacén.
                    </span>
                </div>
            </TFCardContent>
        </TFCard>
    );
};

export default MaterialFiltersPanel;