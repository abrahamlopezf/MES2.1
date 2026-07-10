import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';

import {
  TFAlert,
  TFButton,
  TFCard,
  TFCardContent,
  TFInput,
  TFSelect,
  TFTextarea,
} from '../../../components/tf-ui';

import {
  MATERIAL_TYPE_OPTIONS,
  MATERIAL_UNIT_OPTIONS,
} from '../constants/materialsUi';

const getInitialState = (initialData) => ({
  material_category_id: initialData?.material_category_id
    ? String(initialData.material_category_id)
    : '',
  code: initialData?.code || '',
  name: initialData?.name || '',
  material_type: initialData?.material_type || '',
  default_unit: initialData?.default_unit || '',
  description: initialData?.description || '',
  technical_notes: initialData?.technical_notes || '',
  min_stock:
    initialData?.min_stock !== null && initialData?.min_stock !== undefined
      ? String(initialData.min_stock)
      : '',
  is_active: initialData?.is_active ?? true,
});

const MaterialForm = ({
  categories = [],
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState(getInitialState(initialData));
  const [formError, setFormError] = useState(null);

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    setFormData(getInitialState(initialData));
    setFormError(null);
  }, [initialData]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((category) => category.is_active || category.id === initialData?.material_category_id)
      .map((category) => ({
        value: String(category.id),
        label: `${category.name} (${category.code})`,
      }));
  }, [categories, initialData]);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.material_category_id) {
      return 'Selecciona una categoría.';
    }

    if (!formData.code.trim()) {
      return 'Captura el código del material.';
    }

    if (!formData.name.trim()) {
      return 'Captura el nombre del material.';
    }

    if (!formData.material_type) {
      return 'Selecciona el tipo de material.';
    }

    if (!formData.default_unit) {
      return 'Selecciona la unidad predeterminada.';
    }

    if (formData.min_stock !== '' && Number(formData.min_stock) < 0) {
      return 'El stock mínimo no puede ser negativo.';
    }

    return null;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);

    const payload = {
      material_category_id: Number(formData.material_category_id),
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      material_type: formData.material_type,
      default_unit: formData.default_unit,
      description: formData.description.trim() || null,
      technical_notes: formData.technical_notes.trim() || null,
      min_stock: formData.min_stock === '' ? 0 : Number(formData.min_stock),
    };

    if (isEditing) {
      payload.is_active = Boolean(formData.is_active);
    }

    onSubmit?.(payload);
  };

  return (
    <TFCard>
      <TFCardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {formError && (
            <TFAlert
              variant="danger"
              title="Revisa el formulario"
              message={formError}
            />
          )}

          {categoryOptions.length === 0 && (
            <TFAlert
              variant="warning"
              title="Necesitas una categoría activa"
              message="Antes de crear materiales, registra al menos una categoría activa."
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TFInput
              label="Código"
              name="code"
              placeholder="Ej. PP-001"
              value={formData.code}
              onChange={(event) => updateField('code', event.target.value)}
              helperText="Código único para identificar el material."
              required
            />

            <TFInput
              label="Nombre"
              name="name"
              placeholder="Ej. Polipropileno"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />

            <TFSelect
              label="Categoría"
              name="material_category_id"
              placeholder="Selecciona categoría"
              value={formData.material_category_id}
              onChange={(event) =>
                updateField('material_category_id', event.target.value)
              }
              options={categoryOptions}
              required
            />

            <TFSelect
              label="Tipo de material"
              name="material_type"
              placeholder="Selecciona tipo"
              value={formData.material_type}
              onChange={(event) =>
                updateField('material_type', event.target.value)
              }
              options={MATERIAL_TYPE_OPTIONS}
              required
            />

            <TFSelect
              label="Unidad predeterminada"
              name="default_unit"
              placeholder="Selecciona unidad"
              value={formData.default_unit}
              onChange={(event) =>
                updateField('default_unit', event.target.value)
              }
              options={MATERIAL_UNIT_OPTIONS}
              required
            />

            <TFInput
              label="Stock mínimo"
              name="min_stock"
              type="number"
              min="0"
              step="0.001"
              placeholder="Ej. 100"
              value={formData.min_stock}
              onChange={(event) => updateField('min_stock', event.target.value)}
              helperText="Usaremos este dato para alertas futuras."
            />

            {isEditing && (
              <TFSelect
                label="Estado"
                name="is_active"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(event) =>
                  updateField('is_active', event.target.value === 'true')
                }
                options={[
                  { value: 'true', label: 'Activo' },
                  { value: 'false', label: 'Inactivo' },
                ]}
              />
            )}
          </div>

          <TFTextarea
            label="Descripción"
            name="description"
            placeholder="Describe el uso general del material."
            value={formData.description}
            onChange={(event) => updateField('description', event.target.value)}
          />

          <TFTextarea
            label="Notas técnicas"
            name="technical_notes"
            placeholder="Ej. Validar peso recibido, lote, proveedor o condiciones especiales."
            value={formData.technical_notes}
            onChange={(event) =>
              updateField('technical_notes', event.target.value)
            }
          />

          <div className="grid gap-3 sm:flex sm:justify-end">
            <TFButton
              type="button"
              variant="secondary"
              icon={X}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </TFButton>

            <TFButton
              type="submit"
              icon={Save}
              isLoading={isSubmitting}
              disabled={categoryOptions.length === 0}
            >
              {isEditing ? 'Guardar cambios' : 'Crear material'}
            </TFButton>
          </div>
        </form>
      </TFCardContent>
    </TFCard>
  );
};

export default MaterialForm;