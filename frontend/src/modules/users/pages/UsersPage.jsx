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
  createUserRequest,
  deleteUserRequest,
  getUsersRequest,
  updateUserRequest,
} from '../services/usersApi';

import { getRolesRequest } from '../../roles/services/rolesApi';
import { getAreasRequest } from '../../areas/services/areasApi';

import UserForm from '../components/UserForm';
import UsersTable from '../components/UsersTable';

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

const UsersPage = () => {
  const { user: currentUser, hasPermission } = useAuthStore();

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({
      value: String(role.id),
      label: role.name,
    }));
  }, [roles]);

  const areaOptions = useMemo(() => {
    return areas.map((area) => ({
      value: String(area.id),
      label: area.name,
    }));
  }, [areas]);

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        const searchableText = [
          user.first_name,
          user.last_name,
          user.email,
          user.username,
          user.role?.name,
          user.role?.code,
          user.area?.name,
          user.area?.code,
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch = includesNormalized(searchableText, searchTerm);

        const matchesRole = roleFilter
          ? Number(user.role?.id) === Number(roleFilter)
          : true;

        const matchesArea = areaFilter
          ? Number(user.area?.id) === Number(areaFilter)
          : true;

        const matchesStatus =
          statusFilter === 'active'
            ? user.is_active
            : statusFilter === 'inactive'
              ? !user.is_active
              : true;

        return matchesSearch && matchesRole && matchesArea && matchesStatus;
      })
      .sort((a, b) => a.id - b.id);
  }, [users, searchTerm, roleFilter, areaFilter, statusFilter]);

  const hasActiveFilters = Boolean(
    searchTerm || roleFilter || areaFilter || statusFilter
  );

  const loadUsersData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersResponse, rolesResponse, areasResponse] = await Promise.all([
        getUsersRequest(),
        getRolesRequest(),
        getAreasRequest(),
      ]);

      setUsers(usersResponse.data || []);
      setRoles(rolesResponse.data || []);
      setAreas(areasResponse.data || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setAreaFilter('');
    setStatusFilter('');
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
    setSuccessMessage(null);
    setError(null);
  };

  const openEditForm = (targetUser) => {
    setSelectedUser(targetUser);
    setIsFormOpen(true);
    setSuccessMessage(null);
    setError(null);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  const handleSubmitUser = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (selectedUser) {
        const response = await updateUserRequest(selectedUser.id, payload);

        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === selectedUser.id ? response.data : item
          )
        );

        setSuccessMessage('Usuario actualizado correctamente.');
      } else {
        const response = await createUserRequest(payload);

        setUsers((currentUsers) => [...currentUsers, response.data]);
        setSuccessMessage('Usuario creado correctamente.');
      }

      closeForm();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await deleteUserRequest(userToDelete.id);

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === userToDelete.id ? response.data : item
        )
      );

      setSuccessMessage('Usuario desactivado correctamente.');
      setUserToDelete(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Cargando usuarios"
        message="Estamos consultando usuarios, roles y áreas del sistema."
      />
    );
  }

  if (error && !users.length) {
    return (
      <ErrorState
        title="No pudimos cargar usuarios"
        message={error}
        action={
          <Button icon={RefreshCw} onClick={loadUsersData}>
            Intentar nuevamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="module-page">
      <Card
        title="Gestión de usuarios"
        description="Administra usuarios, roles, áreas y estado de acceso al sistema."
        actions={
          <div className="module-actions">
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={loadUsersData}
            >
              Actualizar
            </Button>

            {canCreate && (
              <Button icon={Plus} onClick={openCreateForm}>
                Nuevo usuario
              </Button>
            )}
          </div>
        }
      >
        <div className="module-stack">
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
                <h3>Buscar y filtrar usuarios</h3>
                <p>
                  Puedes buscar por nombre, usuario, correo, rol o área.
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

            <div className="filter-grid">
              <Input
                label="Búsqueda"
                name="searchTerm"
                icon={Search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar usuario..."
              />

              <Select
                label="Rol"
                name="roleFilter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                options={roleOptions}
                placeholder="Todos los roles"
              />

              <Select
                label="Área"
                name="areaFilter"
                value={areaFilter}
                onChange={(event) => setAreaFilter(event.target.value)}
                options={areaOptions}
                placeholder="Todas las áreas"
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
              Mostrando <strong>{filteredUsers.length}</strong> de{' '}
              <strong>{users.length}</strong> usuarios.
            </div>
          </section>

          {isFormOpen && (
            <UserForm
              user={selectedUser}
              roles={roles}
              areas={areas}
              currentUser={currentUser}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmitUser}
              onCancel={closeForm}
            />
          )}

          {!filteredUsers.length ? (
            <EmptyState
              title="No encontramos usuarios"
              message={
                hasActiveFilters
                  ? 'No hay usuarios que coincidan con los filtros seleccionados.'
                  : 'Cuando crees usuarios, aparecerán en esta sección.'
              }
              action={
                hasActiveFilters ? (
                  <Button icon={FilterX} variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : canCreate ? (
                  <Button icon={Plus} onClick={openCreateForm}>
                    Crear primer usuario
                  </Button>
                ) : null
              }
            />
          ) : (
            <UsersTable
              users={filteredUsers}
              currentUser={currentUser}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEditForm}
              onDelete={setUserToDelete}
            />
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Desactivar usuario"
        message={
          userToDelete
            ? `¿Seguro que deseas desactivar a ${userToDelete.first_name} ${userToDelete.last_name}? El usuario ya no podrá iniciar sesión.`
            : ''
        }
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};

export default UsersPage;