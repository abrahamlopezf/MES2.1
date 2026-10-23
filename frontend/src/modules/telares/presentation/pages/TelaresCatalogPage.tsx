import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Badge, Icon } from '@/design-system';
import { apiClient } from '@/core/api/apiClient';
import { toast } from 'sonner';

type BomItemDraft = {
  pti_product_id: number | '';
  role: string;
  ratio_percentage: number;
  consumption_g_per_m: number;
  required_quantity: number | '';
  required_unit: 'KG' | 'PIEZAS';
  notes: string;
};

const emptyItem = (): BomItemDraft => ({
  pti_product_id: '', role: 'URDIMBRE', ratio_percentage: 50,
  consumption_g_per_m: 32.5, required_quantity: '', required_unit: 'KG', notes: '',
});

const emptyBom = () => ({
  code: '', name: '', description: '', output_product_name: '',
  target_width_cm: 50, target_weight_g_per_m: 65, warp_density: 10, weft_density: 10,
  expected_output_quantity: 1, expected_output_unit: 'ROLLO',
  default_route: 'TELARES,LAMINADO,CORTE', is_active: true, items: [emptyItem()],
});

const emptyLoom = () => ({
  code: '', name: '', model: '', type: 'CIRCULAR', rpm: 120,
  status: 'DISPONIBLE', specifications: '', supported_pti_types: [] as number[],
  supported_bom_ids: [] as number[], is_active: true,
});

export const TelaresCatalogPage: React.FC = () => {
  const [tab, setTab] = useState<'rollos' | 'maquinas'>('rollos');
  const [editingBom, setEditingBom] = useState<any | null>(null);
  const [editingLoom, setEditingLoom] = useState<any | null>(null);
  const [bomDraft, setBomDraft] = useState(emptyBom());
  const [loomDraft, setLoomDraft] = useState(emptyLoom());
  const queryClient = useQueryClient();

  const { data: boms = [], isLoading: loadingBoms } = useQuery({
    queryKey: ['telares', 'catalog', 'boms'],
    queryFn: async () => apiClient.get('/telares/boms?all=true'),
  });
  const { data: looms = [], isLoading: loadingLooms } = useQuery({
    queryKey: ['telares', 'catalog', 'looms'],
    queryFn: async () => apiClient.get('/telares/looms?all=true'),
  });
  const { data: ptis = [] } = useQuery({
    queryKey: ['extrusion', 'pti-products', { is_active: true }],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/pti-products', { params: { is_active: true } });
      return response?.data || response || [];
    },
  });
  const activePtis = useMemo(() => ptis.filter((pti: any) => pti.is_active), [ptis]);

  const invalidateCatalogs = () => {
    queryClient.invalidateQueries({ queryKey: ['telares'] });
    queryClient.invalidateQueries({ queryKey: ['telares', 'catalog'] });
  };
  const saveBomMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...bomDraft,
        output_product_name: bomDraft.output_product_name || bomDraft.name,
        default_route: bomDraft.default_route.split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean),
        items: bomDraft.items.map((item) => ({
          ...item,
          pti_product_id: Number(item.pti_product_id),
          required_quantity: item.required_quantity === '' ? null : Number(item.required_quantity),
        })),
      };
      if (editingBom) return apiClient.put(`/telares/boms/${editingBom.id}`, payload);
      return apiClient.post('/telares/boms', payload);
    },
    onSuccess: () => { invalidateCatalogs(); toast.success('Rollo guardado en el catálogo de Telares.'); setEditingBom(null); setBomDraft(emptyBom()); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo guardar el rollo.'),
  });
  const saveLoomMutation = useMutation({
    mutationFn: async () => editingLoom
      ? apiClient.put(`/telares/looms/${editingLoom.id}`, loomDraft)
      : apiClient.post('/telares/looms', loomDraft),
    onSuccess: () => { invalidateCatalogs(); toast.success('Telar guardado en el catálogo.'); setEditingLoom(null); setLoomDraft(emptyLoom()); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo guardar el telar.'),
  });
  const deactivateMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'boms' | 'looms'; id: number }) => apiClient.delete(`/telares/${kind}/${id}`),
    onSuccess: () => { invalidateCatalogs(); toast.success('Registro desactivado.'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo desactivar el registro.'),
  });

  const startNewBom = () => { setEditingBom(null); setBomDraft(emptyBom()); };
  const editBom = (bom: any) => {
    setEditingBom(bom);
    setBomDraft({
      ...emptyBom(), ...bom,
      default_route: (bom.default_route || []).join(','),
      items: (bom.items || []).map((item: any) => ({ ...emptyItem(), ...item, pti_product_id: item.pti_product_id || '', required_quantity: item.required_quantity ? Number(item.required_quantity) : '' })),
    });
  };
  const startNewLoom = () => { setEditingLoom(null); setLoomDraft(emptyLoom()); };
  const editLoom = (loom: any) => {
    setEditingLoom(loom);
    setLoomDraft({ ...emptyLoom(), ...loom, supported_pti_types: (loom.supported_pti_types || []).map(Number), supported_bom_ids: (loom.supported_bom_ids || []).map(Number) });
  };

  const toggleNumber = (values: number[], value: number, checked: boolean) => checked
    ? [...new Set([...values, value])]
    : values.filter((current) => current !== value);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 p-4 pb-28 sm:p-6 lg:pr-24">
      <header className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Icon name="texture" size={28} className="text-primary" />Catálogos de Telares</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configura rollos, consumo por tipo de PTI de Extrusión y máquinas compatibles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === 'rollos' ? 'default' : 'outline'} onClick={() => setTab('rollos')}>Rollos</Button>
          <Button variant={tab === 'maquinas' ? 'default' : 'outline'} onClick={() => setTab('maquinas')}>Máquinas Telares</Button>
        </div>
      </header>

      {tab === 'rollos' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Catálogo de rollos</h2>
              <Button onClick={startNewBom}><Icon name="add" size={17} />Nuevo rollo</Button>
            </div>
            {loadingBoms ? <p className="p-6 text-muted-foreground">Cargando rollos…</p> : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Código / Rollo</th><th className="p-3">PTI requeridos</th><th className="p-3">Ruta</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {boms.map((bom: any) => (
                      <tr key={bom.id}>
                        <td className="p-3"><strong className="block">{bom.name}</strong><span className="font-mono text-xs text-muted-foreground">{bom.code}</span></td>
                        <td className="p-3">{(bom.items || []).map((item: any) => <div key={item.id}>{item.ptiProduct?.code || `PTI #${item.pti_product_id}`} · {item.required_quantity ? `${item.required_quantity} ${item.required_unit}` : `${item.consumption_g_per_m} g/m`}</div>)}</td>
                        <td className="p-3 text-xs">{(bom.default_route || []).join(' → ')}</td>
                        <td className="p-3"><Badge variant={bom.is_active ? 'success' : 'outline'}>{bom.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                        <td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editBom(bom)}>Editar</Button>{bom.is_active && <Button size="sm" variant="destructive" onClick={() => window.confirm(`¿Desactivar ${bom.name}?`) && deactivateMutation.mutate({ kind: 'boms', id: bom.id })}>Desactivar</Button>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-lg font-black">{editingBom ? `Editar ${editingBom.code}` : 'Alta de rollo'}</h2>
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); saveBomMutation.mutate(); }}>
              <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Código único" value={bomDraft.code} onChange={(e) => setBomDraft({ ...bomDraft, code: e.target.value.toUpperCase() })} required /><Input placeholder="Nombre del rollo" value={bomDraft.name} onChange={(e) => setBomDraft({ ...bomDraft, name: e.target.value })} required /></div>
              <textarea value={bomDraft.description} onChange={(e) => setBomDraft({ ...bomDraft, description: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background p-3 text-sm" placeholder="Descripción / aplicación" />
              <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold">ANCHO CM<Input type="number" min="0.1" value={bomDraft.target_width_cm} onChange={(e) => setBomDraft({ ...bomDraft, target_width_cm: Number(e.target.value) })} /></label><label className="text-xs font-bold">PESO G/M<Input type="number" min="0" value={bomDraft.target_weight_g_per_m} onChange={(e) => setBomDraft({ ...bomDraft, target_weight_g_per_m: Number(e.target.value) })} /></label><label className="text-xs font-bold">SALIDA<Input type="number" min="0.01" step="0.01" value={bomDraft.expected_output_quantity} onChange={(e) => setBomDraft({ ...bomDraft, expected_output_quantity: Number(e.target.value) })} /></label></div>
              <label className="block text-xs font-bold">ETAPAS EN ORDEN (separadas por coma)<Input value={bomDraft.default_route} onChange={(e) => setBomDraft({ ...bomDraft, default_route: e.target.value })} placeholder="TELARES,GLOBO,LAMINADO,CORTE" /></label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between"><strong className="text-sm">PTI de Extrusión requeridos por tipo</strong><Button type="button" size="sm" variant="outline" onClick={() => setBomDraft({ ...bomDraft, items: [...bomDraft.items, emptyItem()] })}>Agregar PTI</Button></div>
                {bomDraft.items.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-2">
                    <select value={item.pti_product_id} onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, pti_product_id: Number(e.target.value) || '' } : row) })} className="h-10 rounded-md border border-border bg-background px-2 text-xs" required>
                      <option value="">Selecciona PTI de Extrusión</option>{activePtis.map((pti: any) => <option key={pti.id} value={pti.id}>{pti.code} — {pti.name}</option>)}
                    </select>
                    <select value={item.role} onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, role: e.target.value } : row) })} className="h-10 rounded-md border border-border bg-background px-2 text-xs"><option>URDIMBRE</option><option>TRAMA</option><option>AMBOS</option><option>REFUERZO</option></select>
                    <div className="flex gap-2"><Input type="number" min="0.001" step="0.001" placeholder="Cantidad por rollo" value={item.required_quantity} required onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_quantity: e.target.value === '' ? '' : Number(e.target.value) } : row) })} /><select value={item.required_unit} onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_unit: e.target.value as 'KG' | 'PIEZAS' } : row) })} className="h-10 rounded-md border border-border bg-background px-2 text-xs"><option value="KG">KG</option><option value="PIEZAS">PIEZAS</option></select></div>
                    <div className="flex gap-2"><Input type="number" min="0" max="100" step="0.01" placeholder="% del peso" value={item.ratio_percentage} onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, ratio_percentage: Number(e.target.value) } : row) })} /><Input type="number" min="0" step="0.01" placeholder="Consumo g/m" value={item.consumption_g_per_m} onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, consumption_g_per_m: Number(e.target.value) } : row) })} /><Button type="button" size="sm" variant="ghost" disabled={bomDraft.items.length === 1} onClick={() => setBomDraft({ ...bomDraft, items: bomDraft.items.filter((_, i) => i !== index) })}>×</Button></div>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={bomDraft.is_active} onChange={(e) => setBomDraft({ ...bomDraft, is_active: e.target.checked })} />Rollo activo</label>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={startNewBom}>Limpiar</Button><Button type="submit" disabled={saveBomMutation.isPending}>{saveBomMutation.isPending ? 'Guardando…' : 'Guardar rollo'}</Button></div>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
          <section className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-black">Registro de máquinas</h2><Button onClick={startNewLoom}><Icon name="add" size={17} />Nuevo telar</Button></div>
            {loadingLooms ? <p className="p-6 text-muted-foreground">Cargando máquinas…</p> : <div className="space-y-3">{looms.map((loom: any) => (
              <article key={loom.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{loom.name} <span className="font-mono text-xs text-muted-foreground">{loom.code}</span></h3><p className="text-xs text-muted-foreground">{loom.model} · {loom.type} · {loom.rpm} RPM</p></div><Badge variant={loom.is_active ? 'success' : 'outline'}>{loom.is_active ? 'Activo' : 'Inactivo'}</Badge></div>
                {loom.specifications && <p className="mt-2 text-sm">{loom.specifications}</p>}
                <p className="mt-2 text-xs"><strong>Tipos PTI:</strong> {(loom.supported_pti_types || []).map((id: number) => activePtis.find((p: any) => p.id === Number(id))?.code || `#${id}`).join(', ') || 'Sin restricción configurada'}</p>
                <p className="text-xs"><strong>Rollos:</strong> {(loom.supported_bom_ids || []).map((id: number) => boms.find((b: any) => b.id === Number(id))?.code || `#${id}`).join(', ') || 'Sin restricción configurada'}</p>
                <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => editLoom(loom)}>Editar</Button>{loom.is_active && <Button size="sm" variant="destructive" onClick={() => window.confirm(`¿Desactivar ${loom.name}?`) && deactivateMutation.mutate({ kind: 'looms', id: loom.id })}>Desactivar</Button>}</div>
              </article>
            ))}</div>}
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 text-lg font-black">{editingLoom ? `Editar ${editingLoom.code}` : 'Alta de telar'}</h2>
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); saveLoomMutation.mutate(); }}>
              <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Código" value={loomDraft.code} onChange={(e) => setLoomDraft({ ...loomDraft, code: e.target.value.toUpperCase() })} required /><Input placeholder="Nombre" value={loomDraft.name} onChange={(e) => setLoomDraft({ ...loomDraft, name: e.target.value })} required /></div>
              <div className="grid gap-3 sm:grid-cols-3"><Input placeholder="Modelo" value={loomDraft.model} onChange={(e) => setLoomDraft({ ...loomDraft, model: e.target.value })} /><Input placeholder="Tipo" value={loomDraft.type} onChange={(e) => setLoomDraft({ ...loomDraft, type: e.target.value.toUpperCase() })} /><Input type="number" min="1" placeholder="RPM" value={loomDraft.rpm} onChange={(e) => setLoomDraft({ ...loomDraft, rpm: Number(e.target.value) })} /></div>
              <textarea value={loomDraft.specifications} onChange={(e) => setLoomDraft({ ...loomDraft, specifications: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background p-3 text-sm" placeholder="Especificaciones, dimensiones, configuración operativa" />
              <fieldset className="space-y-2 rounded-lg border border-border p-3"><legend className="px-1 text-xs font-black uppercase">Tipos de PTI de Extrusión que maneja</legend>{activePtis.map((pti: any) => <label key={pti.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={loomDraft.supported_pti_types.includes(pti.id)} onChange={(e) => setLoomDraft({ ...loomDraft, supported_pti_types: toggleNumber(loomDraft.supported_pti_types, pti.id, e.target.checked) })} />{pti.code} — {pti.name}</label>)}</fieldset>
              <fieldset className="space-y-2 rounded-lg border border-border p-3"><legend className="px-1 text-xs font-black uppercase">Rollos compatibles</legend>{boms.filter((bom: any) => bom.is_active).map((bom: any) => <label key={bom.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={loomDraft.supported_bom_ids.includes(bom.id)} onChange={(e) => setLoomDraft({ ...loomDraft, supported_bom_ids: toggleNumber(loomDraft.supported_bom_ids, bom.id, e.target.checked) })} />{bom.code} — {bom.name}</label>)}</fieldset>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={loomDraft.is_active} onChange={(e) => setLoomDraft({ ...loomDraft, is_active: e.target.checked })} />Telar activo</label>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={startNewLoom}>Limpiar</Button><Button type="submit" disabled={saveLoomMutation.isPending}>{saveLoomMutation.isPending ? 'Guardando…' : 'Guardar telar'}</Button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default TelaresCatalogPage;
