import React, { useState, useEffect } from 'react';
import { FilterX, Search, Filter } from 'lucide-react';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';
import { TFSelect } from '../../../components/tf-ui';

import {
    MATERIAL_STATUS_OPTIONS,
    MATERIAL_TYPE_OPTIONS,
    MATERIAL_UNIT_OPTIONS,
} from '../constants/materialsUi';

const MaterialFiltersPanel = ({
    filters,
    families = [],
    tags = [],
    canViewInactive,
    onFilterChange,
    onClearFilters,
}) => {
    const safeFamilies = Array.isArray(families) ? families : [];

    const familyOptions = safeFamilies.map((family) => ({
        value: String(family.uuid),
        label: family.name,
    }));

    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    useEffect(() => {
        setSearchTerm(filters.search || '');
    }, [filters.search]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                onFilterChange('search', searchTerm);
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, onFilterChange, filters.search]);

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.family_uuid ||
        filters.material_type ||
        filters.default_unit ||
        filters.tag ||
        (filters.status && filters.status !== 'active')
    );

    return (
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
                <div>
                    <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
                    <p className="text-sm text-muted-foreground font-semibold">Encuentra materiales por código o ranking.</p>
                </div>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground font-bold w-full sm:w-auto justify-center sm:justify-start">
                        <FilterX className="w-4 h-4 mr-2 shrink-0" />
                        <span>Limpiar Filtros</span>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="relative sm:col-span-2 md:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!pl-10 font-medium w-full"
                    />
                </div>

                <select
                    className="flex h-14 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.family_uuid}
                    onChange={(e) => onFilterChange('family_uuid', e.target.value)}
                >
                    <option value="">Todos los Rankings</option>
                    {familyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>



                <select
                    className="flex h-14 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.default_unit}
                    onChange={(e) => onFilterChange('default_unit', e.target.value)}
                >
                    <option value="">Todas las unidades</option>
                    {MATERIAL_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>



                <div className="relative">
                    <TFSelect
                        placeholder="Todas las Etiquetas"
                        value={filters.tag ? filters.tag.split(',') : []}
                        onChange={(e) => onFilterChange('tag', e.target.value.join(','))}
                        options={tags.map((opt) => ({ value: String(opt.uuid || opt.id), label: opt.name }))}
                        isMulti={true}
                        containerClassName="!gap-0"
                    />
                </div>

                {canViewInactive && (
                    <select
                        className="flex h-14 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                    >
                        {MATERIAL_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="mt-2 flex items-start sm:items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground border border-border shadow-sm">
                <div className="p-1.5 bg-primary/20 rounded-lg shrink-0 text-primary">
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