import React, { useState, useEffect } from 'react';
import { FilterX, Search, Filter, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
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
    viewMode,
    setViewMode
}) => {
    const safeFamilies = Array.isArray(families) ? families : [];

    const familyOptions = safeFamilies.map((family) => ({
        value: String(family.uuid),
        label: family.name,
    }));

    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const [isExpanded, setIsExpanded] = useState(false);

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-border pb-3">
                <div>
                    <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
                    <p className="text-sm text-muted-foreground font-semibold">Encuentra materiales por código o ranking.</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="font-bold flex-1 sm:flex-none justify-center md:hidden">
                        {isExpanded ? <ChevronUp className="w-4 h-4 mr-2 shrink-0" /> : <ChevronDown className="w-4 h-4 mr-2 shrink-0" />}
                        <span>{isExpanded ? 'Ocultar Filtros' : 'Filtros Avanzados'}</span>
                    </Button>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground font-bold flex-1 sm:flex-none justify-center">
                            <FilterX className="w-4 h-4 mr-2 shrink-0" />
                            <span>Limpiar Filtros</span>
                        </Button>
                    )}
                    {setViewMode && (
                        <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-md shrink-0 ml-auto md:ml-2">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-sm text-sm flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Vista de lista"
                            >
                                <List size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-sm text-sm flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Vista de tarjetas"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!pl-10 font-medium w-full"
                    />
                </div>

                <div className={`${isExpanded ? 'grid' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}>

                    {setViewMode && (
                        <div className="md:hidden col-span-1 sm:col-span-2 flex items-center justify-between bg-secondary/30 p-2 rounded-xl border border-input">
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
            </div>

            <div className={`${isExpanded ? 'flex' : 'hidden'} md:flex mt-2 items-start sm:items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground border border-border shadow-sm`}>
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