import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Badge } from '@/design-system';
import { apiClient } from '@/core/api/apiClient';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { canViewCosts } from '@/utils/authHelpers';
import {
  Factory,
  Layers,
  ShieldAlert,
  Coins,
  Package,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Gauge,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  Search,
  X,
  Edit2,
  Plus,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

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
  pti_product_id: '',
  role: 'URDIMBRE',
  ratio_percentage: 50,
  consumption_g_per_m: 32.5,
  required_quantity: '',
  required_unit: 'KG',
  notes: '',
});

const emptyBom = () => ({
  code: '',
  name: '',
  description: '',
  output_product_name: '',
  target_width_cm: 50,
  target_weight_g_per_m: 65,
  warp_density: 10,
  weft_density: 10,
  expected_output_quantity: 1,
  expected_output_unit: 'ROLLO',
  standard_output_meters: '' as number | '',
  default_route: 'TELARES,LAMINADO,CORTE',
  ounces_yd2: 5.0,
  fabric_type: 'TUBULAR' as 'TUBULAR' | 'PLANA',
  tape_color: 'N/A',
  tape_denier: 2300,
  tape_width_mm: 3.0,
  weft_denier: '1800 - 2000',
  warp_denier: '1800 - 2000',
  cost_transformation_index: 1.08,
  general_considerations: '',
  is_active: true,
  items: [emptyItem()],
});

const emptyLoom = () => ({
  code: '',
  name: '',
  loom_number: null as number | null,
  creel_capacity_spools: 1800,
  current_spools_count: 0,
  current_wip_kg: 0,
  model: 'LOHIA LSL-6',
  type: 'CIRCULAR',
  rpm: 120,
  status: 'DISPONIBLE',
  specifications: '',
  supported_pti_types: [] as number[],
  supported_bom_ids: [] as number[],
  is_active: true,
  subarea_id: null as number | null,
});

export const TelaresCatalogPage: React.FC = () => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const [tab, setTab] = useState<'telas' | 'telares'>('telas');

  // Filtros Tab Telas
  const [bomSearch, setBomSearch] = useState('');
  const [bomOuncesFilter, setBomOuncesFilter] = useState<'ALL' | string>('ALL');
  const [bomTypeFilter, setBomTypeFilter] = useState<'ALL' | 'TUBULAR' | 'PLANA'>('ALL');

  // Filtros y Vista Tab Telares
  const [loomSearch, setLoomSearch] = useState('');
  const [loomFilter, setLoomFilter] = useState<'ALL' | 'CIRCULARES' | 'BANDA'>('ALL');
  const [loomStatusFilter, setLoomStatusFilter] = useState<'ALL' | 'DISPONIBLE' | 'EN_PRODUCCION' | 'MANTENIMIENTO'>('ALL');
  const [loomViewMode, setLoomViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modales de Registro
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<any | null>(null);
  const [bomDraft, setBomDraft] = useState(emptyBom());

  const [isLoomModalOpen, setIsLoomModalOpen] = useState(false);
  const [editingLoom, setEditingLoom] = useState<any | null>(null);
  const [loomDraft, setLoomDraft] = useState(emptyLoom());

  // Modal para cargar fileta / creel WIP (1800 bobinas)
  const [isCreelModalOpen, setIsCreelModalOpen] = useState(false);
  const [selectedLoomForCreel, setSelectedLoomForCreel] = useState<any | null>(null);
  const [creelSpoolsToLoad, setCreelSpoolsToLoad] = useState<number>(300);
  const [selectedRackForCreel, setSelectedRackForCreel] = useState<number | ''>('');

  const queryClient = useQueryClient();

  const { data: boms = [], isLoading: loadingBoms } = useQuery({
    queryKey: ['telares', 'catalog', 'boms'],
    queryFn: async () => apiClient.get('/telares/boms?all=true'),
  });

  const { data: looms = [], isLoading: loadingLooms } = useQuery({
    queryKey: ['telares', 'catalog', 'looms'],
    queryFn: async () => apiClient.get('/telares/looms?all=true'),
  });

  const { data: subareas = [] } = useQuery({
    queryKey: ['telares', 'subareas'],
    queryFn: async () => apiClient.get('/telares/subareas'),
  });

  const { data: ptis = [] } = useQuery({
    queryKey: ['extrusion', 'pti-products', { is_active: true }],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/pti-products', { params: { is_active: true } });
      return response?.data || response || [];
    },
  });

  const { data: ptiRacks = [] } = useQuery({
    queryKey: ['extrusion', 'racks'],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/racks');
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
      if (bomDraft.ounces_yd2 >= 6.5) {
        if (bomDraft.weft_denier.includes('1800') || bomDraft.warp_denier.includes('1800')) {
          throw new Error('Restricción técnica: Para telas de 6.5 oz a 8.0 oz NO se permite Trama ni Urdimbre Denier 1800.');
        }
      }

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
    onSuccess: () => {
      invalidateCatalogs();
      toast.success('Especificación técnica de tela guardada exitosamente.');
      setIsBomModalOpen(false);
      setEditingBom(null);
      setBomDraft(emptyBom());
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message || 'No se pudo guardar la tela.'),
  });

  const saveLoomMutation = useMutation({
    mutationFn: async () => {
      if (editingLoom) return apiClient.put(`/telares/looms/${editingLoom.id}`, loomDraft);
      return apiClient.post('/telares/looms', loomDraft);
    },
    onSuccess: () => {
      invalidateCatalogs();
      toast.success('Telar guardado en el catálogo.');
      setIsLoomModalOpen(false);
      setEditingLoom(null);
      setLoomDraft(emptyLoom());
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo guardar el telar.'),
  });

  const loadCreelMutation = useMutation({
    mutationFn: async (payload: { loom_id: number; rack_id: number; spools_to_load: number }) => {
      return apiClient.post(`/telares/looms/${payload.loom_id}/load-creel`, payload);
    },
    onSuccess: (data: any) => {
      invalidateCatalogs();
      toast.success(data?.message || 'Bobinas cargadas exitosamente a la fileta del Telar.');
      setIsCreelModalOpen(false);
      setSelectedLoomForCreel(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Error al cargar fileta.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'boms' | 'looms'; id: number }) => apiClient.delete(`/telares/${kind}/${id}`),
    onSuccess: () => {
      invalidateCatalogs();
      toast.success('Registro desactivado.');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'No se pudo desactivar el registro.'),
  });

  // Apertura de Modales
  const startNewBom = () => {
    setEditingBom(null);
    setBomDraft(emptyBom());
    setIsBomModalOpen(true);
  };

  const editBom = (bom: any) => {
    setEditingBom(bom);
    setBomDraft({
      ...emptyBom(),
      ...bom,
      default_route: (bom.default_route || []).join(','),
      ounces_yd2: bom.ounces_yd2 ? Number(bom.ounces_yd2) : 5.0,
      standard_output_meters: bom.standard_output_meters ? Number(bom.standard_output_meters) : '',
      cost_transformation_index: bom.cost_transformation_index ? Number(bom.cost_transformation_index) : 1.08,
      items: (bom.items || []).map((item: any) => ({
        ...emptyItem(),
        ...item,
        pti_product_id: item.pti_product_id || '',
        required_quantity: item.required_quantity ? Number(item.required_quantity) : '',
      })),
    });
    setIsBomModalOpen(true);
  };

  const startNewLoom = () => {
    setEditingLoom(null);
    setLoomDraft(emptyLoom());
    setIsLoomModalOpen(true);
  };

  const editLoom = (loom: any) => {
    setEditingLoom(loom);
    setLoomDraft({
      ...emptyLoom(),
      ...loom,
      loom_number: loom.loom_number ? Number(loom.loom_number) : null,
      creel_capacity_spools: loom.creel_capacity_spools ? Number(loom.creel_capacity_spools) : 1800,
      current_spools_count: loom.current_spools_count ? Number(loom.current_spools_count) : 0,
      current_wip_kg: loom.current_wip_kg ? Number(loom.current_wip_kg) : 0,
      subarea_id: loom.subarea_id ? Number(loom.subarea_id) : null,
      supported_pti_types: (loom.supported_pti_types || []).map(Number),
      supported_bom_ids: (loom.supported_bom_ids || []).map(Number),
    });
    setIsLoomModalOpen(true);
  };

  const toggleNumber = (values: number[], value: number, checked: boolean) =>
    checked ? [...new Set([...values, value])] : values.filter((current) => current !== value);

  // Filtrado de Telas
  const filteredBoms = useMemo(() => {
    return boms.filter((bom: any) => {
      const search = bomSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (bom.name || '').toLowerCase().includes(search) ||
        (bom.code || '').toLowerCase().includes(search) ||
        (bom.tape_color || '').toLowerCase().includes(search);

      const matchesOunces =
        bomOuncesFilter === 'ALL' ||
        (bom.ounces_yd2 && Number(bom.ounces_yd2).toFixed(1) === bomOuncesFilter);

      const matchesType =
        bomTypeFilter === 'ALL' ||
        (bom.fabric_type || 'TUBULAR').toUpperCase() === bomTypeFilter;

      return matchesSearch && matchesOunces && matchesType;
    });
  }, [boms, bomSearch, bomOuncesFilter, bomTypeFilter]);

  // Filtrado de Telares
  const filteredLooms = useMemo(() => {
    return looms.filter((l: any) => {
      const search = loomSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (l.name || '').toLowerCase().includes(search) ||
        (l.code || '').toLowerCase().includes(search) ||
        String(l.loom_number || '').includes(search) ||
        (l.model || '').toLowerCase().includes(search);

      let matchesType = true;
      if (loomFilter === 'BANDA') {
        matchesType = l.subarea_id === 7 || l.type === 'BANDA' || (l.name || '').includes('Banda');
      } else if (loomFilter === 'CIRCULARES') {
        matchesType = l.subarea_id !== 7 && l.type !== 'BANDA';
      }

      let matchesStatus = true;
      if (loomStatusFilter !== 'ALL') {
        matchesStatus = l.status === loomStatusFilter;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [looms, loomSearch, loomFilter, loomStatusFilter]);

  // Cálculo en vivo del costo teórico del rollo según índice de transformación
  const theoreticalRollCost = useMemo(() => {
    const costIndex = Number(bomDraft.cost_transformation_index || 1.0);
    const weightKg = Number(bomDraft.target_weight_g_per_m || 65) * 0.001 * 500;
    let basePtiCost = 0;
    bomDraft.items.forEach((item) => {
      const pti = activePtis.find((p: any) => p.id === Number(item.pti_product_id));
      const ptiCostPerKg = Number(pti?.unit_price || 42.5);
      const ratio = Number(item.ratio_percentage || 50) / 100;
      basePtiCost += weightKg * ratio * ptiCostPerKg;
    });
    const transformedCost = basePtiCost * costIndex;
    return {
      basePtiCost,
      transformedCost,
      costPerMeter: transformedCost / 500,
    };
  }, [bomDraft, activePtis]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 p-4 pb-28 sm:p-6 lg:pr-24">
      {/* Header Industrial */}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-slate-700 bg-slate-800 p-5 shadow-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Factory className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              Catálogos Maestros de Tejido / Telares
            </h1>
            <p className="text-sm font-semibold text-slate-300">
              Especificación de Telas (PDF) y Monitoreo de Parque de Telares con Creel WIP (1,800 Bobinas)
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación Industrial (Solo 2 pestañas, Operadores ahora tiene su módulo) */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === 'telas' ? 'default' : 'outline'}
            onClick={() => setTab('telas')}
            className={`h-11 font-black uppercase text-xs rounded-xl ${
              tab === 'telas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'border-slate-600 bg-slate-900 text-slate-300'
            }`}
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Catálogo Telas / Bandas ({boms.length})
          </Button>
          <Button
            variant={tab === 'telares' ? 'default' : 'outline'}
            onClick={() => setTab('telares')}
            className={`h-11 font-black uppercase text-xs rounded-xl ${
              tab === 'telares' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'border-slate-600 bg-slate-900 text-slate-300'
            }`}
          >
            <Gauge className="mr-1.5 h-4 w-4" />
            21 Telares y Fileta Creel ({looms.length})
          </Button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* TAB 1: CATÁLOGO DE TELAS Y BANDAS SEGÚN ESPECIFICACIÓN PDF */}
      {/* ========================================================= */}
      {tab === 'telas' && (
        <div className="space-y-4">
          {/* Encabezado y Barra de Filtros */}
          <div className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-4 shadow-lg space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase text-slate-100">Fichas Técnicas de Telares (PDF)</h2>
                <p className="text-xs font-semibold text-slate-400">
                  Matriz oficial de Onzas, Tipo de Tela, Cinta de Identificación, Deniers e Índice de Costo
                </p>
              </div>

              {/* Botón Registrar Tela (Abre Modal) */}
              <Button
                onClick={startNewBom}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-11 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                + Registrar Ficha Técnica
              </Button>
            </div>

            {/* Filtros de Telas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 border-t border-slate-700/60">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por código, descripción o cinta..."
                  value={bomSearch}
                  onChange={(e) => setBomSearch(e.target.value)}
                  className="pl-10 h-10 bg-slate-900 border-2 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium"
                />
                {bomSearch && (
                  <button
                    onClick={() => setBomSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro de Tipo de Tela */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                    bomTypeFilter === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('TUBULAR')}
                  className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                    bomTypeFilter === 'TUBULAR' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tubular
                </button>
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('PLANA')}
                  className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                    bomTypeFilter === 'PLANA' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Plana
                </button>
              </div>

              {/* Selector de Onzas */}
              <select
                value={bomOuncesFilter}
                onChange={(e) => setBomOuncesFilter(e.target.value)}
                className="h-10 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-xs font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todas las Onzas</option>
                <option value="3.0">3.0 oz/yd²</option>
                <option value="5.0">5.0 oz/yd²</option>
                <option value="6.0">6.0 oz/yd²</option>
                <option value="6.5">6.5 oz/yd²</option>
                <option value="7.2">7.2 oz/yd²</option>
                <option value="8.0">8.0 oz/yd²</option>
              </select>
            </div>
          </div>

          {/* Tabla de Fichas Técnicas (Full Width) */}
          {loadingBoms ? (
            <p className="p-12 text-center text-slate-400 font-semibold">Cargando catálogo de telas…</p>
          ) : filteredBoms.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold bg-slate-800 rounded-2xl border-2 border-slate-700">
              No se encontraron fichas técnicas con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl">
              <table className="w-full min-w-[850px] text-left text-sm text-slate-200">
                <thead className="border-b-2 border-slate-700 bg-slate-900 text-xs font-black uppercase text-slate-300">
                  <tr>
                    <th className="p-3.5 pl-5">Código / Tela</th>
                    <th className="p-3.5">Onzas / Tipo</th>
                    <th className="p-3.5">Cinta Identificación</th>
                    <th className="p-3.5">Trama / Urdimbre</th>
                    {allowCosts && <th className="p-3.5">Índice Costo</th>}
                    <th className="p-3.5">Componentes PTI</th>
                    <th className="p-3.5">Ruta</th>
                    <th className="p-3.5 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 font-semibold">
                  {filteredBoms.map((bom: any) => {
                    const isHeavy = Number(bom.ounces_yd2 || 0) >= 6.5;
                    return (
                      <tr key={bom.id} className="hover:bg-slate-750 transition-colors">
                        <td className="p-3.5 pl-5">
                          <strong className="block font-black text-white text-sm">{bom.name}</strong>
                          <span className="font-mono text-xs font-bold text-blue-400">{bom.code}</span>
                        </td>
                        <td className="p-3.5">
                          <Badge className="bg-slate-900 border border-slate-600 text-amber-400 font-black text-xs mr-1.5">
                            {bom.ounces_yd2 ? `${Number(bom.ounces_yd2).toFixed(1)} oz` : 'Estándar'}
                          </Badge>
                          <Badge variant={bom.fabric_type === 'PLANA' ? 'outline' : 'default'} className="font-bold text-xs">
                            {bom.fabric_type || 'TUBULAR'}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          {bom.tape_color && bom.tape_color !== 'N/A' ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-600">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    bom.tape_color.includes('VERDE')
                                      ? '#22c55e'
                                      : bom.tape_color.includes('ROJO')
                                      ? '#ef4444'
                                      : bom.tape_color.includes('AZUL')
                                      ? '#3b82f6'
                                      : '#a855f7',
                                }}
                              />
                              {bom.tape_color} {bom.tape_denier ? `(${bom.tape_denier}D)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold text-xs">Sin cinta (N/A)</span>
                          )}
                        </td>
                        <td className="p-3.5 text-xs font-mono">
                          <div><span className="text-slate-400 font-sans font-semibold">Trama:</span> {bom.weft_denier || '1800-2000'}D</div>
                          <div><span className="text-slate-400 font-sans font-semibold">Urdimbre:</span> {bom.warp_denier || '1800-2000'}D</div>
                          {isHeavy && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-400 uppercase">
                              ⚠ Restricción: No 1800D
                            </span>
                          )}
                        </td>
                        {allowCosts && (
                          <td className="p-3.5">
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              x{Number(bom.cost_transformation_index || 1).toFixed(4)}
                            </span>
                          </td>
                        )}
                        <td className="p-3.5 text-xs">
                          <span className="text-slate-300 font-medium">{bom.items?.length || 0} insumo(s) PTI</span>
                        </td>
                        <td className="p-3.5 text-xs text-slate-300 font-medium">
                          {(bom.default_route || []).join(' → ')}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editBom(bom)}
                              className="h-8 border-slate-600 bg-slate-900 text-slate-200 font-bold text-xs"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            {bom.is_active && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  window.confirm(`¿Desactivar la especificación ${bom.name}?`) &&
                                  deactivateMutation.mutate({ kind: 'boms', id: bom.id })
                                }
                                className="h-8 text-xs font-bold"
                              >
                                Desactivar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: 21 TELARES Y CONTROL WIP FILETA / CREEL (1800 BOBINAS) */}
      {/* ========================================================= */}
      {tab === 'telares' && (
        <div className="space-y-4">
          {/* Encabezado y Barra de Filtros de Telares */}
          <div className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-4 shadow-lg space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase text-slate-100">
                  Parque de 21 Telares y Filetas Creel
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Control estricto de WIP interno por máquina (Capacidad hasta 1,800 bobinas cada una)
                </p>
              </div>

              {/* Botón Registrar Telar (Abre Modal) */}
              <Button
                onClick={startNewLoom}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-11 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                + Registrar Telar
              </Button>
            </div>

            {/* Barra de Filtros Industriales */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 border-t border-slate-700/60">
              {/* Buscador */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar telar por número (#1-21), código, nombre o modelo..."
                  value={loomSearch}
                  onChange={(e) => setLoomSearch(e.target.value)}
                  className="pl-10 h-10 bg-slate-900 border-2 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium"
                />
                {loomSearch && (
                  <button
                    onClick={() => setLoomSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro por Tipo de Telar */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLoomFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    loomFilter === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({looms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoomFilter('CIRCULARES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    loomFilter === 'CIRCULARES' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Circulares (1-17)
                </button>
                <button
                  type="button"
                  onClick={() => setLoomFilter('BANDA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    loomFilter === 'BANDA' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Telares Banda (18-21)
                </button>
              </div>

              {/* Filtro por Estado */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter('ALL')}
                  className={`px-2.5 py-1.5 text-xs font-black uppercase rounded-lg ${
                    loomStatusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter('DISPONIBLE')}
                  className={`px-2.5 py-1.5 text-xs font-black uppercase rounded-lg ${
                    loomStatusFilter === 'DISPONIBLE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Disponible
                </button>
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter('EN_PRODUCCION')}
                  className={`px-2.5 py-1.5 text-xs font-black uppercase rounded-lg ${
                    loomStatusFilter === 'EN_PRODUCCION' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  En Producción
                </button>
              </div>

              {/* Selector de Modo de Vista (Tarjetas vs Tabla) */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setLoomViewMode('CARDS')}
                  title="Vista de Tarjetas / Cuadrícula"
                  className={`p-1.5 rounded-lg transition-all ${
                    loomViewMode === 'CARDS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLoomViewMode('TABLE')}
                  title="Vista de Tabla Detallada"
                  className={`p-1.5 rounded-lg transition-all ${
                    loomViewMode === 'TABLE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Renderizado de Telares: Modo Tarjetas o Modo Tabla */}
          {loadingLooms ? (
            <p className="p-12 text-center text-slate-400 font-semibold">Cargando máquinas…</p>
          ) : filteredLooms.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold bg-slate-800 rounded-2xl border-2 border-slate-700">
              No se encontraron telares con los filtros aplicados.
            </div>
          ) : loomViewMode === 'CARDS' ? (
            /* Modo 1: Tarjetas / Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLooms.map((loom: any) => {
                const maxSpools = loom.creel_capacity_spools || 1800;
                const spools = Number(loom.current_spools_count || 0);
                const pct = Math.min(100, Math.round((spools / maxSpools) * 100));
                const isBand = loom.subarea_id === 7 || loom.type === 'BANDA';

                return (
                  <div
                    key={loom.id}
                    className={`rounded-2xl border-2 p-5 shadow-lg space-y-3 transition-all ${
                      isBand ? 'bg-slate-850 border-purple-500/40' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-base">
                            Telar #{loom.loom_number || loom.id}
                          </span>
                          {isBand && (
                            <Badge className="bg-purple-600 text-white text-[10px] font-black uppercase">
                              Telar Banda
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base leading-tight mt-0.5">{loom.name}</h3>
                        <p className="text-xs text-slate-400">
                          {loom.code} · {loom.model || 'LSL-6'} · {loom.rpm || 120} RPM
                        </p>
                      </div>

                      <Badge
                        variant={loom.status === 'EN_PRODUCCION' ? 'default' : 'outline'}
                        className={`font-black text-xs uppercase px-2 py-0.5 rounded-lg ${
                          loom.status === 'EN_PRODUCCION'
                            ? 'bg-blue-600 text-white'
                            : 'border-slate-600 bg-slate-900 text-slate-300'
                        }`}
                      >
                        {loom.status || 'DISPONIBLE'}
                      </Badge>
                    </div>

                    {/* Barra de Progreso Fileta Creel */}
                    <div className="space-y-1 rounded-xl bg-slate-900 p-3 border border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-amber-400" />
                          Fileta Creel (WIP):
                        </span>
                        <span className="font-mono font-black text-amber-300">
                          {spools.toFixed(0)} / {maxSpools} bobinas ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className={`h-full transition-all duration-300 ${
                            pct > 75 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Peso en fileta: <strong>{Number(loom.current_wip_kg || 0).toFixed(1)} kg</strong></span>
                        <span>Rollos: <strong>{loom.total_rolls_produced || 0}</strong></span>
                      </div>
                    </div>

                    {/* Acciones del Telar */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLoomForCreel(loom);
                          setIsCreelModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl h-9"
                      >
                        <Package className="mr-1 h-3.5 w-3.5" />
                        Cargar Fileta
                      </Button>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editLoom(loom)}
                          className="h-9 border-slate-600 bg-slate-900 text-slate-200 font-bold text-xs rounded-xl"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        {loom.is_active && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              window.confirm(`¿Desactivar el telar ${loom.name}?`) &&
                              deactivateMutation.mutate({ kind: 'looms', id: loom.id })
                            }
                            className="h-9 text-xs font-bold rounded-xl"
                          >
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Modo 2: Tabla Detallada */
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl">
              <table className="w-full min-w-[900px] text-left text-sm text-slate-200">
                <thead className="border-b-2 border-slate-700 bg-slate-900 text-xs font-black uppercase text-slate-300">
                  <tr>
                    <th className="p-3.5 pl-5"># Telar / Código</th>
                    <th className="p-3.5">Nombre y Modelo</th>
                    <th className="p-3.5">Tipo / Subárea</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5">Fileta Creel WIP (Ocupación)</th>
                    <th className="p-3.5">Rollos</th>
                    <th className="p-3.5">Velocidad</th>
                    <th className="p-3.5 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 font-semibold">
                  {filteredLooms.map((loom: any) => {
                    const maxSpools = loom.creel_capacity_spools || 1800;
                    const spools = Number(loom.current_spools_count || 0);
                    const pct = Math.min(100, Math.round((spools / maxSpools) * 100));
                    const isBand = loom.subarea_id === 7 || loom.type === 'BANDA';

                    return (
                      <tr key={loom.id} className="hover:bg-slate-750 transition-colors">
                        <td className="p-3.5 pl-5">
                          <span className="font-mono font-black text-amber-400 text-base">
                            #{loom.loom_number || loom.id}
                          </span>
                          <span className="block font-mono text-xs text-blue-400">{loom.code}</span>
                        </td>
                        <td className="p-3.5">
                          <strong className="block font-black text-white text-sm">{loom.name}</strong>
                          <span className="text-xs text-slate-400">{loom.model || 'LSL-6'}</span>
                        </td>
                        <td className="p-3.5">
                          {isBand ? (
                            <Badge className="bg-purple-600 text-white font-black text-xs">
                              Telar Banda (Subárea 7)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-bold text-xs text-slate-300 border-slate-600">
                              Circular Estándar
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`font-black text-xs uppercase px-2 py-0.5 rounded-lg ${
                              loom.status === 'EN_PRODUCCION'
                                ? 'bg-blue-600 text-white'
                                : 'border-slate-600 bg-slate-900 text-slate-300'
                            }`}
                          >
                            {loom.status || 'DISPONIBLE'}
                          </Badge>
                        </td>
                        <td className="p-3.5 min-w-[220px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-mono font-bold">
                              <span className="text-amber-400">{spools.toFixed(0)} / {maxSpools} bobs</span>
                              <span className="text-slate-400">({pct}%)</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                              <div
                                className={`h-full ${
                                  pct > 75 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              WIP: {Number(loom.current_wip_kg || 0).toFixed(1)} kg
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-sm text-slate-200">
                          {loom.total_rolls_produced || 0}
                        </td>
                        <td className="p-3.5 text-xs text-slate-300">
                          {loom.rpm || 120} RPM
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedLoomForCreel(loom);
                                setIsCreelModalOpen(true);
                              }}
                              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              <Package className="h-3.5 w-3.5 mr-1" />
                              Cargar Fileta
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editLoom(loom)}
                              className="h-8 border-slate-600 bg-slate-900 text-slate-200 font-bold text-xs"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            {loom.is_active && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  window.confirm(`¿Desactivar el telar ${loom.name}?`) &&
                                  deactivateMutation.mutate({ kind: 'looms', id: loom.id })
                                }
                                className="h-8 text-xs font-bold"
                              >
                                Desactivar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ALTA / EDICIÓN DE FICHA TÉCNICA DE TELA (PDF)    */}
      {/* ========================================================= */}
      {isBomModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white">
                    {editingBom ? 'Editar Ficha Técnica de Tela' : 'Alta de Ficha Técnica de Tela'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Matriz técnica oficial según PDF: onzas, deniers, color de cinta e índice de costo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBomModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBomMutation.mutate();
              }}
              className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
            >
              {/* Código y Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-300">
                  CÓDIGO ÚNICO (BOM) *
                  <Input
                    value={bomDraft.code}
                    onChange={(e) => setBomDraft({ ...bomDraft, code: e.target.value.toUpperCase() })}
                    placeholder="BOM-TEL-6.0-TUB"
                    required
                    className="mt-1 bg-slate-800 border-slate-700 font-mono text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  NOMBRE DE LA TELA *
                  <Input
                    value={bomDraft.name}
                    onChange={(e) => setBomDraft({ ...bomDraft, name: e.target.value })}
                    placeholder="Tela Tubular 6.0 oz/yd²"
                    required
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </label>
              </div>

              {/* Especificaciones Técnicas (PDF Página 1) */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Especificaciones Oficiales de Tela (Página 1 del PDF)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block text-xs font-bold text-slate-300">
                    ONZAS (oz / yd²) *
                    <select
                      value={bomDraft.ounces_yd2}
                      onChange={(e) => {
                        const oz = Number(e.target.value);
                        let autoTapeColor = 'N/A';
                        let autoTapeDenier = 2300;
                        let autoWeft = '1800 - 2000';
                        let autoWarp = '1800 - 2000';
                        let autoCostIndex = 1.08;

                        if (oz === 3.0) {
                          autoTapeColor = 'N/A';
                          autoTapeDenier = 1200;
                          autoWeft = '1200';
                          autoWarp = '1200';
                          autoCostIndex = 1.05;
                        } else if (oz === 5.0) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'VERDE / MORADO';
                          autoCostIndex = 1.08;
                        } else if (oz === 6.0) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'ROJO';
                          autoCostIndex = 1.1;
                        } else if (oz === 6.5) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'AZUL';
                          autoWeft = '2000';
                          autoWarp = '2000';
                          autoCostIndex = 1.12;
                        } else if (oz === 7.2) {
                          autoTapeColor = 'N/A';
                          autoWeft = '2000 - 2300';
                          autoWarp = '2100';
                          autoCostIndex = 1.15;
                        } else if (oz === 8.0) {
                          autoTapeColor = 'N/A';
                          autoWeft = '2000 - 2300';
                          autoWarp = '2100';
                          autoCostIndex = 1.18;
                        }

                        setBomDraft({
                          ...bomDraft,
                          ounces_yd2: oz,
                          tape_color: autoTapeColor,
                          tape_denier: autoTapeDenier,
                          weft_denier: autoWeft,
                          warp_denier: autoWarp,
                          cost_transformation_index: autoCostIndex,
                        });
                      }}
                      className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-amber-400"
                    >
                      <option value={3.0}>3.0 oz / yd²</option>
                      <option value={5.0}>5.0 oz / yd²</option>
                      <option value={6.0}>6.0 oz / yd²</option>
                      <option value={6.5}>6.5 oz / yd² (Restringido 1800)</option>
                      <option value={7.2}>7.2 oz / yd² (Restringido 1800)</option>
                      <option value={8.0}>8.0 oz / yd² (Restringido 1800)</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-slate-300">
                    TIPO DE TELA
                    <select
                      value={bomDraft.fabric_type}
                      onChange={(e) =>
                        setBomDraft({ ...bomDraft, fabric_type: e.target.value as 'TUBULAR' | 'PLANA' })
                      }
                      className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white"
                    >
                      <option value="TUBULAR">TUBULAR</option>
                      <option value="PLANA">PLANA</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-slate-300">
                    CINTA IDENTIFICACIÓN
                    <select
                      value={bomDraft.tape_color}
                      onChange={(e) => setBomDraft({ ...bomDraft, tape_color: e.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white"
                    >
                      <option value="N/A">N/A (Sin cinta)</option>
                      <option value="VERDE / MORADO">VERDE / MORADO (5.0 oz)</option>
                      <option value="ROJO">ROJO (6.0 oz)</option>
                      <option value="AZUL">AZUL (6.5 oz)</option>
                    </select>
                  </label>
                </div>

                {/* Banner de Restricción Técnica */}
                {bomDraft.ounces_yd2 >= 6.5 && (
                  <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-black uppercase text-rose-300">
                      <ShieldAlert className="h-4 w-4" />
                      Restricción Técnica Estricta de Tejeduría (Pág 1):
                    </div>
                    <p>
                      Para telas de <strong>6.5 a 8.0 oz</strong>: NO se permite el uso de Trama ni Urdimbre en <strong>Denier 1800</strong>.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-slate-300">
                    TRAMA (DENIER) *
                    <Input
                      value={bomDraft.weft_denier}
                      onChange={(e) => setBomDraft({ ...bomDraft, weft_denier: e.target.value })}
                      placeholder="Ej. 1800 - 2000 ó 2000"
                      className="mt-1 bg-slate-900 border-slate-700 font-mono text-white text-xs"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-300">
                    URDIMBRE (DENIER) *
                    <Input
                      value={bomDraft.warp_denier}
                      onChange={(e) => setBomDraft({ ...bomDraft, warp_denier: e.target.value })}
                      placeholder="Ej. 1800 - 2000 ó 2100"
                      className="mt-1 bg-slate-900 border-slate-700 font-mono text-white text-xs"
                    />
                  </label>
                </div>
              </div>

              {/* Índice de Transformación de Costo (Oculto para Supervisores) */}
              {allowCosts && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-400" />
                      Índice de Transformación de Costo (Multiplicador)
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Costo PTI Extrusión × Índice = Costo Rollo
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0.5"
                      max="5.0"
                      value={bomDraft.cost_transformation_index}
                      onChange={(e) =>
                        setBomDraft({ ...bomDraft, cost_transformation_index: Number(e.target.value) || 1.0 })
                      }
                      className="w-40 bg-slate-900 border-emerald-500/50 text-emerald-300 font-mono font-black text-base"
                    />
                    <div className="text-xs text-slate-300">
                      Estimación rollo 500m:{' '}
                      <strong className="text-white">${theoreticalRollCost.transformedCost.toFixed(2)} MXN</strong>{' '}
                      (${theoreticalRollCost.costPerMeter.toFixed(2)} / metro)
                    </div>
                  </div>
                </div>
              )}

              {/* Dimensiones y Ruta */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-blue-200">Producto de salida y base de rendimiento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <label className="sm:col-span-2 block text-xs font-bold text-slate-300">
                    PRODUCTO / MODELO DE TELA O BANDA *
                    <Input value={bomDraft.output_product_name} onChange={(e) => setBomDraft({ ...bomDraft, output_product_name: e.target.value })} placeholder="Modelo / nombre comercial" required className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <label className="block text-xs font-bold text-slate-300">
                    SALIDA ESTIMADA *
                    <Input type="number" min="0.001" step="0.001" value={bomDraft.expected_output_quantity} onChange={(e) => setBomDraft({ ...bomDraft, expected_output_quantity: Number(e.target.value) || 0 })} required className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <label className="block text-xs font-bold text-slate-300">
                    UNIDAD DE SALIDA
                    <select value={bomDraft.expected_output_unit} onChange={(e) => setBomDraft({ ...bomDraft, expected_output_unit: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white">
                      <option value="ROLLO">ROLLO</option><option value="METRO">METRO</option><option value="KG">KG</option><option value="PIEZA">PIEZA</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2 block text-xs font-bold text-slate-300">
                    METROS DE REFERENCIA POR SALIDA (OPCIONAL)
                    <Input type="number" min="0.001" step="0.01" value={bomDraft.standard_output_meters} onChange={(e) => setBomDraft({ ...bomDraft, standard_output_meters: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Necesario para cantidades por rollo" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <p className="sm:col-span-2 self-center text-[11px] text-slate-400">El consumo planeado usa gramos de PTI por metro. La cantidad por salida se prorratea si se captura una base de metros.</p>
                </div>
              </div>

              {/* Dimensiones y Ruta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block text-xs font-bold text-slate-300">
                  ANCHO (CM)
                  <Input
                    type="number"
                    value={bomDraft.target_width_cm}
                    onChange={(e) => setBomDraft({ ...bomDraft, target_width_cm: Number(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  GRAMAJE (G/M)
                  <Input
                    type="number"
                    value={bomDraft.target_weight_g_per_m}
                    onChange={(e) => setBomDraft({ ...bomDraft, target_weight_g_per_m: Number(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-300 col-span-2">
                  RUTA OPERATIVA DEL QR
                  <Input
                    value={bomDraft.default_route}
                    onChange={(e) => setBomDraft({ ...bomDraft, default_route: e.target.value })}
                    placeholder="TELARES,LAMINADO,CORTE"
                    className="mt-1 bg-slate-800 border-slate-700 text-white font-mono text-xs"
                  />
                </label>
              </div>

              {/* Componentes PTI de Extrusión Requeridos */}
              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white">
                      Insumos Requeridos de Extrusión (PTIs)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Vincule los PTIs de urdimbre, trama o refuerzo con sus cantidades y porcentajes
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setBomDraft({ ...bomDraft, items: [...bomDraft.items, emptyItem()] })}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                  >
                    + Agregar Insumo PTI
                  </Button>
                </div>

                {bomDraft.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-xl bg-slate-900 p-3 border border-slate-700 items-end"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">
                        PTI DE EXTRUSIÓN #{index + 1}
                      </label>
                      <select
                        value={item.pti_product_id}
                        onChange={(e) =>
                          setBomDraft({
                            ...bomDraft,
                            items: bomDraft.items.map((row, i) =>
                              i === index ? { ...row, pti_product_id: Number(e.target.value) || '' } : row
                            ),
                          })
                        }
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs font-bold text-white"
                      >
                        <option value="">Seleccione PTI</option>
                        {activePtis.map((pti: any) => (
                          <option key={pti.id} value={pti.id}>
                            {pti.code} — {pti.name} (${pti.unit_price || 42.5}/kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">FUNCIÓN</label>
                      <select
                        value={item.role}
                        onChange={(e) =>
                          setBomDraft({
                            ...bomDraft,
                            items: bomDraft.items.map((row, i) =>
                              i === index ? { ...row, role: e.target.value } : row
                            ),
                          })
                        }
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs font-bold text-white"
                      >
                        <option value="URDIMBRE">URDIMBRE</option>
                        <option value="TRAMA">TRAMA</option>
                        <option value="CINTA_REFUERZO">CINTA / REFUERZO</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="space-y-1 flex-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">% RATIO</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.ratio_percentage}
                          onChange={(e) =>
                            setBomDraft({
                              ...bomDraft,
                              items: bomDraft.items.map((row, i) =>
                                i === index ? { ...row, ratio_percentage: Number(e.target.value) } : row
                              ),
                            })
                          }
                          className="h-9 bg-slate-800 border-slate-700 text-xs font-bold text-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={bomDraft.items.length === 1}
                        onClick={() =>
                          setBomDraft({ ...bomDraft, items: bomDraft.items.filter((_, i) => i !== index) })
                        }
                        className="h-9 px-2 text-red-400 hover:text-red-300 disabled:opacity-30 mt-5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="sm:col-span-4 grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-slate-700 pt-2">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase sm:col-span-2">
                        CONSUMO DEL PTI (G / METRO) *
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          value={item.consumption_g_per_m}
                          onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, consumption_g_per_m: Number(e.target.value) || 0 } : row) })}
                          className="mt-1 h-9 bg-slate-800 border-slate-700 text-xs font-bold text-white"
                        />
                      </label>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">
                        CANTIDAD POR SALIDA
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          value={item.required_quantity}
                          onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_quantity: e.target.value === '' ? '' : Number(e.target.value) } : row) })}
                          className="mt-1 h-9 bg-slate-800 border-slate-700 text-xs font-bold text-white"
                        />
                      </label>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase">
                        UNIDAD
                        <select
                          value={item.required_unit}
                          onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_unit: e.target.value as 'KG' | 'PIEZAS' } : row) })}
                          className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs font-bold text-white"
                        >
                          <option value="KG">KG</option><option value="PIEZAS">BOBINAS</option>
                        </select>
                      </label>
                      <p className="sm:col-span-4 text-[10px] text-slate-500">El consumo g/metro calcula la demanda del plan. La cantidad por salida sirve para prorratear la receta cuando el producto tiene metros de referencia configurados.</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBomModalOpen(false)}
                  className="font-bold border-slate-700 text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveBomMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase"
                >
                  {saveBomMutation.isPending ? 'Guardando…' : editingBom ? 'Actualizar Ficha Técnica' : 'Guardar Ficha Técnica'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ALTA / EDICIÓN DE TELAR                         */}
      {/* ========================================================= */}
      {isLoomModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white">
                    {editingLoom ? `Editar Telar #${editingLoom.loom_number || editingLoom.id}` : 'Alta de Máquina Telar'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure número de telar (1-21), capacidad de creel (1,800 bobinas) y subárea
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoomModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveLoomMutation.mutate();
              }}
              className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-300">
                  CÓDIGO TELAR *
                  <Input
                    value={loomDraft.code}
                    onChange={(e) => setLoomDraft({ ...loomDraft, code: e.target.value.toUpperCase() })}
                    placeholder="TEL-01"
                    required
                    className="mt-1 bg-slate-800 border-slate-700 font-mono text-white"
                  />
                </label>
                <label className="block text-xs font-bold text-amber-300">
                  NÚMERO DE TELAR (1 al 21) *
                  <Input
                    type="number"
                    min="1"
                    max="21"
                    value={loomDraft.loom_number || ''}
                    onChange={(e) =>
                      setLoomDraft({ ...loomDraft, loom_number: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="Ej. 10"
                    required
                    className="mt-1 bg-slate-800 border-amber-500/50 font-mono font-black text-amber-300"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-300">
                NOMBRE DESCRIPTIVO *
                <Input
                  value={loomDraft.name}
                  onChange={(e) => setLoomDraft({ ...loomDraft, name: e.target.value })}
                  placeholder="Telar Circular 10"
                  required
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block text-xs font-bold text-slate-300">
                  MODELO
                  <Input
                    value={loomDraft.model}
                    onChange={(e) => setLoomDraft({ ...loomDraft, model: e.target.value })}
                    placeholder="LOHIA LSL-6"
                    className="mt-1 bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  TIPO
                  <select
                    value={loomDraft.type}
                    onChange={(e) => setLoomDraft({ ...loomDraft, type: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-xs font-bold text-white"
                  >
                    <option value="CIRCULAR">CIRCULAR</option>
                    <option value="PLANO">PLANO</option>
                    <option value="BANDA">BANDA</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  RPM OPERATIVA
                  <Input
                    type="number"
                    value={loomDraft.rpm}
                    onChange={(e) => setLoomDraft({ ...loomDraft, rpm: Number(e.target.value) })}
                    className="mt-1 bg-slate-800 border-slate-700 text-white text-xs"
                  />
                </label>
              </div>

              {/* Capacidad Creel / Fileta */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-1">
                <label className="block text-xs font-bold text-amber-300">
                  CAPACIDAD MÁXIMA DE FILETA / CREEL (BOBINAS) *
                  <Input
                    type="number"
                    min="100"
                    max="2500"
                    value={loomDraft.creel_capacity_spools}
                    onChange={(e) =>
                      setLoomDraft({ ...loomDraft, creel_capacity_spools: Number(e.target.value) || 1800 })
                    }
                    required
                    className="mt-1 bg-slate-800 border-amber-500/50 font-mono font-bold text-amber-400 text-sm"
                  />
                </label>
                <p className="text-[11px] text-slate-400">
                  * Capacidad estándar de fileta para telares de tejido (típicamente 1,800 bobinas c/u).
                </p>
              </div>

              {/* Subárea */}
              <label className="block text-xs font-bold text-slate-300">
                SUBÁREA / LÍNEA
                <select
                  value={loomDraft.subarea_id || ''}
                  onChange={(e) =>
                    setLoomDraft({ ...loomDraft, subarea_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-white"
                >
                  <option value="">Telares general (Planta)</option>
                  {subareas.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLoomModalOpen(false)}
                  className="font-bold border-slate-700 text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveLoomMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase"
                >
                  {saveLoomMutation.isPending ? 'Guardando…' : editingLoom ? 'Actualizar Telar' : 'Guardar Telar'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CARGAR BOBINAS A FILETA CREEL (WIP INTERNO)      */}
      {/* ========================================================= */}
      {isCreelModalOpen && selectedLoomForCreel && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
          <div className="w-full max-w-lg rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase text-white flex items-center gap-2">
                  <Package className="h-6 w-6 text-emerald-400" />
                  Cargar Fileta Creel — Telar #{selectedLoomForCreel.loom_number || selectedLoomForCreel.id}
                </h3>
                <p className="text-xs text-slate-400">
                  Alimente la fileta del telar con bobinas desde un Rack Maestro de Extrusión
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreelModalOpen(false);
                  setSelectedLoomForCreel(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-800 p-3 border border-slate-700 text-xs space-y-1">
              <p>Capacidad Creel: <strong className="text-amber-400">{selectedLoomForCreel.creel_capacity_spools || 1800} bobinas</strong></p>
              <p>Ocupación Actual: <strong className="text-emerald-400">{Number(selectedLoomForCreel.current_spools_count || 0).toFixed(0)} bobinas</strong></p>
              <p>Espacio Disponible: <strong className="text-white">{Math.max(0, (selectedLoomForCreel.creel_capacity_spools || 1800) - Number(selectedLoomForCreel.current_spools_count || 0))} bobinas</strong></p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedRackForCreel) {
                  toast.error('Selecciona un Rack Maestro con bobinas de extrusión');
                  return;
                }
                loadCreelMutation.mutate({
                  loom_id: selectedLoomForCreel.id,
                  rack_id: Number(selectedRackForCreel),
                  spools_to_load: Number(creelSpoolsToLoad),
                });
              }}
            >
              <label className="block text-xs font-bold text-slate-300">
                RACK MAESTRO DE ORIGEN (EXTRUSIÓN) *
                <select
                  value={selectedRackForCreel}
                  onChange={(e) => setSelectedRackForCreel(Number(e.target.value) || '')}
                  required
                  className="mt-1 h-11 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-white"
                >
                  <option value="">Selecciona Rack de Extrusión</option>
                  {ptiRacks
                    .filter((r: any) => Number(r.current_quantity) > 0)
                    .map((rack: any) => (
                      <option key={rack.id} value={rack.id}>
                        {rack.rack_code} — {rack.currentPtiProduct?.code || 'PTI'} ({Number(rack.current_quantity).toFixed(0)} bobinas disp.)
                      </option>
                    ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-slate-300">
                CANTIDAD DE BOBINAS A CARGAR EN FILETA *
                <Input
                  type="number"
                  min="1"
                  max={(selectedLoomForCreel.creel_capacity_spools || 1800) - Number(selectedLoomForCreel.current_spools_count || 0)}
                  value={creelSpoolsToLoad}
                  onChange={(e) => setCreelSpoolsToLoad(Number(e.target.value))}
                  required
                  className="mt-1 bg-slate-800 border-slate-700 font-mono text-base font-bold text-emerald-400"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreelModalOpen(false);
                    setSelectedLoomForCreel(null);
                  }}
                  className="border-slate-700 bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loadCreelMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {loadCreelMutation.isPending ? 'Cargando…' : 'Confirmar Carga a Fileta'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TelaresCatalogPage;
