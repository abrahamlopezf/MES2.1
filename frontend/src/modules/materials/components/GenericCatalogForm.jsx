import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { TFButton } from '../../../components/tf-ui';

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
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* CODE */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">
            {labels.codeLabel} *
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setField('code', e.target.value.toUpperCase())}
            disabled={!!initialData?.id || isSubmitting}
            className="w-full border-2 border-border bg-background text-foreground rounded-lg px-4 py-2 uppercase focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:bg-muted"
            placeholder={labels.codePlaceholder}
            maxLength={20}
          />
          {!!initialData?.id && (
            <p className="text-xs text-muted-foreground mt-1">El código no puede modificarse tras su creación.</p>
          )}
        </div>

        {/* NAME */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">
            {labels.nameLabel} *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={isSubmitting}
            className="w-full border-2 border-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:bg-muted"
            placeholder={labels.namePlaceholder}
            maxLength={100}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">
            {labels.descriptionLabel}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setField('description', e.target.value)}
            disabled={isSubmitting}
            rows={3}
            className="w-full border-2 border-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none resize-none disabled:opacity-50 disabled:bg-muted"
            placeholder="Opcional"
            maxLength={255}
          />
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 sm:p-6 bg-card border-t border-border flex items-center justify-end gap-3 mt-auto">
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
          variant="primary"
          icon={Check}
          isLoading={isSubmitting}
          disabled={!formData.code || !formData.name}
        >
          {initialData ? 'Actualizar' : 'Guardar'}
        </TFButton>
      </div>
    </form>
  );
};

export default GenericCatalogForm;
