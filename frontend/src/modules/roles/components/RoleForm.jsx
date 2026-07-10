import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';

const getInitialFormData = (role) => ({
  name: role?.name || '',
  code: role?.code || '',
  description: role?.description || '',
  is_active: role?.is_active ?? true,
  permission_ids: role?.permissions?.map((permission) => Number(permission.id)) || [],
});

const groupPermissionsByModule = (permissions = []) => {
  return permissions.reduce((groups, permission) => {
    const moduleName = permission.module || 'general';

    if (!groups[moduleName]) {
      groups[moduleName] = [];
    }

    groups[moduleName].push(permission);

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

  return (
    <Card
      title={isEdit ? 'Editar rol' : 'Nuevo rol personalizado'}
      description={
        isEdit
          ? 'Actualiza el nombre, descripción y permisos del rol seleccionado.'
          : 'Crea un rol personalizado seleccionando los permisos que tendrá.'
      }
    >
      <form className="role-form" onSubmit={handleSubmit}>
        {isSystemRole && (
          <Alert
            variant="warning"
            title="Rol base del sistema"
            message="Este rol pertenece a la configuración base. Por seguridad, evita modificar permisos críticos si no es necesario."
          />
        )}

        <div className="form-grid">
          <Input
            label="Nombre del rol"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ejemplo: Auxiliar Operativo"
            required
          />

          <Input
            label="Código interno"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Ejemplo: AUXILIAR_OPERATIVO"
            helperText={
              isEdit
                ? 'El código no se puede modificar después de crear el rol.'
                : 'Usa mayúsculas, números y guion bajo.'
            }
            disabled={isEdit}
            required
          />

          <label className="ui-field form-grid-full">
            <span className="ui-field-label">Descripción</span>
            <textarea
              className="ui-textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe para qué se usará este rol."
              rows={4}
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <span>Rol activo</span>
          </label>
        </div>

        <section className="permissions-selector">
          <div className="permissions-selector-header">
            <h3>Permisos del rol</h3>
            <p>
              Selecciona con cuidado las acciones que este rol podrá realizar.
            </p>
          </div>

          {Object.entries(permissionGroups).map(([moduleName, modulePermissions]) => (
            <div className="permission-module-group" key={moduleName}>
              <h4>{moduleName}</h4>

              <div className="permission-check-grid">
                {modulePermissions.map((permission) => (
                  <label className="permission-check" key={permission.id}>
                    <input
                      type="checkbox"
                      checked={formData.permission_ids.includes(Number(permission.id))}
                      onChange={() => handlePermissionToggle(Number(permission.id))}
                    />

                    <span>
                      <strong>{permission.name}</strong>
                      <small>{permission.code}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            icon={X}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            icon={Save}
            isLoading={isSubmitting}
            disabled={formData.permission_ids.length === 0}
          >
            {isEdit ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default RoleForm;