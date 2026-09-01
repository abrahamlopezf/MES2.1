import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X } from 'lucide-react';
import { TFButton, TFInput, TFTextarea } from '../../../components/tf-ui';

const supplierSchema = z.object({
  name: z.string().min(3, 'La Razón Social debe tener al menos 3 caracteres'),
  commercial_name: z.string().optional(),
  category: z.string().optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Debe ser un correo válido').or(z.literal('')),
  description: z.string().optional(),
});

const SupplierCatalogForm = ({
  initialData,
  isSubmitting,
  onSubmit,
  onCancel
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty }
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: initialData?.name || '',
      commercial_name: initialData?.commercial_name || '',
      category: initialData?.category || '',
      tax_id: initialData?.tax_id || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      description: initialData?.description || ''
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* Código autogenerado info */}
        {!initialData && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-center text-primary text-sm font-semibold text-center">
            El Código del proveedor será generado automáticamente
          </div>
        )}

        <TFInput
          label="Razón Social *"
          placeholder="Ej. Proveedora de Plásticos S.A."
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />

        <TFInput
          label="Nombre Comercial"
          placeholder="Ej. ProPlastics"
          disabled={isSubmitting}
          {...register('commercial_name')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <TFInput
            label="RFC"
            placeholder="Ej. ABCD123456EF7"
            className="uppercase"
            disabled={isSubmitting}
            {...register('tax_id')}
          />
          <TFInput
            label="Giro o Categoría"
            placeholder="Ej. Resinas"
            disabled={isSubmitting}
            {...register('category')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <TFInput
            label="Teléfono"
            placeholder="Ej. 555-1234"
            disabled={isSubmitting}
            {...register('phone')}
          />
          <TFInput
            label="Correo Electrónico"
            placeholder="Ej. ventas@prov.com"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />
        </div>

        <TFTextarea
          label="Información Adicional (Dirección, Contacto)"
          placeholder="Información adicional sobre el proveedor..."
          disabled={isSubmitting}
          {...register('description')}
        />
      </div>

      <div className="p-4 sm:p-6 bg-card border-t border-border flex items-center justify-end gap-3 mt-auto shrink-0">
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
          disabled={isSubmitting || (!isDirty && !!initialData)}
          isLoading={isSubmitting}
        >
          {initialData ? 'Guardar Cambios' : 'Crear Proveedor'}
        </TFButton>
      </div>
    </form>
  );
};

export default SupplierCatalogForm;
