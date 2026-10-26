import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Airplay,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  Package,
  Sliders,
  DollarSign,
  Filter,
  Check,
  X,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { canViewCosts } from '../../../utils/authHelpers';
import { globoApi } from '../services/globoApi';
import { telaresApi } from '../../telares/services/telaresApi';
import axiosClient from '../../../api/axiosClient';
import { GloboSpecification } from '../types/globo.types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';

interface MaterialItemDraft {
  material_id: number | '';
  quantity: number | '';
  unit: string;
  notes: string;
}

const emptySpecificationForm = () => ({
  code: '',
  name: '',
  description: '',
  process_type: '' as '' | 'EXPANSION' | 'FUELLE' | 'CALIBRADO' | 'REFUERZO' | 'OTRO',
  custom_process_type: '',
  target_width_cm: '' as number | '',
  target_grammage_g_per_m: '' as number | '',
  output_product_name: '',
  expected_output_quantity: '' as number | '',
  expected_output_unit: '',
  standard_output_meters: '' as number | '',
  standard_waste_percentage: '' as number | '',
  cost_transformation_index: '' as number | '',
  loom_roll_requirements: {
    allowed_bom_ids: [] as number[],
    min_width_cm: '' as number | '',
    max_width_cm: '' as number | '',
    fabric_type: '' as '' | 'TUBULAR' | 'PLANA' | 'CUALQUIERA',
    meters_per_output: '' as number | '',
    notes: '',
  },
  materials: [] as MaterialItemDraft[],
});

export const GloboCatalogPage: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const allowCosts = canViewCosts(user);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecId, setEditingSpecId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptySpecificationForm());

  // Queries
  const { data: specs = [], isLoading, refetch } = useQuery({
    queryKey: ['globo-specifications'],
    queryFn: () => globoApi.getSpecifications(),
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['telares-boms'],
    queryFn: () => telaresApi.getBoms(),
  });

  const { data: warehouseMaterials = [] } = useQuery({
    queryKey: ['warehouse-materials-list'],
    queryFn: async () => {
      const res = await axiosClient.get('/materials?limit=250');
      return res.data?.data || res.data || [];
    },
  });
  const recipeMaterials = useMemo(() => warehouseMaterials.filter((mat: any) => {
    if (mat.status !== 'ACTIVE' || mat.is_active === false) return false;
    const unitCode = String(mat.base_unit?.code || mat.unit?.code || '').toUpperCase();
    const unitName = String(mat.base_unit?.name || mat.unit?.name || '').toUpperCase();
    return unitCode === 'KG' || ['KILOGRAMO', 'KILOGRAMOS'].includes(unitName);
  }), [warehouseMaterials]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => globoApi.createSpecification(payload),
    onSuccess: () => {
      toast.success('Especificación de Globo guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['globo-specifications'] });
      setIsModalOpen(false);
      setEditingSpecId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar especificación');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => globoApi.updateSpecification(id, payload),
    onSuccess: () => {
      toast.success('Especificación de Globo actualizada');
      queryClient.invalidateQueries({ queryKey: ['globo-specifications'] });
      setIsModalOpen(false);
      setEditingSpecId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al actualizar especificación');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => globoApi.toggleSpecification(id),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['globo-specifications'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al cambiar estado');
    },
  });

  const handleOpenCreate = () => {
    setEditingSpecId(null);
    setFormData(emptySpecificationForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (spec: GloboSpecification) => {
    setEditingSpecId(spec.id);
    setFormData({
      code: spec.code,
      name: spec.name,
      description: spec.description || '',
      process_type: ['EXPANSION', 'FUELLE', 'CALIBRADO', 'REFUERZO'].includes(spec.process_type) ? spec.process_type : 'OTRO',
      custom_process_type: ['EXPANSION', 'FUELLE', 'CALIBRADO', 'REFUERZO'].includes(spec.process_type) ? '' : String(spec.process_type),
      target_width_cm: Number(spec.target_width_cm),
      target_grammage_g_per_m: Number(spec.target_grammage_g_per_m),
      output_product_name: spec.output_product_name || '',
      expected_output_quantity: Number(spec.expected_output_quantity),
      expected_output_unit: spec.expected_output_unit || '',
      standard_output_meters: Number(spec.standard_output_meters),
      standard_waste_percentage: Number(spec.standard_waste_percentage),
      cost_transformation_index: Number(spec.cost_transformation_index),
      loom_roll_requirements: {
        allowed_bom_ids: spec.loom_roll_requirements?.allowed_bom_ids || [],
        min_width_cm: Number(spec.loom_roll_requirements?.min_width_cm),
        max_width_cm: Number(spec.loom_roll_requirements?.max_width_cm),
        fabric_type: spec.loom_roll_requirements?.fabric_type || '',
        meters_per_output: Number(spec.loom_roll_requirements?.meters_per_output),
        notes: spec.loom_roll_requirements?.notes || '',
      },
      materials: (spec.materials || []).map((m) => ({
        material_id: m.material_id,
        quantity: Number(m.quantity || 0),
        unit: m.unit || 'KG',
        notes: m.notes || '',
      })),
    });
    setIsModalOpen(true);
  };

  const handleAddMaterialRow = () => {
    setFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, { material_id: '', quantity: '', unit: 'KG', notes: '' }],
    }));
  };

  const handleRemoveMaterialRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.materials];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, materials: updated };
    });
  };

  const handleBomToggle = (bomId: number) => {
    setFormData((prev) => {
      const current = prev.loom_roll_requirements.allowed_bom_ids || [];
      const updated = current.includes(bomId)
        ? current.filter((id) => id !== bomId)
        : [...current, bomId];
      return {
        ...prev,
        loom_roll_requirements: {
          ...prev.loom_roll_requirements,
          allowed_bom_ids: updated,
        },
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partialMaterial = formData.materials.some((m) => !m.material_id || !Number(m.quantity) || Number(m.quantity) <= 0);
    if (!formData.code.trim() || !formData.name.trim() || !formData.process_type || (formData.process_type === 'OTRO' && !formData.custom_process_type.trim()) || !formData.output_product_name.trim() || !formData.expected_output_unit.trim() ||
        !formData.loom_roll_requirements.allowed_bom_ids.length || !formData.loom_roll_requirements.fabric_type || partialMaterial) {
      toast.error('Completa los datos obligatorios, selecciona al menos un BOM compatible y termina o elimina cada línea de insumo.');
      return;
    }
    const positiveFields = [formData.target_width_cm, formData.target_grammage_g_per_m, formData.expected_output_quantity, formData.standard_output_meters,
      formData.loom_roll_requirements.min_width_cm, formData.loom_roll_requirements.max_width_cm];
    if (positiveFields.some((value) => !Number.isFinite(Number(value)) || Number(value) <= 0) || formData.standard_waste_percentage === '' || !Number.isFinite(Number(formData.standard_waste_percentage)) || Number(formData.standard_waste_percentage) < 0 ||
        Number(formData.loom_roll_requirements.min_width_cm) > Number(formData.loom_roll_requirements.max_width_cm) || (allowCosts && Number(formData.cost_transformation_index) <= 0)) {
      toast.error('Revisa anchos, gramajes, metros, cantidad estándar, merma y factor de costo.');
      return;
    }

    const payload = {
      ...formData,
      process_type: formData.process_type === 'OTRO' ? formData.custom_process_type.trim().toUpperCase() : formData.process_type,
      target_width_cm: Number(formData.target_width_cm),
      target_grammage_g_per_m: Number(formData.target_grammage_g_per_m),
      expected_output_quantity: Number(formData.expected_output_quantity),
      standard_output_meters: Number(formData.standard_output_meters),
      standard_waste_percentage: Number(formData.standard_waste_percentage),
      cost_transformation_index: allowCosts ? Number(formData.cost_transformation_index) : 1,
      loom_roll_requirements: { ...formData.loom_roll_requirements, min_width_cm: Number(formData.loom_roll_requirements.min_width_cm), max_width_cm: Number(formData.loom_roll_requirements.max_width_cm), meters_per_output: Number(formData.standard_output_meters) },
      materials: formData.materials
        .map((m) => ({
          material_id: Number(m.material_id),
          quantity: Number(m.quantity),
          unit: 'KG',
          notes: m.notes,
        })),
    };

    if (editingSpecId) {
      updateMutation.mutate({ id: editingSpecId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtrado de especificaciones
  const filteredSpecs = useMemo(() => {
    return specs.filter((s) => {
      if (filterType !== 'ALL' && s.process_type !== filterType) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = s.code?.toLowerCase().includes(term);
        const matchName = s.name?.toLowerCase().includes(term);
        const matchOutput = s.output_product_name?.toLowerCase().includes(term);
        return matchCode || matchName || matchOutput;
      }
      return true;
    });
  }, [specs, filterType, searchTerm]);

  return (
    <div className={`p-4 md:p-6 min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-500/20 text-orange-500 rounded-lg">
              <Airplay className="h-6 w-6" />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Catálogo de Fórmulas y Especificaciones de Globo
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Definición de rollos de telares permitidos, insumos de almacén y rendimiento para producto intermedio (PTI) Globo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreate}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 flex items-center gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Nueva Especificación Globo
          </Button>
        </div>
      </div>

      {/* KPI Cards / Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fórmulas Globo</p>
          <p className="text-2xl font-black mt-1 text-orange-500">{specs.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activas en Planta</p>
          <p className="text-2xl font-black mt-1 text-emerald-500">{specs.filter((s) => s.is_active).length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipos Expansión</p>
          <p className="text-2xl font-black mt-1 text-blue-500">{specs.filter((s) => s.process_type === 'EXPANSION').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipos Fuelle</p>
          <p className="text-2xl font-black mt-1 text-purple-500">{specs.filter((s) => s.process_type === 'FUELLE').length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-4 justify-between items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre o PTI..."
            className="pl-9 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['ALL', 'EXPANSION', 'FUELLE', 'CALIBRADO'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === t
                  ? 'bg-orange-600 text-white shadow'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Todos los Tipos' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Specifications */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Cargando catálogo de Globo...</div>
      ) : filteredSpecs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border rounded-xl bg-white/5">
          No se encontraron especificaciones de Globo con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSpecs.map((spec) => (
            <div
              key={spec.id}
              className={`p-5 rounded-xl border transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-orange-500/50' : 'bg-white border-slate-200 hover:border-orange-400'
              } shadow-sm`}
            >
              {/* Card Top */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm px-2.5 py-0.5 rounded font-black bg-orange-500/10 text-orange-500 border border-orange-500/30">
                      {spec.code}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        spec.process_type === 'EXPANSION'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : spec.process_type === 'FUELLE'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {spec.process_type}
                    </span>
                    {!spec.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                        INACTIVO
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-slate-100">{spec.name}</h3>
                  {spec.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{spec.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(spec)}
                    className="h-8 px-2.5 text-xs font-semibold"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate(spec.id)}
                    className={`h-8 px-2.5 text-xs font-semibold ${
                      spec.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {spec.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>

              {/* Technical Target Strip */}
              <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs">
                <div>
                  <span className="text-slate-500 block">Producto Salida:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {spec.output_product_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ancho / Gramaje:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {spec.target_width_cm} cm | {spec.target_grammage_g_per_m} g/m
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lote PTI:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {spec.standard_output_meters} m ({spec.expected_output_quantity} {spec.expected_output_unit})
                  </span>
                </div>
              </div>

              {/* Requisitos de Rollos de Telares */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1 text-orange-500">
                    <Layers className="h-3.5 w-3.5" />
                    Rollos de Telares Admitidos:
                  </span>
                  <span>
                    {spec.loom_roll_requirements?.fabric_type || 'Tipo sin definir'} · {spec.loom_roll_requirements?.min_width_cm ?? '—'}–{spec.loom_roll_requirements?.max_width_cm ?? '—'} cm
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {spec.allowed_boms && spec.allowed_boms.length > 0 ? (
                    spec.allowed_boms.map((bom) => (
                      <span
                        key={bom.id}
                        className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                      >
                        {bom.code} ({bom.target_width_cm}cm)
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Cualquier rollo tubular compatible</span>
                  )}
                </div>
              </div>

              {/* Materiales de Almacén Requeridos */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1 text-xs font-bold text-purple-500 mb-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Insumos de Almacén Requeridos (por Rollo PTI):
                </span>

                <div className="space-y-1">
                  {spec.materials && spec.materials.length > 0 ? (
                    spec.materials.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-xs p-1.5 rounded bg-purple-500/5 border border-purple-500/20"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {m.material?.name || `Material #${m.material_id}`}
                        </span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {m.quantity} {m.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No requiere insumos adicionales de almacén</span>
                  )}
                </div>
              </div>

              {/* Bottom strip: Waste and Cost Index */}
              <div className="flex justify-between items-center mt-3 pt-2 text-[11px] text-slate-500">
                <span>Merma Estándar: <strong className="text-amber-500">{spec.standard_waste_percentage}%</strong></span>
                {allowCosts && (
                  <span className="font-mono text-emerald-500">
                    Índice Transf: <strong>x{spec.cost_transformation_index}</strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Especificación */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div
              className={`relative w-full max-w-3xl my-8 p-6 rounded-2xl border shadow-2xl ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Airplay className="h-6 w-6 text-orange-500" />
                  <h2 className="text-xl font-black">
                    {editingSpecId ? 'Editar Especificación de Globo' : 'Nueva Especificación / Receta de Globo'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* 1. Datos Principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Código Único *</label>
                    <Input
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ej. GLO-001"
                      className="font-mono font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Nombre de la Fórmula *</label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre de la receta"
                    />
                  </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Tipo de Proceso *</label>
                    <select
                        required
                      value={formData.process_type}
                      onChange={(e: any) => setFormData({ ...formData, process_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border text-sm font-semibold bg-transparent"
                    >
                      <option value="">Selecciona tipo</option>
                      <option value="EXPANSION">EXPANSIÓN</option>
                      <option value="FUELLE">FUELLE</option>
                      <option value="CALIBRADO">CALIBRADO</option>
                      <option value="REFUERZO">REFUERZO</option>
                      <option value="OTRO">OTRO / PERSONALIZADO</option>
                    </select>
                  </div>
                  {formData.process_type === 'OTRO' && (
                    <div className="md:col-span-3">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Tipo personalizado *</label>
                      <Input required maxLength={50} value={formData.custom_process_type} onChange={(e) => setFormData({ ...formData, custom_process_type: e.target.value })} placeholder="Escribe el tipo de transformación" />
                    </div>
                  )}
                  <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Ancho de salida (cm) *</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.1"
                      required
                      value={formData.target_width_cm}
                      onChange={(e) => setFormData({ ...formData, target_width_cm: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Gramaje de salida (g/m) *</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.1"
                      required
                      value={formData.target_grammage_g_per_m}
                      onChange={(e) => setFormData({ ...formData, target_grammage_g_per_m: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Merma estándar (%) *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      value={formData.standard_waste_percentage}
                      onChange={(e) => setFormData({ ...formData, standard_waste_percentage: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Descripción / notas de proceso</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      placeholder="Instrucciones de preparación, acabado o control"
                    />
                  </div>

                {/* 2. Definición de Rendimiento / PTI */}
                <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
                  <h4 className="text-xs font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Definición de Salida (PTI Globo)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Producto de salida *</label>
                      <Input
                        required
                        value={formData.output_product_name}
                        onChange={(e) => setFormData({ ...formData, output_product_name: e.target.value })}
                        placeholder="Nombre del producto transformado"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Metros estándar de salida *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={formData.standard_output_meters}
                        onChange={(e) => setFormData({ ...formData, standard_output_meters: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Cantidad de salida estándar *</label>
                      <Input type="number" min="0.01" step="0.01" required value={formData.expected_output_quantity} onChange={(e) => setFormData({ ...formData, expected_output_quantity: e.target.value === '' ? '' : Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Unidad de salida *</label>
                      <Input required value={formData.expected_output_unit} onChange={(e) => setFormData({ ...formData, expected_output_unit: e.target.value.toUpperCase() })} placeholder="ROLLO, KG, etc." />
                    </div>
                  </div>
                  {allowCosts && (
                    <div className="w-full md:w-1/3">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Factor Costo Transformación</label>
                      <Input
                        type="number"
                        min="0.0001"
                        step="0.01"
                        required
                        value={formData.cost_transformation_index}
                        onChange={(e) => setFormData({ ...formData, cost_transformation_index: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Requisitos de Rollos de Telares */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                  <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    Rollos de Telares Permitidos / Requeridos
                  </h4>
                  <p className="text-xs text-slate-400">
                    Selecciona los BOM de Telares compatibles. Sus onzas, tipo de tela, denier y cinta se consultan desde el catálogo BOM.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-black/20 rounded-lg">
                    {boms.filter((bom: any) => bom.is_active !== false).map((bom: any) => {
                      const isSelected = formData.loom_roll_requirements.allowed_bom_ids?.includes(bom.id);
                      return (
                        <button
                          key={bom.id}
                          type="button"
                          onClick={() => handleBomToggle(bom.id)}
                          aria-pressed={Boolean(isSelected)}
                          className={`text-left p-2 rounded border text-xs transition-colors flex items-center justify-between min-h-16 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 font-bold'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <span className="min-w-0 pr-1">
                            <span className="block truncate">{bom.code} · {bom.name}</span>
                            <span className="block text-[10px] opacity-80">{bom.ounces_yd2 ? `${bom.ounces_yd2} oz/yd² · ` : ''}{bom.fabric_type || 'Tipo no definido'} · {bom.target_width_cm} cm</span>
                            <span className="block text-[10px] opacity-80">Trama {bom.weft_denier || '—'}D · Urdimbre {bom.warp_denier || '—'}D</span>
                            <span className="block text-[10px] opacity-80">Cinta {bom.tape_color || '—'} · {bom.tape_denier || '—'}D / {bom.tape_width_mm || '—'} mm</span>
                            {bom.general_considerations && <span className="block text-[10px] opacity-80 line-clamp-2">{bom.general_considerations}</span>}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Ancho mínimo de entrada (cm) *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.5"
                        required
                        value={formData.loom_roll_requirements.min_width_cm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            loom_roll_requirements: {
                              ...formData.loom_roll_requirements,
                              min_width_cm: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Ancho máximo de entrada (cm) *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.5"
                        required
                        value={formData.loom_roll_requirements.max_width_cm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            loom_roll_requirements: {
                              ...formData.loom_roll_requirements,
                              max_width_cm: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Tipo de tela de entrada *</label>
                      <select required value={formData.loom_roll_requirements.fabric_type} onChange={(e) => setFormData({ ...formData, loom_roll_requirements: { ...formData.loom_roll_requirements, fabric_type: e.target.value as any } })} className="w-full h-10 px-3 rounded-md border text-sm font-semibold bg-transparent">
                        <option value="">Selecciona</option><option value="TUBULAR">Tubular</option><option value="PLANA">Plana</option><option value="CUALQUIERA">Cualquiera</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Notas / restricciones de entrada</label>
                    <Input value={formData.loom_roll_requirements.notes} onChange={(e) => setFormData({ ...formData, loom_roll_requirements: { ...formData.loom_roll_requirements, notes: e.target.value } })} placeholder="Restricciones adicionales para recibir el rollo" />
                  </div>
                </div>

                {/* 4. Insumos de Almacén Requeridos */}
                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4" />
                      Insumos de Almacén Requeridos (receta para metros estándar)
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddMaterialRow}
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar Insumo
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">Registra el KG de cada insumo necesario para los metros estándar de salida definidos arriba.</p>

                  {formData.materials.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No se han especificado insumos de almacén para esta fórmula.</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.materials.map((row, index) => (
                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_8rem_2rem] gap-2 items-center bg-black/20 p-2 rounded-lg">
                          <select
                            required
                            value={row.material_id}
                            onChange={(e) => handleMaterialChange(index, 'material_id', e.target.value ? Number(e.target.value) : '')}
                            className="flex-1 h-9 px-2 rounded border text-xs bg-slate-800 text-slate-200"
                          >
                            <option value="">-- Seleccionar Insumo de Almacén --</option>
                            {recipeMaterials.map((mat: any) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} ({mat.internal_code}) · {mat.base_unit?.code || mat.base_unit?.name || 'KG'}
                              </option>
                            ))}
                          </select>
                          {recipeMaterials.length === 0 && <p className="col-span-3 text-xs text-amber-300">No hay materiales activos con unidad base KG en el catálogo de Almacén.</p>}

                          <div>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.01"
                              required
                              aria-label={`Consumo de ${warehouseMaterials.find((mat: any) => mat.id === Number(row.material_id))?.name || `insumo ${index + 1}`} en kg por ${formData.standard_output_meters || 'metros estándar'} m de salida`}
                              placeholder="KG"
                              value={row.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              className="h-9 text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(index)}
                            className="p-1.5 text-red-400 hover:text-red-300 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="col-span-3">
                            <Input placeholder="Nota / especificación opcional" aria-label={`Nota del insumo ${index + 1}`} value={row.notes} onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)} className="h-9 text-xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar Especificación'}
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
export default GloboCatalogPage;
