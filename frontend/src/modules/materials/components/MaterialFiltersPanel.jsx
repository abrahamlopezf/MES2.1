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
    categories = [],
    canViewInactive,
    onFilterChange,
    onClearFilters,
}) => {
    const safeCategories = Array.isArray(categories) ? categories : [];

    const categoryOptions = safeCategories.map((category) => ({
        value: String(category.id),
        label: category.name,
    }));

    return (
        <TFCard>
            <TFCardHeader>
                <TFCardTitleGroup
                    eyebrow="Filtros"
                    title="Buscar materiales"
                    description="Filtra por nombre, código, categoría, tipo o unidad predeterminada."
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
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
                    <TFInput
                        label="Buscar"
                        name="search"
                        icon={Search}
                        placeholder="Código, nombre o descripción"
                        value={filters.search}
                        onChange={(event) => onFilterChange('search', event.target.value)}
                    />

                    <TFSelect
                        label="Categoría"
                        name="material_category_id"
                        placeholder="Todas las categorías"
                        value={filters.material_category_id}
                        onChange={(event) =>
                            onFilterChange('material_category_id', event.target.value)
                        }
                        options={categoryOptions}
                    />

                    <TFSelect
                        label="Tipo"
                        name="material_type"
                        placeholder="Todos los tipos"
                        value={filters.material_type}
                        onChange={(event) => onFilterChange('material_type', event.target.value)}
                        options={MATERIAL_TYPE_OPTIONS}
                    />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <TFSelect
                        label="Unidad"
                        name="default_unit"
                        placeholder="Todas las unidades"
                        value={filters.default_unit}
                        onChange={(event) => onFilterChange('default_unit', event.target.value)}
                        options={MATERIAL_UNIT_OPTIONS}
                    />

                    {canViewInactive && (
                        <TFSelect
                            label="Estado"
                            name="status"
                            placeholder="Solo activos"
                            value={filters.status}
                            onChange={(event) => onFilterChange('status', event.target.value)}
                            options={MATERIAL_STATUS_OPTIONS}
                        />
                    )}
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm font-bold text-[var(--color-muted)]">
                    <Filter className="size-5 text-[var(--color-primary)]" />
                    <span>
                        El catálogo evita capturas libres y prepara el flujo de recepción de almacén.
                    </span>
                </div>
            </TFCardContent>
        </TFCard>
    );
};

export default MaterialFiltersPanel;