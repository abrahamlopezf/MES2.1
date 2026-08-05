import React, { useMemo, useState } from 'react';
import { FilterX, Plus, RefreshCw, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Alert } from '@/components/ui/alert.tsx';
import { Card, Button, Input, TopBar } from '../../../design-system';

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
import UsersGrid from '../components/UsersTable';
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
    <div className="space-y-4 px-4 sm:px-6 md:px-8 py-4 md:py-6 pb-32 sm:pb-12 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground font-semibold mt-1">Administra accesos, roles y áreas del personal.</p>
        </div>
        <PermissionGate permission="users.create">
          <Button onClick={openCreateForm} size="lg" className="font-bold shadow-sm">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </Button>
        </PermissionGate>
      </div>

      <div className="space-y-4">
          <section className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-lg">Filtros de Búsqueda</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  <FilterX className="w-4 h-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nómina, Nombre, Correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 font-medium"
                />
              </div>
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Todos los roles</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {areas.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

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
            <UsersGrid users={filteredUsers} onEdit={openEditForm} />
          )}
        </div>
    </div>
  );
};

export default UsersPage;
