import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Boxes, AlertCircle, CheckSquare, X, MousePointerSquareDashed, MapPin, Calendar, User, Hash } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, TopBar } from '../../../../design-system';
import axiosClient from '../../../../api/axiosClient';
import { GlobalErrorBoundary } from '../../../../core/error/GlobalErrorBoundary';
import { ChangeLocationModal } from '../components/ChangeLocationModal';

const MaterialLotesPageContent = () => {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const [lotesToMove, setLotesToMove] = useState<any[]>([]);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLotes, setSelectedLotes] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['material-lotes', materialId],
    queryFn: async () => {
      const response = await axiosClient.get(`/warehouse/inventory/${materialId}/lotes`);
      return response.data.data;
    }
  });

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
  
  const activeLotes = data.filter((l: any) => l.is_active !== false && l.is_active !== 0);

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

        {/* === VISTA MOBILE: Cards (oculta en md+) === */}
        <div className="md:hidden flex flex-col gap-3">
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              No hay lotes activos para este material.
            </div>
          ) : (
            data.map((lote: any) => {
              const isInactive = lote.is_active === false || lote.is_active === 0;
              const isSelected = selectedLotes.has(lote.id);
              return (
                <div
                  key={lote.id}
                  className={`bg-card rounded-xl border shadow-sm p-4 flex flex-col gap-3 transition-all ${
                    isInactive ? 'opacity-60' : ''
                  } ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'} ${
                    isSelectionMode && !isInactive ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => { if (isSelectionMode && !isInactive) toggleLoteSelection(lote.id); }}
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
                        <span className="font-bold text-foreground text-base">Lote #{lote.id}</span>
                      </div>
                      {isInactive && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">Baja</Badge>
                      )}
                    </div>
                    <span className="font-bold text-lg text-primary leading-none shrink-0">
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
                      <Button variant="ghost" size="sm" className="flex-1 h-9" onClick={() => navigate(`/warehouse/lotes/${lote.id}`)}>
                        Ver detalle
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => handleSingleChangeLocation(lote)} disabled={isInactive}>
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-primary" />
                  Lotes Registrados
                  {isSelectionMode && selectedLotes.size > 0 && (
                    <Badge variant="secondary" className="ml-2">{selectedLotes.size} seleccionados</Badge>
                  )}
                </CardTitle>
                {!isSelectionMode ? (
                  <Button variant="outline" size="sm" onClick={toggleSelectionMode} disabled={activeLotes.length === 0}>
                    <MousePointerSquareDashed className="w-4 h-4 mr-2" />Seleccionar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleSelectAll}>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {selectedLotes.size === activeLotes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleBulkChangeLocation} disabled={selectedLotes.size === 0}>
                      Cambiar Todo de Loc.
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                      <X className="w-4 h-4 mr-2" />Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border">
                    <tr>
                      {isSelectionMode && <th className="px-4 py-3 w-10 text-center"></th>}
                      <th className="px-4 py-3 font-medium">Lote</th>
                      <th className="px-4 py-3 font-medium">Localidad</th>
                      <th className="px-4 py-3 font-medium">Fecha Recepción</th>
                      <th className="px-4 py-3 font-medium">Recibido Por</th>
                      <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                      <th className="px-4 py-3 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={isSelectionMode ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          No hay lotes activos para este material.
                        </td>
                      </tr>
                    ) : (
                      data.map((lote: any) => {
                        const isInactive = lote.is_active === false || lote.is_active === 0;
                        return (
                          <tr
                            key={lote.id}
                            className={`border-b border-border last:border-0 hover:bg-muted/50 ${isInactive ? 'opacity-60 bg-secondary/20' : ''} ${selectedLotes.has(lote.id) ? 'bg-primary/5' : ''}`}
                            onClick={() => { if (isSelectionMode && !isInactive) toggleLoteSelection(lote.id); }}
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
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                #{lote.id}
                                {isInactive && (
                                  <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">Dado de Baja</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {lote.location ? (
                                <Badge variant="outline">{lote.location.code}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Sin asignar</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{new Date(lote.date_received).toLocaleDateString()}</td>
                            <td className="px-4 py-3">{lote.user?.first_name} {lote.user?.last_name}</td>
                            <td className="px-4 py-3 text-right font-mono">{Number((lote.available_amount ?? lote.amount) || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/warehouse/lotes/${lote.id}`); }}>
                                Ver Detalle
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={(e) => { e.stopPropagation(); handleSingleChangeLocation(lote); }}
                                disabled={isInactive || isSelectionMode}
                              >
                                Cambiar Loc.
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {lotesToMove.length > 0 && (
        <ChangeLocationModal
          lotes={lotesToMove}
          onClose={handleCloseModal}
          onSuccess={() => {}}
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
