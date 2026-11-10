import { useState, useEffect } from 'react';
import { Save, X, ShieldAlert } from '@/design-system/components/Icon/googleIconCompat';
import { TFButton, TFInput, TFTextarea } from '../../../components/tf-ui';
import MasterDataActionDialog from '../../../components/shared/MasterDataActionDialog';

const TAG_COLOR_PRESETS = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#D97706', '#059669'];
const DEFAULT_TAG_COLOR = '#2563EB';

const GenericCatalogForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
  onDeactivate,
  labels = {
    title: 'Registro de Catálogo',
    codeLabel: 'Código',
    codePlaceholder: 'Ej. SEG',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ej. Seguridad',
    descriptionLabel: 'Descripción'
  },
  isCodeOptional = false,
  useColorForCode = false
}) => {
  const [formData, setFormData] = useState({
    code: initialData?.code || (useColorForCode ? initialData?.color || DEFAULT_TAG_COLOR : '') || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
  });
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || (useColorForCode ? initialData.color || DEFAULT_TAG_COLOR : '') || '',
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      setFormData({ code: useColorForCode ? DEFAULT_TAG_COLOR : '', name: '', description: '' });
    }
  }, [initialData]);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (useColorForCode) {
      submitData.color = submitData.code;
      delete submitData.code;
    }
    await onSubmit(submitData);
  };

  return (
    <form className="flex flex-col h-full overflow-hidden" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
        <div className={useColorForCode ? "grid grid-cols-1 gap-5 sm:grid-cols-[20rem_minmax(0,1fr)] sm:items-start sm:gap-6" : "space-y-6"}>
          {/* CODE */}
          {!isCodeOptional && !useColorForCode && (
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
          )}
          
          {useColorForCode && (
            <div className="animate-form-field min-w-0" style={{ '--stagger': 1 }}>
              <label htmlFor="master-data-tag-color" className="mb-2 ml-1 block text-sm font-bold text-foreground">
                Color de etiqueta
              </label>
              <div className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background p-2.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  id="master-data-tag-color"
                  type="color"
                  value={formData.code || DEFAULT_TAG_COLOR}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  aria-label="Elegir color personalizado para la etiqueta"
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">Color seleccionado</span>
                  <span className="mt-0.5 block font-mono text-base font-bold uppercase text-foreground">{formData.code || DEFAULT_TAG_COLOR}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Colores sugeridos">
                {TAG_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Usar color ${color}`}
                    aria-pressed={(formData.code || DEFAULT_TAG_COLOR).toUpperCase() === color}
                    title={color}
                    disabled={isSubmitting}
                    onClick={() => setField('code', color)}
                    className={`h-11 w-11 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${(formData.code || DEFAULT_TAG_COLOR).toUpperCase() === color ? 'border-foreground ring-2 ring-primary/30 ring-offset-1' : 'border-background shadow-sm'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* NAME */}
          <TFInput
            label={`${labels.nameLabel} *`}
            required
            value={formData.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={isSubmitting}
            placeholder={labels.namePlaceholder}
            maxLength={100}
            containerClassName={`animate-form-field ${useColorForCode ? "min-w-0" : ""}`}
            style={{ '--stagger': 2 }}
          />
        </div>

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
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 animate-form-field" style={{ '--stagger': 4 }}>
          {isEditing && onDeactivate && initialData?.is_active && (
            <TFButton
              variant="danger"
              icon={ShieldAlert}
              type="button"
              onClick={() => setIsActionDialogOpen(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:mr-auto mb-3 sm:mb-0"
            >
              Gestionar Estado
            </TFButton>
          )}
          <TFButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </TFButton>
          <TFButton
            type="submit"
            variant="primary"
            icon={Save}
            isLoading={isSubmitting}
            disabled={!formData.code || !formData.name}
            className="w-full sm:w-auto"
          >
            {initialData?.id ? 'Actualizar' : 'Crear'}
          </TFButton>
        </div>
      </div>
      
      {isEditing && onDeactivate && (
        <MasterDataActionDialog
          open={isActionDialogOpen}
          item={initialData}
          title={`Gestionar Estado de ${labels.title || 'Registro'}`}
          itemLabel="Registro seleccionado"
          isLoading={isSubmitting}
          onClose={() => setIsActionDialogOpen(false)}
          onConfirm={({ action, reason }) => {
             setIsActionDialogOpen(false);
             onDeactivate({ ...initialData, action, reason });
          }}
        />
      )}
    </form>
  );
};

export default GenericCatalogForm;
