import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Power, X, Info } from 'lucide-react';
import { toast } from 'sonner';

import { userSchema, UserFormValues } from '../schemas/userSchema';
import { User, UserStatus } from '../types/user';
import { useCreateUserMutation, useUpdateUserMutation, useRequestDeactivationMutation } from '../hooks/useUsers';
import { useAuthStore } from '@/store/authStore';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog.tsx';
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-black">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription className="italic text-muted-foreground mt-1">
            {isEdit ? 'Modifica los datos del usuario en el sistema.' : 'Registra un nuevo usuario para darle acceso al ERP.'}
          </DialogDescription>
        </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nombres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Juan Carlos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario (Username)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. jperez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña {isEdit && '(Opcional, dejar en blanco para no cambiar)'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Ej. Password123!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mustChangePassword"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8 mb-4 col-span-1 md:col-span-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex items-center gap-1.5">
                    <FormLabel className="text-sm font-medium">
                      Forzar cambio de contraseña
                    </FormLabel>
                    <div 
                      className="text-muted-foreground hover:text-foreground cursor-help transition-colors flex items-center"
                      title="Si se marca, el usuario deberá cambiar su contraseña la próxima vez que inicie sesión."
                    >
                      <Info className="w-4 h-4" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numeroNomina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Nómina</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. EMP-001" disabled={isSupervisor} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. 5551234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <FormField
              control={form.control}
              name="rolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puesto</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={roles.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-background text-foreground">Selecciona un puesto</option>
                      {roles.map((role: any) => (
                        <option key={role.id} value={role.id} className="bg-background text-foreground">
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t mt-4 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              className="border-red-300 dark:border-red-900 text-red-600 dark:text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400 font-medium shadow-sm"
              onClick={onClose} 
              disabled={isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            {isEdit && user.status === 'PENDING' && isGeneralAdmin && (
              <PermissionGate permission="users.approve">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  disabled={isPending}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Aprobar usuario
                </Button>
              </PermissionGate>
            )}

            {isEdit && user.status === 'ACTIVE' && isGeneralAdmin && (
              <PermissionGate permission="users.update">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleUpdateStatus('INACTIVE')}
                  disabled={isPending}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Desactivar
                </Button>
              </PermissionGate>
            )}

            {isEdit && user.status === 'ACTIVE' && !isGeneralAdmin && (
              <PermissionGate permission="users.update">
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-300 dark:border-red-900 text-red-600 dark:text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-400 font-medium shadow-sm"
                  onClick={handleRequestDeactivation}
                  disabled={isPending}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Solicitar Desactivación
                </Button>
              </PermissionGate>
            )}

            {isEdit && (user.status === 'INACTIVE' || user.status === 'SUSPENDED') && isGeneralAdmin && (
              <PermissionGate permission="users.update">
                <Button
                  type="button"
                  variant="default"
                  className="bg-success hover:bg-success/90 text-success-foreground font-semibold"
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  disabled={isPending}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Activar
                </Button>
              </PermissionGate>
            )}

            <Button type="submit" disabled={isPending}>
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
    </Dialog>
  );
};

export default UserForm;
