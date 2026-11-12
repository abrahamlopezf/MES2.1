import React, { useState, useMemo, useEffect } from 'react';
import CollapsibleFilterPanel from '@/components/shared/CollapsibleFilterPanel';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Package,
  Sliders,
  DollarSign,
  Filter,
  Check,
  X,
  Airplay,
  ShieldCheck,
} from '@/design-system/components/Icon/googleIconCompat';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { canViewCosts, getUserAreaCode, isAdminUser, isAreaAdminUser, isSupervisorUser } from '../../../utils/authHelpers';
import { laminadoApi } from '../services/laminadoApi';
import { telaresApi } from '../../telares/services/telaresApi';
import axiosClient from '../../../api/axiosClient';
import { LaminadoSpecification } from '../types/laminado.types';
import { groupIdenticalRecipeLines } from '../../../shared/utils/groupIdenticalRecipeLines';
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
  output_pti_code: '',
  name: '',
  description: '',
  lamination_type: '' as '' | 'EXTRUSION_COATING' | 'MONOCAPA' | 'BICAPA' | 'BOPP_FILM' | 'PAPEL_KRAFT' | 'OTRO',
  custom_lamination_type: '',
  target_width_cm: '' as number | '',
  coating_grammage_g_per_m2: '' as number | '',
  output_product_name: '',
  expected_output_quantity: '' as number | '',
  expected_output_unit: '',
  standard_output_meters: '' as number | '',
  standard_waste_percentage: '' as number | '',
  cost_transformation_index: '' as number | '',
  loom_roll_requirements: {
    allowed_bom_ids: [] as number[],
    accepted_input_stages: [] as string[],
    accepts_from_globo: false,
    min_width_cm: '' as number | '',
    max_width_cm: '' as number | '',
    fabric_type: '' as '' | 'TUBULAR' | 'PLANA' | 'CUALQUIERA',
    meters_per_output: '' as number | '',
    notes: '',
  },
  materials: [] as MaterialItemDraft[],
});

export const LaminadoCatalogPage: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const allowCosts = canViewCosts(user);
  const canManageCatalog = isAdminUser(user) || (getUserAreaCode(user) === 'LAMINADO' && (isAreaAdminUser(user) || isSupervisorUser(user)));
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecId, setEditingSpecId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptySpecificationForm());

  // Queries
  const { data: specs = [], isLoading, isError: specsError, refetch: refetchSpecs } = useQuery({
    queryKey: ['laminado-specifications'],
    queryFn: () => laminadoApi.getSpecifications(),
  });

  const { data: boms = [], isError: bomsError, refetch: refetchBoms } = useQuery({
    queryKey: ['telares-boms'],
    queryFn: () => telaresApi.getBoms(),
  });

  const { data: warehouseMaterials = [], isError: materialsError, refetch: refetchMaterials } = useQuery({
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
    mutationFn: (payload: any) => laminadoApi.createSpecification(payload),
    onSuccess: () => {
      toast.success('Especificación de Laminado guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['laminado-specifications'] });
      setIsModalOpen(false);
      setEditingSpecId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar especificación');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => laminadoApi.updateSpecification(id, payload),
    onSuccess: () => {
      toast.success('Especificación de Laminado actualizada');
      queryClient.invalidateQueries({ queryKey: ['laminado-specifications'] });
      setIsModalOpen(false);
      setEditingSpecId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al actualizar especificación');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => laminadoApi.toggleSpecification(id),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['laminado-specifications'] });
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

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  const handleOpenEdit = (spec: LaminadoSpecification) => {
    setEditingSpecId(spec.id);
    setFormData({
      code: spec.code,
      output_pti_code: spec.output_pti_code || '',
      name: spec.name,
      description: spec.description || '',
      lamination_type: ['EXTRUSION_COATING', 'MONOCAPA', 'BICAPA', 'BOPP_FILM', 'PAPEL_KRAFT'].includes(spec.lamination_type) ? spec.lamination_type : 'OTRO',
      custom_lamination_type: ['EXTRUSION_COATING', 'MONOCAPA', 'BICAPA', 'BOPP_FILM', 'PAPEL_KRAFT'].includes(spec.lamination_type) ? '' : String(spec.lamination_type),
      target_width_cm: spec.target_width_cm == null ? '' : Number(spec.target_width_cm),
      coating_grammage_g_per_m2: spec.coating_grammage_g_per_m2 == null ? '' : Number(spec.coating_grammage_g_per_m2),
      output_product_name: spec.output_product_name || '',
      expected_output_quantity: spec.expected_output_quantity == null ? '' : Number(spec.expected_output_quantity),
      expected_output_unit: spec.expected_output_unit || '',
      standard_output_meters: spec.standard_output_meters == null ? '' : Number(spec.standard_output_meters),
      standard_waste_percentage: spec.standard_waste_percentage == null ? '' : Number(spec.standard_waste_percentage),
      cost_transformation_index: spec.cost_transformation_index == null ? '' : Number(spec.cost_transformation_index),
      loom_roll_requirements: {
        allowed_bom_ids: spec.loom_roll_requirements?.allowed_bom_ids || [],
        accepts_from_globo: spec.loom_roll_requirements?.accepts_from_globo ?? true,
        accepted_input_stages: spec.loom_roll_requirements?.accepted_input_stages || ['TELARES', ...((spec.loom_roll_requirements?.accepts_from_globo ?? true) ? ['GLOBO'] : [])],
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
    if (!formData.code.trim() || !formData.name.trim() || !formData.output_pti_code.trim() || !formData.output_product_name.trim() || partialMaterial) {
      toast.error('Indica el código y nombre de la ficha y el código y nombre del PTI. Completa o elimina cada línea de insumo iniciada.');
      return;
    }
    const payload = {
      ...formData,
      lamination_type: formData.lamination_type === 'OTRO' ? formData.custom_lamination_type.trim().toUpperCase() : formData.lamination_type || null,
      target_width_cm: formData.target_width_cm === '' ? null : Number(formData.target_width_cm),
      coating_grammage_g_per_m2: formData.coating_grammage_g_per_m2 === '' ? null : Number(formData.coating_grammage_g_per_m2),
      expected_output_quantity: formData.expected_output_quantity === '' ? null : Number(formData.expected_output_quantity),
      expected_output_unit: formData.expected_output_unit || null,
      standard_output_meters: formData.standard_output_meters === '' ? null : Number(formData.standard_output_meters),
      standard_waste_percentage: formData.standard_waste_percentage === '' ? null : Number(formData.standard_waste_percentage),
      cost_transformation_index: allowCosts && formData.cost_transformation_index !== '' ? Number(formData.cost_transformation_index) : null,
      loom_roll_requirements: { ...formData.loom_roll_requirements, min_width_cm: formData.loom_roll_requirements.min_width_cm === '' ? null : Number(formData.loom_roll_requirements.min_width_cm), max_width_cm: formData.loom_roll_requirements.max_width_cm === '' ? null : Number(formData.loom_roll_requirements.max_width_cm), meters_per_output: formData.standard_output_meters === '' ? null : Number(formData.standard_output_meters), accepts_from_globo: formData.loom_roll_requirements.accepted_input_stages.includes('GLOBO') },
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

  const filteredSpecs = useMemo(() => {
    return specs.filter((s) => {
      if (filterType !== 'ALL' && s.lamination_type !== filterType) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          s.code?.toLowerCase().includes(term) ||
          s.name?.toLowerCase().includes(term) ||
          s.output_product_name?.toLowerCase().includes(term)
        );
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
            <span className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
              <Layers className="h-6 w-6" />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Catálogo de Fórmulas y Especificaciones de Laminado
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Recetas de extrusión de película, compatibilidad con rollos de telares/globo e insumos de resina PEBD para PTI Laminado.
          </p>
        </div>

        {canManageCatalog && <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreate}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 flex items-center gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            Nueva Especificación Laminado
          </Button>
        </div>}
      </div>

      {/* KPI Cards / Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fórmulas Laminado</p>
          <p className="text-2xl font-black mt-1 text-amber-500">{specs.length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activas en Planta</p>
          <p className="text-2xl font-black mt-1 text-emerald-500">{specs.filter((s) => s.is_active).length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extrusión Recubrimiento</p>
          <p className="text-2xl font-black mt-1 text-blue-500">{specs.filter((s) => s.lamination_type === 'EXTRUSION_COATING').length}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Película BOPP</p>
          <p className="text-2xl font-black mt-1 text-purple-500">{specs.filter((s) => s.lamination_type === 'BOPP_FILM').length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <CollapsibleFilterPanel title="Buscar y filtrar especificaciones" summary={`${filteredSpecs.length} resultados${filterType !== 'ALL' ? ` · ${filterType}` : ''}${searchTerm ? ` · ${searchTerm}` : ''}`} className={`mb-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
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
          {['ALL', 'EXTRUSION_COATING', 'BOPP_FILM', 'MONOCAPA'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === t
                  ? 'bg-amber-600 text-white shadow'
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
      </CollapsibleFilterPanel>

      {/* Grid of Specifications */}
      {specsError ? (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-center">
          <p className="font-bold text-red-700 dark:text-red-300">No se pudo cargar el catálogo de Laminado.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">No se mostrarán fórmulas vacías por un error de conexión.</p>
          <Button onClick={() => refetchSpecs()} className="mt-3 min-h-11">Reintentar</Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-slate-500">Cargando catálogo de Laminado...</div>
      ) : filteredSpecs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border rounded-xl bg-white/5">
          No se encontraron especificaciones de Laminado con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSpecs.map((spec) => (
            <div
              key={spec.id}
              className={`p-5 rounded-xl border transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-400'
              } shadow-sm`}
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm px-2.5 py-0.5 rounded font-black bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      {spec.code}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        spec.lamination_type === 'EXTRUSION_COATING'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : spec.lamination_type === 'BOPP_FILM'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {spec.lamination_type}
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

              {canManageCatalog && <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(spec)}
                  className="min-h-11 min-w-0 flex-1 whitespace-normal px-3 text-sm font-semibold sm:flex-initial"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate(spec.id)}
                  className={`min-h-11 min-w-0 flex-1 whitespace-normal px-3 text-sm font-semibold sm:flex-initial ${
                      spec.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {spec.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>}
              </div>

              {/* Strip Datos Clave */}
              <div className="my-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-100 p-3 text-xs sm:grid-cols-3 dark:bg-slate-800/60">
                <div>
                  <span className="text-slate-500 block">Producto Salida:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {spec.output_pti_code || 'PTI sin código'} · {spec.output_product_name || 'Producto pendiente'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ancho / Capa PE:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {spec.target_width_cm ?? '—'} cm | {spec.coating_grammage_g_per_m2 ?? '—'} g/m²
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lote PTI:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {spec.standard_output_meters ?? '—'} m ({spec.expected_output_quantity ?? '—'} {spec.expected_output_unit || '—'})
                  </span>
                </div>
              </div>

              {/* Requisitos de Rollos */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1 text-amber-500">
                    <Layers className="h-3.5 w-3.5" />
                    Rollos de Telares / Globo Admitidos:
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {(spec.loom_roll_requirements?.accepted_input_stages || ['TELARES', ...(spec.loom_roll_requirements?.accepts_from_globo === false ? [] : ['GLOBO'])]).join(' + ')}
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
                    <span className="text-xs text-slate-400 italic">Cualquier rollo con ancho compatible</span>
                  )}
                </div>
              </div>

              {/* Materiales de Almacén Requeridos */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1 text-xs font-bold text-blue-500 mb-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Resinas e Insumos de Almacén Requeridos (por Rollo PTI):
                </span>

                <div className="space-y-1">
                  {spec.materials && spec.materials.length > 0 ? (
                    groupIdenticalRecipeLines(spec.materials).map(({ line: m, count, totalQuantity }) => (
                      <div
                        key={`${m.material_id}-${m.quantity}-${m.unit}-${m.notes ?? ''}`}
                        className="flex min-w-0 flex-col gap-1 rounded border border-blue-500/20 bg-blue-500/5 p-1.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0 break-words font-semibold text-slate-700 dark:text-slate-300">
                          {m.material?.name || `Material #${m.material_id}`}
                          {count > 1 && (
                            <span className="ml-1 text-[10px] font-normal text-slate-500">
                              · {count} renglones idénticos
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {count > 1 ? totalQuantity.toFixed(3) : m.quantity} {m.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No requiere insumos adicionales</span>
                  )}
                </div>
              </div>

              {/* Bottom strip */}
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
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm sm:p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="laminado-spec-dialog-title"
              className={`relative w-full max-w-3xl my-8 p-6 rounded-2xl border shadow-2xl ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-6 w-6 text-amber-500" />
                  <h2 id="laminado-spec-dialog-title" className="text-lg sm:text-xl font-black">
                    {editingSpecId ? 'Editar Especificación de Laminado' : 'Nueva Especificación / Receta de Laminado'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                  aria-label="Cerrar formulario de especificación"
                  className="min-h-11 min-w-11 flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form noValidate onSubmit={handleSubmit} className="space-y-4 max-h-[75dvh] overflow-y-auto pr-1 sm:max-h-[78vh]">
                {/* 1. Datos Principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Código Único *</label>
                    <Input
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ej. LAM-001"
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
                      <label className="text-xs font-bold text-slate-400 block mb-1">Tipo de Laminación *</label>
                    <select
                        required
                      value={formData.lamination_type}
                      onChange={(e: any) => setFormData({ ...formData, lamination_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border text-sm font-semibold bg-transparent"
                    >
                      <option value="">Selecciona tipo</option>
                      <option value="EXTRUSION_COATING">EXTRUSIÓN RECUBRIMIENTO</option>
                      <option value="MONOCAPA">MONOCAPA</option>
                      <option value="BICAPA">BICAPA</option>
                      <option value="BOPP_FILM">PELÍCULA BOPP</option>
                      <option value="PAPEL_KRAFT">PAPEL KRAFT</option>
                      <option value="OTRO">OTRO / PERSONALIZADO</option>
                    </select>
                  </div>
                  {formData.lamination_type === 'OTRO' && (
                    <div className="md:col-span-3">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Tipo personalizado *</label>
                      <Input required maxLength={50} value={formData.custom_lamination_type} onChange={(e) => setFormData({ ...formData, custom_lamination_type: e.target.value })} placeholder="Escribe el tipo de laminado" />
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
                      onChange={(e) => setFormData({ ...formData, target_width_cm: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Gramaje de recubrimiento (g/m²) *</label>
                    <Input
                      type="number"
                        min="0.01"
                      step="0.1"
                        required
                      value={formData.coating_grammage_g_per_m2}
                      onChange={(e) => setFormData({ ...formData, coating_grammage_g_per_m2: e.target.value === '' ? '' : Number(e.target.value) })}
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
                      onChange={(e) => setFormData({ ...formData, standard_waste_percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Descripción / notas de proceso</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="Instrucciones de preparación, acabado o control" />
                  </div>

                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Puedes guardar la ficha como borrador mientras se confirman el flujo, los consumos y las medidas. Un borrador no se ofrece para producción.
                </div>

                {/* 2. Definición de Rendimiento / PTI */}
                {(bomsError || materialsError) && (
                  <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">No se pudieron cargar todos los datos auxiliares del formulario.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {bomsError && <Button type="button" variant="outline" className="min-h-11" onClick={() => refetchBoms()}>Reintentar BOM</Button>}
                      {materialsError && <Button type="button" variant="outline" className="min-h-11" onClick={() => refetchMaterials()}>Reintentar insumos</Button>}
                    </div>
                  </div>
                )}
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Definición de Salida (PTI Laminado)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Código de PTI de Laminado *</label>
                      <Input required value={formData.output_pti_code} onChange={(e) => setFormData({ ...formData, output_pti_code: e.target.value.toUpperCase() })} placeholder="Ej. LAM-PTI-001" className="font-mono" />
                    </div>
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
                        onChange={(e) => setFormData({ ...formData, standard_output_meters: e.target.value === '' ? '' : Number(e.target.value) })}
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
                        onChange={(e) => setFormData({ ...formData, cost_transformation_index: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Requisitos de Rollos */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      Rollos de Telares / Globo Requeridos
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      ['TELARES', 'Acepta rollo directo de Telares'],
                      ['GLOBO', 'Acepta rollo procesado por Globo'],
                    ].map(([stage, label]) => {
                      const selected = formData.loom_roll_requirements.accepted_input_stages.includes(stage);
                      return (
                        <label key={stage} className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer">
                          <input type="checkbox" checked={selected} onChange={() => setFormData({ ...formData, loom_roll_requirements: { ...formData.loom_roll_requirements, accepted_input_stages: selected ? formData.loom_roll_requirements.accepted_input_stages.filter((item) => item !== stage) : [...formData.loom_roll_requirements.accepted_input_stages, stage] } })} className="h-4 w-4 rounded" />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>

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
                              ? 'bg-amber-600 text-white border-amber-500 font-bold'
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
                              min_width_cm: e.target.value === '' ? '' : Number(e.target.value),
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
                              max_width_cm: e.target.value === '' ? '' : Number(e.target.value),
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
                    <h4 className="text-sm font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-4 w-4" />
                      Resinas e Insumos de Almacén Requeridos (receta para metros estándar)
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddMaterialRow}
                      className="min-h-11 px-3 text-sm bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar Insumo
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">Registra el KG de cada resina o insumo necesario para los metros estándar de salida definidos arriba.</p>

                  {formData.materials.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No se han especificado insumos de almacén para esta fórmula.</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.materials.map((row, index) => (
                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,8rem)_2.75rem] gap-2 items-center bg-black/20 p-2 rounded-lg max-sm:grid-cols-[minmax(0,1fr)_2.75rem]">
                          <select
                            required
                            value={row.material_id}
                            onChange={(e) => handleMaterialChange(index, 'material_id', e.target.value ? Number(e.target.value) : '')}
                            className="flex-1 min-h-11 w-full px-2 rounded border text-sm bg-slate-800 text-slate-200 max-sm:col-span-2"
                          >
                            <option value="">-- Seleccionar Resina o Insumo --</option>
                            {recipeMaterials.map((mat: any) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name} ({mat.internal_code}) · {mat.base_unit?.code || mat.base_unit?.name || 'KG'}
                              </option>
                            ))}
                          </select>
                          {recipeMaterials.length === 0 && <p className="col-span-full text-sm text-amber-300">No hay materiales activos con unidad base KG en el catálogo de Almacén.</p>}

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
                              className="min-h-11 text-sm max-sm:col-span-1"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(index)}
                            aria-label={`Eliminar insumo ${index + 1}`}
                            className="min-h-11 min-w-11 flex items-center justify-center text-red-400 hover:text-red-300 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="col-span-full">
                            <Input placeholder="Nota / especificación opcional" aria-label={`Nota del insumo ${index + 1}`} value={row.notes} onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)} className="min-h-11 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 flex flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white/95 pt-3 dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="min-h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold"
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
export default LaminadoCatalogPage;
