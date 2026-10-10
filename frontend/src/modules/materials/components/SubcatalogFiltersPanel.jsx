import React, { useState, useEffect } from 'react';
import { FilterX, Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';

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

    return (
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
                <div>
                    <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
                    <p className="text-sm text-muted-foreground font-semibold">Encuentra {entityName} por código o nombre.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground font-bold flex-1 sm:flex-none justify-center">
                            <FilterX className="w-4 h-4 mr-2 shrink-0" />
                            <span>Limpiar Filtros</span>
                        </Button>
                    )}
                    {setViewMode && (
                        <div className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-md shrink-0 ml-auto">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">

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
        </section>
    );
};

export default SubcatalogFiltersPanel;
