import { FilterX, Search, Filter } from 'lucide-react';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';

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

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.family_uuid ||
        filters.material_type ||
        filters.default_unit ||
        (filters.status && filters.status !== 'active')
    );

    return (
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 mb-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
                <div>
                    <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
                    <p className="text-sm text-muted-foreground font-semibold">Encuentra materiales por código, familia o tipo.</p>
                </div>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground font-bold">
                        <FilterX className="w-4 h-4 mr-2" />
                        Limpiar Filtros
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative md:col-span-2 lg:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={filters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        className="pl-10 font-medium w-full"
                    />
                </div>

                <select
                    className="flex h-14 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.family_uuid}
                    onChange={(e) => onFilterChange('family_uuid', e.target.value)}
                >
                    <option value="">Todas las familias</option>
                    {familyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                <select
                    className="flex h-14 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.material_type}
                    onChange={(e) => onFilterChange('material_type', e.target.value)}
                >
                    <option value="">Todos los tipos</option>
                    {MATERIAL_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                <select
                    className="flex h-14 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.default_unit}
                    onChange={(e) => onFilterChange('default_unit', e.target.value)}
                >
                    <option value="">Todas las unidades</option>
                    {MATERIAL_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>

                {canViewInactive && (
                    <select
                        className="flex h-14 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 lg:col-span-1"
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                    >
                        {MATERIAL_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="mt-2 flex items-start sm:items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary border border-primary/20 shadow-sm">
                <div className="p-1.5 bg-primary/20 rounded-lg shrink-0">
                    <Filter className="w-4 h-4" />
                </div>
                <span className="leading-tight">
                    El catálogo maestro previene capturas libres y estandariza el flujo para la recepción en almacén.
                </span>
            </div>
        </section>
    );
};

export default MaterialFiltersPanel;