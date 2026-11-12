import { useState, useEffect } from 'react';
import { FilterX, Search, Filter, LayoutGrid, List } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';
import { TFSelect } from '../../../components/tf-ui';
import { CollapsibleFilterPanel } from '../../../components/shared/CollapsibleFilterPanel';

import {
    MATERIAL_STATUS_OPTIONS,
    MATERIAL_UNIT_OPTIONS,
} from '../constants/materialsUi';

const MaterialFiltersPanel = ({
    filters,
    families = [],
    tags = [],
    canViewInactive,
    onFilterChange,
    onClearFilters,
    viewMode,
    setViewMode
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

    const filterSummary = [
        filters.search ? `Búsqueda: “${filters.search}”` : null,
        filters.family_uuid ? 'Familia seleccionada' : null,
        filters.material_type ? 'Tipo seleccionado' : null,
        filters.default_unit ? 'Unidad seleccionada' : null,
        filters.tag ? 'Etiquetas seleccionadas' : null,
        filters.status === 'all' ? 'Todos los estados' : filters.status === 'inactive' ? 'Solo inactivos' : null,
    ].filter(Boolean).join(' · ') || 'Sin filtros adicionales';

    return (
        <CollapsibleFilterPanel
            title="Filtros de Búsqueda"
            description="Encuentra materiales por código o ranking."
            summary={filterSummary}
            className="mb-4"
            actions={<>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={onClearFilters} className="min-h-11 text-muted-foreground hover:text-foreground font-bold"><FilterX className="mr-2 size-4 shrink-0" />Limpiar filtros</Button>}
                {setViewMode && <div className="hidden items-center gap-1 rounded-md bg-secondary/50 p-1 md:flex">
                    <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="Vista de lista" className={`flex min-h-10 min-w-10 items-center justify-center rounded-sm text-sm transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List size={18} /></button>
                    <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Vista de tarjetas" className={`flex min-h-10 min-w-10 items-center justify-center rounded-sm text-sm transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid size={18} /></button>
                </div>}
            </>}
        >
            <div className="space-y-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!pl-10 font-medium w-full"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {setViewMode && (
                        <div className="col-span-1 flex items-center justify-between rounded-xl border border-input bg-secondary/30 p-2 sm:col-span-2 md:hidden">
                            <span className="text-sm font-bold text-muted-foreground ml-2">Vista de resultados:</span>
                            <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-sm text-sm flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Vista de lista"
                                >
                                    <List size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-sm text-sm flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Vista de tarjetas"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                        </div>
                    )}

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

            <div className="mt-2 flex items-start gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground shadow-sm sm:items-center">
                <div className="p-1.5 bg-primary/20 rounded-lg shrink-0 text-primary">
                    <Filter className="w-4 h-4" />
                </div>
                <span className="leading-tight">
                    El catálogo maestro previene capturas libres y estandariza el flujo para la recepción en almacén.
                </span>
            </div>
            </div>
        </CollapsibleFilterPanel>
    );
};

export default MaterialFiltersPanel;
