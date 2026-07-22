import React, { useMemo, useState } from 'react';
import { FilterX, Plus, RefreshCw, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';

// TODO: Refactorizar a Shadcn UI Select en un PR futuro para evitar dependencias circulares con componentes viejos
// Importamos temporalmente el UI nativo o el Shadcn para filtros si está disponible
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadingState from '@/components/feedback/LoadingState';

import { useUsersQuery } from '../hooks/useUsers';
import { getRolesRequest } from '../../roles/services/rolesApi';
import { getAreasRequest } from '../../areas/services/areasApi';
import { includesNormalized } from '@/utils/filters';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { useAuthStore } from '@/store/authStore';

import UserForm from '../components/UserForm';
import UsersTable from '../components/UsersTable';
import { User } from '../types/user';

const UsersPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Queries
  const { data: users = [], isLoading, isError, error, refetch } = useUsersQuery();
  
  // Queries temporales para selectores (se refactorizarán en sus propios módulos luego)
  const { data: rolesResponse } = useQuery({
    queryKey: ['roles'],
    queryFn: getRolesRequest,
  });
  const { data: areasResponse } = useQuery({
    queryKey: ['areas'],
    queryFn: getAreasRequest,
  });

  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role?.code === 'SUPERADMIN';
  const isSupervisor = currentUser?.role?.code === 'SUPERVISOR';

  // Ocultamos el rol SUPERADMIN para todos los que no son SuperAdmin
  let roles = (rolesResponse?.data || []).filter((r: any) => isSuperAdmin || r.code !== 'SUPERADMIN');
  let areas = areasResponse?.data || [];

  if (isSupervisor) {
    roles = roles.filter((r: any) => r.code === 'EMPLEADO' || r.code?.includes('EMPLEADO'));
    areas = areas.filter((a: any) => String(a.id) === String(currentUser?.area?.id || currentUser?.areaId));
  }

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        // Ocultar usuarios que sean SuperAdmin si el usuario actual no lo es
        const userIsSuperAdmin = user.rolNombre.toUpperCase().includes('SUPERADMIN');
        if (!isSuperAdmin && userIsSuperAdmin) return false;

        // Supervisor solo ve su área
        if (isSupervisor && String(user.areaId) !== String(currentUser?.area?.id || currentUser?.areaId)) {
          return false;
        }

        const searchableText = [
          user.nombres,
          user.apellidos,
          user.username,
          user.numeroNomina,
          user.correo,
          user.telefono,
          user.rolNombre,
          user.areaNombre,
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch = includesNormalized(searchableText, searchTerm);
        const matchesRole = roleFilter ? String(user.rolId) === String(roleFilter) : true;
        const matchesArea = areaFilter ? String(user.areaId) === String(areaFilter) : true;
        const matchesStatus =
          statusFilter === 'active'
            ? user.activo
            : statusFilter === 'inactive'
            ? !user.activo
            : true;

        return matchesSearch && matchesRole && matchesArea && matchesStatus;
      })
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [users, searchTerm, roleFilter, areaFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchTerm || roleFilter || areaFilter || statusFilter);

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setAreaFilter('');
    setStatusFilter('');
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const openEditForm = (targetUser: User) => {
    setSelectedUser(targetUser);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  if (isLoading) {
    return <LoadingState title="Cargando usuarios" message="Sincronizando con el servidor..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar usuarios"
        message={error instanceof Error ? error.message : 'Ocurrió un error inesperado'}
        action={
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Intentar nuevamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
            <p className="text-muted-foreground">Administra los accesos y roles del sistema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>

            <PermissionGate permission="users.create">
              <Button onClick={openCreateForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo usuario
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div className="space-y-4">
          <section className="bg-muted/50 p-4 rounded-lg border space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Filtros de Búsqueda</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FilterX className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Buscar (Nómina, Nombre, Correo...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Todos los roles</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {areas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            
            <div className="text-xs text-muted-foreground text-right">
              Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuarios.
            </div>
          </section>

          {isFormOpen && (
            <UserForm user={selectedUser} roles={roles} areas={areas} onClose={closeForm} />
          )}

          {!filteredUsers.length ? (
            <EmptyState
              title="No encontramos usuarios"
              message={
                hasActiveFilters
                  ? 'No hay usuarios que coincidan con los filtros.'
                  : 'Cuando crees usuarios, aparecerán aquí.'
              }
            />
          ) : (
            <UsersTable users={filteredUsers} onEdit={openEditForm} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default UsersPage;
