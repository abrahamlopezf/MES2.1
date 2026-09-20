import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Power, X, Info } from 'lucide-react';
import { toast } from 'sonner';

import { userSchema, UserFormValues } from '../schemas/userSchema';
import { User, UserStatus } from '../types/user';
import { useCreateUserMutation, useUpdateUserMutation, useRequestDeactivationMutation } from '../hooks/useUsers';
import { useAuthStore } from '@/store/authStore';
import { useBottomSheetAnimation } from '@/hooks/useBottomSheetAnimation';

import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { TFInput, TFSelect, TFButton } from '../../../components/tf-ui';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';

interface UserFormProps {
  user?: User | null;
  roles?: any[];
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, roles = [], onClose }) => {
  const isEdit = Boolean(user);
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const requestDeactMutation = useRequestDeactivationMutation();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombres: '',
      apellidos: '',
      username: '',
      numeroNomina: '',
      correo: '',
      telefono: '',
      rolId: '',
      status: 'ACTIVE',
      password: '',
      mustChangePassword: true,
    },
  });

  const { user: currentUser } = useAuthStore();
  const isGeneralAdmin = currentUser?.role?.code === 'ADMIN' || currentUser?.role?.code === 'SUPERADMIN';
  const isSupervisor = currentUser?.role?.code === 'SUPERVISOR';

  useEffect(() => {
    if (user) {
      form.reset({
        nombres: user.nombres,
        apellidos: user.apellidos,
        username: user.username,
        numeroNomina: user.numeroNomina,
        correo: user.correo,
        telefono: user.telefono,
        rolId: user.rolId,
        status: user.status,
        password: '',
        mustChangePassword: user.mustChangePassword ?? false,
      });
    } else if (isSupervisor) {
      // Auto-seleccionar para el Supervisor ya que solo tiene 1 opción
      form.setValue('rolId', roles[0]?.id ? String(roles[0].id) : '');
    }
  }, [user, form, isSupervisor, roles]);

  const onSubmit = (values: UserFormValues) => {
    // Regla: Supervisor siempre crea usuarios en estado PENDING
    const finalValues = { ...values };
    if (!finalValues.password) {
      delete finalValues.password;
    }

    if (!isEdit && isSupervisor) {
      finalValues.status = 'PENDING';
    }

    if (isEdit && user) {
      updateMutation.mutate(
        { id: user.id, payload: finalValues },
        { 
          onSuccess: () => {
            toast.success('Usuario actualizado correctamente');
            onClose();
          },
          onError: (error: any) => {
            console.error('Update Error:', JSON.stringify(error.response?.data?.errors, null, 2));
            const detailMsg = error.response?.data?.errors?.[0]?.message;
            toast.error(detailMsg ? `Error: ${detailMsg}` : error.response?.data?.message || error.message || 'No se pudo actualizar el usuario');
          }
        }
      );
    } else {
      createMutation.mutate(
        finalValues, 
        { 
          onSuccess: () => {
            toast.success(isSupervisor ? 'Usuario registrado y en espera de aprobación' : 'Usuario registrado exitosamente');
            onClose();
          },
          onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || 'No se pudo registrar el usuario');
          }
        }
      );
    }
  };

  const handleUpdateStatus = (newStatus: UserStatus) => {
    if (!user) return;
    const currentValues = form.getValues();
    updateMutation.mutate(
      { id: user.id, payload: { ...currentValues, status: newStatus } },
      { 
        onSuccess: () => {
          toast.success(`Estado del usuario actualizado a ${newStatus}`);
          onClose();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || 'Ocurrió un error al cambiar el estado');
        }
      }
    );
  };

  const handleRequestDeactivation = () => {
    if (!user) return;
    requestDeactMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success('Solicitud enviada a los administradores');
        onClose();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'No se pudo enviar la solicitud');
      }
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || requestDeactMutation.isPending;

  const {
    isRendered,
    animateIn,
    sheetRef,
    currentY,
    handlers
  } = useBottomSheetAnimation(true, 400);

  if (!isRendered) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${animateIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ isolation: 'isolate' }}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative w-full bg-card rounded-t-3xl border-t border-border flex flex-col overflow-hidden max-h-[95dvh] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${animateIn && currentY === 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : undefined }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full pt-3 pb-2 flex justify-center items-center touch-none bg-card"
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={() => handlers.onTouchEnd(onClose)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>
            <p className="italic text-sm text-muted-foreground mt-1">
              {isEdit ? 'Modifica los datos del usuario en el sistema.' : 'Registra un nuevo usuario para darle acceso al ERP.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50 self-start"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col bg-background">

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TFInput
                label="Nombres"
                placeholder="Ej. Juan Carlos"
                error={form.formState.errors.nombres?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 1 } as React.CSSProperties}
                {...form.register('nombres')}
              />
              <TFInput
                label="Apellidos"
                placeholder="Ej. Pérez"
                error={form.formState.errors.apellidos?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 2 } as React.CSSProperties}
                {...form.register('apellidos')}
              />
              <TFInput
                label="Usuario (Username)"
                placeholder={isEdit ? '' : "Autogenerado por el sistema"}
                disabled={true}
                error={form.formState.errors.username?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 3 } as React.CSSProperties}
                {...form.register('username')}
              />
              <TFInput
                label={`Contraseña ${isEdit ? '(Opcional)' : ''}`}
                type="password"
                placeholder="Ej. Password123!"
                error={form.formState.errors.password?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 4 } as React.CSSProperties}
                {...form.register('password')}
              />
              
              <div className="col-span-1 md:col-span-1 flex items-center space-x-3 mt-4 animate-form-field" style={{ '--stagger': 5 } as React.CSSProperties}>
                <Checkbox
                  id="mustChangePassword"
                  checked={form.watch('mustChangePassword')}
                  onCheckedChange={(val: boolean) => form.setValue('mustChangePassword', val)}
                />
                <div className="space-y-1 leading-none flex items-center gap-1.5">
                  <label htmlFor="mustChangePassword" className="text-base font-black text-foreground cursor-pointer">
                    Forzar cambio de contraseña
                  </label>
                  <div 
                    className="text-muted-foreground hover:text-foreground cursor-help transition-colors flex items-center"
                    title="Si se marca, el usuario deberá cambiar su contraseña la próxima vez que inicie sesión."
                  >
                    <Info className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <TFInput
                label="Número de Nómina"
                placeholder="Ej. EMP-001"
                disabled={isSupervisor}
                error={form.formState.errors.numeroNomina?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 6 } as React.CSSProperties}
                {...form.register('numeroNomina')}
              />
              
              <TFInput
                label="Correo Electrónico"
                type="email"
                placeholder="correo@empresa.com"
                error={form.formState.errors.correo?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 7 } as React.CSSProperties}
                {...form.register('correo')}
              />
              
              <TFInput
                label="Teléfono"
                placeholder="Ej. 5551234567"
                error={form.formState.errors.telefono?.message}
                containerClassName="animate-form-field"
                style={{ '--stagger': 8 } as React.CSSProperties}
                {...form.register('telefono')}
              />

              <TFSelect
                label="Puesto"
                options={roles.map(r => ({ label: r.name, value: String(r.id) }))}
                error={form.formState.errors.rolId?.message}
                disabled={roles.length === 0}
                containerClassName="animate-form-field"
                style={{ '--stagger': 9 } as React.CSSProperties}
                {...form.register('rolId')}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-6 border-t border-border mt-6 animate-form-field" style={{ '--stagger': 10 } as React.CSSProperties}>
              <TFButton 
                type="button" 
                variant="secondary" 
                onClick={onClose} 
                disabled={isPending}
              >
                Cancelar
              </TFButton>

              {isEdit && user.status === 'PENDING' && isGeneralAdmin && (
                <PermissionGate permission="users.approve">
                  <TFButton
                    type="button"
                    variant="primary"
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    disabled={isPending}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Aprobar usuario
                  </TFButton>
                </PermissionGate>
              )}

              {isEdit && user.status === 'ACTIVE' && isGeneralAdmin && (
                <PermissionGate permission="users.update">
                  <TFButton
                    type="button"
                    variant="danger"
                    onClick={() => handleUpdateStatus('INACTIVE')}
                    disabled={isPending}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Desactivar
                  </TFButton>
                </PermissionGate>
              )}

              {isEdit && user.status === 'ACTIVE' && !isGeneralAdmin && (
                <PermissionGate permission="users.update">
                  <TFButton
                    type="button"
                    variant="danger"
                    onClick={handleRequestDeactivation}
                    disabled={isPending}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Solicitar Desactivación
                  </TFButton>
                </PermissionGate>
              )}

              {isEdit && (user.status === 'INACTIVE' || user.status === 'SUSPENDED') && isGeneralAdmin && (
                <PermissionGate permission="users.update">
                  <TFButton
                    type="button"
                    variant="primary"
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    disabled={isPending}
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Activar
                  </TFButton>
                </PermissionGate>
              )}

              <TFButton type="submit" disabled={isPending} variant="primary">
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Guardar cambios' : 'Registrar'}
              </TFButton>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserForm;
