import { useState, useEffect } from 'react';
import { Save, X, ShieldAlert } from 'lucide-react';
import { TFButton, TFInput, TFTextarea } from '../../../components/tf-ui';
import MasterDataActionDialog from '../../../components/shared/MasterDataActionDialog';

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
    code: initialData?.code || (useColorForCode ? initialData?.color : '') || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
  });
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || (useColorForCode ? initialData.color : '') || '',
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
        <div className={useColorForCode ? "flex flex-row gap-4 sm:gap-6 items-start" : "space-y-6"}>
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
            <div className="w-24 sm:w-28 shrink-0">
              <TFInput
                label={labels.codeLabel}
                type="color"
                value={formData.code}
                onChange={(e) => setField('code', e.target.value)}
                disabled={isSubmitting}
                containerClassName="animate-form-field w-full"
                style={{ '--stagger': 1 }}
                className="h-11 w-full cursor-pointer p-0.5 rounded border border-border bg-background"
              />
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
            containerClassName={`animate-form-field ${useColorForCode ? "flex-1" : ""}`}
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
