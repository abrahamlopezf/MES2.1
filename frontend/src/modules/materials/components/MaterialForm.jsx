import { useEffect, useMemo, useState } from 'react';
import { Save, X, QrCode, ShieldAlert } from 'lucide-react';
import { useConfirmAction } from '../../../providers/ConfirmProvider';
import { TFAlert, TFButton, TFCard, TFCardContent, TFInput, TFSelect, TFTextarea } from '../../../components/tf-ui';

import {
  useMaterialFamiliesQuery,
  useMaterialCodesQuery,
  useMaterialTypesQuery,
  useMaterialBrandsQuery,
  useOperationalAreasQuery,
  useRankingsQuery,
  useMaterialsQuery,
  useMaterialUnitsQuery
} from '../hooks/useMaterialsQueries';

const MaterialForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
  onDeactivate,
}) => {
  const { confirm } = useConfirmAction();
  const isEditing = Boolean(initialData?.id);

  const { data: familiesData } = useMaterialFamiliesQuery({ pageSize: 10000 });
  const { data: codesData } = useMaterialCodesQuery({ pageSize: 10000 });
  const { data: typesData } = useMaterialTypesQuery({ pageSize: 10000 });
  const { data: brandsData } = useMaterialBrandsQuery({ pageSize: 10000 });
  const { data: locationsData } = useOperationalAreasQuery({ pageSize: 10000 });
  const { data: unitsData } = useMaterialUnitsQuery({ pageSize: 10000 });
  const { data: rankingsData } = useRankingsQuery();

  const families = familiesData?.items || [];
  const codes = codesData?.items || [];
  const types = typesData?.items || [];
  const brands = brandsData?.items || [];
  const locations = locationsData?.items || [];
  const units = unitsData?.items || [];
  const rankings = rankingsData?.items || [];

  const [formData, setFormData] = useState({
    ranking_id: initialData?.ranking_id || '',
    family_uuid: initialData?.family?.uuid || (initialData?.family?.id ? String(initialData.family.id) : (initialData?.family_id ? String(initialData.family_id) : '')),
    material_code_uuid: initialData?.material_code?.uuid || (initialData?.material_code?.id ? String(initialData.material_code.id) : (initialData?.material_code_id ? String(initialData.material_code_id) : '')),
    type_uuid: initialData?.type?.uuid || (initialData?.type?.id ? String(initialData.type.id) : (initialData?.type_id ? String(initialData.type_id) : '')),
    brand_uuid: initialData?.brand?.uuid || (initialData?.brand?.id ? String(initialData.brand.id) : (initialData?.brand_id ? String(initialData.brand_id) : '')),
    base_unit_uuid: initialData?.base_unit?.uuid || (initialData?.base_unit?.id ? String(initialData.base_unit.id) : (initialData?.base_unit_id ? String(initialData.base_unit_id) : '')),
    location_uuid: initialData?.default_location?.uuid || (initialData?.default_location?.id ? String(initialData.default_location.id) : (initialData?.default_location_id ? String(initialData.default_location_id) : '')),
    name: initialData?.name || '',
    description: initialData?.description || '',
    minimum_stock: initialData?.minimum_stock ?? '',
    reorder_point: initialData?.reorder_point ?? '',
    is_active: initialData?.is_active ?? true,
  });

  // Fetch materials for the selected family to dynamically filter/recommend Types and Brands
  const { data: familyMaterialsData } = useMaterialsQuery({
    family_uuid: formData.family_uuid || 'none',
    limit: 'all',
  });
  const familyMaterials = familyMaterialsData?.items || [];
  
  const validTypeUuids = new Set(familyMaterials.map(m => m.type?.uuid).filter(Boolean));
  const validBrandUuids = new Set(familyMaterials.map(m => m.brand?.uuid).filter(Boolean));
  
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (initialData) {
      console.log("MaterialForm initialization debug:", JSON.stringify({
        initialType: initialData.type,
        initialTypeId: initialData.type_id,
        initialLocation: initialData.default_location,
        initialLocationId: initialData.default_location_id,
      }, null, 2));
      setFormData((current) => ({
        ...current,
        ranking_id: initialData?.ranking_id || current.ranking_id,
        family_uuid: initialData?.family?.uuid || (initialData?.family?.id ? String(initialData.family.id) : (initialData?.family_id ? String(initialData.family_id) : current.family_uuid)),
        material_code_uuid: initialData?.material_code?.uuid || (initialData?.material_code?.id ? String(initialData.material_code.id) : (initialData?.material_code_id ? String(initialData.material_code_id) : current.material_code_uuid)),
        type_uuid: initialData?.type?.uuid || (initialData?.type?.id ? String(initialData.type.id) : (initialData?.type_id ? String(initialData.type_id) : current.type_uuid)),
        brand_uuid: initialData?.brand?.uuid || (initialData?.brand?.id ? String(initialData.brand.id) : (initialData?.brand_id ? String(initialData.brand_id) : current.brand_uuid)),
        location_uuid: initialData?.default_location?.uuid || (initialData?.default_location?.id ? String(initialData.default_location.id) : (initialData?.default_location_id ? String(initialData.default_location_id) : current.location_uuid)),
        base_unit_uuid: initialData?.base_unit?.uuid || (initialData?.base_unit?.id ? String(initialData.base_unit.id) : (initialData?.base_unit_id ? String(initialData.base_unit_id) : current.base_unit_uuid)),
        name: initialData.name || current.name,
        description: initialData.description || current.description,
        minimum_stock: initialData.minimum_stock ?? current.minimum_stock,
        reorder_point: initialData.reorder_point ?? current.reorder_point,
        is_active: initialData.is_active ?? current.is_active,
      }));
    }
  }, [initialData]);

  // Robust fallback: if initialData only provided an ID, find its UUID once the catalogues load
  useEffect(() => {
    const locId = initialData?.default_location?.id || initialData?.default_location_id;
    if (locId && locations.length > 0) {
      if (formData.location_uuid === String(locId)) {
        const item = locations.find(x => String(x.id) === String(locId));
        if (item && item.uuid) updateField('location_uuid', item.uuid);
      }
    }
  }, [initialData, locations, formData.location_uuid]);

  useEffect(() => {
    const codeId = initialData?.material_code?.id || initialData?.material_code_id;
    if (codeId && codes.length > 0) {
      if (formData.material_code_uuid === String(codeId)) {
        const item = codes.find(x => String(x.id) === String(codeId));
        if (item && item.uuid) updateField('material_code_uuid', item.uuid);
      }
    }
  }, [initialData, codes, formData.material_code_uuid]);

  useEffect(() => {
    const typeId = initialData?.type?.id || initialData?.type_id;
    if (typeId && types.length > 0) {
      if (formData.type_uuid === String(typeId)) {
        const item = types.find(x => String(x.id) === String(typeId));
        if (item && item.uuid) updateField('type_uuid', item.uuid);
      }
    }
  }, [initialData, types, formData.type_uuid]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const familyOptions = families.map(f => ({ value: f.uuid || String(f.id), label: `${f.code} - ${f.name}` }));
  const codeOptions = codes.map(c => ({ value: c.uuid || String(c.id), label: `${c.code} - ${c.name}` }));
  
  // Group Types by Recommended (used by family) and Others
  const recommendedTypes = types.filter(t => validTypeUuids.has(t.uuid || String(t.id)));
  const otherTypes = types.filter(t => !validTypeUuids.has(t.uuid || String(t.id)));
  const typeOptions = formData.family_uuid ? [
    ...recommendedTypes.map(t => ({ value: t.uuid || String(t.id), label: `⭐ ${t.name}` })),
    ...(otherTypes.length > 0 ? [{ value: 'SEP_1', label: '--- Otros Tipos ---', disabled: true }] : []),
    ...otherTypes.map(t => ({ value: t.uuid || String(t.id), label: t.name }))
  ] : types.map(t => ({ value: t.uuid || String(t.id), label: t.name }));

  // Group Brands by Recommended (used by family) and Others
  const recommendedBrands = brands.filter(b => validBrandUuids.has(b.uuid || String(b.id)));
  const otherBrands = brands.filter(b => !validBrandUuids.has(b.uuid || String(b.id)));
  const brandOptions = formData.family_uuid ? [
    ...recommendedBrands.map(b => ({ value: b.uuid || String(b.id), label: `⭐ ${b.name}` })),
    ...(otherBrands.length > 0 ? [{ value: 'SEP_2', label: '--- Otras Marcas ---', disabled: true }] : []),
    ...otherBrands.map(b => ({ value: b.uuid || String(b.id), label: b.name }))
  ] : brands.map(b => ({ value: b.uuid || String(b.id), label: b.name }));

  const locationOptions = locations.map(l => ({ 
    value: l.uuid || String(l.id), 
    label: `${l.code} - ${l.name}` 
  }));


  const unitOptions = units.map(u => ({ value: u.uuid || String(u.id), label: `${u.code} - ${u.name}` }));
  const rankingOptions = rankings.map(r => ({ value: String(r.id), label: `${r.nomenclature} - ${r.name}` }));

  const selectedFamily = families.find(f => f.uuid === formData.family_uuid);
  const selectedCode = codes.find(c => c.uuid === formData.material_code_uuid);

  // Vista Previa visual del Código del Material
  const previewCode = useMemo(() => {
    if (isEditing && initialData?.internal_code) return initialData.internal_code;
    const famCode = selectedFamily ? selectedFamily.code : '[FAMILIA]';
    const artCode = selectedCode ? selectedCode.code : '[ARTICULO]';
    return `${famCode}-${artCode}-XXX`;
  }, [selectedFamily, selectedCode, isEditing, initialData]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.family_uuid || !formData.material_code_uuid || !formData.name.trim() || !formData.ranking_id) {
      setFormError('Por favor complete todos los campos obligatorios (Familia, Artículo, Nombre y Ranking).');
      return;
    }

    setFormError(null);

    const payload = {
      ranking_id: parseInt(formData.ranking_id, 10),
      family_uuid: formData.family_uuid,
      material_code_uuid: formData.material_code_uuid,
      type_uuid: formData.type_uuid || null,
      brand_uuid: formData.brand_uuid || null,
      location_uuid: formData.location_uuid || null,
      base_unit_uuid: formData.base_unit_uuid || null,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      minimum_stock: formData.minimum_stock !== '' ? Number(formData.minimum_stock) : undefined,
      reorder_point: formData.reorder_point !== '' ? Number(formData.reorder_point) : undefined,
    };

    if (isEditing) {
      payload.is_active = Boolean(formData.is_active);
    }

    confirm({
      title: isEditing ? 'Guardar Cambios' : 'Registrar Material',
      message: '¿Está seguro de guardar la información de este material?',
      confirmText: 'Sí, guardar',
      variant: 'primary',
      action: async () => {
        if (onSubmit) {
          await onSubmit(payload);
        }
      }
    });
  };

  return (
    <form className="flex flex-col h-full overflow-hidden" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
        {formError && (
          <TFAlert variant="danger" title="Revisa el formulario" message={formError} />
        )}

        {/* TARJETA VISUAL DE CÓDIGO */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 text-center shadow-inner overflow-hidden animate-form-field" style={{ '--stagger': 1 }}>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <QrCode size={14} /> Código Interno del Material
            </p>
            <div className="text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 font-mono tracking-wider sm:tracking-widest break-all">
              {previewCode}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-snug">
              El consecutivo real se asignará al guardar. Este código será parte de la nomenclatura del QR en recepción.
            </p>
          </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 animate-form-field [&>*]:min-w-0" style={{ '--stagger': 2 }}>
            <TFSelect
              label="Ranking *"
              name="ranking_id"
              placeholder="Selecciona el Ranking"
              value={formData.ranking_id}
              onChange={(e) => updateField('ranking_id', e.target.value)}
              options={rankingOptions}
              disabled={isSubmitting}
              required
            />

            <TFSelect
              label="Familia *"
              name="family_uuid"
              placeholder="Selecciona la Familia"
              value={formData.family_uuid}
              onChange={(e) => updateField('family_uuid', e.target.value)}
              options={familyOptions}
              disabled={isEditing || isSubmitting}
              required
            />
            
            <TFSelect
              label="Artículo / Consecutivo *"
              name="material_code_uuid"
              placeholder="Selecciona el Artículo"
              value={formData.material_code_uuid}
              onChange={(e) => updateField('material_code_uuid', e.target.value)}
              options={codeOptions}
              disabled={isEditing || isSubmitting}
              required
            />

            <TFInput
              label="Nombre del Material *"
              name="name"
              placeholder="Ej. Lentes de seguridad oscuros"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={isSubmitting}
              required
            />
        </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 animate-form-field [&>*]:min-w-0" style={{ '--stagger': 3 }}>
            <TFSelect
              label="Tipo de Material"
              name="type_uuid"
              placeholder="Selecciona el Tipo (Opcional)"
              value={formData.type_uuid}
              onChange={(e) => updateField('type_uuid', e.target.value)}
              options={typeOptions}
              disabled={isEditing || isSubmitting}
            />

            <TFSelect
              label="Localidad Sugerida (Recepción)"
              name="location_uuid"
              placeholder="Selecciona Localidad (Opcional)"
              value={formData.location_uuid}
              onChange={(e) => updateField('location_uuid', e.target.value)}
              options={locationOptions}
              disabled={isSubmitting}
            />

            <TFSelect
              label="Unidad de Medida (Base)"
              name="base_unit_uuid"
              placeholder="Selecciona Unidad (Opcional)"
              value={formData.base_unit_uuid}
              onChange={(e) => updateField('base_unit_uuid', e.target.value)}
              options={unitOptions}
              disabled={isSubmitting}
            />

            <TFSelect
              label="Marca"
              name="brand_uuid"
              placeholder="Selecciona la Marca (Opcional)"
              value={formData.brand_uuid}
              onChange={(e) => updateField('brand_uuid', e.target.value)}
              options={brandOptions}
              disabled={isSubmitting}
            />
          </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 animate-form-field" style={{ '--stagger': 4 }}>
            <TFInput
              label="Stock Mínimo"
              name="minimum_stock"
              type="number"
              placeholder="0.00"
              value={formData.minimum_stock}
              onChange={(e) => updateField('minimum_stock', e.target.value)}
              disabled={isSubmitting}
            />

            <TFInput
              label="Alerta de Stock (Reorden)"
              name="reorder_point"
              type="number"
              placeholder="0.00"
              value={formData.reorder_point}
              onChange={(e) => updateField('reorder_point', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

        <TFTextarea
          label="Descripción"
          name="description"
          placeholder="Describe características adicionales, empaque, uso general, etc."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          disabled={isSubmitting}
          containerClassName="animate-form-field"
          style={{ '--stagger': 5 }}
        />
      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 animate-form-field flex-wrap" style={{ '--stagger': 6 }}>
        {isEditing && onDeactivate && initialData?.is_active && (
          <TFButton
            variant="danger"
            icon={ShieldAlert}
            type="button"
            onClick={() => onDeactivate(initialData)}
            disabled={isSubmitting}
            className="order-first sm:mr-auto"
          >
            Desactivar
          </TFButton>
        )}
        <TFButton 
          type="button" 
          variant="secondary" 
          onClick={onCancel} 
          disabled={isSubmitting} 
        >
          Cancelar
        </TFButton>
        <TFButton 
          type="submit" 
          variant="primary"
          icon={Save} 
          isLoading={isSubmitting} 
        >
          {isEditing ? 'Guardar cambios' : 'Crear material'}
        </TFButton>
      </div>

      </div>
    </form>
  );
};

export default MaterialForm;