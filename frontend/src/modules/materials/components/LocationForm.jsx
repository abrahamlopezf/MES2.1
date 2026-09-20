import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAreasRequest } from '../../areas/services/areasApi';
import { Save, X, Loader2 } from 'lucide-react';
import { TFButton, TFInput, TFSelect, TFTextarea } from '../../../components/tf-ui';

const LocationForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
  labels = {
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
    area_id: initialData?.area_id || ''
  });

  const { data: areas = [], isLoading: isLoadingAreas } = useQuery({
    queryKey: ['all-areas'],
    queryFn: async () => {
      const response = await getAreasRequest();
      return Array.isArray(response.data) ? response.data : (response.data?.items || []);
    }
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
        area_id: initialData.area_id || ''
      });
    } else {
      setFormData({ code: '', name: '', description: '', area_id: '' });
    }
  }, [initialData]);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      area_id: formData.area_id ? parseInt(formData.area_id, 10) : null
    });
  };

  const areaOptions = areas.map(area => ({ value: String(area.id), label: area.name }));

  return (
    <form className="flex flex-col h-full overflow-hidden" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
        {/* AREA */}
        <TFSelect
          label="Área de Pertenencia *"
          required
          value={formData.area_id}
          onChange={(e) => setField('area_id', e.target.value)}
          disabled={isSubmitting || isLoadingAreas}
          options={areaOptions}
          placeholder={isLoadingAreas ? 'Cargando áreas...' : 'Selecciona un Área'}
          containerClassName="animate-form-field"
          style={{ '--stagger': 1 }}
        />

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
          style={{ '--stagger': 2 }}
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
          style={{ '--stagger': 3 }}
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
          style={{ '--stagger': 4 }}
        />
      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 animate-form-field" style={{ '--stagger': 5 }}>
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
          {initialData?.id ? 'Actualizar' : 'Crear'}
        </TFButton>
      </div>

      </div>
    </form>
  );
};

export default LocationForm;
