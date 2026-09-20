import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, AlertTriangle } from 'lucide-react';
import { useBottomSheetAnimation } from '@/hooks/useBottomSheetAnimation';

import { Button } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';

const getInitialFormData = (role) => ({
  name: role?.name || '',
  code: role?.code || '',
  description: role?.description || '',
  is_active: role?.is_active ?? true,
  permission_ids: role?.permissions?.map((permission) => Number(permission.id)) || [],
});

const MODULE_CATEGORY_MAP = {
  warehouse: 'Almacén e Inventario',
  Warehouse: 'Almacén e Inventario',
  materials: 'Almacén e Inventario',
  qr: 'Códigos QR y Trazabilidad',
  QRCodes: 'Códigos QR y Trazabilidad',
  users: 'Sistema y Usuarios',
  roles: 'Sistema y Usuarios',
  System: 'Sistema y Usuarios',
  areas: 'Sistema y Usuarios',
  operations: 'Operaciones y Producción',
  Formulas: 'Operaciones y Producción',
  Scrap: 'Mermas y Scrap',
  reports: 'Reportes y Auditoría',
  dashboard: 'Reportes y Auditoría',
  charts: 'Reportes y Auditoría',
  Audit: 'Reportes y Auditoría',
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'Almacén e Inventario': return '📦';
    case 'Códigos QR y Trazabilidad': return '🔲';
    case 'Sistema y Usuarios': return '⚙️';
    case 'Operaciones y Producción': return '🏭';
    case 'Mermas y Scrap': return '♻️';
    case 'Reportes y Auditoría': return '📊';
    default: return '🧩';
  }
};

const groupPermissionsByModule = (permissions = []) => {
  return permissions.reduce((groups, permission) => {
    const rawModule = permission.module || 'general';
    const category = MODULE_CATEGORY_MAP[rawModule] || 'Otros Permisos';

    if (!groups[category]) {
      groups[category] = [];
    }

    // Evitar duplicados por id
    if (!groups[category].some(p => p.id === permission.id)) {
      groups[category].push(permission);
    }

    return groups;
  }, {});
};

const RoleForm = ({
  role,
  permissions = [],
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isEdit = Boolean(role?.id);
  const isSystemRole = Boolean(role?.is_system);

  const [formData, setFormData] = useState(getInitialFormData(role));

  useEffect(() => {
    setFormData(getInitialFormData(role));
  }, [role]);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(permissions),
    [permissions]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData((currentData) => {
      const exists = currentData.permission_ids.includes(permissionId);

      return {
        ...currentData,
        permission_ids: exists
          ? currentData.permission_ids.filter((id) => id !== permissionId)
          : [...currentData.permission_ids, permissionId],
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_active: Boolean(formData.is_active),
      permission_ids: formData.permission_ids,
    };

    if (!isEdit) {
      payload.code = formData.code.trim().toUpperCase();
    }

    onSubmit(payload);
  };

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
        onClick={onCancel}
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
          onTouchEnd={() => handlers.onTouchEnd(onCancel)}
        >
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-5 pb-4 border-b border-border flex justify-between items-center bg-card">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              {isEdit ? 'Editar rol' : 'Nuevo rol personalizado'}
            </h3>
            <p className="italic text-sm text-muted-foreground mt-1">
              {isEdit
                ? 'Actualiza el nombre, descripción y permisos del rol seleccionado.'
                : 'Crea un rol personalizado seleccionando los permisos que tendrá.'}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors bg-secondary/50 self-start"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col bg-background">

        <form className="role-form space-y-5" onSubmit={handleSubmit}>
          {isSystemRole && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl mb-2">
              <AlertTriangle className="size-6 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <strong className="text-sm font-bold">Rol base del sistema</strong>
                <p className="text-sm font-medium opacity-90 m-0 leading-relaxed">
                  Este rol pertenece a la configuración base. Por seguridad, evita modificar permisos críticos si no es necesario.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Nombre del rol</span>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ejemplo: Auxiliar Operativo"
                required
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Código interno</span>
              <Input
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ejemplo: AUXILIAR_OPERATIVO"
                disabled={isEdit}
                required
                className="w-full"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {isEdit
                  ? 'El código no se puede modificar después de crear el rol.'
                  : 'Usa mayúsculas, números y guion bajo.'}
              </span>
            </label>

            <label className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Descripción</span>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe para qué se usará este rol."
                rows={3}
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer md:col-span-2 bg-secondary/20 p-4 rounded-xl border border-border transition-colors hover:bg-secondary/30">
              <input
                type="checkbox"
                name="is_active"
                className="w-5 h-5 rounded border-input bg-background text-primary focus:ring-primary focus:ring-2 cursor-pointer"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span className="font-bold text-foreground">Rol activo en el sistema</span>
            </label>
          </div>

          <section className="mt-6 pt-4 border-t border-border">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Permisos del rol</h3>
              <p className="text-sm text-muted-foreground font-semibold">
                Selecciona con cuidado las acciones que este rol podrá realizar.
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(permissionGroups).map(([moduleName, modulePermissions]) => (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm" key={moduleName}>
                  <div className="bg-secondary/50 px-4 py-3 border-b border-border flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{getCategoryIcon(moduleName)}</span>
                    <h4 className="font-black text-foreground capitalize tracking-wide">{moduleName}</h4>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modulePermissions.map((permission) => (
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/30 cursor-pointer transition-all" key={permission.id}>
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary cursor-pointer"
                          checked={formData.permission_ids.includes(Number(permission.id))}
                          onChange={() => handlePermissionToggle(Number(permission.id))}
                        />

                        <span className="flex flex-col gap-0.5">
                          <strong className="text-sm font-bold text-foreground leading-tight">{permission.name}</strong>
                          <small className="text-xs text-muted-foreground font-medium">{permission.code}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="font-bold shadow-sm"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={formData.permission_ids.length === 0 || isSubmitting}
              className="font-bold shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RoleForm;