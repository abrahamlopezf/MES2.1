import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../../../../core/api/apiClient';
import { Badge, Button, Input, Icon } from '../../../../design-system';
import { useAuthStore } from '../../../../store/authStore';
import { canViewCosts } from '../../../../utils/authHelpers';
import { useActiveTagsQuery } from '../../../materials/hooks/useMaterialsQueries';

interface SiloItem {
  id: number;
  code: string;
  name: string;
  material_id: number | null;
  capacity_kg: number;
  min_capacity_kg: number;
  alert_stock_kg: number;
  material_tag_id: number | null;
  is_extrusion_feed: boolean;
  current_stock_kg: number;
  current_lot_number: string;
  current_lot_type: string;
  unit_cost: number;
  total_investment?: number;
  is_active: boolean;
  fill_percentage: number;
  is_critical_reorder: boolean;
  status_alert: 'NORMAL' | 'ALERTA_STOCK' | 'CRITICO_REORDEN';
  materialTag?: { id: number; uuid: string; name: string; color?: string } | null;
  material?: {
    id: number;
    name: string;
    internal_code?: string;
  };
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

const localDateValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const SilosManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const allowCosts = canViewCosts(user);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSiloModalOpen, setIsSiloModalOpen] = useState(false);
  const [editingSilo, setEditingSilo] = useState<SiloItem | null>(null);

  // Formulario Factura PP (Entrada a Silo - Cero QR)
  const [invoiceForm, setInvoiceForm] = useState({
    folio: '',
    invoice_date: localDateValue(),
    supplier_name: '',
    silo_id: '',
    material_id: '',
    quantity_kg: '',
    lot_number: '',
    unit_cost: '28.50',
    currency: 'MXN',
    notes: ''
  });

  // Formulario Silo (Alta / Edición)
  const [siloForm, setSiloForm] = useState({
    code: '',
    name: '',
    material_tag_id: '',
    is_extrusion_feed: false,
    capacity_kg: '40000',
    min_capacity_kg: '5000',
    alert_stock_kg: '10000'
  });

  // 1. Obtener Silos reales desde backend con métricas calculadas
  const { data: silosResponse, isLoading: loadingSilos, refetch: refetchSilos } = useQuery({
    queryKey: ['warehouse', 'silos'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouse/silos');
      return res.data;
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false
  });

  const silos: SiloItem[] = Array.isArray(silosResponse?.data)
    ? silosResponse.data
    : Array.isArray(silosResponse)
    ? silosResponse
    : [];

  const backendSummary = silosResponse?.summary;
  const { data: materialTags = [] } = useActiveTagsQuery();

  const exchangeRateQuery = useQuery({
    queryKey: ['warehouse', 'usd-mxn-rate', invoiceForm.invoice_date],
    queryFn: async () => {
      const res = await apiClient.get('/warehouse/silos/exchange-rate', { params: { date: invoiceForm.invoice_date } });
      return res.data;
    },
    enabled: isInvoiceModalOpen && Boolean(invoiceForm.invoice_date),
    staleTime: 60_000,
    retry: 1,
  });

  // 2. Obtener Catálogo de Materiales para asignación al Silo
  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'all-list'],
    queryFn: async () => {
      const res = await apiClient.get('/materials?limit=all');
      return res.data?.data?.items || res.data?.data || res.data || [];
    }
  });


  const rawMaterials: any[] = Array.isArray(materialsData) ? materialsData : [];
  // Priorizar materias primas de polipropileno y resinas
  const ppMaterials = rawMaterials.filter((m: any) => {
    const name = (m.name || '').toUpperCase();
    const code = (m.internal_code || m.material_code || '').toUpperCase();
    const tagged = (m.tags || []).some((tag: any) => /^(PP|POLIPROPILENO)/i.test(String(tag.name || '').trim()));
    return tagged || name.includes('POLIPROPILENO') || name.includes('PP ') || code.startsWith('MP-PP');
  });
  const materialOptions = ppMaterials.length > 0 ? ppMaterials : rawMaterials;
  const getMaterialsForSilo = (siloId?: number) => {
    const silo = silos.find((item) => item.id === siloId);
    const siloTagUuid = silo?.materialTag?.uuid;
    const siloTagId = silo?.material_tag_id;
    if (!siloTagId && !siloTagUuid) return [];
    return rawMaterials.filter((material: any) => (material.tags || []).some((tag: any) =>
      (siloTagId && Number(tag.id) === Number(siloTagId)) ||
      (siloTagUuid && String(tag.uuid) === String(siloTagUuid))
    ));
  };
  const selectedSiloMaterials = getMaterialsForSilo(Number(invoiceForm.silo_id));

  // Mutación: Registrar Factura PP (Entrada directa al Silo sin etiquetas QR)
  const invoiceEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/warehouse/silos/invoice-entry', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'wip-inventory'] });
      toast.success(data?.message || 'Ingreso de PP registrado exitosamente en Silo (Cero QRs generados).');
      setIsInvoiceModalOpen(false);
      setInvoiceForm({
        folio: '',
        invoice_date: localDateValue(),
        supplier_name: '',
        silo_id: '',
        material_id: '',
        quantity_kg: '',
        lot_number: '',
        unit_cost: '28.50',
        currency: 'MXN',
        notes: ''
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Error al registrar ingreso de factura al Silo.';
      toast.error(msg);
    }
  });

  // Mutación: Crear Silo
  const createSiloMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/warehouse/silos', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'wip-inventory'] });
      toast.success('Silo registrado exitosamente en Almacén.');
      setIsSiloModalOpen(false);
      resetSiloForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Error al registrar Silo.';
      toast.error(msg);
    }
  });

  // Mutación: Actualizar Silo
  const updateSiloMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put(`/warehouse/silos/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'wip-inventory'] });
      toast.success('Silo actualizado correctamente.');
      setIsSiloModalOpen(false);
      setEditingSilo(null);
      resetSiloForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Error al actualizar Silo.';
      toast.error(msg);
    }
  });

  // Mutación: Desactivar Silo
  const deleteSiloMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/warehouse/silos/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'wip-inventory'] });
      toast.success('Silo desactivado.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al desactivar Silo.');
    }
  });

  const resetSiloForm = () => {
    setSiloForm({
      code: '',
      name: '',
      material_tag_id: materialTags.find((tag: any) => /^(PP|POLIPROPILENO)$/i.test(String(tag.name || '').trim()))?.id?.toString() || '',
      is_extrusion_feed: false,
      capacity_kg: '40000',
      min_capacity_kg: '5000',
      alert_stock_kg: '10000'
    });
    setEditingSilo(null);
  };

  const handleOpenEditSilo = (silo: SiloItem) => {
    setEditingSilo(silo);
    setSiloForm({
      code: silo.code || '',
      name: silo.name || '',
      material_tag_id: silo.material_tag_id ? String(silo.material_tag_id) : '',
      is_extrusion_feed: Boolean(silo.is_extrusion_feed),
      capacity_kg: String(silo.capacity_kg || 40000),
      min_capacity_kg: String(silo.min_capacity_kg || 5000),
      alert_stock_kg: String(silo.alert_stock_kg || 10000)
    });
    setIsSiloModalOpen(true);
  };

  const handleOpenInvoiceModalForSilo = (siloId?: number) => {
    const chosenSiloId = siloId || silos[0]?.id;
    setInvoiceForm(prev => ({
      ...prev,
      silo_id: chosenSiloId ? String(chosenSiloId) : '',
      material_id: String(getMaterialsForSilo(chosenSiloId)[0]?.id || '')
    }));
    setIsInvoiceModalOpen(true);
  };

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.folio.trim()) {
      toast.error('El folio de la factura es obligatorio.');
      return;
    }
    if (!invoiceForm.silo_id) {
      toast.error('Selecciona el silo destino.');
      return;
    }
    if (!invoiceForm.material_id) {
      toast.error('Selecciona el material de polipropileno que indica la factura.');
      return;
    }
    const qty = Number(invoiceForm.quantity_kg);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Ingresa una cantidad de kilos válida mayor a 0.');
      return;
    }
    const unitCost = Number(invoiceForm.unit_cost);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast.error('Ingresa el costo unitario de la factura en la moneda seleccionada.');
      return;
    }
    if (!exchangeRateQuery.data?.rate) {
      toast.error('No se pudo consultar el tipo de cambio del DOF para la fecha de factura.');
      return;
    }

    invoiceEntryMutation.mutate({
      folio: invoiceForm.folio.trim().toUpperCase(),
      invoice_date: invoiceForm.invoice_date,
      silo_id: Number(invoiceForm.silo_id),
      material_id: Number(invoiceForm.material_id),
      quantity_kg: qty,
      supplier_name: invoiceForm.supplier_name.trim() || undefined,
      lot_number: invoiceForm.lot_number.trim() || undefined,
      unit_cost: unitCost,
      currency: invoiceForm.currency,
      notes: invoiceForm.notes.trim() || undefined
    });
  };

  const handleSubmitSilo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siloForm.code.trim() || !siloForm.name.trim()) {
      toast.error('Código y nombre del Silo son obligatorios.');
      return;
    }
    const capacity = Number(siloForm.capacity_kg);
    const minimum = Number(siloForm.min_capacity_kg);
    const alert = Number(siloForm.alert_stock_kg);
    if (!siloForm.material_tag_id) {
      toast.error('Selecciona la etiqueta que permitirá ingresar materiales al silo.');
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(minimum) || minimum < 0 || minimum > capacity) {
      toast.error('Revisa la capacidad máxima y el stock mínimo del silo.');
      return;
    }
    if (!Number.isFinite(alert) || alert < minimum || alert > capacity) {
      toast.error('El stock de alerta debe ser igual o mayor al mínimo y no exceder la capacidad máxima.');
      return;
    }

    const payload: any = {
      code: siloForm.code.trim().toUpperCase(),
      name: siloForm.name.trim(),
      material_tag_id: Number(siloForm.material_tag_id),
      is_extrusion_feed: Boolean(siloForm.is_extrusion_feed),
      capacity_kg: capacity,
      min_capacity_kg: minimum,
      alert_stock_kg: alert,
    };

    if (editingSilo) {
      // En edición NUNCA se sobreescribe stock, costo ni lote actual para evitar descuadres operativos
      updateSiloMutation.mutate({ id: editingSilo.id, payload });
    } else {
      createSiloMutation.mutate(payload);
    }
  };

  const filteredSilos = silos.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.materialTag?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.material?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCapacityKg = backendSummary?.total_capacity_kg ?? silos.reduce((sum, s) => sum + (Number(s.capacity_kg) || 0), 0);
  const totalStockKg = backendSummary?.total_stock_kg ?? silos.reduce((sum, s) => sum + (Number(s.current_stock_kg) || 0), 0);
  const totalInvestment = backendSummary?.total_investment ?? silos.reduce((sum, s) => sum + (Number(s.total_investment) || ((Number(s.current_stock_kg) || 0) * (Number(s.unit_cost) || 0))), 0);
  const criticalSilosCount = backendSummary?.critical_silos_count ?? silos.filter(s => s.is_critical_reorder || (Number(s.current_stock_kg) <= Number(s.min_capacity_kg))).length;

  // Datos dinámicos del KPI según pestaña activa (Homologado a la tarjeta de pérdidas y merma del Dashboard)
  let siloKpiTitle = allowCosts ? 'STOCK TOTAL EN SILOS' : 'VOLUMEN TOTAL EN SILOS';
  let siloKpiValue = totalInvestment;
  let siloKpiKg = totalStockKg;
  const overallAvgCost = totalStockKg > 0 ? (totalInvestment / totalStockKg) : 0;
  let siloKpiSubtitle = allowCosts
    ? `${Number(totalStockKg).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg PP total · ${silos.length} tanques · $${overallAvgCost.toFixed(2)} prom/kg`
    : `${Number(totalStockKg).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg PP total · ${silos.length} tanques operativos`;
  let siloKpiColor = 'border-emerald-500 bg-emerald-500/5';
  let siloKpiBadge = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-[1700px] mx-auto w-full pb-32">
      {/* 1. Header con Filosofía Industrial de Alto Contraste */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon name="propane_tank" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Control y Gestión de Silos (PP)
                </h1>
                <Badge variant="outline" className="font-mono text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                  Almacén Central
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold mt-0.5">
                Almacenamiento masivo de Polipropileno con alimentación directa por tubería a la Mezcladora.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              resetSiloForm();
              setIsSiloModalOpen(true);
            }}
            className="font-black text-xs sm:text-sm h-11 px-4 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
          >
            <Icon name="add_circle" size={18} />
            <span>Dar de Alta Silo</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => refetchSilos()}
            className="h-11 px-3 border-border hover:bg-muted"
            title="Actualizar datos"
          >
            <Icon name="refresh" size={18} />
          </Button>
        </div>
      </div>

      {/* 2. Banner de Regla de Oro / Excepción de Almacén */}
      <div className="p-4 rounded-xl border-2 bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
            <Icon name="verified_user" size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Regla Operativa de Silos (Cero Impresión de QRs)
            </h4>
            <p className="text-xs font-medium text-blue-900/80 dark:text-blue-200/90 leading-relaxed">
              El Polipropileno (PP) ingresado a los Silos surte <strong>directamente a la Mezcladora</strong> de Extrusión por tubería hermética.
              Al recibir facturas de PP, <strong>no se generan etiquetas QR individuales</strong>. El consumo se deduce automáticamente de los Silos
              en Almacén por cada fórmula mezclada.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Alerta de Compra Anticipada (Si hay silos en nivel crítico) */}
      {criticalSilosCount > 0 && (
        <div className="p-4 rounded-xl border-2 bg-amber-500/15 border-amber-500/50 text-amber-950 dark:text-amber-100 flex items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
              <Icon name="warning" size={24} />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wider text-amber-950 dark:text-amber-200">
                Atención Compras y Almacén: {criticalSilosCount} Silo(s) en Nivel Crítico de Reorden
              </h4>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300 leading-tight">
                El stock actual se encuentra por debajo de la capacidad mínima de seguridad. Generar orden de compra a proveedores de resina inmediatamente para evitar desabasto en el Centro de Mezclado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tarjetas de Resumen KPI (Homologadas a la arquitectura de Dashboard de Almacén) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Silos en Operación */}
        <div className="p-5 rounded-xl border border-border shadow-sm border-b-4 border-primary bg-primary/5 flex flex-col justify-between min-h-[160px] overflow-hidden">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
                Silos en Operación
              </span>
              <Icon name="propane_tank" size={20} className="text-primary shrink-0" />
            </div>
            <div className="flex items-center gap-2 bg-muted/80 p-1 rounded-lg border border-border/50 h-8 px-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                Tanques activos en planta
              </span>
            </div>
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-foreground tracking-tight">{silos.length}</span>
            <span className="text-xs font-bold text-muted-foreground">tanques</span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            100% operativos para suministro a Mezcladora
          </p>
        </div>

        {/* Card 2: Dinero Invertido en Silos (KPI Dinámico estilo Merma/Scrap del Dashboard) */}
        <div className={`p-5 rounded-xl border border-border shadow-sm border-b-4 ${siloKpiColor} transition-colors flex flex-col justify-between min-h-[160px] overflow-hidden`}>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
                {siloKpiTitle}
              </span>
              <div className="shrink-0 text-muted-foreground opacity-80">
                <Icon name="payments" size={20} className="text-emerald-500" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Existencias de polipropileno disponibles por silo.</p>
          </div>

          <div className="my-1 flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight">
              {allowCosts ? formatCurrency(siloKpiValue) : `${Number(siloKpiKg).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg`}
            </span>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border ${siloKpiBadge}`}>
              {allowCosts ? `${Number(siloKpiKg).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg PP` : 'Operativo'}
            </span>
          </div>

          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {siloKpiSubtitle}
          </p>
        </div>

        {/* Card 3: Capacidad Total Instalada */}
        <div className="p-5 rounded-xl border border-border shadow-sm border-b-4 border-blue-500 bg-blue-500/5 flex flex-col justify-between min-h-[160px] overflow-hidden">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
                Capacidad Total Instalada
              </span>
              <Icon name="storage" size={20} className="text-blue-500 shrink-0" />
            </div>
            <div className="flex items-center gap-2 bg-muted/80 p-1 rounded-lg border border-border/50 h-8 px-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                Almacenamiento masivo nominal
              </span>
            </div>
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-foreground tracking-tight">
              {Number(totalCapacityKg).toLocaleString('es-MX')}
            </span>
            <span className="text-xs font-bold text-muted-foreground">kg máx</span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {((totalStockKg / (totalCapacityKg || 1)) * 100).toFixed(1)}% de ocupación global instalada
          </p>
        </div>

        {/* Card 4: Alertas de Reorden */}
        <div className={`p-5 rounded-xl border shadow-sm border-b-4 flex flex-col justify-between min-h-[160px] overflow-hidden ${
          criticalSilosCount > 0
            ? 'bg-amber-500/10 border-amber-500/40 border-b-amber-500'
            : 'bg-card border-border border-b-emerald-500'
        }`}>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground opacity-70 text-xs font-bold uppercase tracking-wider truncate">
                Alertas de Reorden
              </span>
              <Icon name="notifications_active" size={20} className={criticalSilosCount > 0 ? 'text-amber-500 shrink-0 animate-bounce' : 'text-emerald-500 shrink-0'} />
            </div>
            <div className="flex items-center gap-2 bg-muted/80 p-1 rounded-lg border border-border/50 h-8 px-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                {criticalSilosCount > 0 ? 'Stock por debajo del mínimo' : 'Capacidad de seguridad óptima'}
              </span>
            </div>
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono tracking-tight ${criticalSilosCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {criticalSilosCount}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {criticalSilosCount === 1 ? 'silo crítico' : 'silos críticos'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {criticalSilosCount > 0 ? '¡Generar compras a proveedores!' : 'Sin riesgo de desabasto en planta'}
          </p>
        </div>
      </div>

      {/* 5. Buscador y Filtros */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre o material..."
            className="pl-10 !h-10 text-xs sm:text-sm font-semibold bg-background"
          />
        </div>
        <div className="text-xs font-bold text-muted-foreground">
          Mostrando {filteredSilos.length} de {silos.length} silos
        </div>
      </div>

      {/* 6. Listado de Silos (Tarjetas Industriales de Alto Impacto) */}
      {loadingSilos ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
          <span className="font-bold text-sm">Cargando información de Silos y niveles de stock...</span>
        </div>
      ) : filteredSilos.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-3">
          <Icon name="propane_tank" size={40} className="text-muted-foreground/60" />
          <h3 className="font-black text-lg text-foreground">No hay Silos registrados</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Registra los silos de almacenamiento masivo de Polipropileno para habilitar la alimentación directa a la Mezcladora.
          </p>
          <Button
            type="button"
            onClick={() => {
              resetSiloForm();
              setIsSiloModalOpen(true);
            }}
            className="font-bold text-xs h-10 px-4 mt-2"
          >
            Dar de Alta Primer Silo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSilos.map((silo) => {
            const currentStock = Number(silo.current_stock_kg) || 0;
            const maxCap = Number(silo.capacity_kg) || 40000;
            const minCap = Number(silo.min_capacity_kg) || 5000;
            const alertStock = Number(silo.alert_stock_kg) || minCap;
            const fillPct = Math.min(100, Math.round((currentStock / (maxCap || 1)) * 100));
            const isCritical = currentStock <= minCap;
            const isWarning = !isCritical && currentStock <= alertStock;

            return (
              <div
                key={silo.id}
                className={`rounded-2xl border-2 bg-card overflow-hidden shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  isCritical
                    ? 'border-amber-500/70 dark:border-amber-500/80 ring-1 ring-amber-500/30'
                    : isWarning
                    ? 'border-orange-400/70 ring-1 ring-orange-400/20'
                    : 'border-border'
                }`}
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {silo.code}
                      </span>
                      <Badge
                        variant={isCritical ? 'destructive' : 'outline'}
                        className={`font-mono text-[10px] font-black uppercase tracking-wider ${isWarning ? 'border-orange-400 text-orange-600' : ''}`}
                      >
                        {isCritical ? '⚠️ MÍNIMO CRÍTICO' : isWarning ? '⚠️ ALERTA DE STOCK' : '✅ NIVEL ÓPTIMO'}
                      </Badge>
                      {silo.is_extrusion_feed && (
                        <Badge variant="success" className="text-[9px] font-bold">ALIMENTA MEZCLADORA</Badge>
                      )}
                    </div>
                    <h3 className="font-black text-base text-foreground truncate">
                      {silo.name}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 truncate">
                      <Icon name="science" size={14} className="text-primary shrink-0" />
                      <span>Etiqueta: {silo.materialTag?.name || 'Sin etiqueta asignada'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSilo(silo)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Editar especificaciones del Silo"
                    >
                      <Icon name="edit" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de desactivar el Silo ${silo.name}?`)) {
                          deleteSiloMutation.mutate(silo.id);
                        }
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Desactivar Silo"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>

                {/* Body Card: Indicador de Capacidad y Nivel de Stock */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Gauge / Barra de Progreso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-muted-foreground uppercase text-[11px] tracking-wider">
                        Nivel de Llenado
                      </span>
                      <span className="font-mono font-black text-sm text-foreground">
                        {fillPct}%
                      </span>
                    </div>
                    <div className="w-full bg-muted/80 rounded-full h-4 overflow-hidden border border-border p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical
                            ? 'bg-amber-500'
                            : isWarning
                            ? 'bg-orange-400'
                            : fillPct > 85
                            ? 'bg-blue-600'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-muted-foreground pt-0.5">
                      <span>0 kg</span>
                      <span className="text-amber-600 dark:text-amber-400">Mín: {minCap.toLocaleString()} kg · Alerta: {alertStock.toLocaleString()} kg</span>
                      <span>Máx: {maxCap.toLocaleString()} kg</span>
                    </div>
                  </div>

                  {/* Datos Clave */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Stock Actual
                      </span>
                      <span className={`font-mono text-base font-black block truncate ${
                        isCritical ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                      }`}>
                        {currentStock.toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Capacidad Disponible
                      </span>
                      <span className="font-mono text-base font-black text-foreground block truncate">
                        {Math.max(0, maxCap - currentStock).toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Lote Actual en Silo
                      </span>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-xs font-black text-foreground truncate">
                          {silo.current_lot_number || 'S/L'}
                        </span>
                      </div>
                    </div>

                    {allowCosts && (
                      <>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Costo Unitario
                          </span>
                          <span className="font-mono text-xs font-black text-primary block truncate">
                            ${Number(silo.unit_cost || 0).toFixed(2)} / kg
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5 col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Dinero Invertido en Silo
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ({currentStock.toLocaleString('es-MX', { maximumFractionDigits: 1 })} kg × ${Number(silo.unit_cost || 0).toFixed(2)})
                            </span>
                          </div>
                          <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 block truncate">
                            {formatCurrency(currentStock * Number(silo.unit_cost || 0))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Destino y Conexión Operativa */}
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-foreground">
                    <Icon name="hub" size={16} className="text-primary shrink-0" />
                    <span className="font-semibold text-[11px] leading-tight">
                      Alimentación directa por tubería a <strong>Mezcladora</strong> (Centro de Mezclado).
                    </span>
                  </div>
                </div>

                {/* Footer Card con Acciones Directas */}
                <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenInvoiceModalForSilo(silo.id)}
                    className="w-full font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 h-10 shadow-xs"
                    title={`Registrar factura para sumar kilos a ${silo.name}`}
                  >
                    <Icon name="receipt_long" size={16} />
                    <span>Cargar Factura a este Silo</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR FACTURA DE POLIPROPILENO (ENTRADA A SILO - CERO QR)   */}
      {/* ========================================================================= */}
      {isInvoiceModalOpen && (
        <div
          onClick={() => setIsInvoiceModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col space-y-4 p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Icon name="receipt_long" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-foreground uppercase tracking-wide">
                    Registrar Factura PP (Entrada a Silo)
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Recepción de resina a granel con descarga directa en Silo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Banner de Excepción Cero QR */}
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-950 dark:text-blue-100 flex items-start gap-2.5">
              <Icon name="info" size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black uppercase tracking-wider block">
                  Excepción de Almacén (Sin Impresión de QRs)
                </span>
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  Este material ingresa por tubería directamente al Silo para surtir la Mezcladora. No requiere etiquetas de costal. El inventario se incrementará en Almacén bajo este folio de factura.
                </p>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Folio de Factura */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="tag" size={14} className="text-primary" />
                    <span>Folio de Factura *</span>
                  </label>
                  <Input
                    required
                    autoFocus
                    value={invoiceForm.folio}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, folio: e.target.value.toUpperCase() })}
                    placeholder="Ej. FAC-2026-9901"
                    className="!h-11 font-mono uppercase font-black text-sm bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha de Factura *</label>
                  <Input
                    type="date"
                    required
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="!h-11 bg-background border-border"
                  />
                </div>

                {/* Silo Destino */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="propane_tank" size={14} className="text-primary" />
                    <span>Silo Destino *</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={invoiceForm.silo_id}
                      onChange={(e) => setInvoiceForm({
                        ...invoiceForm,
                        silo_id: e.target.value,
                        material_id: String(getMaterialsForSilo(Number(e.target.value))[0]?.id || '')
                      })}
                      className="w-full !h-11 bg-background border border-border rounded-lg pl-3 pr-10 text-xs sm:text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>-- Selecciona un Silo --</option>
                      {silos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name} ({Number(s.current_stock_kg).toLocaleString()} kg disp. / Máx: {Number(s.capacity_kg).toLocaleString()} kg)
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <Icon name="expand_more" size={20} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="label" size={14} className="text-primary" />
                    <span>Polipropileno de la factura *</span>
                  </label>
                  <select
                    required
                    value={invoiceForm.material_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, material_id: e.target.value })}
                    className="w-full !h-11 bg-background border border-border rounded-lg px-3 text-xs sm:text-sm font-bold text-foreground"
                  >
                    <option value="" disabled>Selecciona un material con la etiqueta del silo</option>
                    {selectedSiloMaterials.map((material: any) => (
                      <option key={material.id} value={material.id}>{material.internal_code || material.code || 'MP'} · {material.name}</option>
                    ))}
                  </select>
                  {selectedSiloMaterials.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No hay materiales con la etiqueta del silo. Asigna esa etiqueta al material antes de registrar el ingreso.</p>
                  )}
                </div>

                {/* Kilos Recibidos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="scale" size={14} className="text-primary" />
                    <span>Kilos Recibidos (kg) *</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={invoiceForm.quantity_kg}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, quantity_kg: e.target.value })}
                    placeholder="Ej. 30000"
                    className="!h-11 font-mono font-black text-base bg-background border-border"
                  />
                </div>

                {/* Proveedor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="local_shipping" size={14} className="text-muted-foreground" />
                    <span>Proveedor (Opcional)</span>
                  </label>
                  <Input
                    value={invoiceForm.supplier_name}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supplier_name: e.target.value })}
                    placeholder="Ej. Indelpro / Braskem"
                    className="!h-11 text-xs sm:text-sm font-semibold bg-background border-border"
                  />
                </div>

                {/* Número de Lote */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="barcode" size={14} className="text-muted-foreground" />
                    <span>Número de Lote</span>
                  </label>
                  <Input
                    value={invoiceForm.lot_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, lot_number: e.target.value.toUpperCase() })}
                    placeholder="Ej. LOT-PP-26-004"
                    className="!h-11 font-mono uppercase font-bold text-xs sm:text-sm bg-background border-border"
                  />
                </div>

                {/* Costo Unitario */}
                {allowCosts && (
                  <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon name="currency_exchange" size={14} className="text-muted-foreground" />
                      <span>Moneda de factura</span>
                    </label>
                    <select
                      value={invoiceForm.currency}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
                      className="w-full !h-11 bg-background border border-border rounded-lg px-3 text-sm font-bold text-foreground"
                    >
                      <option value="MXN">MXN · Peso mexicano</option>
                      <option value="USD">USD · Dólar estadounidense</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon name="attach_money" size={14} className="text-muted-foreground" />
                      <span>Costo Unitario ({invoiceForm.currency}/kg) *</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.0001"
                      required
                      value={invoiceForm.unit_cost}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, unit_cost: e.target.value })}
                      placeholder={invoiceForm.currency === 'USD' ? 'Ej. 1.65' : 'Ej. 28.50'}
                      className="!h-11 font-mono font-bold text-xs sm:text-sm bg-background border-border"
                    />
                  </div>
                  {
                    <div className="sm:col-span-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
                      {exchangeRateQuery.isLoading ? 'Consultando tipo de cambio del DOF…' : exchangeRateQuery.data ? (
                        (() => {
                          const amount = Number(invoiceForm.unit_cost || 0);
                          const rate = Number(exchangeRateQuery.data.rate);
                          const mxn = invoiceForm.currency === 'USD' ? amount * rate : amount;
                          const usd = invoiceForm.currency === 'USD' ? amount : (rate > 0 ? amount / rate : 0);
                          return <>Tipo de cambio del DOF: {rate} MXN/USD ({exchangeRateQuery.data.date}). Se guardarán {formatCurrency(mxn)} MXN y ${usd.toFixed(6)} USD.</>;
                        })()
                      ) : exchangeRateQuery.error ? (
                        'No se pudo consultar el Diario Oficial de la Federación. Verifica la fecha y la conexión antes de registrar la factura.'
                      ) : 'Se consultará la cotización publicada por el DOF para la fecha de factura.'}
                    </div>
                  }
                  </>
                )}

                {/* Notas */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon name="edit_note" size={14} className="text-muted-foreground" />
                    <span>Observaciones de la Recepción</span>
                  </label>
                  <textarea
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Ej. Descarga en Silo 1 mediante tolva de pipa #24..."
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs sm:text-sm font-medium text-foreground outline-none resize-none"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="font-bold text-xs h-11 px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={invoiceEntryMutation.isPending}
                  className="font-black text-xs sm:text-sm h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-sm"
                >
                  {invoiceEntryMutation.isPending ? (
                    <>
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={18} />
                      Registrar Ingreso al Silo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DAR DE ALTA / EDITAR SILO                                       */}
      {/* ========================================================================= */}
      {isSiloModalOpen && (
        <div
          onClick={() => setIsSiloModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col space-y-4 p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <Icon name="propane_tank" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-foreground uppercase tracking-wide">
                    {editingSilo ? `Editar Silo: ${editingSilo.code}` : 'Dar de Alta Silo'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Configuración de capacidades máximas y umbral de reorden para evitar desabasto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSiloModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSilo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Código */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Código del Silo *
                  </label>
                  <Input
                    required
                    value={siloForm.code}
                    onChange={(e) => setSiloForm({ ...siloForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ej. SILO-01"
                    className="!h-11 font-mono uppercase font-black text-sm bg-background border-border"
                  />
                </div>

                {/* Nombre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre del Silo *
                  </label>
                  <Input
                    required
                    value={siloForm.name}
                    onChange={(e) => setSiloForm({ ...siloForm, name: e.target.value })}
                    placeholder="Ej. Silo 1 - PP Homopolímero"
                    className="!h-11 text-xs sm:text-sm font-bold bg-background border-border"
                  />
                </div>

                {/* Etiqueta compatible con múltiples materiales */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Etiqueta de Material Permitida *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={siloForm.material_tag_id}
                      onChange={(e) => setSiloForm({ ...siloForm, material_tag_id: e.target.value })}
                      className="w-full !h-11 bg-background border border-border rounded-lg pl-3 pr-10 text-xs sm:text-sm font-bold text-foreground outline-none appearance-none cursor-pointer"
                    >
                      <option value="">-- Selecciona una etiqueta --</option>
                      {materialTags.map((tag: any) => (
                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <Icon name="expand_more" size={20} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Cualquier material con esta etiqueta podrá ingresar al silo, aunque cambie su tipo o código de PP.</span>
                </div>

                <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(siloForm.is_extrusion_feed)}
                    onChange={(e) => setSiloForm({ ...siloForm, is_extrusion_feed: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-xs font-black text-foreground">Silo de alimentación directa a Mezcladora</span>
                    <span className="block mt-0.5 text-[10px] text-muted-foreground">Marca únicamente los dos silos físicos que suministran PP a Extrusión. Los demás siguen visibles y valorizados en Almacén, pero no se suman ni se consumen en fórmulas.</span>
                  </span>
                </label>

                {/* Capacidad Máxima */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Capacidad Máxima (kg) *
                  </label>
                  <Input
                    type="number"
                    step="100"
                    min="1000"
                    required
                    value={siloForm.capacity_kg}
                    onChange={(e) => setSiloForm({ ...siloForm, capacity_kg: e.target.value })}
                    placeholder="40000"
                    className="!h-11 font-mono font-black text-sm bg-background border-border"
                  />
                </div>

                {/* Stock mínimo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Icon name="warning" size={14} className="text-amber-500" />
                    <span>Stock Mínimo (kg) *</span>
                  </label>
                  <Input
                    type="number"
                    step="100"
                    min="0"
                    required
                    value={siloForm.min_capacity_kg}
                    onChange={(e) => setSiloForm({ ...siloForm, min_capacity_kg: e.target.value })}
                    placeholder="5000"
                    className="!h-11 font-mono font-black text-sm bg-background border-amber-500/40 text-amber-600 dark:text-amber-400"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Al alcanzar este nivel, el sistema marcará el silo en mínimo crítico.
                  </span>
                </div>

                {/* Stock de alerta */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1">
                    <Icon name="notifications_active" size={14} className="text-orange-500" />
                    Stock de Alerta (kg) *
                  </label>
                  <Input
                    type="number"
                    step="100"
                    min={siloForm.min_capacity_kg || 0}
                    max={siloForm.capacity_kg || undefined}
                    required
                    value={siloForm.alert_stock_kg}
                    onChange={(e) => setSiloForm({ ...siloForm, alert_stock_kg: e.target.value })}
                    placeholder="10000"
                    className="!h-11 font-mono font-black text-sm bg-background border-orange-500/40 text-orange-600 dark:text-orange-400"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium block">Debe ser igual o mayor al mínimo y no superar la capacidad máxima.</span>
                </div>

                {/* El stock, costos y folios solo cambian mediante movimientos */}
                {editingSilo && (
                  <div className="sm:col-span-2 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                    <Icon name="lock" size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold block text-foreground">
                        Control Automático de Inventario
                      </span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                        El <strong>Stock Actual ({Number(editingSilo.current_stock_kg || 0).toLocaleString()} kg)</strong>{allowCosts ? <>, <strong>Costo Unitario (${Number(editingSilo.unit_cost || 0).toFixed(2)})</strong></> : null} y <strong>Lote ({editingSilo.current_lot_number || 'S/L'})</strong> se gestionan exclusivamente mediante los ingresos de almacén y consumos de la mezcladora.
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSiloModalOpen(false)}
                  className="font-bold text-xs h-11 px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createSiloMutation.isPending || updateSiloMutation.isPending}
                  className="font-black text-xs sm:text-sm h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
                >
                  {createSiloMutation.isPending || updateSiloMutation.isPending ? (
                    <>
                      <Icon name="progress_activity" size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={18} />
                      {editingSilo ? 'Guardar Cambios' : 'Registrar Silo'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
