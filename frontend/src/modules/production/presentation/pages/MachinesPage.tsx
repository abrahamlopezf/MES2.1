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
  const { data: machinesData, isLoading: loadingMachines, isError: machinesError, refetch: refetchMachines } = useQuery({
    queryKey: ['extrusion', 'machines'],
    queryFn: async () => {
      const res = await apiClient.get('/extrusion/machines');
      return res.data?.data || res.data || [];
    }
  });

  const machines: any[] = Array.isArray(machinesData) ? machinesData : [];

  const filteredMachines = machines.filter((m: any) => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="extrusion-workspace min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 pb-32 lg:pr-24">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Icon name="precision_manufacturing" size={32} className="text-primary" />
            Catálogo de Extrusoras
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Administración de máquinas y de las fórmulas compatibles definidas por el cliente.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="px-3 py-1 text-xs font-bold border-border bg-card">
            Total: {machines.length} Extrusoras
          </Badge>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="machine-search" className="sr-only">Buscar extrusora por nombre, código o tipo</label>
            <Input 
              id="machine-search"
              placeholder="Buscar por nombre, código o tipo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-muted/50 border-transparent focus:bg-background"
            />
          </div>

        </CardContent>
      </Card>

      {/* Grid de Máquinas */}
      {loadingMachines ? (
        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground font-bold gap-3">
          <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
          <span>Cargando catálogo operativo de extrusoras...</span>
        </div>
      ) : machinesError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Icon name="error" size={24} className="mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="text-base font-bold">No se pudo cargar el catálogo</p>
              <p className="mt-1 text-sm text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => refetchMachines()} className="min-h-11 w-full font-bold sm:w-auto">Reintentar</Button>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border p-8">
          <Icon name="precision_manufacturing" size={48} className="opacity-20 mb-4" />
          <p className="font-bold text-foreground">No se encontraron extrusoras con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredMachines.map((machine: any) => {
            const hasActiveOrders = Number(machine.active_orders_count || 0) > 0;
            const isMachine4 = machine.id === 4;

            return (
              <Card 
                key={machine.id} 
                className="overflow-hidden transition-all shadow-sm bg-card border border-border"
              >
                <CardContent className="p-5 flex flex-col h-full gap-4">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1 basis-full sm:basis-auto">
                      <div className="p-3 rounded-xl shrink-0 font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        <Icon name="precision_manufacturing" size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-foreground leading-tight break-words">{machine.name}</h3>
                          <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                            {machine.code}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-semibold mt-1 truncate">
                          Tipo: {machine.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                      <Badge
                        variant={machine.status === 'ACTIVE' ? 'success' : 'warning'}
                        className="font-bold text-sm shrink-0"
                      >
                        {machine.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}
                      </Badge>
                      <PermissionGate permission="extrusion.runs.manage">
                        <Button type="button" variant="outline" onClick={() => handleEditMachine(machine)} className="h-11 min-w-11 px-2" aria-label={`Editar ${machine.name}`} title={`Editar ${machine.name}`}>
                          <Icon name="edit" size={18} />
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>

                  {/* Restricciones especiales (Extrusora 4) */}
                  {isMachine4 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 flex items-start gap-2 text-sm font-bold leading-relaxed">
                      <Icon name="block" size={16} className="shrink-0 mt-0.5 text-red-500" />
                      <span>Restricción: esta extrusora no procesa fórmulas con Polipropileno tipo B.</span>
                    </div>
                  )}

                  {hasActiveOrders && <p className="text-sm text-muted-foreground">{machine.active_orders_count} mezcla(s) en cola o proceso.</p>}

                  {/* Footer de Tarjeta: Compatibilidad y Acciones */}
                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenFormulasModal(machine)}
                      className="min-h-11 rounded-md px-2 text-sm font-bold text-primary hover:underline flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <label className="block space-y-2 text-sm font-bold text-foreground">
              Nombre
              <Input value={machineDraft.name} onChange={(e) => setMachineDraft({ ...machineDraft, name: e.target.value })} required />
            </label>
            <label className="block space-y-2 text-sm font-bold text-foreground">
              Tipo / uso
              <Input value={machineDraft.type} onChange={(e) => setMachineDraft({ ...machineDraft, type: e.target.value })} placeholder="Ej. Exclusiva para mezcla X" />
            </label>
            <label className="block space-y-2 text-sm font-bold text-foreground">
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
                aria-label="Cerrar matriz de recetas compatibles"
                className="min-h-11 min-w-11 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
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

    </div>
  );
};
