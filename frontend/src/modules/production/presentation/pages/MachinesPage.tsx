import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, Badge, Button, Input, Icon } from '../../../../design-system';
import { apiClient } from '../../../../core/api/apiClient';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';

export const MachinesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachineForFormulas, setSelectedMachineForFormulas] = useState<any | null>(null);
  const [isFormulasModalOpen, setIsFormulasModalOpen] = useState(false);
  const [changingSiloForMachine, setChangingSiloForMachine] = useState<any | null>(null);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [machineDraft, setMachineDraft] = useState({ name: '', type: '', notes: '', status: 'ACTIVE' });
  const [selectedFormulaIds, setSelectedFormulaIds] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const { data: formulaOptions = [] } = useQuery({
    queryKey: ['extrusion', 'floor-formulas'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/floor-formulas?is_active=ALL');
      return res.data?.data || res.data || [];
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put(`/extrusion/machines/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'machines'] });
      toast.success('Extrusora actualizada.');
      setEditingMachine(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No se pudo actualizar la extrusora.'),
  });

  const updateCompatibilityMutation = useMutation({
    mutationFn: async ({ id, formula_ids }: { id: number; formula_ids: number[] }) => {
      const res = await apiClient.put(`/extrusion/machines/${id}/formulas`, { formula_ids });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'machines'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'queues'] });
      toast.success('Recetas compatibles actualizadas.');
      setIsFormulasModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No se pudo guardar la matriz de compatibilidad.'),
  });

  // 1. Obtener máquinas reales desde backend
  const { data: machinesData, isLoading: loadingMachines } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/machines');
      return res.data?.data || res.data || [];
    }
  });

  // 2. Obtener silos para asignación
  const { data: silosData } = useQuery({
    queryKey: ['extrusion', 'silos'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/silos');
      return res.data?.data || res.data || [];
    }
  });

  const machines: any[] = Array.isArray(machinesData) ? machinesData : [];
  const silos: any[] = Array.isArray(silosData) ? silosData : [];

  // 3. Mutación de Toggle Híbrido (Modo Silo vs Manual)
  const toggleModoSiloMutation = useMutation({
    mutationFn: async ({ id, modo_silo }: { id: number; modo_silo: boolean }) => {
      const res = await apiClient.put(`/extrusion/machines/${id}/modo-silo`, { modo_silo });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'machines'] });
      toast.success(data.message || 'Modo operativo actualizado.');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Error al actualizar modo operativo.';
      toast.error('Operación Bloqueada', {
        description: errMsg,
        duration: 5000
      });
    }
  });

  // 4. Mutación de asignación de Silo
  const assignSiloMutation = useMutation({
    mutationFn: async ({ id, silo_id }: { id: number; silo_id: number | null }) => {
      const res = await apiClient.put(`/extrusion/machines/${id}/silo`, { silo_id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'machines'] });
      toast.success(data.message || 'Silo asignado correctamente.');
      setChangingSiloForMachine(null);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Error al asignar silo.';
      toast.error('Error de Asignación', {
        description: errMsg,
        duration: 5000
      });
    }
  });

  const filteredMachines = machines.filter((m: any) => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleSilo = (machine: any) => {
    if (machine.active_orders_count > 0) {
      toast.error('Bloqueo Operacional', {
        description: `La ${machine.name} tiene ${machine.active_orders_count} orden(es) en cola o en proceso. No se puede alternar el modo operativo hasta desocupar la línea.`,
        duration: 4500
      });
      return;
    }
    toggleModoSiloMutation.mutate({
      id: machine.id,
      modo_silo: !machine.modo_silo
    });
  };

  const handleOpenFormulasModal = (machine: any) => {
    setSelectedMachineForFormulas(machine);
    setSelectedFormulaIds((machine.compatible_formulas || []).map((formula: any) => Number(formula.id)));
    setIsFormulasModalOpen(true);
  };

  const handleEditMachine = (machine: any) => {
    setEditingMachine(machine);
    setMachineDraft({ name: machine.name || '', type: machine.type || 'STANDARD', notes: machine.notes || '', status: machine.status || 'ACTIVE' });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 pb-32 lg:pr-24">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Icon name="precision_manufacturing" size={32} className="text-primary" />
            Catálogo de Extrusoras & Alimentación Híbrida
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Gestión de modos operativos (Silos automatizados vs. Costales manuales) y matriz de recetas compatibles.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="px-3 py-1 text-xs font-bold border-border bg-card">
            Total: {machines.length} Extrusoras
          </Badge>
          <Badge variant="outline" className="px-3 py-1 text-xs font-bold border-primary/30 bg-primary/10 text-primary">
            Silos Activos: {machines.filter(m => m.modo_silo).length}
          </Badge>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, código o tipo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-muted/50 border-transparent focus:bg-background"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Silo Automatizado</span>
            <span className="mx-2">|</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Alimentación Manual</span>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Máquinas */}
      {loadingMachines ? (
        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground font-bold gap-3">
          <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
          <span>Cargando catálogo operativo de extrusoras...</span>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border p-8">
          <Icon name="precision_manufacturing" size={48} className="opacity-20 mb-4" />
          <p className="font-bold text-foreground">No se encontraron extrusoras con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredMachines.map((machine: any) => {
            const isSilo = Boolean(machine.modo_silo);
            const hasActiveOrders = Number(machine.active_orders_count || 0) > 0;
            const assignedSilo = machine.silo;
            const isMachine4 = machine.id === 4;

            return (
              <Card 
                key={machine.id} 
                className={`overflow-hidden transition-all shadow-sm bg-card border ${
                  isSilo ? 'border-emerald-500/30' : 'border-border'
                }`}
              >
                <CardContent className="p-5 flex flex-col h-full gap-4">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-3 rounded-xl shrink-0 font-bold ${
                        isSilo ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}>
                        <Icon name={isSilo ? 'precision_manufacturing' : 'inventory_2'} size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-foreground leading-tight whitespace-nowrap">{machine.name}</h3>
                          <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                            {machine.code}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5 truncate">
                          Tipo: {machine.type}
                        </p>
                      </div>
                    </div>

                    <Badge 
                      variant={machine.status === 'ACTIVE' ? 'success' : 'warning'} 
                      className="font-bold text-[11px] shrink-0"
                    >
                      {machine.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}
                    </Badge>
                    <PermissionGate permission="extrusion.runs.manage">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEditMachine(machine)} className="h-8 px-2" title="Editar extrusora">
                        <Icon name="edit" size={15} />
                      </Button>
                    </PermissionGate>
                  </div>

                  {/* Restricciones especiales (Extrusora 4) */}
                  {isMachine4 && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 flex items-start gap-2 text-xs font-bold">
                      <Icon name="block" size={16} className="shrink-0 mt-0.5 text-red-500" />
                      <span>Hard-block: Prohibido PP Tipo &quot;B&quot; en receta y tolva de silo.</span>
                    </div>
                  )}

                  {/* Toggle Híbrido: Modo Silo vs Manual */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="tune" size={14} className="text-primary" />
                        Alimentación PP
                      </span>
                      {hasActiveOrders && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                          <Icon name="lock" size={11} />
                          {machine.active_orders_count} en cola
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-background border border-border rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSilo) handleToggleSilo(machine);
                        }}
                        disabled={toggleModoSiloMutation.isPending || (!isSilo && hasActiveOrders)}
                        className={`h-9 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 min-w-0 transition-all ${
                          !isSilo
                            ? 'bg-blue-600 text-white shadow-xs font-black'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        title="Modo Manual con Costales"
                      >
                        <Icon name="handyman" size={14} className="shrink-0" />
                        <span className="font-black">Costales</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isSilo) handleToggleSilo(machine);
                        }}
                        disabled={toggleModoSiloMutation.isPending || (isSilo && hasActiveOrders)}
                        className={`h-9 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 min-w-0 transition-all ${
                          isSilo
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        title="Modo Silo Automatizado"
                      >
                        <Icon name="hub" size={14} className="shrink-0" />
                        <span className="font-black">Silo</span>
                      </button>
                    </div>

                    {/* Información del Silo Asignado */}
                    {isSilo ? (
                      <div className="pt-2 border-t border-border/60 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-semibold flex items-center gap-1">
                            <Icon name="storage" size={13} className="text-emerald-500" />
                            Silo Asignado:
                          </span>
                          <span className="font-bold text-foreground">
                            {assignedSilo ? assignedSilo.name : 'Sin asignar'}
                          </span>
                        </div>

                        {assignedSilo && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-emerald-500/5 p-2 rounded-md border border-emerald-500/20">
                            <div>
                              <span className="text-muted-foreground block text-[10px] font-sans font-semibold">Stock Silo:</span>
                              <span className="font-bold text-foreground">
                                {Number(assignedSilo.current_stock_kg || 0).toLocaleString()} kg
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] font-sans font-semibold">Lote / Tipo:</span>
                              <span className="font-bold text-foreground">
                                {assignedSilo.current_lot_number} ({assignedSilo.current_lot_type || 'A'})
                              </span>
                            </div>
                          </div>
                        )}

                        <PermissionGate permission="extrusion.runs.manage">
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setChangingSiloForMachine(machine)}
                              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              <Icon name="swap_horiz" size={13} />
                              Cambiar Silo Vinculado
                            </button>
                          </div>
                        </PermissionGate>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground font-medium pt-1">
                        El operador debe solicitar y escanear el QR con la mezcla completa (PP + Aditivos) surtida en costales.
                      </p>
                    )}
                  </div>

                  {/* Footer de Tarjeta: Compatibilidad y Acciones */}
                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenFormulasModal(machine)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                    >
                      <Icon name="science" size={15} />
                      <span>{machine.compatible_formulas?.length || machine.formulas_count || 0} Recetas Compatibles</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <span>Cola:</span>
                      <Badge variant={hasActiveOrders ? 'warning' : 'outline'} className="font-mono text-[10px] font-bold">
                        {machine.active_orders_count || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingMachine && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateMachineMutation.mutate({ id: editingMachine.id, payload: machineDraft });
            }}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-lg">Editar {editingMachine.code}</h3>
              <button type="button" onClick={() => setEditingMachine(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <label className="block space-y-1 text-xs font-bold uppercase text-muted-foreground">
              Nombre
              <Input value={machineDraft.name} onChange={(e) => setMachineDraft({ ...machineDraft, name: e.target.value })} required />
            </label>
            <label className="block space-y-1 text-xs font-bold uppercase text-muted-foreground">
              Tipo / uso
              <Input value={machineDraft.type} onChange={(e) => setMachineDraft({ ...machineDraft, type: e.target.value })} placeholder="Ej. Exclusiva para mezcla X" />
            </label>
            <label className="block space-y-1 text-xs font-bold uppercase text-muted-foreground">
              Especificaciones / exclusividad
              <textarea value={machineDraft.notes} onChange={(e) => setMachineDraft({ ...machineDraft, notes: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background p-3 text-sm font-medium text-foreground" placeholder="Notas operativas o exclusividad definida por el cliente" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMachine(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMachineMutation.isPending}>{updateMachineMutation.isPending ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Matriz de Recetas Compatibles de la Máquina */}
      {isFormulasModalOpen && selectedMachineForFormulas && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon name="science" size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground">
                    Recetas Compatibles: {selectedMachineForFormulas.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Matriz de Compatibilidad Técnica Oficial (extrusoras_formulas)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormulasModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center gap-2">
                <Icon name="tune" size={16} className="shrink-0" />
                <span>Selecciona las recetas autorizadas por el cliente para esta máquina. La lista controla el mezclado y el encolado.</span>
              </div>

              {selectedMachineForFormulas.id === 4 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Icon name="block" size={16} className="shrink-0 text-red-500" />
                  <span>Hard-block: Prohibido Polipropileno B. Fórmulas como DIN-PPB, NEGRO y VERDE-OPT están deshabilitadas.</span>
                </div>
              )}

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {formulaOptions.map((formula: any) => {
                  const selected = selectedFormulaIds.includes(Number(formula.id));
                  return (
                    <label key={formula.id} className="p-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => setSelectedFormulaIds((current) => event.target.checked
                          ? [...current, Number(formula.id)]
                          : current.filter((id) => id !== Number(formula.id)))}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {formula.code}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {formula.name}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-muted/20 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setIsFormulasModalOpen(false)}>Cancelar</Button>
              <PermissionGate permission="extrusion.runs.manage">
                <Button
                  disabled={updateCompatibilityMutation.isPending}
                  onClick={() => updateCompatibilityMutation.mutate({ id: selectedMachineForFormulas.id, formula_ids: selectedFormulaIds })}
                >
                  {updateCompatibilityMutation.isPending ? 'Guardando…' : 'Guardar Compatibilidad'}
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Silo Asignado */}
      {changingSiloForMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                <Icon name="storage" size={20} className="text-primary" />
                Asignar Silo a {changingSiloForMachine.name}
              </h3>
              <button
                type="button"
                onClick={() => setChangingSiloForMachine(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              Selecciona el silo de Polipropileno que alimentará la tolva automatizada de esta extrusora.
            </p>

            <div className="space-y-2">
              {silos.map((silo: any) => {
                const isSelected = changingSiloForMachine.silo_id === silo.id;
                const isLotB = silo.current_lot_type === 'B' || (silo.current_lot_number || '').includes('B');
                const isMachine4Blocked = changingSiloForMachine.id === 4 && isLotB;

                return (
                  <button
                    key={silo.id}
                    type="button"
                    disabled={isMachine4Blocked}
                    onClick={() => {
                      assignSiloMutation.mutate({
                        id: changingSiloForMachine.id,
                        silo_id: silo.id
                      });
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isMachine4Blocked
                        ? 'opacity-40 bg-muted cursor-not-allowed border-border'
                        : isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{silo.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {silo.code}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Stock: {Number(silo.current_stock_kg || 0).toLocaleString()} kg | Lote: {silo.current_lot_number} (Tipo {silo.current_lot_type || 'A'})
                      </p>
                    </div>

                    {isMachine4Blocked ? (
                      <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                        PROHIBIDO (PP-B)
                      </span>
                    ) : isSelected ? (
                      <Icon name="check_circle" size={18} className="text-emerald-500" />
                    ) : (
                      <Icon name="radio_button_unchecked" size={18} className="text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setChangingSiloForMachine(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
