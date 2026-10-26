import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../../api/axiosClient';
import { toast } from 'sonner';
import { useConfirmAction } from '../../../../providers/ConfirmProvider';
import { ManualEntryBottomSheetPresenter } from './ManualEntryBottomSheet.presenter';
import { downloadBatchPdf } from '../../../identity/presentation/hooks/useIdentityBatches';
import { Link } from 'react-router-dom';
import { Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { 
  TFDialog, 
  TFDialogContent, 
  TFDialogHeader, 
  TFDialogTitle, 
  TFDialogDescription, 
  TFDialogFooter, 
  TFButton 
} from '../../../../components/tf-ui';

export interface ManualEntryBottomSheetContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualEntryBottomSheet: React.FC<ManualEntryBottomSheetContainerProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmAction();
  const [materialId, setMaterialId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [selectedSiloId, setSelectedSiloId] = useState<string>('');
  const [entries, setEntries] = useState([{ folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
  const [notes, setNotes] = useState('');
  const [catalogReminder, setCatalogReminder] = useState<any>(null);

  // Clear state when opened
  useEffect(() => {
    if (isOpen) {
      setMaterialId('');
      setLocationId('');
      setSelectedSiloId('');
      setEntries([{ folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
      setNotes('');
    }
  }, [isOpen]);

  const { data: materialsData, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const response = await axiosClient.get(`/materials?pageSize=10000`);
      return response.data;
    },
    enabled: isOpen
  });

  const materialsList = materialsData?.data?.items || (Array.isArray(materialsData?.data) ? materialsData.data : []);
  const materials = [...materialsList].sort((a: any, b: any) => {
    const textA = `${a.internal_code} - ${a.name}`.toLowerCase();
    const textB = `${b.internal_code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { data: rawLocations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['warehouse', 'locations'],
    queryFn: async () => {
      const response = await axiosClient.get(`/locations?pageSize=10000`);
      return response.data.data;
    },
    enabled: isOpen
  });

  const locations = [...rawLocations].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.description || a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.description || b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  const { data: rawSuppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['materials', 'suppliers'],
    queryFn: async () => {
      const response = await axiosClient.get(`/suppliers?pageSize=10000`);
      return response.data.data;
    },
    enabled: isOpen
  });

  const suppliers = [...rawSuppliers].sort((a: any, b: any) => {
    const textA = `${a.code} - ${a.name}`.toLowerCase();
    const textB = `${b.code} - ${b.name}`.toLowerCase();
    return textA.localeCompare(textB);
  });

  // Silos activos para abastecimiento directo de Polipropileno
  const { data: silosData = [], isLoading: loadingSilos } = useQuery({
    queryKey: ['warehouse', 'silos'],
    queryFn: async () => {
      const response = await axiosClient.get('/warehouse/silos');
      return response.data?.data || response.data || [];
    },
    enabled: isOpen
  });
  const silos = Array.isArray(silosData) ? silosData : [];

  // Helper para detectar si el material seleccionado es Polipropileno a granel (Silo)
  const isPpMaterial = (mat: any) => {
    if (!mat) return false;
    const name = (mat.name || mat.material_name || '').toUpperCase();
    const code = (mat.internal_code || mat.code || mat.material_code || '').toUpperCase();
    return name.includes('POLIPROPILENO') || name.includes('PP ') || code.startsWith('MP-PP') || code.includes('PP-');
  };

  const selectedMaterialObj = materials.find((m: any) => m.id.toString() === materialId);
  const isPp = isPpMaterial(selectedMaterialObj);

  // Preseleccionar Silo cuando se elija Polipropileno
  useEffect(() => {
    if (isPp && silos.length > 0 && !selectedSiloId) {
      const matched = silos.find((s: any) => Number(s.material_id) === Number(materialId)) || silos[0];
      if (matched) setSelectedSiloId(String(matched.id));
    }
  }, [isPp, silos, materialId, selectedSiloId]);

  const { mutate: handleManualEntry, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      const response = await axiosClient.post('/warehouse/inventory/manual-entry', {
        material_id: Number(materialId),
        location_id: isPp ? null : (locationId ? Number(locationId) : null),
        silo_id: isPp && selectedSiloId ? Number(selectedSiloId) : null,
        entries: entries.map(e => ({ 
          folio: e.folio, 
          quantity: Number(e.quantity),
          supplier_id: e.supplier_id ? (String(e.supplier_id).startsWith('NEW:') ? e.supplier_id : Number(e.supplier_id)) : null,
          unit_cost: e.unit_cost ? Number(e.unit_cost) : null
        })),
        notes
      });
      return response.data;
    },
    onSuccess: async (data) => {
      const resPayload = data?.data || data;
      if (resPayload?.is_silo) {
        toast.success(`Ingreso a Silo ${resPayload?.silo_code || ''} registrado exitosamente (${resPayload?.total_quantity || ''} kg). Sin generación de QR.`);
      } else {
        toast.success('Ingreso manual registrado exitosamente');
      }

      queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
      queryClient.invalidateQueries({ queryKey: ['materials', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'silos'] });
      queryClient.invalidateQueries({ queryKey: ['extrusion', 'silos'] });
      
      const createdCatalogs = resPayload?.created_catalogs || [];
      const qrBatchId = resPayload?.qrBatchId;
      if (qrBatchId && !resPayload?.is_silo) {
        toast.info('Generando y descargando códigos QR...');
        try {
          await downloadBatchPdf(qrBatchId, 'MANUAL-ENTRY');
        } catch (e) {
          toast.error('Ocurrió un error al descargar el PDF de Códigos QR.');
        }
      }

      if (createdCatalogs.length > 0) {
        const selectedMat = materials.find((m: any) => m.id.toString() === materialId);
        setCatalogReminder({
          materialName: selectedMat ? `${selectedMat.internal_code} - ${selectedMat.name}` : 'Material',
          catalogs: createdCatalogs
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    },
    onError: (error: any) => {
      console.error("FRONTEND MUTATION ERROR:", error);
      toast.error(error.response?.data?.message || `Error al registrar el ingreso: ${error.message}`);
    }
  });

  const handleMaterialChange = (val: string) => {
    setMaterialId(val);
    const selectedMat = materials.find((m: any) => m.id.toString() === val);
    const selectedIsPp = isPpMaterial(selectedMat);
    if (selectedIsPp) {
      setLocationId('');
    } else if (selectedMat && selectedMat.default_location_id) {
      setLocationId(selectedMat.default_location_id.toString());
    }
  };

  const handleUpdateEntry = (index: number, field: string, value: string) => {
    const newEntries = [...entries];
    if (field === 'quantity') {
      // Bloquear signos negativos o caracteres inválidos
      const sanitized = value.replace(/[^0-9.]/g, '');
      (newEntries[index] as any)[field] = sanitized;
    } else if (field === 'unit_cost') {
      const sanitized = value.replace(/[^0-9.]/g, '');
      (newEntries[index] as any)[field] = sanitized;
    } else {
      (newEntries[index] as any)[field] = value;
    }
    setEntries(newEntries);
  };

  const handleAddEntry = () => {
    setEntries([...entries, { folio: '', quantity: '', supplier_id: '', unit_cost: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const onConfirmEntry = async () => {
    if (!materialId) {
      toast.error('Selecciona un material del catálogo.');
      return;
    }

    if (!isPp && !locationId) {
      toast.error('Selecciona una localidad de almacenamiento.');
      return;
    }

    if (isPp && !selectedSiloId) {
      toast.error('Selecciona el Silo de destino para el Polipropileno.');
      return;
    }

    const hasEmptyQty = entries.some(e => e.quantity === '' || e.quantity === null);
    if (hasEmptyQty) {
      toast.error('Ingresa la cantidad para cada renglón.');
      return;
    }

    const hasInvalidQty = entries.some(e => Number(e.quantity) <= 0 || isNaN(Number(e.quantity)));
    if (hasInvalidQty) {
      toast.error('La cantidad debe ser mayor a 0. No se permiten valores negativos ni cero.');
      return;
    }

    const hasInvalidCost = entries.some(e => e.unit_cost === '' || Number(e.unit_cost) < 0 || isNaN(Number(e.unit_cost)));
    if (hasInvalidCost) {
      toast.error('El costo unitario es obligatorio y no puede ser negativo.');
      return;
    }

    const confirmed = await confirm({
      title: isPp ? 'Ingreso a Silos (Sin QR)' : 'Ingreso de Material',
      message: isPp 
        ? `¿Confirmas el ingreso directo de ${entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0)} kg de Polipropileno al Silo seleccionado? No se generarán etiquetas QR.`
        : `¿Confirmas el ingreso de ${entries.length} lote(s) al almacén?`,
      confirmText: 'Sí, ingresar',
      variant: 'primary'
    });

    if (!confirmed) return;

    handleManualEntry();
  };

  return (
    <>
      <ManualEntryBottomSheetPresenter
        isOpen={isOpen}
        onClose={onClose}
        materialId={materialId}
        locationId={locationId}
        entries={entries}
        notes={notes}
        materials={materials}
        loadingMaterials={loadingMaterials}
        locations={locations}
        loadingLocations={loadingLocations}
        suppliers={suppliers}
        loadingSuppliers={loadingSuppliers}
        isSubmitting={isSubmitting}
        isPp={isPp}
        silos={silos}
        loadingSilos={loadingSilos}
        selectedSiloId={selectedSiloId}
        onChangeMaterialId={handleMaterialChange}
        onChangeLocationId={setLocationId}
        onChangeSiloId={setSelectedSiloId}
        onChangeNotes={setNotes}
        onAddEntry={handleAddEntry}
        onUpdateEntry={handleUpdateEntry}
        onRemoveEntry={handleRemoveEntry}
        onConfirmEntry={onConfirmEntry}
      />

      {/* DIÁLOGO RECORDATORIO DE PROVEEDOR CREADO AL VUELO */}
      {catalogReminder && (
        <TFDialog open={Boolean(catalogReminder)} onOpenChange={() => setCatalogReminder(null)}>
          <TFDialogContent className="max-w-lg p-6 bg-card border-border rounded-2xl shadow-2xl z-[999999]">
            <TFDialogHeader className="pr-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                <Sparkles size={24} />
              </div>
              <TFDialogTitle className="text-xl sm:text-2xl font-black text-foreground">
                ¡Ingreso Registrado con Éxito!
              </TFDialogTitle>
              <TFDialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Se detectaron y crearon nuevos registros en el catálogo de Proveedores.
              </TFDialogDescription>
            </TFDialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Material Ingresado</span>
                  <span className="text-sm font-bold text-foreground">{catalogReminder.materialName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Nuevo proveedor registrado:
                </span>
                <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {catalogReminder.catalogs.map((cat: any, idx: number) => (
                    <div 
                      key={idx}
                      className="bg-background border border-border rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                          {cat.catalog || cat.entity || 'Proveedores'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-foreground truncate">{cat.name}</span>
                          {cat.code && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                              {cat.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={cat.path || '/materials/suppliers'}
                        onClick={() => setCatalogReminder(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <span>Completar</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="leading-snug m-0">
                  <strong>Recordatorio Operativo:</strong> Por favor ingresa al subcatálogo de Proveedores para completar la información restante (RFC, teléfono, correo y razón social) para asegurar la integridad de la base de datos.
                </p>
              </div>
            </div>

            <TFDialogFooter className="mt-2">
              <TFButton
                variant="primary"
                onClick={() => setCatalogReminder(null)}
                className="w-full sm:w-auto h-10 text-sm font-bold"
              >
                Entendido, continuar
              </TFButton>
            </TFDialogFooter>
          </TFDialogContent>
        </TFDialog>
      )}
    </>
  );
};
