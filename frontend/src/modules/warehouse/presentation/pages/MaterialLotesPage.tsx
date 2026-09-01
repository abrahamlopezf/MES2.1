import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Boxes, AlertCircle, CheckSquare, X, MousePointerSquareDashed, MapPin, Calendar, User, Hash, Search, Filter } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, TopBar } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { GlobalErrorBoundary } from '../../../../core/error/GlobalErrorBoundary';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { LoteTraceabilityModal } from '../components/LoteTraceabilityModal';

const MaterialLotesPageContent = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const [lotesToMove, setLotesToMove] = useState<any[]>([]);
  const [traceabilityLoteId, setTraceabilityLoteId] = useState<number | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLotes, setSelectedLotes] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['material-lotes', materialId],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${materialId}/lotes`);
      return response.data.data;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

  const filteredLotes = React.useMemo(() => {
    if (!data) return [];
    
    return data.filter((lote: any) => {
      // Status Filter
      const isInactive = lote.is_active === false || lote.is_active === 0;
      if (statusFilter === 'active' && isInactive) return false;
      if (statusFilter === 'inactive' && !isInactive) return false;
      
      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const folioStr = (lote.folio || '').toLowerCase();
        const idStr = String(lote.id);
        const locStr = (lote.location?.code || '').toLowerCase();
        const userStr = (`${lote.user?.first_name || ''} ${lote.user?.last_name || ''}`).toLowerCase();
        
        if (!folioStr.includes(query) && 
            !idStr.includes(query) && 
            !locStr.includes(query) &&
            !userStr.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [data, searchQuery, statusFilter]);

  const activeLotes = filteredLotes.filter((l: any) => l.is_active !== false && l.is_active !== 0);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Lotes del Material"
          leftAction={
            <button onClick={() => navigate('/warehouse/inventory')} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={20} />
            </button>
          }
        />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col h-full">
        <TopBar
          title="Lotes del Material"
          leftAction={
            <button onClick={() => navigate('/warehouse/inventory')} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={20} />
            </button>
          }
        />
        <div className="p-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Ocurrió un error al cargar los lotes del material.</p>
          </div>
        </div>
      </div>
    );
  }
  


  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) setSelectedLotes(new Set());
  };

  const handleSelectAll = () => {
    if (selectedLotes.size === activeLotes.length) {
      setSelectedLotes(new Set());
    } else {
      setSelectedLotes(new Set(activeLotes.map((l: any) => l.id)));
    }
  };

  const toggleLoteSelection = (loteId: number) => {
    const newSelection = new Set(selectedLotes);
    if (newSelection.has(loteId)) {
      newSelection.delete(loteId);
    } else {
      newSelection.add(loteId);
    }
    setSelectedLotes(newSelection);
  };

  const handleBulkChangeLocation = () => {
    const lotes = data.filter((l: any) => selectedLotes.has(l.id));
    setLotesToMove(lotes);
  };

  const handleSingleChangeLocation = (lote: any) => {
    setLotesToMove([lote]);
  };

  const handleCloseModal = () => {
    setLotesToMove([]);
    if (isSelectionMode) {
      setSelectedLotes(new Set());
      setIsSelectionMode(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">

      {/* TopBar */}
      <TopBar
        title="Lotes del Material"
        leftAction={
          <button
            onClick={() => navigate('/warehouse/inventory')}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Volver al inventario"
          >
            <ArrowLeft size={20} />
          </button>
        }
        rightAction={
          !isSelectionMode ? (
            <button
              onClick={toggleSelectionMode}
              disabled={activeLotes.length === 0}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-40"
              title="Seleccionar lotes"
            >
              <MousePointerSquareDashed size={20} />
            </button>
          ) : (
            <button
              onClick={toggleSelectionMode}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-foreground"
              title="Cancelar selección"
            >
              <X size={20} />
            </button>
          )
        }
      />

      {/* Barra de acciones en modo selección */}
      {isSelectionMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border overflow-x-auto">
          <Badge variant="secondary" className="shrink-0">{selectedLotes.size} selec.</Badge>
          <Button variant="secondary" size="sm" onClick={handleSelectAll} className="shrink-0 whitespace-nowrap">
            <CheckSquare className="w-4 h-4 mr-1" />
            {selectedLotes.size === activeLotes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBulkChangeLocation}
            disabled={selectedLotes.size === 0}
            className="shrink-0 whitespace-nowrap"
          >
            Cambiar localidad
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">

        {/* Filters Panel */}
        <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 mb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-lg">Filtros y Búsqueda</h3>
              <p className="text-sm text-muted-foreground font-semibold">Encuentra lotes específicos de este material.</p>
            </div>
            {(searchQuery || statusFilter !== 'active') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('active'); }} className="text-muted-foreground hover:text-foreground font-bold w-full sm:w-auto justify-center sm:justify-start">
                <X className="w-4 h-4 mr-2 shrink-0" />
                <span>Limpiar Filtros</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por folio, ubicación o usuario..."
                className="w-full h-10 !pl-10 pr-4 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                className="w-full h-10 !pl-10 pr-8 appearance-none rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="active">Solo Activos</option>
                <option value="inactive">Solo Bajas</option>
              </select>
            </div>
          </div>
        </section>

        {/* === VISTA MOBILE: Cards (oculta en md+) === */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredLotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              {data.length === 0 ? 'No hay lotes registrados para este material.' : 'No se encontraron lotes con estos filtros.'}
            </div>
          ) : (
            filteredLotes.map((lote: any) => {
              const isInactive = lote.is_active === false || lote.is_active === 0 || Number(lote.available_amount ?? lote.amount) === 0;
              const isSelected = selectedLotes.has(lote.id);
              return (
                <div
                  key={lote.id}
                  className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 transition-all ${
                    isInactive ? 'opacity-70 bg-muted/50 border-dashed' : 'bg-card border-border'
                  } ${isSelected ? '!border-primary ring-1 ring-primary/30' : ''} cursor-pointer hover:border-primary/50`}
                  onClick={() => {
                    if (isSelectionMode && !isInactive) toggleLoteSelection(lote.id);
                    else if (!isSelectionMode) setTraceabilityLoteId(lote.id);
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary mt-0.5"
                          checked={isSelected}
                          onChange={() => toggleLoteSelection(lote.id)}
                          disabled={isInactive}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      <div className="flex items-center gap-1.5">
                        <Hash size={14} className="text-muted-foreground" />
                        <span className="font-bold text-foreground text-base">Folio: {lote.folio || 'LEGACY-LOT'}</span>
                      </div>
                      {isInactive && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-muted text-muted-foreground border-border">Deshabilitado</Badge>
                      )}
                    </div>
                    <span className={`font-bold text-lg leading-none shrink-0 ${isInactive ? 'text-muted-foreground' : 'text-primary'}`}>
                      {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="shrink-0" />
                      {lote.location ? (
                        <Badge variant="outline" className="text-[11px] py-0">{lote.location.code}</Badge>
                      ) : (
                        <span>Sin asignar</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="shrink-0" />
                      <span>{new Date(lote.date_received).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <User size={12} className="shrink-0" />
                      <span>{lote.user?.first_name} {lote.user?.last_name}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  {!isSelectionMode && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button variant="ghost" size="sm" className="flex-1 h-9" onClick={(e) => { e.stopPropagation(); setTraceabilityLoteId(lote.id); }}>
                        Trazabilidad
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9" onClick={(e) => { e.stopPropagation(); handleSingleChangeLocation(lote); }} disabled={isInactive}>
                        Cambiar loc.
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* === VISTA DESKTOP: Tabla (oculta en mobile) === */}
        <div className="hidden md:block">
          <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-bold text-foreground text-lg tracking-tight flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-primary" />
                  Lotes Registrados
                  {isSelectionMode && selectedLotes.size > 0 && (
                    <Badge variant="secondary" className="ml-2">{selectedLotes.size} seleccionados</Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground font-semibold mt-1">
                  Consulta el catálogo de lotes disponibles para este material.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border text-sm font-bold text-foreground">
                  {filteredLotes.length} registros
                </div>
                {!isSelectionMode ? (
                  <Button variant="outline" size="sm" onClick={toggleSelectionMode} disabled={activeLotes.length === 0} className="font-bold shadow-sm h-[34px]">
                    <MousePointerSquareDashed className="w-4 h-4 mr-2" />Seleccionar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleSelectAll} className="font-bold h-[34px]">
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {selectedLotes.size === activeLotes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleBulkChangeLocation} disabled={selectedLotes.size === 0} className="font-bold shadow-sm h-[34px]">
                      Cambiar Todo de Loc.
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="font-bold shadow-sm h-[34px]">
                      <X className="w-4 h-4 mr-2" />Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="rounded-xl border border-border overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                    <tr>
                      {isSelectionMode && <th className="px-4 py-3 w-10 text-center font-bold"></th>}
                      <th className="px-4 py-3 font-bold tracking-tight">Folio</th>
                      <th className="px-4 py-3 font-bold tracking-tight">Localidad</th>
                      <th className="px-4 py-3 font-bold tracking-tight">Fecha Recepción</th>
                      <th className="px-4 py-3 font-bold tracking-tight">Recibido Por</th>
                      <th className="px-4 py-3 font-bold tracking-tight text-right">Cantidad</th>
                      <th className="px-4 py-3 font-bold tracking-tight text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLotes.length === 0 ? (
                      <tr>
                        <td colSpan={isSelectionMode ? 7 : 6} className="text-center py-8 text-muted-foreground font-semibold">
                          {data.length === 0 ? 'No hay lotes registrados para este material.' : 'No se encontraron lotes con estos filtros.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLotes.map((lote: any) => {
                        const isInactive = lote.is_active === false || lote.is_active === 0 || Number(lote.available_amount ?? lote.amount) === 0;
                        return (
                            <tr
                              key={lote.id}
                              className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${isInactive ? 'opacity-70 bg-muted/30 text-muted-foreground border-dashed' : ''} ${selectedLotes.has(lote.id) ? 'bg-primary/5' : ''}`}
                            onClick={() => {
                              if (isSelectionMode && !isInactive) toggleLoteSelection(lote.id);
                              else if (!isSelectionMode) setTraceabilityLoteId(lote.id);
                            }}
                          >
                            {isSelectionMode && (
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                                  checked={selectedLotes.has(lote.id)}
                                  onChange={() => toggleLoteSelection(lote.id)}
                                  disabled={isInactive}
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                {lote.folio || `#${lote.id}`}
                                {isInactive && <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-2 bg-muted text-muted-foreground border-border shrink-0">Deshabilitado</Badge>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {lote.location ? (
                                <Badge variant="outline" className="font-bold bg-background">{lote.location.code}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs font-semibold">Sin asignar</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-muted-foreground">{new Date(lote.date_received).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium text-muted-foreground">{lote.user?.first_name} {lote.user?.last_name}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${isInactive ? 'text-muted-foreground' : 'text-primary'}`}>
                              {Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {!isSelectionMode && (
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" className="font-bold" onClick={(e) => { e.stopPropagation(); setTraceabilityLoteId(lote.id); }}>
                                    Trazabilidad
                                  </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2 font-bold bg-background shadow-sm"
                                onClick={(e) => { e.stopPropagation(); handleSingleChangeLocation(lote); }}
                                disabled={isInactive || isSelectionMode}
                              >
                                Cambiar Loc.
                              </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

      </div>

      {lotesToMove.length > 0 && (
        <ChangeLocationModal
          lotes={lotesToMove}
          onClose={handleCloseModal}
          onSuccess={() => {}}
        />
      )}
      {/* Lote Traceability Modal */}
      {traceabilityLoteId && (
        <LoteTraceabilityModal
          loteId={traceabilityLoteId}
          onClose={() => setTraceabilityLoteId(null)}
        />
      )}
    </div>
  );
};

export const MaterialLotesPage = () => (
  <GlobalErrorBoundary>
    <MaterialLotesPageContent />
  </GlobalErrorBoundary>
);
