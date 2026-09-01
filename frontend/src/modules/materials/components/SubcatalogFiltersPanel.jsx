import { FilterX, Search } from 'lucide-react';
import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';

const SubcatalogFiltersPanel = ({
    filters,
    onFilterChange,
    onClearFilters,
    entityName = "registros",
}) => {
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
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground hover:text-foreground font-bold w-full sm:w-auto justify-center sm:justify-start">
                        <FilterX className="w-4 h-4 mr-2 shrink-0" />
                        <span>Limpiar Filtros</span>
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="relative sm:col-span-2 md:col-span-2 xl:col-span-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código o nombre..."
                        value={filters?.search || ''}
                        onChange={(e) => onFilterChange('search', e.target.value)}
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
