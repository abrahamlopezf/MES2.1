import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAreasRequest } from '../../areas/services/areasApi';
import { Loader2 } from 'lucide-react';

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* AREA */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">
            Área de Pertenencia *
          </label>
          {isLoadingAreas ? (
             <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="animate-spin mr-2" size={16}/> Cargando áreas...</div>
          ) : (
            <select
              required
              value={formData.area_id}
              onChange={(e) => setField('area_id', e.target.value)}
              disabled={isSubmitting}
              className="w-full border-2 border-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:bg-muted"
            >
              <option value="" disabled>Selecciona un Área</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          )}
        </div>

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
      
      <div className="bg-secondary/30 border-t border-border p-4 flex justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-muted text-foreground hover:bg-muted/80 px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center disabled:opacity-50"
        >
          {isSubmitting ? (
             <><Loader2 className="animate-spin mr-2" size={18} /> Guardando...</>
          ) : (
            <>{initialData?.id ? 'Actualizar' : 'Crear'}</>
          )}
        </button>
      </div>
    </form>
  );
};

export default LocationForm;
