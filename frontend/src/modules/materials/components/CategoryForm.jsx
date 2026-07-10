import { useEffect, useState } from 'react';
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

const getInitialState = (initialData) => ({
  code: initialData?.code || '',
  name: initialData?.name || '',
  description: initialData?.description || '',
  is_active: initialData?.is_active ?? true,
});

const CategoryForm = ({
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

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.code.trim()) {
      return 'Captura el código de la categoría.';
    }

    if (!formData.name.trim()) {
      return 'Captura el nombre de la categoría.';
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
      code: formData.code.trim().toUpperCase(),
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
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {formError && (
            <TFAlert
              variant="danger"
              title="Revisa el formulario"
              message={formError}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TFInput
              label="Código"
              name="code"
              placeholder="Ej. MP, MS, GEN"
              value={formData.code}
              onChange={(event) => updateField('code', event.target.value)}
              helperText="Código corto y único."
              required
            />

            <TFInput
              label="Nombre"
              name="name"
              placeholder="Ej. Materia Prima"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
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
                  { value: 'true', label: 'Activa' },
                  { value: 'false', label: 'Inactiva' },
                ]}
              />
            )}
          </div>

          <TFTextarea
            label="Descripción"
            name="description"
            placeholder="Describe qué materiales agrupa esta categoría."
            value={formData.description}
            onChange={(event) => updateField('description', event.target.value)}
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
            >
              {isEditing ? 'Guardar cambios' : 'Crear categoría'}
            </TFButton>
          </div>
        </form>
      </TFCardContent>
    </TFCard>
  );
};

export default CategoryForm;