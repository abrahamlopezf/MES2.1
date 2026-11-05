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
  QrCode,
} from '@/design-system/components/Icon/googleIconCompat';

type BomItemDraft = {
  pti_product_id: number | '';
  role: string;
  ratio_percentage: number;
  consumption_per_meter: number;
  consumption_per_meter_unit: 'KG' | 'PIEZAS';
  consumption_g_per_m: number;
  required_quantity: number | '';
  required_unit: 'KG' | 'PIEZAS';
  notes: string;
};

const emptyItem = (): BomItemDraft => ({
  pti_product_id: '',
  role: 'URDIMBRE',
  ratio_percentage: 0,
  consumption_per_meter: 0,
  consumption_per_meter_unit: 'KG',
  consumption_g_per_m: 0,
  required_quantity: '',
  required_unit: 'KG',
  notes: '',
});

const emptyBom = () => ({
  code: '',
  name: '',
  description: '',
  output_product_name: '',
  subarea_id: null as number | null,
  product_kind: 'ROLLO_TELA',
  output_color: '',
  output_width_value: '' as number | '',
  output_width_unit: 'CM',
  output_denier: '' as number | '',
  tensile_strength_lb: '' as number | '',
  units_per_pallet: '' as number | '',
  packaging_type: '',
  output_weight_kg: '' as number | '',
  is_provisional: true,
  target_width_cm: 0,
  target_weight_g_per_m: 0,
  warp_density: 0,
  weft_density: 0,
  expected_output_quantity: 1,
  expected_output_unit: 'ROLLO',
  standard_output_meters: '' as number | '',
  default_route: '',
  allowed_routes: [] as string[],
  ounces_yd2: '' as number | '',
  fabric_type: 'TUBULAR' as 'TUBULAR' | 'PLANA',
  tape_color: 'N/A',
  tape_denier: 0,
  tape_width_mm: 0,
  weft_denier: '',
  warp_denier: '',
  cost_transformation_index: 1.0,
  general_considerations: '',
  is_active: true,
  items: [],
});

const routeOptionsForKind = (kind: string) => kind === 'ROLLO_TELA'
  ? [
      { value: 'TELARES,LAMINADO', label: 'Telares → Laminado' },
      { value: 'TELARES,LAMINADO,CORTE', label: 'Telares → Laminado → Corte' },
      { value: 'TELARES,CORTE', label: 'Telares → Corte directo' },
      { value: 'TELARES,LONAS', label: 'Telares → Lonas' },
      { value: 'TELARES,ALMACEN', label: 'Telares → Almacén' },
      { value: 'TELARES,VENTA', label: 'Telares → Venta de rollo' },
    ]
  : [
      { value: 'TELARES,CORTE', label: 'Telares → Corte (de banda / de cinta)' },
      { value: 'TELARES,ALMACEN', label: 'Telares → Almacén' },
      { value: 'TELARES,VENTA', label: 'Telares → Venta directa' },
    ];

const routeStagesToValue = (route: unknown) => Array.isArray(route)
  ? route.map((stage) => String(stage).trim().toUpperCase()).join(',')
  : String(route || '').split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean).join(',');

const outputWidthToCm = (value: number, unit: string) =>
  unit === 'PULGADA' ? value * 2.54 : unit === 'MM' ? value / 10 : value;

const getPtiConsumptionPerMeter = (item: any, bom: any) => {
  const savedPerMeter = Number(item.consumption_per_meter);
  if (savedPerMeter > 0) return savedPerMeter;
  const legacyKgPerMeter = Number(item.consumption_g_per_m || 0) / 1000;
  if (legacyKgPerMeter > 0) return legacyKgPerMeter;

  // Translate older per-output values into an equivalent per-meter amount for editing.
  const quantity = Number(item.required_quantity || 0);
  const expectedQuantity = Number(bom.expected_output_quantity || 1);
  const referenceMeters = Number(bom.standard_output_meters || 0);
  if (quantity <= 0 || expectedQuantity <= 0) return 0;
  const outputUnit = String(bom.expected_output_unit || 'ROLLO').toUpperCase();
  if (outputUnit === 'METRO') return quantity / expectedQuantity;
  if (outputUnit === 'KG') {
    const weightPerMeter = Number(bom.output_weight_kg || 0) > 0 && referenceMeters > 0
      ? Number(bom.output_weight_kg) / referenceMeters
      : Number(bom.target_weight_g_per_m || 0) / 1000;
    return weightPerMeter > 0 ? quantity * weightPerMeter / expectedQuantity : 0;
  }
  return referenceMeters > 0 ? quantity * expectedQuantity / referenceMeters : 0;
};

const emptyLoom = () => ({
  code: '',
  name: '',
  loom_number: null as number | null,
  creel_capacity_spools: null as number | null,
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
  const [bomSubareaFilter, setBomSubareaFilter] = useState<'ALL' | string>('ALL');
  const [bomProductFilter, setBomProductFilter] = useState<'ALL' | 'ROLLO_TELA' | 'BANDA' | 'CINTA'>('ALL');

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

  const { data: ptis = [], isLoading: loadingPtis, isError: ptisError, refetch: refetchPtis } = useQuery({
    queryKey: ['extrusion', 'pti-products', { is_active: true }],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/pti-products', { params: { is_active: true } });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      return [];
    },
  });

  const { data: ptiRacks = [] } = useQuery({
    queryKey: ['extrusion', 'racks'],
    queryFn: async () => {
      const response: any = await apiClient.get('/extrusion/racks');
      return response?.data || response || [];
    },
  });

  const activePtis = useMemo(() => ptis.filter((pti: any) => pti.is_active === true || pti.is_active === 1 || pti.is_active === 'true'), [ptis]);
  const selectedSubarea = subareas.find((subarea: any) => Number(subarea.id) === Number(bomDraft.subarea_id));
  const isBandSubarea = /banda/i.test(String(selectedSubarea?.name || ''));
  const configuredRouteOptions = routeOptionsForKind(bomDraft.product_kind);
  const compatiblePtis = useMemo(
    () => activePtis.filter((pti: any) => {
      const configured = String(pti.telares_subarea_code || '').toUpperCase();
      if (configured === 'NO_APLICA') return false;
      const legacyMachineNumber = Number(pti.extrusion_machine_number);
      const isBandPti = configured ? configured === 'TELARES_BANDA' : legacyMachineNumber === 1;
      if (!configured && ![1, 2, 4, 5].includes(legacyMachineNumber)) return false;
      return isBandPti === isBandSubarea;
    }),
    [activePtis, isBandSubarea]
  );

  const invalidateCatalogs = () => {
    queryClient.invalidateQueries({ queryKey: ['telares'] });
    queryClient.invalidateQueries({ queryKey: ['telares', 'catalog'] });
  };

  const saveBomMutation = useMutation({
    mutationFn: async () => {
      const referenceMeters = Number(bomDraft.standard_output_meters) || 0;
      const configuredItems = bomDraft.items.filter((item) => item.pti_product_id !== '');
      if (!bomDraft.is_provisional && configuredItems.length && referenceMeters <= 0) {
        throw new Error('Indica los metros de referencia para calcular cuánto consume cada PTI.');
      }
      if (!bomDraft.is_provisional && configuredItems.some((item) =>
        Number(item.required_quantity) <= 0 && Number(item.consumption_per_meter) <= 0 && Number(item.consumption_g_per_m) <= 0
      )) {
        throw new Error('Completa la cantidad de consumo de cada PTI o marca la ficha como provisional mientras confirmas los datos.');
      }
      if (!bomDraft.allowed_routes.length) {
        throw new Error('Autoriza al menos una ruta operativa para esta ficha.');
      }
      if (!bomDraft.allowed_routes.includes(bomDraft.default_route)) {
        throw new Error('La ruta sugerida debe estar marcada como permitida.');
      }
      if (bomDraft.ounces_yd2 >= 6.5) {
        if (bomDraft.weft_denier.includes('1800') || bomDraft.warp_denier.includes('1800')) {
          throw new Error('Restricción técnica: Para telas de 6.5 oz a 8.0 oz NO se permite Trama ni Urdimbre Denier 1800.');
        }
      }

      const payload = {
        ...bomDraft,
        output_product_name: bomDraft.output_product_name || bomDraft.name,
        default_route: bomDraft.default_route.split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean),
        allowed_routes: bomDraft.allowed_routes.map((route) => route.split(',').map((stage) => stage.trim().toUpperCase()).filter(Boolean)),
        items: configuredItems.map((item) => {
          const quantityPerReference = Number(item.required_quantity) || 0;
          const perMeter = quantityPerReference > 0 && referenceMeters > 0
            ? quantityPerReference / referenceMeters
            : Number(item.consumption_per_meter) || 0;
          return {
            ...item,
            pti_product_id: Number(item.pti_product_id),
            consumption_per_meter: perMeter,
            consumption_per_meter_unit: item.required_unit,
            // Legacy field is kept synchronized for existing reports and clients.
            consumption_g_per_m: item.required_unit === 'KG' ? perMeter * 1000 : 0,
            required_quantity: quantityPerReference > 0 ? quantityPerReference : null,
            required_unit: item.required_unit,
          };
        }),
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
    const rollSubarea = subareas.find((subarea: any) => /rollo/i.test(subarea.name));
    setBomDraft({ ...emptyBom(), subarea_id: rollSubarea?.id ?? null });
    setIsBomModalOpen(true);
  };

  const editBom = (bom: any) => {
    setEditingBom(bom);
    const savedRoute = routeStagesToValue(bom.default_route);
    const savedAllowedRoutes = Array.isArray(bom.allowed_routes) && bom.allowed_routes.length
      ? bom.allowed_routes.map(routeStagesToValue)
      : [savedRoute];
    setBomDraft({
      ...emptyBom(),
      ...bom,
      output_width_value: bom.output_width_value == null ? '' : Number(bom.output_width_value),
      output_denier: bom.output_denier == null ? '' : Number(bom.output_denier),
      tensile_strength_lb: bom.tensile_strength_lb == null ? '' : Number(bom.tensile_strength_lb),
      units_per_pallet: bom.units_per_pallet == null ? '' : Number(bom.units_per_pallet),
      output_weight_kg: bom.output_weight_kg == null ? '' : Number(bom.output_weight_kg),
      default_route: savedRoute,
      allowed_routes: savedAllowedRoutes,
      ounces_yd2: bom.ounces_yd2 == null ? '' : Number(bom.ounces_yd2),
      standard_output_meters: bom.standard_output_meters ? Number(bom.standard_output_meters) : '',
      cost_transformation_index: bom.cost_transformation_index ? Number(bom.cost_transformation_index) : 1.0,
      items: (bom.items || []).map((item: any) => {
        const perMeter = getPtiConsumptionPerMeter(item, bom);
        const referenceMeters = Number(bom.standard_output_meters || 0);
        const unit = item.consumption_per_meter_unit === 'PIEZAS'
          ? 'PIEZAS'
          : item.required_unit === 'PIEZAS' ? 'PIEZAS' : 'KG';
        return {
          ...emptyItem(),
          ...item,
          pti_product_id: item.pti_product_id || '',
          consumption_per_meter: perMeter,
          consumption_per_meter_unit: unit,
          required_quantity: perMeter > 0 && referenceMeters > 0
            ? Number((perMeter * referenceMeters).toFixed(6))
            : '',
          required_unit: unit,
        };
      }),
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
      creel_capacity_spools: loom.creel_capacity_spools == null ? null : Number(loom.creel_capacity_spools),
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

      const isFabricRoll = String(bom.product_kind || 'ROLLO_TELA').toUpperCase() === 'ROLLO_TELA';
      const matchesOunces = !isFabricRoll || bomOuncesFilter === 'ALL' ||
        (bom.ounces_yd2 && Number(bom.ounces_yd2).toFixed(1) === bomOuncesFilter);

      const matchesType = !isFabricRoll || bomTypeFilter === 'ALL' ||
        (bom.fabric_type || 'TUBULAR').toUpperCase() === bomTypeFilter;

      const matchesProduct = bomProductFilter === 'ALL' || String(bom.product_kind || 'ROLLO_TELA').toUpperCase() === bomProductFilter;
      const matchesSubarea = bomSubareaFilter === 'ALL' || String(bom.subarea_id || '') === bomSubareaFilter;

      return matchesSearch && matchesOunces && matchesType && matchesProduct && matchesSubarea;
    });
  }, [boms, bomSearch, bomOuncesFilter, bomTypeFilter, bomProductFilter, bomSubareaFilter]);

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
        matchesType = /banda/i.test(l.subarea?.name || '') || l.type === 'BANDA' || (l.name || '').includes('Banda');
      } else if (loomFilter === 'CIRCULARES') {
        matchesType = !(/banda/i.test(l.subarea?.name || '') || l.type === 'BANDA' || (l.name || '').includes('Banda'));
      }

      let matchesStatus = true;
      if (loomStatusFilter !== 'ALL') {
        matchesStatus = l.status === loomStatusFilter;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [looms, loomSearch, loomFilter, loomStatusFilter]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 p-4 pb-32 sm:p-6 lg:pb-8">
      <header className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Factory className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-300">Telares · Catálogos</p>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">¿Qué deseas consultar?</h1>
              <p className="mt-1 text-base text-slate-300">Elige productos o máquinas para continuar.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
            className="min-h-12 border-slate-600 px-5 text-base font-bold text-slate-100 sm:self-center"
          >
            <QrCode className="mr-2 h-5 w-5" aria-hidden="true" /> Escanear un QR
          </Button>
        </div>

        <nav aria-label="Catálogos de Telares" className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            aria-pressed={tab === 'telas'}
            onClick={() => setTab('telas')}
            className={`flex min-h-[88px] items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              tab === 'telas'
                ? 'border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                : 'border-slate-600 bg-slate-900 text-slate-100 hover:border-blue-400 hover:bg-slate-700'
            }`}
          >
            <Layers className="h-7 w-7 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold">Productos de tela y banda</span>
              <span className={`mt-1 block text-sm ${tab === 'telas' ? 'text-blue-100' : 'text-slate-300'}`}>Ver especificaciones y materiales requeridos</span>
            </span>
            <span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{boms.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === 'telares'}
            onClick={() => setTab('telares')}
            className={`flex min-h-[88px] items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              tab === 'telares'
                ? 'border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                : 'border-slate-600 bg-slate-900 text-slate-100 hover:border-blue-400 hover:bg-slate-700'
            }`}
          >
            <Gauge className="h-7 w-7 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold">Telares y filetas</span>
              <span className={`mt-1 block text-sm ${tab === 'telares' ? 'text-blue-100' : 'text-slate-300'}`}>Consultar máquinas, subáreas y capacidad de bobinas</span>
            </span>
            <span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{looms.length}</span>
          </button>
        </nav>
      </header>

      {/* ========================================================= */}
      {/* TAB 1: CATÁLOGO DE TELAS Y BANDAS SEGÚN ESPECIFICACIÓN PDF */}
      {/* ========================================================= */}
      {tab === 'telas' && (
        <div className="space-y-4">
          {/* Encabezado y Barra de Filtros */}
          <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-lg sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-700/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black leading-tight text-slate-100">Productos de tela y banda</h2>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-300">
                  Consulta las especificaciones de cada producto y las bobinas que requiere.
                </p>
              </div>

                {/* Alta de producto de Telares */}
              <Button
                type="button"
                onClick={startNewBom}
                className="min-h-12 shrink-0 rounded-xl bg-blue-600 px-5 text-base font-bold text-white shadow-md shadow-blue-950/30 hover:bg-blue-500 sm:self-center"
              >
                <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                Registrar producto
              </Button>
            </div>

            {/* Filtros de Telas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200 sm:col-span-2 xl:col-span-3">
                <span>Buscar producto</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    type="text"
                    placeholder="Código o nombre del producto"
                    value={bomSearch}
                    onChange={(e) => setBomSearch(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-600 bg-slate-900 !pl-12 pr-12 text-base font-medium text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/50"
                  />
                  {bomSearch && (
                    <button
                      type="button"
                      onClick={() => setBomSearch('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200 xl:col-span-2"><span>Subárea</span>
                <select value={bomSubareaFilter} onChange={(e) => setBomSubareaFilter(e.target.value)} className="h-12 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <option value="ALL">Todas las subáreas</option>
                  {subareas.map((subarea: any) => <option key={subarea.id} value={subarea.id}>{subarea.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200 xl:col-span-2"><span>Tipo de producto</span>
                <select value={bomProductFilter} onChange={(e) => setBomProductFilter(e.target.value as typeof bomProductFilter)} className="h-12 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <option value="ALL">Todos los productos</option><option value="ROLLO_TELA">Rollos de tela</option><option value="BANDA">Bandas</option><option value="CINTA">Cintas</option>
                </select>
              </label>

              {/* Filtro de Tipo de Tela */}
              <fieldset className="min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-1.5 sm:col-span-2 xl:col-span-3">
                <legend className="px-1 text-sm font-semibold text-slate-200">Construcción de tela</legend>
                <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('ALL')}
                  className={`min-h-11 rounded-lg px-2 text-sm font-bold transition-all ${
                    bomTypeFilter === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('TUBULAR')}
                  className={`min-h-11 rounded-lg px-2 text-sm font-bold transition-all ${
                    bomTypeFilter === 'TUBULAR' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tubular
                </button>
                <button
                  type="button"
                  onClick={() => setBomTypeFilter('PLANA')}
                  className={`min-h-11 rounded-lg px-2 text-sm font-bold transition-all ${
                    bomTypeFilter === 'PLANA' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Plana
                </button>
                </div>
              </fieldset>

              {/* Selector de peso por superficie */}
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-200 xl:col-span-2"><span>Peso de tela</span>
                <select
                  value={bomOuncesFilter}
                  onChange={(e) => setBomOuncesFilter(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base font-semibold text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <option value="ALL">Todos los pesos</option>
                  <option value="3.0">3.0 oz/yd²</option>
                  <option value="5.0">5.0 oz/yd²</option>
                  <option value="6.0">6.0 oz/yd²</option>
                  <option value="6.5">6.5 oz/yd²</option>
                  <option value="7.2">7.2 oz/yd²</option>
                  <option value="8.0">8.0 oz/yd²</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 pt-3 text-sm">
              <p className="rounded-lg bg-slate-900/70 px-3 py-2 font-medium text-slate-200" aria-live="polite">Mostrando <strong className="text-white">{filteredBoms.length}</strong> de {boms.length} fichas</p>
              {(bomSearch || bomSubareaFilter !== 'ALL' || bomProductFilter !== 'ALL' || bomTypeFilter !== 'ALL' || bomOuncesFilter !== 'ALL') && (
                <Button type="button" variant="outline" onClick={() => { setBomSearch(''); setBomSubareaFilter('ALL'); setBomProductFilter('ALL'); setBomTypeFilter('ALL'); setBomOuncesFilter('ALL'); }} className="min-h-11 border-slate-600 px-4 text-sm font-semibold text-slate-100">
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Tabla de Fichas Técnicas (Full Width) */}
          {loadingBoms ? (
            <p className="p-12 text-center text-slate-400 font-semibold">Cargando catálogo de telas…</p>
          ) : filteredBoms.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold bg-slate-800 rounded-2xl border-2 border-slate-700">
                No se encontraron productos con estos filtros.
            </div>
          ) : (
            <>
            <div className="grid gap-3 xl:hidden">
              {filteredBoms.map((bom: any) => {
                const isFabricRoll = String(bom.product_kind || 'ROLLO_TELA').toUpperCase() === 'ROLLO_TELA';
                return (
                  <article key={bom.id} className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-4 shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold leading-snug text-white">{bom.name}</h3>
                        <p className="mt-1 font-mono text-sm font-semibold text-blue-300">{bom.code}</p>
                      </div>
                      <Badge className="shrink-0 bg-blue-950 text-sm text-blue-100">{bom.product_kind === 'BANDA' ? 'Banda' : bom.product_kind === 'CINTA' ? 'Cinta' : 'Rollo'}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-200">{bom.subarea?.name || 'Subárea pendiente'}{bom.output_color ? ` · ${bom.output_color}` : ''}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/70 p-3 text-sm">
                      <div><span className="block text-xs font-semibold text-slate-400">Especificación</span><span className="font-medium text-slate-100">{[bom.output_width_value ? `${Number(bom.output_width_value)} ${bom.output_width_unit || 'cm'}` : null, bom.ounces_yd2 ? `${Number(bom.ounces_yd2).toFixed(1)} oz/yd²` : null, isFabricRoll ? (bom.fabric_type || 'TUBULAR') : null].filter(Boolean).join(' · ') || 'Pendiente'}</span></div>
                      <div><span className="block text-xs font-semibold text-slate-400">Insumos PTI</span><span className="font-medium text-slate-100">{bom.items?.length || 0}{!bom.items?.length ? ' · Sin consumo' : ' insumos'}</span></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {bom.is_provisional && <Badge className="bg-amber-950 text-sm text-amber-200">Provisional</Badge>}
                      {allowCosts && <Badge className="bg-emerald-950 text-sm text-emerald-200">Índice x{Number(bom.cost_transformation_index || 1).toFixed(4)}</Badge>}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => editBom(bom)} className="min-h-12 border-slate-600 text-sm font-semibold"><Edit2 className="mr-2 h-4 w-4" />Editar ficha</Button>
                      {bom.is_active ? <Button type="button" variant="destructive" onClick={() => window.confirm(`¿Desactivar la especificación ${bom.name}?`) && deactivateMutation.mutate({ kind: 'boms', id: bom.id })} className="min-h-12 text-sm font-semibold">Desactivar</Button> : <span className="flex min-h-12 items-center justify-center rounded-lg border border-slate-600 text-sm text-slate-300">Inactiva</span>}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl xl:block">
              <table className="w-full min-w-[850px] text-left text-sm text-slate-200">
                <thead className="border-b-2 border-slate-700 bg-slate-900 text-xs font-black uppercase text-slate-300">
                  <tr>
                    <th className="p-3.5 pl-5">Código / Tela</th>
                    <th className="p-3.5">Producto / Especificación</th>
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
                    const isFabricRoll = String(bom.product_kind || 'ROLLO_TELA').toUpperCase() === 'ROLLO_TELA';
                    const isHeavy = isFabricRoll && Number(bom.ounces_yd2 || 0) >= 6.5;
                    return (
                      <tr key={bom.id} className="hover:bg-slate-750 transition-colors">
                        <td className="p-3.5 pl-5">
                          <strong className="block font-black text-white text-sm">{bom.name}</strong>
                          <span className="font-mono text-xs font-bold text-blue-400">{bom.code}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className="bg-blue-950 border border-blue-500/30 text-blue-200 font-black text-xs">{bom.product_kind === 'BANDA' ? 'BANDA' : bom.product_kind === 'CINTA' ? 'CINTA' : 'ROLLO DE TELA'}</Badge>
                            <Badge className="bg-slate-900 border border-slate-600 text-slate-200 font-bold text-xs">{bom.subarea?.name || 'Subárea pendiente'}</Badge>
                            {bom.is_provisional && <Badge className="bg-amber-950 border border-amber-500/40 text-amber-200 font-bold text-xs">PROVISIONAL</Badge>}
                          </div>
                          <span className="mt-1 block text-xs text-slate-400">
                            {[bom.output_color, bom.output_width_value ? `${Number(bom.output_width_value)} ${bom.output_width_unit || 'CM'}` : null, bom.output_denier ? `${bom.output_denier} D` : null, bom.ounces_yd2 ? `${Number(bom.ounces_yd2).toFixed(1)} oz/yd²` : null].filter(Boolean).join(' · ') || 'Especificación pendiente'}
                          </span>
                          {bom.product_kind === 'ROLLO_TELA' && <Badge variant={bom.fabric_type === 'PLANA' ? 'outline' : 'default'} className="mt-1 font-bold text-xs">{bom.fabric_type || 'TUBULAR'}</Badge>}
                        </td>
                        <td className="p-3.5">
                          {!isFabricRoll && (bom.output_color || bom.tensile_strength_lb || bom.units_per_pallet) ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-xs text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-600">
                                {bom.output_color || 'Color pendiente'} {bom.tensile_strength_lb ? `· ${Number(bom.tensile_strength_lb)} lb` : ''} {bom.units_per_pallet ? `· ${bom.units_per_pallet}/tarima` : ''}
                              </span>
                          ) : isFabricRoll && bom.tape_color && bom.tape_color !== 'N/A' ? (
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
                          {isFabricRoll ? <><div><span className="text-slate-400 font-sans font-semibold">Trama:</span> {bom.weft_denier || '1800-2000'}D</div><div><span className="text-slate-400 font-sans font-semibold">Urdimbre:</span> {bom.warp_denier || '1800-2000'}D</div></> : <span className="text-slate-500 font-sans">No aplica a este PTI</span>}
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
                          {bom.items?.some((item: any) => !item.required_quantity && !Number(item.consumption_g_per_m)) && <span className="block text-[10px] text-amber-300">Relación de consumo pendiente</span>}
                          {!bom.items?.length && <span className="block text-[10px] text-amber-300">Sin consumo: no disponible para producción</span>}
                        </td>
                        <td className="p-3.5 text-xs text-slate-300 font-medium">
                          <div className="space-y-1.5">
                            {(Array.isArray(bom.allowed_routes) && bom.allowed_routes.length ? bom.allowed_routes : [bom.default_route || []]).map((route: string[], index: number) => {
                              const routeValue = routeStagesToValue(route);
                              const isSuggested = routeValue === routeStagesToValue(bom.default_route);
                              return <div key={`${routeValue}-${index}`} className="flex flex-wrap items-center gap-1.5">
                                <span>{routeValue.replaceAll(',', ' → ')}</span>
                                {isSuggested && <span className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-300">Sugerida</span>}
                              </div>;
                            })}
                          </div>
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
            </>
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
                  Telares y filetas
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Consulta las máquinas, su subárea y la capacidad configurada para cada una.
                </p>
              </div>

              {/* Botón Registrar Telar (Abre Modal) */}
              <Button
                onClick={startNewLoom}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-11 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Registrar telar
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

              <section className="rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-cyan-200">Identidad del PTI de salida</h4>
                    <p className="mt-1 text-[11px] text-slate-400">La subárea limita qué telares pueden producirlo. Marca como provisional los datos ficticios o pendientes de confirmar.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs font-bold text-amber-200">
                    <input type="checkbox" checked={bomDraft.is_provisional} onChange={(e) => setBomDraft({ ...bomDraft, is_provisional: e.target.checked })} />
                    Especificación provisional
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-xs font-bold text-slate-300">SUBÁREA *
                    <select required value={bomDraft.subarea_id ?? ''} onChange={(e) => {
                      const selected = subareas.find((subarea: any) => Number(subarea.id) === Number(e.target.value));
                      const isBand = /banda/i.test(selected?.name || '');
                      const nextKind = isBand ? 'BANDA' : 'ROLLO_TELA';
                      const nextRouteOptions = routeOptionsForKind(nextKind);
                      setBomDraft({
                        ...bomDraft,
                        subarea_id: e.target.value ? Number(e.target.value) : null,
                        product_kind: nextKind,
                        allowed_routes: [],
                        default_route: nextRouteOptions[0]?.value || '',
                      });
                    }} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white">
                      <option value="">Seleccionar subárea…</option>
                      {subareas.map((subarea: any) => <option key={subarea.id} value={subarea.id}>{subarea.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-300">TIPO DE SALIDA *
                    <select required value={bomDraft.product_kind} onChange={(e) => {
                      const nextKind = e.target.value;
                      const nextOptions = routeOptionsForKind(nextKind);
                      setBomDraft({ ...bomDraft, product_kind: nextKind, allowed_routes: [], default_route: nextOptions[0]?.value || '' });
                    }} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white">
                      {/banda/i.test(subareas.find((subarea: any) => Number(subarea.id) === Number(bomDraft.subarea_id))?.name || '')
                        ? <><option value="BANDA">BANDA</option><option value="CINTA">CINTILLA / CINTA</option></>
                        : <option value="ROLLO_TELA">ROLLO DE TELA</option>}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-300">COLOR / VARIANTE
                    <Input value={bomDraft.output_color} onChange={(e) => setBomDraft({ ...bomDraft, output_color: e.target.value })} placeholder="Ej. Blanco, verde óptico" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <label className="text-xs font-bold text-slate-300">ANCHO
                    <Input type="number" min="0" step="0.01" value={bomDraft.output_width_value} onChange={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      setBomDraft({ ...bomDraft, output_width_value: value, target_width_cm: value === '' ? bomDraft.target_width_cm : outputWidthToCm(value, bomDraft.output_width_unit) });
                    }} placeholder="Pendiente" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <label className="text-xs font-bold text-slate-300">UNIDAD DE ANCHO
                    <select value={bomDraft.output_width_unit} onChange={(e) => setBomDraft({ ...bomDraft, output_width_unit: e.target.value, target_width_cm: bomDraft.output_width_value === '' ? bomDraft.target_width_cm : outputWidthToCm(Number(bomDraft.output_width_value), e.target.value) })} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white"><option value="CM">cm</option><option value="PULGADA">pulgadas</option><option value="MM">mm</option></select>
                  </label>
                  <label className="text-xs font-bold text-slate-300">DENIER DE SALIDA
                    <Input type="number" min="0" value={bomDraft.output_denier} onChange={(e) => setBomDraft({ ...bomDraft, output_denier: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Pendiente" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  {bomDraft.product_kind !== 'ROLLO_TELA' && <>
                    <label className="text-xs font-bold text-slate-300">RESISTENCIA (LB)
                      <Input type="number" min="0" step="0.01" value={bomDraft.tensile_strength_lb} onChange={(e) => setBomDraft({ ...bomDraft, tensile_strength_lb: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Pendiente" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                    </label>
                    <label className="text-xs font-bold text-slate-300">UNIDADES POR TARIMA
                      <Input type="number" min="0" step="1" value={bomDraft.units_per_pallet} onChange={(e) => setBomDraft({ ...bomDraft, units_per_pallet: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Pendiente" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                    </label>
                    <label className="text-xs font-bold text-slate-300">EMPAQUE
                      <Input value={bomDraft.packaging_type} onChange={(e) => setBomDraft({ ...bomDraft, packaging_type: e.target.value })} placeholder="Ej. Rollo, caja" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                    </label>
                  </>}
                  <label className="text-xs font-bold text-slate-300">PESO DE REFERENCIA (KG)
                    <Input type="number" min="0" step="0.001" value={bomDraft.output_weight_kg} onChange={(e) => setBomDraft({ ...bomDraft, output_weight_kg: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Pendiente de confirmar" className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                </div>
              </section>

              {/* Especificaciones Técnicas (PDF Página 1) */}
              {bomDraft.product_kind === 'ROLLO_TELA' && (
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
                        let autoCostIndex = 1.0;

                        if (oz === 3.0) {
                          autoTapeColor = 'N/A';
                          autoTapeDenier = 1200;
                          autoWeft = '1200';
                          autoWarp = '1200';
                        } else if (oz === 5.0) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'VERDE / MORADO';
                        } else if (oz === 6.0) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'ROJO';
                        } else if (oz === 6.5) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'ROJO';
                          autoWeft = '2000';
                          autoWarp = '2000';
                        } else if (oz === 7.2) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'AZUL';
                          autoWeft = '2000 - 2300';
                          autoWarp = '2100';
                        } else if (oz === 8.0) {
                          autoTapeColor = bomDraft.fabric_type === 'PLANA' ? 'N/A' : 'AZUL';
                          autoWeft = '2000 - 2300';
                          autoWarp = '2100';
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
                      onChange={(e) => {
                        const nextFabricType = e.target.value as 'TUBULAR' | 'PLANA';
                        const oz = Number(bomDraft.ounces_yd2);
                        const defaultTubularTape =
                          oz === 5.0
                            ? 'VERDE / MORADO'
                            : oz === 6.0 || oz === 6.5
                            ? 'ROJO'
                            : oz === 7.2 || oz === 8.0
                            ? 'AZUL'
                            : 'N/A';
                        setBomDraft({
                          ...bomDraft,
                          fabric_type: nextFabricType,
                          tape_color: nextFabricType === 'PLANA' ? 'N/A' : defaultTubularTape,
                        });
                      }}
                      className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white"
                    >
                      <option value="TUBULAR">TUBULAR</option>
                      <option value="PLANA">PLANA</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-slate-300">
                    CINTA IDENTIFICACIÓN
                    <select
                      value={bomDraft.fabric_type === 'PLANA' ? 'N/A' : bomDraft.tape_color}
                      disabled={bomDraft.fabric_type === 'PLANA'}
                      onChange={(e) => setBomDraft({ ...bomDraft, tape_color: e.target.value })}
                      className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
                    >
                      <option value="N/A">N/A (Sin cinta / Tela Plana)</option>
                      <option value="VERDE / MORADO">VERDE / MORADO (5.0 oz Tubular)</option>
                      <option value="ROJO">ROJO (6.0 y 6.5 oz Tubular)</option>
                      <option value="AZUL">AZUL (7.2 y 8.0 oz Tubular)</option>
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
              )}

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
                      El costo se calcula con el consumo y precio reales de los PTI guardados en la ficha. No se estiman precios ni longitudes por defecto.
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
                    METROS DE REFERENCIA PARA LOS INSUMOS {!bomDraft.is_provisional && bomDraft.items.some((item) => item.pti_product_id !== '') ? '*' : '(PROVISIONAL)'}
                    <Input type="number" min="0.001" step="0.01" value={bomDraft.standard_output_meters} onChange={(e) => {
                      const nextValue = e.target.value === '' ? '' : Number(e.target.value);
                      const previousMeters = Number(bomDraft.standard_output_meters) || 0;
                      const nextMeters = Number(nextValue) || 0;
                      setBomDraft({
                        ...bomDraft,
                        standard_output_meters: nextValue,
                        items: bomDraft.items.map((item) => {
                          const enteredAmount = Number(item.required_quantity) || 0;
                          const existingPerMeter = Number(item.consumption_per_meter) || 0;
                          const perMeter = enteredAmount > 0 && previousMeters > 0 ? enteredAmount / previousMeters : existingPerMeter;
                          return perMeter > 0 && nextMeters > 0
                            ? { ...item, required_quantity: Number((perMeter * nextMeters).toFixed(6)) }
                            : item;
                        }),
                      });
                    }} placeholder="Ej. 1,000 m" required={!bomDraft.is_provisional && bomDraft.items.some((item) => item.pti_product_id !== '')} className="mt-1 bg-slate-900 border-slate-700 text-white" />
                  </label>
                  <p className="sm:col-span-2 self-center text-[11px] leading-relaxed text-slate-300">Escribe la longitud base que usarás para definir los insumos, por ejemplo 1,000 metros. Abajo indicarás cuánto PTI consume cada posición para esa longitud; el sistema calculará proporcionalmente otras producciones.</p>
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
                <fieldset className="col-span-2 space-y-2 rounded-xl border border-blue-500/30 bg-blue-950/15 p-3">
                  <legend className="px-1 text-xs font-bold text-slate-200">RUTAS AUTORIZADAS DEL QR *</legend>
                  <p className="text-[11px] text-slate-400">Marca una o varias rutas permitidas para este PTI. En el registro del rollo solo se mostrarán las seleccionadas.</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {configuredRouteOptions.map((option) => {
                      const checked = bomDraft.allowed_routes.includes(option.value);
                      return (
                        <div key={option.value} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${checked ? 'border-blue-400 bg-blue-900/30 text-white' : 'border-slate-700 bg-slate-900/60 text-slate-300'}`}>
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextRoutes = event.target.checked
                                  ? [...new Set([...bomDraft.allowed_routes, option.value])]
                                  : bomDraft.allowed_routes.filter((route) => route !== option.value);
                                const nextDefault = nextRoutes.includes(bomDraft.default_route)
                                  ? bomDraft.default_route
                                  : (nextRoutes[0] || '');
                                setBomDraft({ ...bomDraft, allowed_routes: nextRoutes, default_route: nextDefault });
                              }}
                              className="h-4 w-4 accent-blue-500"
                            />
                            <span>{option.label}</span>
                          </label>
                          <label className={`flex shrink-0 items-center gap-1.5 text-[10px] ${checked ? 'cursor-pointer text-slate-300' : 'cursor-not-allowed text-slate-500'}`}>
                            <input
                              type="radio"
                              name="default-bom-route"
                              checked={bomDraft.default_route === option.value}
                              disabled={!checked}
                              onChange={() => setBomDraft({ ...bomDraft, default_route: option.value })}
                              aria-label={`Ruta sugerida: ${option.label}`}
                              className="h-4 w-4 accent-emerald-500"
                            />
                            Sugerida
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              {/* Componentes PTI de Extrusión Requeridos */}
              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white">
                      Bobinas requeridas por posición
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Selecciona cada PTI de Extrusión, indica dónde se monta y cuánto se consume para los metros de referencia.
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
                    className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4"
                  >
                    <div className="flex min-h-10 items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-200">
                        Bobina de Extrusión #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setBomDraft({ ...bomDraft, items: bomDraft.items.filter((_, i) => i !== index) })
                        }
                        aria-label={`Eliminar bobina de Extrusión ${index + 1}`}
                        title="Eliminar esta bobina"
                        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-red-400/40 px-3 text-sm font-bold text-red-200 transition-colors hover:border-red-300 hover:bg-red-950/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      >
                        <X size={18} aria-hidden="true" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                    <div className="sm:col-span-2 space-y-1">
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
                        disabled={loadingPtis || ptisError || compatiblePtis.length === 0}
                        className="h-11 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="">
                          {loadingPtis ? 'Cargando PTI de Extrusión…' : ptisError ? 'No se pudo cargar el catálogo' : compatiblePtis.length === 0 ? 'No hay PTI activos compatibles' : 'Seleccione un PTI de Extrusión'}
                        </option>
                        {compatiblePtis.map((pti: any) => (
                          <option key={pti.id} value={pti.id}>
                            {pti.code} — {pti.name}{pti.color ? ` · ${pti.color}` : ''}{pti.denier ? ` · ${pti.denier} D` : ''}{allowCosts && pti.unit_price != null ? ` ($${pti.unit_price}/kg)` : ''}
                          </option>
                        ))}
                      </select>
                      {ptisError ? (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200" role="alert">
                          <span>No se pudo consultar el catálogo de PTI de Extrusión.</span>
                          <Button type="button" variant="outline" onClick={() => refetchPtis()} className="min-h-10 border-red-400/50 px-3 text-sm text-red-100">Reintentar</Button>
                        </div>
                      ) : !loadingPtis && !compatiblePtis.length ? (
                        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
                          {activePtis.length === 0
                            ? 'No hay PTI activos en el catálogo de Extrusión. Verifique que existan y estén activos.'
                            : `No hay PTI activos compatibles con ${isBandSubarea ? 'Telares Banda (Extrusora 1)' : 'Telares Rollo (otras extrusoras)'}. Revise la subárea seleccionada y las fichas de Extrusión.`}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Posición en el telar</label>
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
                        <option value="URDIMBRE">Urdimbre</option>
                        <option value="TRAMA">Trama</option>
                        <option value="AMBOS">Urdimbre y trama</option>
                        <option value="REFUERZO">Cinta / refuerzo</option>
                      </select>
                    </div>

                    </div>
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-700 pt-3 sm:grid-cols-3">
                      <label className="block text-xs font-bold text-slate-300 sm:col-span-2">
                        Cantidad consumida para {Number(bomDraft.standard_output_meters) > 0 ? `${Number(bomDraft.standard_output_meters).toLocaleString('es-MX')} m` : 'los metros de referencia'}
                        <Input
                          type="number"
                          min="0.000001"
                          step="0.001"
                          value={item.required_quantity === '' && Number(item.consumption_per_meter) > 0 && Number(bomDraft.standard_output_meters) > 0
                            ? Number((Number(item.consumption_per_meter) * Number(bomDraft.standard_output_meters)).toFixed(6))
                            : item.required_quantity}
                          onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_quantity: e.target.value === '' ? '' : Number(e.target.value), consumption_per_meter: 0, consumption_g_per_m: 0 } : row) })}
                          placeholder={bomDraft.is_provisional ? 'Pendiente de confirmar' : 'Cantidad requerida'}
                          className="mt-1 h-11 bg-slate-800 border-slate-700 text-base font-bold text-white"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-300">
                        Unidad de consumo
                        <select
                          value={item.required_unit}
                          onChange={(e) => setBomDraft({ ...bomDraft, items: bomDraft.items.map((row, i) => i === index ? { ...row, required_unit: e.target.value as 'KG' | 'PIEZAS', consumption_per_meter_unit: e.target.value as 'KG' | 'PIEZAS' } : row) })}
                          className="mt-1 h-11 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm font-bold text-white"
                        >
                          <option value="KG">Kilogramos (kg)</option>
                          <option value="PIEZAS">Bobinas (piezas)</option>
                        </select>
                      </label>
                      <div className="sm:col-span-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs leading-relaxed text-cyan-100" aria-live="polite">
                        {Number(item.required_quantity) > 0 && Number(bomDraft.standard_output_meters) > 0
                          ? `Equivale a ${(Number(item.required_quantity) / Number(bomDraft.standard_output_meters)).toLocaleString('es-MX', { maximumFractionDigits: 6 })} ${item.required_unit === 'KG' ? 'kg' : 'bobinas'} por metro.`
                          : bomDraft.is_provisional
                          ? 'Puedes dejar la cantidad pendiente mientras confirmas el dato con Planta. La ficha provisional no estará disponible para producir.'
                          : 'Captura la cantidad del PTI para los metros de referencia; se necesita para validar el WIP antes de producir.'}
                      </div>
                    </div>
                    {Number(item.consumption_per_meter) > 0 && !(Number(item.required_quantity) > 0) && (
                      <p className="text-xs text-amber-200">Consumo previamente guardado: {Number(item.consumption_per_meter).toLocaleString('es-MX', { maximumFractionDigits: 6 })} {item.consumption_per_meter_unit === 'KG' ? 'kg' : 'bobinas'} por metro. Indica los metros de referencia para mostrarlo como cantidad total.</p>
                    )}
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
                  CAPACIDAD INDIVIDUAL DE WIP / FILETA (BOBINAS) *
                  <Input
                    type="number"
                    min="1"
                    value={loomDraft.creel_capacity_spools ?? ''}
                    onChange={(e) => setLoomDraft({ ...loomDraft, creel_capacity_spools: e.target.value === '' ? null : Number(e.target.value) })}
                    required
                    className="mt-1 bg-slate-800 border-amber-500/50 font-mono font-bold text-amber-400 text-sm"
                  />
                </label>
                <p className="text-[11px] text-slate-400">
                  * La capacidad se guarda por telar. Tejido Tela usa 1,800 bobinas; para cada telar Banda captura la capacidad propia confirmada.
                </p>
              </div>

              {/* Subárea */}
              <label className="block text-xs font-bold text-slate-300">
                SUBÁREA / LÍNEA
                <select
                  value={loomDraft.subarea_id || ''}
                  onChange={(e) => {
                    const nextSubareaId = e.target.value ? Number(e.target.value) : null;
                    const nextSubarea = subareas.find((item: any) => Number(item.id) === nextSubareaId);
                    const changedSubarea = Number(loomDraft.subarea_id || 0) !== Number(nextSubareaId || 0);
                    const isBand = /banda/i.test(String(nextSubarea?.name || ''));
                    setLoomDraft({
                      ...loomDraft,
                      subarea_id: nextSubareaId,
                      creel_capacity_spools: changedSubarea ? (isBand ? null : 1800) : loomDraft.creel_capacity_spools,
                    });
                  }}
                  required
                  className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-white"
                >
                  <option value="">Selecciona subárea…</option>
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
