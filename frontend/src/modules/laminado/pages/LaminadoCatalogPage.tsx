import React, { useState, useMemo, useEffect } from 'react';
import CollapsibleFilterPanel from '@/components/shared/CollapsibleFilterPanel';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Sliders,
  X,
} from '@/design-system/components/Icon/googleIconCompat';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { canViewCosts } from '../../../utils/authHelpers';
import { laminadoApi } from '../services/laminadoApi';
import { telaresApi } from '../../telares/services/telaresApi';
import axiosClient from '../../../api/axiosClient';
import { LaminadoSpecification } from '../types/laminado.types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { SearchSelect } from '../../../design-system/components/Input/SearchSelect';
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
  coating_grammage_g_per_m2: '' as number | '',
  output_product_name: '',
  expected_output_quantity: '' as number | '',
  expected_output_unit: '',
  standard_output_meters: '' as number | '',
  standard_waste_percentage: '' as number | '',
  cost_transformation_index: '' as number | '',
  loom_roll_requirements: {
    allowed_bom_ids: [] as number[],
    accepted_input_stages: ['TELARES'] as string[],
    accepts_from_globo: false,
    meters_per_output: '' as number | '',
    notes: '',
  },
  materials: [] as MaterialItemDraft[],
});

const normalizeMaterialName = (name: unknown) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

const materialIdentityKey = (material: any) => {
  const name = normalizeMaterialName(material?.name);
  if (material?.family_id && name) return `${material.family_id}:${material.base_unit_id ?? 'NULL'}:${name}`;
  return `MATERIAL:${material?.id ?? material?.material_id}`;
};

const consolidateMaterialLines = (materials: any[] = []) => {
  const grouped = new Map<string, { line: any; quantity: number; codes: Set<string>; notes: Set<string> }>();
  for (const line of materials) {
    const material = line.material || {};
    const key = materialIdentityKey({ ...material, id: line.material_id });
    const current = grouped.get(key) || { line, quantity: 0, codes: new Set<string>(), notes: new Set<string>() };
    current.quantity += Number(line.quantity || 0);
    if (material.internal_code) current.codes.add(String(material.internal_code));
    if (line.notes) current.notes.add(String(line.notes));
    grouped.set(key, current);
  }
  return [...grouped.values()].map((group) => ({
    line: group.line,
    quantity: Number(group.quantity.toFixed(3)),
    equivalentCodeCount: group.codes.size,
    notes: [...group.notes].join(' · '),
  }));
};

export const LaminadoCatalogPage: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const allowCosts = canViewCosts(user);
  const roleCode = String(typeof user?.role === 'string' ? user.role : user?.role?.code || user?.role?.name || '').toUpperCase();
  const canManageCatalog = ['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN_LAMINADO'].includes(roleCode);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecId, setEditingSpecId] = useState<number | null>(null);
  const [selectedBomToAdd, setSelectedBomToAdd] = useState<number | ''>('');
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
      const pageSize = 250;
      const allMaterials: any[] = [];
      let page = 1;
      let total = Infinity;
      while (allMaterials.length < total) {
        const res = await axiosClient.get('/materials', { params: { page, pageSize, status: 'ACTIVE' } });
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        allMaterials.push(...rows);
        total = Number(res.data?.meta?.total ?? allMaterials.length);
        if (rows.length < pageSize) break;
        page += 1;
      }
      return allMaterials;
    },
  });
  const recipeMaterials = useMemo(() => warehouseMaterials.filter((mat: any) => {
    if (mat.status !== 'ACTIVE' || mat.is_active === false) return false;
    const unitCode = String(mat.base_unit?.code || mat.unit?.code || '').toUpperCase();
    const unitName = String(mat.base_unit?.name || mat.unit?.name || '').toUpperCase();
    return unitCode === 'KG' || ['KILOGRAMO', 'KILOGRAMOS'].includes(unitName);
  }), [warehouseMaterials]);
  const recipeMaterialGroups = useMemo(() => {
    const groups = new Map<string, any>();
    for (const material of recipeMaterials) {
      const key = materialIdentityKey(material);
      const group = groups.get(key) || { ...material, equivalent_material_ids: [], equivalent_codes: [] };
      group.equivalent_material_ids.push(Number(material.id));
      if (material.internal_code) group.equivalent_codes.push(String(material.internal_code));
      if (Number(material.id) < Number(group.id)) {
        group.id = Number(material.id);
        group.internal_code = material.internal_code;
      }
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'es-MX'));
  }, [recipeMaterials]);

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
    setSelectedBomToAdd('');
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
    setSelectedBomToAdd('');
    setFormData({
      code: spec.code,
      output_pti_code: spec.output_pti_code || '',
      name: spec.name,
      description: spec.description || '',
      lamination_type: ['EXTRUSION_COATING', 'MONOCAPA', 'BICAPA', 'BOPP_FILM', 'PAPEL_KRAFT'].includes(spec.lamination_type) ? spec.lamination_type : 'OTRO',
      custom_lamination_type: ['EXTRUSION_COATING', 'MONOCAPA', 'BICAPA', 'BOPP_FILM', 'PAPEL_KRAFT'].includes(spec.lamination_type) ? '' : String(spec.lamination_type),
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
        accepted_input_stages: ['TELARES'],
        meters_per_output: Number(spec.loom_roll_requirements?.meters_per_output),
        notes: spec.loom_roll_requirements?.notes || '',
      },
      materials: consolidateMaterialLines(spec.materials || []).map(({ line, quantity, notes }) => {
        const equivalent = recipeMaterialGroups.find((group: any) => group.equivalent_material_ids.includes(Number(line.material_id)));
        return {
          material_id: equivalent?.id || line.material_id,
          quantity,
          unit: line.unit || 'KG',
          notes,
        };
      }),
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

  const isCompatibleTelaresBom = (bom: any) => {
    if (bom.is_active === false || String(bom.product_kind || '').toUpperCase() !== 'ROLLO_TELA') return false;
    const width = Number(bom.target_width_cm || 0);
    if (width <= 0) return false;
    const routes = Array.isArray(bom.allowed_routes) && bom.allowed_routes.length ? bom.allowed_routes : [bom.default_route];
    return routes.some((route: any) => Array.isArray(route)
      && String(route[0] || '').toUpperCase() === 'TELARES'
      && String(route[1] || '').toUpperCase() === 'LAMINADO');
  };
  const selectedBomIds = formData.loom_roll_requirements.allowed_bom_ids;
  const selectedBomOptions = boms.filter((bom: any) => selectedBomIds.includes(Number(bom.id)));
  const compatibleBomOptions = boms.filter((bom: any) => !selectedBomIds.includes(Number(bom.id)) && isCompatibleTelaresBom(bom));

  const handleAddSelectedBom = () => {
    if (!selectedBomToAdd) return;
    handleBomToggle(Number(selectedBomToAdd));
    setSelectedBomToAdd('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partialMaterial = formData.materials.some((m) => !m.material_id || !Number(m.quantity) || Number(m.quantity) <= 0);
    if (!formData.code.trim() || !formData.name.trim() || !formData.output_pti_code.trim() || !formData.output_product_name.trim() || formData.loom_roll_requirements.allowed_bom_ids.length === 0 || formData.materials.length === 0 || partialMaterial) {
      toast.error('Completa la ficha, agrega al menos un material de Almacén con su consumo y selecciona un rollo compatible de Telares.');
      return;
    }
    const payload = {
      ...formData,
      lamination_type: formData.lamination_type === 'OTRO' ? formData.custom_lamination_type.trim().toUpperCase() : formData.lamination_type || null,
      coating_grammage_g_per_m2: formData.coating_grammage_g_per_m2 === '' ? null : Number(formData.coating_grammage_g_per_m2),
      expected_output_quantity: formData.expected_output_quantity === '' ? null : Number(formData.expected_output_quantity),
      expected_output_unit: formData.expected_output_unit || null,
      standard_output_meters: formData.standard_output_meters === '' ? null : Number(formData.standard_output_meters),
      standard_waste_percentage: formData.standard_waste_percentage === '' ? null : Number(formData.standard_waste_percentage),
      cost_transformation_index: allowCosts && formData.cost_transformation_index !== '' ? Number(formData.cost_transformation_index) : null,
      loom_roll_requirements: { allowed_bom_ids: formData.loom_roll_requirements.allowed_bom_ids, notes: formData.loom_roll_requirements.notes, meters_per_output: formData.standard_output_meters === '' ? null : Number(formData.standard_output_meters), accepted_input_stages: ['TELARES'], accepts_from_globo: false },
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
  }, [specs, searchTerm]);

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
            Catálogo de Laminado
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Una ficha maestra para el proceso. Administra aquí sus rollos compatibles de Telares y los insumos requeridos.
          </p>
        </div>

        {canManageCatalog && <div className="flex items-center gap-3">
          <Button
            onClick={() => specs[0] ? handleOpenEdit(specs[0]) : handleOpenCreate()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 flex items-center gap-2 shadow-md"
          >
            <Plus className="h-5 w-5" />
            {specs[0] ? 'Editar ficha: rollos e insumos' : 'Crear ficha única de Laminado'}
          </Button>
        </div>}
      </div>

      <div className={`mb-6 rounded-xl border p-4 text-sm ${isDark ? 'border-amber-500/30 bg-amber-950/20 text-amber-100' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
        <strong>Una ficha maestra de Laminado.</strong> En la misma ficha se enlazan los rollos compatibles de Telares y los materiales de Almacén que se consumirán.
      </div>

      {/* Filters & Search */}
      <CollapsibleFilterPanel title="Buscar ficha de Laminado" summary={`${filteredSpecs.length} ficha${filteredSpecs.length === 1 ? '' : 's'}${searchTerm ? ` · ${searchTerm}` : ''}`} className={`mb-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
                    Según rollo de Telares | {spec.coating_grammage_g_per_m2 ?? '—'} g/m² de recubrimiento
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
                    Rollos de Telares compatibles:
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
                  Materiales de Almacén requeridos para {spec.standard_output_meters || '—'} m:
                </span>

                <div className="space-y-1">
                  {spec.materials && spec.materials.length > 0 ? (
                    consolidateMaterialLines(spec.materials).map(({ line: m, quantity, equivalentCodeCount, notes }) => {
                      const catalogGroup = recipeMaterialGroups.find((group: any) => group.equivalent_material_ids.includes(Number(m.material_id)));
                      const consolidatedCodes = Math.max(equivalentCodeCount, catalogGroup?.equivalent_codes?.length || 0);
                      return (
                      <div
                        key={`${materialIdentityKey({ ...(m.material || {}), id: m.material_id })}-${m.unit}`}
                        className="flex min-w-0 flex-col gap-1 rounded border border-blue-500/20 bg-blue-500/5 p-1.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0 break-words font-semibold text-slate-700 dark:text-slate-300">
                          {m.material?.name || `Material #${m.material_id}`}
                          {consolidatedCodes > 1 && (
                            <span className="ml-1 text-[10px] font-normal text-slate-500">
                              · consolidado de {consolidatedCodes} códigos
                            </span>
                          )}
                          {notes && <span className="block text-[10px] font-normal text-slate-500">{notes}</span>}
                        </span>
                        <span className="shrink-0 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {quantity.toFixed(3)} {m.unit}
                        </span>
                      </div>
                      );
                    })
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
                    {editingSpecId ? 'Editar ficha maestra y rollos compatibles' : 'Crear ficha maestra de Laminado'}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      Rollos compatibles de Telares
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Busca y agrega rollos desde el catálogo de Telares. El ancho se toma automáticamente de cada ficha; no se captura de nuevo en Laminado.
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <SearchSelect
                        options={compatibleBomOptions}
                        value={selectedBomToAdd || null}
                        onChange={(value) => setSelectedBomToAdd(Number(value) || '')}
                        getLabel={(bom: any) => `${bom.code} · ${bom.name}`}
                        getDescription={(bom: any) => `${bom.fabric_type || 'Tipo no definido'} · ${bom.target_width_cm} cm · ${bom.ounces_yd2 ? `${bom.ounces_yd2} oz/yd²` : 'Gramaje pendiente'}`}
                        getValue={(bom: any) => Number(bom.id)}
                        placeholder="Buscar rollo en el catálogo de Telares..."
                        emptyMessage="No hay rollos compatibles que coincidan con la búsqueda"
                        disabled={bomsError || compatibleBomOptions.length === 0}
                      />
                    </div>
                    <Button type="button" onClick={handleAddSelectedBom} disabled={!selectedBomToAdd} className="min-h-11 shrink-0 bg-blue-600 text-white hover:bg-blue-700">
                      <Plus className="mr-1 h-4 w-4" /> Agregar rollo
                    </Button>
                  </div>
                  {compatibleBomOptions.length === 0 && selectedBomOptions.length === 0 && <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">No hay rollos activos de Telares con ruta directa a Laminado y ancho definido en su ficha.</p>}

                  <div className="space-y-2">
                    {selectedBomOptions.map((bom: any) => {
                      const isCompatible = isCompatibleTelaresBom(bom);
                      return (
                        <div key={bom.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${isCompatible ? 'border-blue-500/30 bg-blue-500/5' : 'border-rose-500/40 bg-rose-500/10'}`}>
                          <div className="min-w-0">
                            <p className="truncate font-bold">{bom.code} · {bom.name}</p>
                            <p className="text-xs text-slate-400">Ancho heredado: {bom.target_width_cm} cm · {bom.fabric_type || 'Tipo no definido'}{bom.ounces_yd2 ? ` · ${bom.ounces_yd2} oz/yd²` : ''}</p>
                            {!isCompatible && <p className="text-xs font-semibold text-rose-300">Ya no cumple los requisitos; quítalo antes de guardar.</p>}
                          </div>
                          <Button type="button" variant="outline" onClick={() => handleBomToggle(Number(bom.id))} className="min-h-11 shrink-0" aria-label={`Quitar ${bom.code}`}>
                            <X className="h-4 w-4" /> Quitar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {selectedBomOptions.length === 0 && <p className="text-xs text-amber-200">Agrega al menos un rollo del catálogo de Telares.</p>}
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
                      Materiales de Almacén (consumo para los metros estándar)
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
                  <p className="text-xs text-slate-400">Selecciona cualquier material activo de Almacén que se mida en KG —resina, carbonato, aditivo u otro— e indica cuánto consume para los {formData.standard_output_meters || 'metros estándar'} m definidos. El sistema escala esa cantidad según los metros procesados.</p>

                  {formData.materials.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-purple-400/40 p-4 text-sm text-slate-400">
                      Agrega al menos un material de Almacén para definir la receta y permitir que Laminado consulte su WIP o solicite lo faltante mediante una ODC.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.materials.map((row, index) => (
                        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,8rem)_2.75rem] gap-2 items-center bg-black/20 p-2 rounded-lg max-sm:grid-cols-[minmax(0,1fr)_2.75rem]">
                          <div className="min-w-0 max-sm:col-span-2">
                            <SearchSelect
                              options={recipeMaterialGroups.filter((mat: any) =>
                                mat.equivalent_material_ids.includes(Number(row.material_id))
                                || !formData.materials.some((other, otherIndex) => otherIndex !== index && mat.equivalent_material_ids.includes(Number(other.material_id)))
                              )}
                              value={row.material_id ? Number(row.material_id) : null}
                              onChange={(value) => handleMaterialChange(index, 'material_id', Number(value) || '')}
                              getLabel={(mat: any) => `${mat.name} · ${mat.equivalent_codes.length} código(s)`}
                              getDescription={(mat: any) => `${mat.equivalent_codes.join(', ')} · ${mat.base_unit?.code || mat.base_unit?.name || 'KG'}`}
                              getValue={(mat: any) => Number(mat.id)}
                              placeholder="Buscar material de Almacén..."
                              emptyMessage="No hay materiales que coincidan con la búsqueda"
                              disabled={materialsError || recipeMaterialGroups.length === 0}
                            />
                          </div>
                          {recipeMaterials.length === 0 && <p className="col-span-full text-sm text-amber-300">No hay materiales activos medidos en KG en el catálogo de Almacén.</p>}

                          <div>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.01"
                              required
                              aria-label={`Consumo de ${warehouseMaterials.find((mat: any) => mat.id === Number(row.material_id))?.name || `insumo ${index + 1}`} en kg por ${formData.standard_output_meters || 'metros estándar'} m de salida`}
                              placeholder={`KG / ${formData.standard_output_meters || 'm estándar'}`}
                              value={row.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              className="min-h-11 text-sm max-sm:col-span-1"
                            />
                          </div>
                          <p className="col-span-full text-[11px] text-slate-400">
                            KG consumidos por {formData.standard_output_meters || 'los metros estándar'} m de salida
                          </p>

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
