import { useEffect, useMemo, useState } from 'react';
import { Save, X, QrCode } from 'lucide-react';
import { TFAlert, TFButton, TFCard, TFCardContent, TFInput, TFSelect, TFTextarea } from '../../../components/tf-ui';

import {
  useMaterialFamiliesQuery,
  useMaterialCodesQuery,
  useMaterialTypesQuery,
  useMaterialBrandsQuery,
  useOperationalAreasQuery,
  useRankingsQuery,
  useMaterialsQuery
} from '../hooks/useMaterialsQueries';

const MaterialForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isEditing = Boolean(initialData?.id);

  const { data: familiesData } = useMaterialFamiliesQuery({ pageSize: 10000 });
  const { data: codesData } = useMaterialCodesQuery({ pageSize: 10000 });
  const { data: typesData } = useMaterialTypesQuery({ pageSize: 10000 });
  const { data: brandsData } = useMaterialBrandsQuery({ pageSize: 10000 });
  const { data: locationsData } = useOperationalAreasQuery({ pageSize: 10000 });
  const { data: rankingsData } = useRankingsQuery();

  const families = familiesData?.items || [];
  const codes = codesData?.items || [];
  const types = typesData?.items || [];
  const brands = brandsData?.items || [];
  const locations = locationsData?.items || [];
  const rankings = rankingsData?.items || [];

  const [formData, setFormData] = useState({
    ranking_id: initialData?.ranking_id || '',
    family_uuid: initialData?.family?.uuid || '',
    material_code_uuid: initialData?.material_code?.uuid || '',
    type_uuid: initialData?.type?.uuid || '',
    brand_uuid: initialData?.brand?.uuid || '',
    location_uuid: initialData?.default_location?.uuid || '',
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
      setFormData((current) => ({
        ...current,
        ranking_id: initialData?.ranking_id || current.ranking_id,
        family_uuid: initialData?.family?.uuid || current.family_uuid,
        material_code_uuid: initialData?.material_code?.uuid || current.material_code_uuid,
        type_uuid: initialData?.type?.uuid || current.type_uuid,
        brand_uuid: initialData?.brand?.uuid || current.brand_uuid,
        location_uuid: initialData?.default_location?.uuid || current.location_uuid,
        name: initialData.name || current.name,
        description: initialData.description || current.description,
        minimum_stock: initialData.minimum_stock ?? current.minimum_stock,
        reorder_point: initialData.reorder_point ?? current.reorder_point,
        is_active: initialData.is_active ?? current.is_active,
      }));
    }
  }, [initialData]);

  // Robust fallback: if initialData only provided an ID for location, find its UUID once locations load
  useEffect(() => {
    if (initialData && !formData.location_uuid && initialData.default_location?.id && locations.length > 0) {
      const loc = locations.find(l => l.id === initialData.default_location.id);
      if (loc && loc.uuid) updateField('location_uuid', loc.uuid);
    }
  }, [initialData, locations, formData.location_uuid]);

  // Same for material code and type just in case they were missing UUIDs in the API response
  useEffect(() => {
    if (initialData && !formData.material_code_uuid && initialData.material_code?.id && codes.length > 0) {
      const code = codes.find(c => c.id === initialData.material_code.id);
      if (code && code.uuid) updateField('material_code_uuid', code.uuid);
    }
  }, [initialData, codes, formData.material_code_uuid]);

  useEffect(() => {
    if (initialData && !formData.type_uuid && initialData.type?.id && types.length > 0) {
      const type = types.find(t => t.id === initialData.type.id);
      if (type && type.uuid) updateField('type_uuid', type.uuid);
    }
  }, [initialData, types, formData.type_uuid]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const familyOptions = families.map(f => ({ value: f.uuid, label: `${f.code} - ${f.name}` }));
  const codeOptions = codes.map(c => ({ value: c.uuid, label: `${c.code} - ${c.name}` }));
  
  // Group Types by Recommended (used by family) and Others
  const recommendedTypes = types.filter(t => validTypeUuids.has(t.uuid));
  const otherTypes = types.filter(t => !validTypeUuids.has(t.uuid));
  const typeOptions = formData.family_uuid ? [
    ...recommendedTypes.map(t => ({ value: t.uuid, label: `⭐ ${t.name}` })),
    ...(otherTypes.length > 0 ? [{ value: 'SEP_1', label: '--- Otros Tipos ---', disabled: true }] : []),
    ...otherTypes.map(t => ({ value: t.uuid, label: t.name }))
  ] : types.map(t => ({ value: t.uuid, label: t.name }));

  // Group Brands by Recommended (used by family) and Others
  const recommendedBrands = brands.filter(b => validBrandUuids.has(b.uuid));
  const otherBrands = brands.filter(b => !validBrandUuids.has(b.uuid));
  const brandOptions = formData.family_uuid ? [
    ...recommendedBrands.map(b => ({ value: b.uuid, label: `⭐ ${b.name}` })),
    ...(otherBrands.length > 0 ? [{ value: 'SEP_2', label: '--- Otras Marcas ---', disabled: true }] : []),
    ...otherBrands.map(b => ({ value: b.uuid, label: b.name }))
  ] : brands.map(b => ({ value: b.uuid, label: b.name }));

  const locationOptions = locations.map(l => ({ 
    value: l.uuid, 
    label: `${l.code} - ${l.name}` 
  }));
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

  const handleSubmit = (event) => {
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
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      minimum_stock: formData.minimum_stock !== '' ? Number(formData.minimum_stock) : undefined,
      reorder_point: formData.reorder_point !== '' ? Number(formData.reorder_point) : undefined,
    };

    if (isEditing) {
      payload.is_active = Boolean(formData.is_active);
    }

    onSubmit?.(payload);
  };

  return (
    <TFCard>
      <TFCardContent>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          {formError && (
            <TFAlert variant="danger" title="Revisa el formulario" message={formError} />
          )}

          {/* TARJETA VISUAL DE CÓDIGO */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-center shadow-inner">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <QrCode size={16} /> Código Interno del Material
            </p>
            <div className="text-3xl font-black text-slate-800 font-mono tracking-widest">
              {previewCode}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              El consecutivo real se asignará al guardar. Este código será parte de la nomenclatura del QR en recepción.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
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
              disabled={isEditing || isSubmitting}
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

          <div className="grid gap-5 md:grid-cols-2">
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
          />

          {isEditing && (
            <TFSelect
              label="Estado"
              name="is_active"
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => updateField('is_active', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ]}
              disabled={isSubmitting}
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <TFButton type="button" variant="secondary" icon={X} onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </TFButton>
            <TFButton type="submit" icon={Save} isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear material'}
            </TFButton>
          </div>
        </form>
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialForm;