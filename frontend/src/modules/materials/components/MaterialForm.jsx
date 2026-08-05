import { useEffect, useMemo, useState } from 'react';
import { Save, X, QrCode } from 'lucide-react';
import { TFAlert, TFButton, TFCard, TFCardContent, TFInput, TFSelect, TFTextarea } from '../../../components/tf-ui';

import {
  useMaterialFamiliesQuery,
  useMaterialCodesQuery,
  useMaterialTypesQuery,
  useMaterialBrandsQuery
} from '../hooks/useMaterialsQueries';

const MaterialForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isEditing = Boolean(initialData?.id);

  // Consultas de catálogos
  const { data: families = [] } = useMaterialFamiliesQuery();
  const { data: codes = [] } = useMaterialCodesQuery();
  const { data: types = [] } = useMaterialTypesQuery();
  const { data: brands = [] } = useMaterialBrandsQuery();

  const [formData, setFormData] = useState({
    family_uuid: initialData?.family?.uuid || '',
    material_code_uuid: initialData?.material_code?.uuid || '',
    type_uuid: initialData?.type?.uuid || '',
    brand_uuid: initialData?.brand?.uuid || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    is_active: initialData?.is_active ?? true,
  });
  
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        family_uuid: initialData?.family?.uuid || '',
        material_code_uuid: initialData?.material_code?.uuid || '',
        type_uuid: initialData?.type?.uuid || '',
        brand_uuid: initialData?.brand?.uuid || '',
        name: initialData.name || '',
        description: initialData.description || '',
        is_active: initialData.is_active ?? true,
      });
    }
  }, [initialData]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const familyOptions = families.map(f => ({ value: f.uuid, label: `${f.code} - ${f.name}` }));
  const codeOptions = codes.map(c => ({ value: c.uuid, label: `${c.code} - ${c.name}` }));
  const typeOptions = types.map(t => ({ value: t.uuid, label: `${t.code} - ${t.name}` }));
  const brandOptions = brands.map(b => ({ value: b.uuid, label: `${b.code} - ${b.name}` }));

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

    if (!formData.family_uuid || !formData.material_code_uuid || !formData.name.trim()) {
      setFormError('Por favor complete todos los campos obligatorios (Familia, Artículo y Nombre).');
      return;
    }

    setFormError(null);

    const payload = {
      family_uuid: formData.family_uuid,
      material_code_uuid: formData.material_code_uuid,
      type_uuid: formData.type_uuid || null,
      brand_uuid: formData.brand_uuid || null,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
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