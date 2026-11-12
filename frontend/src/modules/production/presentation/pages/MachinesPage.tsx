import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, Badge, Button, Input, Icon } from '../../../../design-system';
import { apiClient } from '../../../../core/api/apiClient';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { isClientFormula } from '@/modules/extrusion/domain/clientFormulaRules';
import { CollapsibleFilterPanel } from '@/components/shared/CollapsibleFilterPanel';

export const MachinesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachineForFormulas, setSelectedMachineForFormulas] = useState<any | null>(null);
  const [isFormulasModalOpen, setIsFormulasModalOpen] = useState(false);
  const [isCreateMachineOpen, setIsCreateMachineOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [machineDraft, setMachineDraft] = useState({ code: '', machine_number: '', name: '', type: 'STANDARD', notes: '', status: 'ACTIVE', is_dynamic_member: false, telares_subarea_code: 'TELARES_ROLLO' });
  const [selectedFormulaIds, setSelectedFormulaIds] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const createMachineMutation = useMutation({
    mutationFn: async (payload: typeof machineDraft) => (await apiClient.post('/extrusion/machines', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'machines'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'floor-formulas'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'queues'] });
      toast.success('Extrusora creada y catálogo actualizado.');
      setIsCreateMachineOpen(false);
      setMachineDraft({ code: '', machine_number: '', name: '', type: 'STANDARD', notes: '', status: 'ACTIVE', is_dynamic_member: false, telares_subarea_code: 'TELARES_ROLLO' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No se pudo crear la extrusora.'),
  });

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
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'queues'] });
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
  const activeMachinesCount = machines.filter((machine: any) => machine.status === 'ACTIVE').length;

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
    setMachineDraft({ code: machine.code || '', machine_number: String(machine.machine_number ?? ''), name: machine.name || '', type: machine.type || 'STANDARD', notes: machine.notes || '', status: machine.status || 'ACTIVE', is_dynamic_member: Boolean(machine.is_dynamic_member), telares_subarea_code: machine.telares_subarea_code || 'NO_APLICA' });
  };

  return (
    <div className="extrusion-workspace mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 p-4 pb-32 sm:gap-5 sm:p-6 lg:p-8">
      {/* Encabezado: propósito de la pantalla y acciones principales */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-14 sm:w-14">
              <Icon name="precision_manufacturing" size={28} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Configuración de producción</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Extrusoras registradas</h1>
              <p className="mt-1 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Consulta las máquinas del área y configura qué recetas heredadas son compatibles con cada una.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:shrink-0">
            <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))} className="min-h-12 w-full gap-2 sm:w-auto">
              <Icon name="qr_code_scanner" size={19} /> Leer QR
            </Button>
            <PermissionGate permission="extrusion.runs.manage">
              <Button type="button" onClick={() => { setMachineDraft({ code: '', machine_number: '', name: '', type: 'STANDARD', notes: '', status: 'ACTIVE', is_dynamic_member: false, telares_subarea_code: 'TELARES_ROLLO' }); setIsCreateMachineOpen(true); }} className="min-h-12 w-full gap-2 sm:w-auto">
                <Icon name="add" size={19} /> Registrar extrusora
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          <Badge variant="outline" className="min-h-9 gap-2 px-3 text-sm">
            <Icon name="precision_manufacturing" size={17} className="text-primary" />
            <span>Registradas: <strong className="tabular-nums text-foreground">{machines.length}</strong></span>
          </Badge>
          <Badge variant="outline" className="min-h-9 gap-2 px-3 text-sm">
            <Icon name="check_circle" size={17} className="text-emerald-500" />
            <span>Operativas: <strong className="tabular-nums text-foreground">{activeMachinesCount}</strong></span>
          </Badge>
        </div>
      </section>

      {/* Barra de Búsqueda y Filtros */}
      <CollapsibleFilterPanel
        title="Buscar extrusoras"
        description="Busca por nombre, código o tipo de máquina."
        summary={`${filteredMachines.length} de ${machines.length} máquinas${searchTerm ? ` · ${searchTerm}` : ''}`}
      >
        <div className="flex w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <Icon name="search" size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="machine-search" className="sr-only">Buscar extrusora por nombre, código o tipo</label>
            <Input 
              id="machine-search"
              placeholder="Buscar por nombre, código o tipo de máquina" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-h-12 w-full border-border bg-background pl-11 text-base"
            />
          </div>
          <p className="shrink-0 px-1 text-sm font-semibold text-muted-foreground" aria-live="polite">
            {filteredMachines.length} de {machines.length} máquinas
          </p>
        </div>
      </CollapsibleFilterPanel>

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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredMachines.map((machine: any) => {
            const hasActiveOrders = Number(machine.active_orders_count || 0) > 0;
            return (
              <Card 
                key={machine.id} 
                className="overflow-hidden transition-all shadow-sm bg-card border border-border"
              >
                <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 font-bold text-blue-600 dark:text-blue-400">
                      <Icon name="precision_manufacturing" size={23} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="break-words text-lg font-black leading-tight text-foreground">{machine.name}</h3>
                            <Badge variant="outline" className="shrink-0 font-mono text-xs font-bold">{machine.code}</Badge>
                            {machine.machine_number != null && <Badge variant="outline" className="shrink-0 text-xs font-bold">Máquina física {machine.machine_number}</Badge>}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-muted-foreground">Tipo: {machine.type}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Destino de PTI: {machine.telares_subarea_code === 'TELARES_BANDA' ? 'Telares Banda' : machine.telares_subarea_code === 'TELARES_ROLLO' ? 'Telares Rollo' : 'Sin destino a Telares'}</p>
                        </div>
                        <PermissionGate permission="extrusion.runs.manage">
                          <Button type="button" variant="outline" onClick={() => handleEditMachine(machine)} className="min-h-11 shrink-0 gap-1.5 px-2.5 text-sm" aria-label={`Editar configuración de ${machine.name}`} title={`Editar configuración de ${machine.name}`}>
                            <Icon name="edit" size={18} />
                            <span>Editar</span>
                          </Button>
                        </PermissionGate>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant={machine.status === 'ACTIVE' ? 'success' : 'warning'} className="min-h-8 shrink-0 font-bold text-sm">
                          {machine.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}
                        </Badge>
                        <Badge variant={machine.is_dynamic_member ? 'success' : 'outline'} className="min-h-8 text-sm">
                          {machine.is_dynamic_member ? 'Recibe fórmulas generales' : machine.code === 'EXT-01' ? 'Uso exclusivo' : 'Sin grupo dinámico'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex min-h-10 items-center">
                    <Badge variant={hasActiveOrders ? 'warning' : 'outline'} className="min-h-9 max-w-full whitespace-normal text-left text-sm font-semibold">
                      {hasActiveOrders ? `${machine.active_orders_count} mezcla(s) en cola o proceso` : 'Sin cola activa'}
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-sm font-bold text-foreground">Regla de fórmulas del cliente</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {machine.machine_number === 1 || machine.code === 'EXT-01'
                        ? 'Esta máquina trabaja con fórmulas exclusivas asignadas por el cliente.'
                        : machine.is_dynamic_member
                          ? 'Esta máquina pertenece al grupo dinámico y recibe las fórmulas generales del cliente.'
                          : 'Esta máquina no recibe fórmulas generales del grupo dinámico.'}
                    </p>
                  </div>

                  <details className="group rounded-xl border border-border bg-background/40">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span>PTI asignados <span className="text-muted-foreground">({machine.ptiProducts?.length || 0})</span></span>
                      <Icon name="expand_more" size={21} className="text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-border px-3 py-3 text-sm">
                      {machine.ptiProducts?.length ? <p className="break-words font-mono leading-relaxed text-muted-foreground">{machine.ptiProducts.map((pti: any) => pti.code).join(' · ')}</p> : <p className="text-muted-foreground">Sin PTI asignados. La asignación se realiza desde el catálogo de PTI.</p>}
                    </div>
                  </details>

                  {/* Footer de Tarjeta: Compatibilidad y Acciones */}
                  <div className="mt-auto border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenFormulasModal(machine)}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-base font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon name="science" size={19} className="shrink-0" />
                      <span>Configurar recetas heredadas</span>
                      <Badge variant="outline" className="ml-1 min-h-7 px-2 text-sm">{machine.compatible_formulas?.length || machine.formulas_count || 0}</Badge>
                    </button>
                    <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">La configuración del cliente se define con la regla de fórmulas indicada arriba.</p>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingMachine && (
        createPortal(<div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateMachineMutation.mutate({ id: editingMachine.id, payload: machineDraft });
            }}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-lg">Editar {editingMachine.code}</h3>
              <button type="button" onClick={() => setEditingMachine(null)} aria-label="Cerrar edición de extrusora" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
            </div>
            <label className="block space-y-2 text-sm font-bold text-foreground">Destino de sus PTI a Telares
              <select value={machineDraft.telares_subarea_code} onChange={(event) => setMachineDraft({ ...machineDraft, telares_subarea_code: event.target.value })} className="min-h-11 w-full rounded-md border border-border bg-background px-3">
                <option value="TELARES_BANDA">Telares Banda</option><option value="TELARES_ROLLO">Telares Rollo</option><option value="NO_APLICA">No aplica a Telares</option>
              </select>
              <span className="block text-xs font-normal text-muted-foreground">Al cambiarlo, se actualizan las fichas PTI ligadas a esta máquina. La ruta posterior del rollo/banda se define en la ficha de Telares.</span>
            </label>
            <label className={`flex items-start gap-3 rounded-lg border border-border p-3 text-base text-foreground ${Number(editingMachine.machine_number) === 1 ? 'opacity-60' : ''}`}>
              <input type="checkbox" checked={machineDraft.is_dynamic_member} disabled={Number(editingMachine.machine_number) === 1} onChange={(event) => setMachineDraft({ ...machineDraft, is_dynamic_member: event.target.checked })} className="mt-0.5" />
              <span><strong>Incluir en el grupo dinámico</strong><span className="mt-1 block text-sm text-muted-foreground">Habilita las fórmulas generales del cliente para esta máquina. No aplica a Extrusora 1.</span></span>
            </label>
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
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setEditingMachine(null)}>Cancelar</Button>
              <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={updateMachineMutation.isPending}>{updateMachineMutation.isPending ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </div>, document.body)
      )}

      {isCreateMachineOpen && (
        createPortal(<div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-5" onSubmit={(event) => { event.preventDefault(); createMachineMutation.mutate(machineDraft); }}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-lg">Nueva extrusora</h3>
              <button type="button" onClick={() => setIsCreateMachineOpen(false)} aria-label="Cerrar formulario de extrusora" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
            </div>
            <label className="block space-y-2 text-base font-bold text-foreground">Código <Input value={machineDraft.code} onChange={(e) => setMachineDraft({ ...machineDraft, code: e.target.value.toUpperCase() })} placeholder="Ej. EXT-06" required maxLength={50} /></label>
            <label className="block space-y-2 text-base font-bold text-foreground">Número físico de máquina <Input type="number" min="1" step="1" value={machineDraft.machine_number} onChange={(e) => setMachineDraft({ ...machineDraft, machine_number: e.target.value })} placeholder="Ej. 6" required /></label>
            <label className="block space-y-2 text-base font-bold text-foreground">Nombre <Input value={machineDraft.name} onChange={(e) => setMachineDraft({ ...machineDraft, name: e.target.value })} placeholder="Ej. Extrusora 6" required maxLength={100} /></label>
            <label className="block space-y-2 text-base font-bold text-foreground">Tipo / uso <Input value={machineDraft.type} onChange={(e) => setMachineDraft({ ...machineDraft, type: e.target.value })} placeholder="STANDARD" maxLength={50} /></label>
            <label className="block space-y-2 text-base font-bold text-foreground">Destino de los PTI
              <select value={machineDraft.telares_subarea_code} onChange={(e) => setMachineDraft({ ...machineDraft, telares_subarea_code: e.target.value })} className="min-h-11 w-full rounded-md border border-border bg-background px-3"><option value="TELARES_BANDA">Telares Banda</option><option value="TELARES_ROLLO">Telares Rollo</option><option value="NO_APLICA">No aplica a Telares</option></select>
            </label>
            <label className={`flex items-start gap-3 rounded-lg border border-border p-3 text-base text-foreground ${Number(machineDraft.machine_number) === 1 ? 'opacity-60' : ''}`}>
              <input type="checkbox" checked={Number(machineDraft.machine_number) === 1 ? false : machineDraft.is_dynamic_member} disabled={Number(machineDraft.machine_number) === 1} onChange={(event) => setMachineDraft({ ...machineDraft, is_dynamic_member: event.target.checked })} className="mt-0.5" />
              <span><strong>Incluir en el grupo dinámico</strong><span className="mt-1 block text-sm text-muted-foreground">Podrá recibir fórmulas generales; la Extrusora 1 seguirá siendo exclusiva.</span></span>
            </label>
            <label className="block space-y-2 text-base font-bold text-foreground">Notas <textarea value={machineDraft.notes} onChange={(e) => setMachineDraft({ ...machineDraft, notes: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background p-3 text-base font-medium text-foreground" /></label>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setIsCreateMachineOpen(false)}>Cancelar</Button>
              <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={createMachineMutation.isPending}>{createMachineMutation.isPending ? 'Guardando…' : 'Crear extrusora'}</Button>
            </div>
          </form>
        </div>, document.body)
      )}

      {/* Modal: Matriz de Recetas Compatibles de la Máquina */}
      {isFormulasModalOpen && selectedMachineForFormulas && (
        createPortal(<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                    Matriz heredada de compatibilidad (no controla las fórmulas del cliente)
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
                <span>Esta matriz aplica a recetas heredadas. Las fórmulas entregadas por el cliente siguen Extrusora 1 exclusiva o pertenencia al grupo dinámico.</span>
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {formulaOptions.filter((formula: any) => !isClientFormula(formula.code)).map((formula: any) => {
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
        </div>, document.body)
      )}

    </div>
  );
};
