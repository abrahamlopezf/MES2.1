import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AREA_REQUIRED_ROLES = ['SUPERVISOR', 'EMPLOYEE'];

const getInitialFormData = (user) => ({
  first_name: user?.first_name || '',
  last_name: user?.last_name || '',
  email: user?.email || '',
  username: user?.username || '',
  password: '',
  role_id: user?.role?.id ? String(user.role.id) : '',
  area_id: user?.area?.id ? String(user.area.id) : '',
  is_active: user?.is_active ?? true,
  must_change_password: user?.must_change_password ?? true,
});

const UserForm = ({
  user,
  roles = [],
  areas = [],
  currentUser,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const isEdit = Boolean(user?.id);

  const [formData, setFormData] = useState(getInitialFormData(user));

  useEffect(() => {
    setFormData(getInitialFormData(user));
  }, [user]);

  const availableRoles = useMemo(() => {
    if (currentUser?.role?.code === 'ADMIN') {
      return roles.filter((role) => role.code !== 'SUPERADMIN');
    }

    return roles;
  }, [roles, currentUser]);

  const selectedRole = availableRoles.find(
    (role) => Number(role.id) === Number(formData.role_id)
  );

  const requiresArea = AREA_REQUIRED_ROLES.includes(selectedRole?.code);

  const roleOptions = availableRoles
    .filter((role) => role.is_active)
    .map((role) => ({
      value: String(role.id),
      label: `${role.name} (${role.code})`,
    }));

  const areaOptions = areas
    .filter((area) => area.is_active)
    .map((area) => ({
      value: String(area.id),
      label: `${area.name} (${area.code})`,
    }));

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'role_id') {
        const nextRole = availableRoles.find(
          (role) => Number(role.id) === Number(value)
        );

        if (!AREA_REQUIRED_ROLES.includes(nextRole?.code)) {
          nextData.area_id = '';
        }
      }

      return nextData;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      role_id: Number(formData.role_id),
      area_id: requiresArea ? Number(formData.area_id) : null,
      is_active: Boolean(formData.is_active),
      must_change_password: Boolean(formData.must_change_password),
    };

    if (formData.password.trim()) {
      payload.password = formData.password;
    }

    onSubmit(payload);
  };

  return (
    <Card
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      description={
        isEdit
          ? 'Actualiza la información del usuario seleccionado.'
          : 'Registra un nuevo acceso al sistema.'
      }
    >
      <form className="user-form" onSubmit={handleSubmit}>
        {currentUser?.role?.code === 'ADMIN' && (
          <Alert
            variant="info"
            title="Restricción de administrador"
            message="Como Admin puedes gestionar usuarios, pero no puedes crear ni modificar usuarios Superadmin."
          />
        )}

        <div className="form-grid">
          <Input
            label="Nombre"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Ejemplo: Juan"
            required
          />

          <Input
            label="Apellido"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Ejemplo: Pérez"
            required
          />

          <Input
            label="Correo"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@empresa.com"
            required
          />

          <Input
            label="Usuario"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="usuario_sistema"
            required
          />

          <Input
            label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEdit ? 'Dejar vacío para conservar' : 'Mínimo 8 caracteres'}
            helperText="Debe incluir mayúscula, minúscula, número y carácter especial."
            required={!isEdit}
          />

          <Select
            label="Rol"
            name="role_id"
            value={formData.role_id}
            onChange={handleChange}
            options={roleOptions}
            placeholder="Selecciona un rol"
            required
          />

          <Select
            label="Área"
            name="area_id"
            value={formData.area_id}
            onChange={handleChange}
            options={areaOptions}
            placeholder={
              requiresArea
                ? 'Selecciona un área'
                : 'No requiere área'
            }
            helperText={
              requiresArea
                ? 'Este rol requiere área asignada.'
                : 'Solo Supervisor y Empleado requieren área.'
            }
            disabled={!requiresArea}
            required={requiresArea}
          />

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <span>Usuario activo</span>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="must_change_password"
              checked={formData.must_change_password}
              onChange={handleChange}
            />
            <span>Solicitar cambio de contraseña</span>
          </label>
        </div>

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
          >
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default UserForm;