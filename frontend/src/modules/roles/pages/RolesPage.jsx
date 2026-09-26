import React, { useEffect, useMemo, useState } from 'react';
import { FilterX, Plus, RefreshCw, Search, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Card, CardContent, Button, Badge } from '../../../design-system';
import { Input } from '../../../design-system/components/Input/Input';
import ErrorState from '../../../components/feedback/ErrorState';
import LoadingState from '../../../components/feedback/LoadingState';
import EmptyState from '../../../components/feedback/EmptyState';

import { useAuthStore } from '../../../store/authStore';
import { includesNormalized } from '../../../utils/filters';
import { PermissionGate } from '../../../shared/components/auth/PermissionGate';

import {
  createRoleRequest,
  deleteRoleRequest,
  getRolesRequest,
  updateRoleRequest,
} from '../services/rolesApi';
import { getPermissionsRequest } from '../../permissions/services/permissionsApi';

import RoleForm from '../components/RoleForm';
import RolesGrid from '../components/RolesTable'; // Kept the import path for the grid
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import Alert from '../../../components/ui/Alert.jsx';

const getApiErrorMessage = (error) => {
  const baseMessage =
    error.friendlyMessage ||
    error.response?.data?.message ||
    'Ocurrió un problema al procesar la solicitud.';
  const validationErrors = error.response?.data?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const details = validationErrors.map((item) => item.message || item.field).filter(Boolean).join(' ');
    return `${baseMessage} ${details}`;
  }
  return baseMessage;
};

const RolesPage = () => {
  const { hasPermission, user: currentUser } = useAuthStore();
  const canCreate = hasPermission('roles.create');
  const canUpdate = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');
  const canViewUsers = hasPermission('users.read');

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

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

        const searchableText = [role.name, role.code, role.description, permissionText].filter(Boolean).join(' ');
        const matchesSearch = includesNormalized(searchableText, searchTerm);

        const matchesType = typeFilter === 'system' ? role.is_system : typeFilter === 'custom' ? !role.is_system : true;
        const matchesStatus = statusFilter === 'active' ? role.is_active : statusFilter === 'inactive' ? !role.is_active : true;

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
        setRoles((currentRoles) => currentRoles.map((item) => (item.id === selectedRole.id ? response.data : item)));
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
      setRoles((currentRoles) => currentRoles.map((item) => (item.id === roleToDelete.id ? response.data : item)));
      setSuccessMessage('Rol desactivado correctamente.');
      setRoleToDelete(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingState title="Cargando roles" message="Estamos consultando roles y permisos del sistema." />;
  }

  if (error && !roles.length) {
    return (
      <ErrorState
        title="No pudimos cargar roles"
        message={error}
        action={<Button onClick={loadRolesData}><RefreshCw className="mr-2 h-4 w-4" /> Intentar nuevamente</Button>}
      />
    );
  }

  return (
    <div className="space-y-4 px-4 sm:px-6 md:px-8 pt-2 pb-4 md:pb-6 pb-32 sm:pb-12 overflow-x-hidden">
      {/* Mobile Navigation Tabs */}
      {canViewUsers && (
        <div className="lg:hidden flex bg-muted/30 p-1 rounded-lg w-full mb-2 border border-border">
          <Link to="/users" className="flex-1 text-center py-2 px-4 rounded-md hover:bg-muted/80 text-muted-foreground font-bold text-sm transition-colors">Usuarios</Link>
          <Link to="/roles" className="flex-1 text-center py-2 px-4 rounded-md bg-background shadow-sm font-bold text-sm text-foreground">Roles</Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2 w-full">
        <div className="flex-1 w-full min-w-[250px]">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground font-semibold mt-1">Consulta roles del sistema y administra roles personalizados.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={loadRolesData} className="font-bold shadow-sm flex-1 md:flex-none justify-center h-12 text-sm">
            <RefreshCw className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Actualizar</span>
          </Button>
          <PermissionGate permission="roles.create">
            <Button onClick={openCreateForm} size="lg" className="font-bold shadow-sm flex-1 md:flex-none justify-center h-12 text-sm">
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Rol
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="space-y-4">
        {currentUser?.role?.code !== 'SUPERADMIN' && (
          <Alert variant="info" title="Modo solo consulta" message="Tu usuario puede consultar roles, pero la administración completa está reservada para Superadmin." />
        )}
        {successMessage && <Alert variant="success" title="Operación correcta" message={successMessage} />}
        {error && <Alert variant="danger" title="Revisa la operación" message={error} />}

        <section className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-0 md:space-y-4">
          <div 
            className={`flex justify-between items-center cursor-pointer md:cursor-default ${showFilters ? 'border-b border-border pb-3 mb-4 md:mb-0' : ''} md:border-b md:border-border md:pb-3`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
              <div className="md:hidden text-muted-foreground">
                {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearFilters(); }} className="text-muted-foreground hover:text-foreground h-8 px-2">
                <FilterX className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Limpiar Filtros</span>
              </Button>
            )}
          </div>

          <div className={`${showFilters ? 'grid' : 'hidden'} md:grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
              <div className="relative md:col-span-12 lg:col-span-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar roles por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-10 font-medium"
                />
              </div>
            
            <div className="md:col-span-6 lg:col-span-3">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="system">Base del sistema</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div className="md:col-span-6 lg:col-span-3">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
          
          <div className={`${showFilters ? 'block' : 'hidden'} md:block text-xs text-muted-foreground text-right font-medium mt-3 md:mt-0`}>
            Mostrando <strong>{filteredRoles.length}</strong> de <strong>{roles.length}</strong> roles.
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
            message={hasActiveFilters ? 'No hay roles que coincidan con los filtros.' : 'Cuando crees roles, aparecerán aquí.'}
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}><FilterX className="mr-2 w-4 h-4"/> Limpiar filtros</Button>
              ) : canCreate ? (
                <Button onClick={openCreateForm}><Plus className="mr-2 w-4 h-4"/> Crear primer rol</Button>
              ) : null
            }
          />
        ) : (
          <RolesGrid
            roles={filteredRoles}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={openEditForm}
            onDelete={setRoleToDelete}
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Desactivar rol"
        message={roleToDelete ? `¿Seguro que deseas desactivar el rol ${roleToDelete.name}?` : ''}
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