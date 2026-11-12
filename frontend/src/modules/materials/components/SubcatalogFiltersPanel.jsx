import { useState, useEffect } from 'react';
import { FilterX, Search, LayoutGrid, List } from '@/design-system/components/Icon/googleIconCompat';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';
import { CollapsibleFilterPanel } from '../../../components/shared/CollapsibleFilterPanel';

const SubcatalogFiltersPanel = ({
    filters,
    onFilterChange,
    onClearFilters,
    entityName = "registros",
    viewMode,
    setViewMode
}) => {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');

    useEffect(() => {
        setSearchTerm(filters?.search || '');
    }, [filters?.search]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== (filters?.search || '')) {
                onFilterChange('search', searchTerm);
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, onFilterChange, filters?.search]);

    const hasActiveFilters = Boolean(
        filters?.search ||
        (filters?.status && filters?.status !== 'all')
    );

    const filterSummary = [
        filters?.search ? `Búsqueda: “${filters.search}”` : null,
        filters?.status === 'active' ? 'Solo activos' : filters?.status === 'inactive' ? 'Solo inactivos' : 'Activos e inactivos',
    ].filter(Boolean).join(' · ');

    return (
        <CollapsibleFilterPanel
            title="Filtros de Búsqueda"
            description={`Encuentra ${entityName} por código o nombre.`}
            summary={filterSummary}
            className="mb-4"
            actions={<>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={onClearFilters} className="min-h-11 text-muted-foreground hover:text-foreground font-bold"><FilterX className="mr-2 size-4 shrink-0" />Limpiar filtros</Button>}
                {setViewMode && <div className="hidden items-center gap-1 rounded-md bg-secondary/50 p-1 md:flex">
                            <button
                                type="button"
                                aria-label="Vista de lista"
                                aria-pressed={viewMode === 'list'}
                                onClick={() => setViewMode('list')}
                                className={`flex min-h-10 min-w-10 items-center justify-center rounded-sm text-sm transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                type="button"
                                aria-label="Vista de tarjetas"
                                aria-pressed={viewMode === 'grid'}
                                onClick={() => setViewMode('grid')}
                                className={`flex min-h-10 min-w-10 items-center justify-center rounded-sm text-sm transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                }
            </>}
        >

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">

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

                <div className="relative sm:col-span-2 md:col-span-2 xl:col-span-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="!pl-10 font-medium w-full"
                    />
                </div>

                <select
                    className="flex h-14 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters?.status || 'all'}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                >
                    <option value="all">Todos (Activos e Inactivos)</option>
                    <option value="active">Solo Activos</option>
                    <option value="inactive">Solo Inactivos</option>
                </select>
            </div>
        </CollapsibleFilterPanel>
    );
};

export default SubcatalogFiltersPanel;
