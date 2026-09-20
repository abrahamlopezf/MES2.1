import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { TFButton, TFInput, TFTextarea } from '../../../components/tf-ui';

const GenericCatalogForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
  labels = {
    title: 'Registro de Catálogo',
    codeLabel: 'Código',
    codePlaceholder: 'Ej. SEG',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ej. Seguridad',
    descriptionLabel: 'Descripción'
  }
}) => {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      setFormData({ code: '', name: '', description: '' });
    }
  }, [initialData]);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form className="flex flex-col h-full overflow-hidden" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
        {/* CODE */}
        <TFInput
          label={`${labels.codeLabel} *`}
          required
          value={formData.code}
          onChange={(e) => setField('code', e.target.value.toUpperCase())}
          disabled={!!initialData?.id || isSubmitting}
          placeholder={labels.codePlaceholder}
          maxLength={20}
          containerClassName="animate-form-field"
          style={{ '--stagger': 1 }}
          helperText={!!initialData?.id ? 'El código no puede modificarse tras su creación.' : undefined}
        />

        {/* NAME */}
        <TFInput
          label={`${labels.nameLabel} *`}
          required
          value={formData.name}
          onChange={(e) => setField('name', e.target.value)}
          disabled={isSubmitting}
          placeholder={labels.namePlaceholder}
          maxLength={100}
          containerClassName="animate-form-field"
          style={{ '--stagger': 2 }}
        />

        {/* DESCRIPTION */}
        <TFTextarea
          label={labels.descriptionLabel}
          value={formData.description}
          onChange={(e) => setField('description', e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder="Opcional"
          maxLength={255}
          containerClassName="animate-form-field"
          style={{ '--stagger': 3 }}
        />

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 animate-form-field" style={{ '--stagger': 4 }}>
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
            disabled={!formData.code || !formData.name}
          >
            {initialData?.id ? 'Actualizar' : 'Crear'}
          </TFButton>
        </div>
      </div>
    </form>
  );
};

export default GenericCatalogForm;
