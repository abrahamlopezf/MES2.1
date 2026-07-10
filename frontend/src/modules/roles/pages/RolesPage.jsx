import { useEffect, useMemo, useState } from 'react';
import { FilterX, Plus, RefreshCw, Search } from 'lucide-react';

import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/feedback/EmptyState';
import ErrorState from '../../../components/feedback/ErrorState';
import Input from '../../../components/ui/Input';
import LoadingState from '../../../components/feedback/LoadingState';
import Select from '../../../components/ui/Select';

import { useAuthStore } from '../../../store/authStore';
import { includesNormalized } from '../../../utils/filters';

import {
  createRoleRequest,
  deleteRoleRequest,
  getRolesRequest,
  updateRoleRequest,
} from '../services/rolesApi';

import { getPermissionsRequest } from '../../permissions/services/permissionsApi';

import RoleForm from '../components/RoleForm';
import RolesTable from '../components/RolesTable';

const getApiErrorMessage = (error) => {
  const baseMessage =
    error.friendlyMessage ||
    error.response?.data?.message ||
    'Ocurrió un problema al procesar la solicitud.';

  const validationErrors = error.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const details = validationErrors
      .map((item) => item.message || item.field)
      .filter(Boolean)
      .join(' ');

    return `${baseMessage} ${details}`;
  }

  return baseMessage;
};

const RolesPage = () => {
  const { hasPermission, user: currentUser } = useAuthStore();

  const canCreate = hasPermission('roles.create');
  const canUpdate = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [selectedRole, setSelectedRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRoles = useMemo(() => {
    return roles
      .filter((role) => {
        const permissionText = role.permissions
          ?.map((permission) => `${permission.name} ${permission.code} ${permission.module}`)
          .join(' ');

        const searchableText = [
          role.name,
          role.code,
          role.description,
          permissionText,
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch = includesNormalized(searchableText, searchTerm);

        const matchesType =
          typeFilter === 'system'
            ? role.is_system
            : typeFilter === 'custom'
              ? !role.is_system
              : true;

        const matchesStatus =
          statusFilter === 'active'
            ? role.is_active
            : statusFilter === 'inactive'
              ? !role.is_active
              : true;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => a.id - b.id);
  }, [roles, searchTerm, typeFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchTerm || typeFilter || statusFilter);

  const loadRolesData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        getRolesRequest(),
        getPermissionsRequest(),
      ]);

      setRoles(rolesResponse.data || []);
      setPermissions(permissionsResponse.data || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRolesData();
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const openCreateForm = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
    setSuccessMessage(null);
    setError(null);
  };

  const openEditForm = (targetRole) => {
    setSelectedRole(targetRole);
    setIsFormOpen(true);
    setSuccessMessage(null);
    setError(null);
  };

  const closeForm = () => {
    setSelectedRole(null);
    setIsFormOpen(false);
  };

  const handleSubmitRole = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (selectedRole) {
        const response = await updateRoleRequest(selectedRole.id, payload);

        setRoles((currentRoles) =>
          currentRoles.map((item) =>
            item.id === selectedRole.id ? response.data : item
          )
        );

        setSuccessMessage('Rol actualizado correctamente.');
      } else {
        const response = await createRoleRequest(payload);

        setRoles((currentRoles) => [...currentRoles, response.data]);
        setSuccessMessage('Rol creado correctamente.');
      }

      closeForm();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await deleteRoleRequest(roleToDelete.id);

      setRoles((currentRoles) =>
        currentRoles.map((item) =>
          item.id === roleToDelete.id ? response.data : item
        )
      );

      setSuccessMessage('Rol desactivado correctamente.');
      setRoleToDelete(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Cargando roles"
        message="Estamos consultando roles y permisos del sistema."
      />
    );
  }

  if (error && !roles.length) {
    return (
      <ErrorState
        title="No pudimos cargar roles"
        message={error}
        action={
          <Button icon={RefreshCw} onClick={loadRolesData}>
            Intentar nuevamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="module-page">
      <Card
        title="Gestión de roles"
        description="Consulta roles del sistema y administra roles personalizados según permisos."
        actions={
          <div className="module-actions">
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={loadRolesData}
            >
              Actualizar
            </Button>

            {canCreate && (
              <Button icon={Plus} onClick={openCreateForm}>
                Nuevo rol
              </Button>
            )}
          </div>
        }
      >
        <div className="module-stack">
          {currentUser?.role?.code !== 'SUPERADMIN' && (
            <Alert
              variant="info"
              title="Modo solo consulta"
              message="Tu usuario puede consultar roles, pero la administración de roles está reservada para Superadmin."
            />
          )}

          {successMessage && (
            <Alert
              variant="success"
              title="Operación correcta"
              message={successMessage}
            />
          )}

          {error && (
            <Alert
              variant="danger"
              title="Revisa la operación"
              message={error}
            />
          )}

          <section className="filter-panel">
            <div className="filter-panel-header">
              <div>
                <h3>Buscar y filtrar roles</h3>
                <p>
                  Puedes buscar por nombre, código, descripción o permisos asignados.
                </p>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  icon={FilterX}
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div className="filter-grid filter-grid-3">
              <Input
                label="Búsqueda"
                name="searchTerm"
                icon={Search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar rol o permiso..."
              />

              <Select
                label="Tipo"
                name="typeFilter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                options={[
                  { value: 'system', label: 'Base del sistema' },
                  { value: 'custom', label: 'Personalizado' },
                ]}
                placeholder="Todos los tipos"
              />

              <Select
                label="Estado"
                name="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: 'active', label: 'Activos' },
                  { value: 'inactive', label: 'Inactivos' },
                ]}
                placeholder="Todos los estados"
              />
            </div>

            <div className="filter-summary">
              Mostrando <strong>{filteredRoles.length}</strong> de{' '}
              <strong>{roles.length}</strong> roles.
            </div>
          </section>

          {isFormOpen && (
            <RoleForm
              role={selectedRole}
              permissions={permissions}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmitRole}
              onCancel={closeForm}
            />
          )}

          {!filteredRoles.length ? (
            <EmptyState
              title="No encontramos roles"
              message={
                hasActiveFilters
                  ? 'No hay roles que coincidan con los filtros seleccionados.'
                  : 'Cuando existan roles, aparecerán en esta sección.'
              }
              action={
                hasActiveFilters ? (
                  <Button icon={FilterX} variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : canCreate ? (
                  <Button icon={Plus} onClick={openCreateForm}>
                    Crear primer rol
                  </Button>
                ) : null
              }
            />
          ) : (
            <RolesTable
              roles={filteredRoles}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEditForm}
              onDelete={setRoleToDelete}
            />
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Desactivar rol"
        message={
          roleToDelete
            ? `¿Seguro que deseas desactivar el rol ${roleToDelete.name}? Esta acción no debe realizarse si el rol está en uso.`
            : ''
        }
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setRoleToDelete(null)}
      />
    </div>
  );
};

export default RolesPage;