import React, { useMemo, useState } from 'react';
import { FilterX, Plus, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';

import { Alert } from '@/components/ui/alert.tsx';
import { Card, Button, Input, TopBar } from '../../../design-system';

// TODO: Refactorizar a Shadcn UI Select en un PR futuro para evitar dependencias circulares con componentes viejos
// Importamos temporalmente el UI nativo o el Shadcn para filtros si está disponible
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadingState from '@/components/feedback/LoadingState';

import { useUsersQuery } from '../hooks/useUsers';
import { getRolesRequest } from '../../roles/services/rolesApi';
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
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Queries
  const { data: users = [], isLoading, isError, error, refetch } = useUsersQuery();
  
  // Queries temporales para selectores (se refactorizarán en sus propios módulos luego)
  const { data: rolesResponse } = useQuery({
    queryKey: ['roles'],
    queryFn: getRolesRequest,
  });

  const { user: currentUser, hasPermission } = useAuthStore();
  const isSuperAdmin = currentUser?.role?.code === 'SUPERADMIN';
  const isSupervisor = currentUser?.role?.code === 'SUPERVISOR';
  const canViewRoles = hasPermission('roles.read');
  
  const [searchParams, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    const openUserId = searchParams.get('openUser');
    if (openUserId && users.length > 0 && !isFormOpen) {
      const targetUser = users.find((u) => String(u.id) === openUserId);
      if (targetUser) {
        setSelectedUser(targetUser);
        setIsFormOpen(true);
        searchParams.delete('openUser');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, users, isFormOpen, setSearchParams]);

  // Ocultamos el rol SUPERADMIN para todos los que no son SuperAdmin
  let roles = (rolesResponse?.data || []).filter((r: any) => isSuperAdmin || r.code !== 'SUPERADMIN');

  if (isSupervisor) {
    roles = roles.filter((r: any) => r.code === 'EMPLEADO' || r.code?.includes('EMPLEADO'));
  }

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => {
        // Ocultar usuarios que sean SuperAdmin si el usuario actual no lo es
        const userIsSuperAdmin = user.rolNombre.toUpperCase().includes('SUPERADMIN');
        if (!isSuperAdmin && userIsSuperAdmin) return false;

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
        const matchesStatus = statusFilter ? user.status === statusFilter : true;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [users, searchTerm, roleFilter, statusFilter]);

  const groupedUsers = useMemo(() => {
    const groups: Record<string, User[]> = {};
    
    filteredUsers.forEach(user => {
      // Si no tiene areaNombre, asumimos 'Global'
      const area = user.areaNombre || 'Global';
      if (!groups[area]) {
        groups[area] = [];
      }
      groups[area].push(user);
    });

    // Ordenar dentro de cada grupo por nombre de rol
    Object.values(groups).forEach(group => {
      group.sort((a, b) => a.rolNombre.localeCompare(b.rolNombre));
    });

    // Ordenar las llaves (Global primero, luego alfabéticamente)
    return Object.fromEntries(
      Object.entries(groups).sort(([areaA], [areaB]) => {
        if (areaA === 'Global') return -1;
        if (areaB === 'Global') return 1;
        return areaA.localeCompare(areaB);
      })
    );
  }, [filteredUsers]);

  const hasActiveFilters = Boolean(searchTerm || roleFilter || statusFilter);

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
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
    <div className="space-y-4 px-4 sm:px-6 md:px-8 pt-2 pb-4 md:pb-6 pb-32 sm:pb-12 overflow-x-hidden">
      
      {/* Mobile Navigation Tabs */}
      {canViewRoles && (
        <div className="lg:hidden flex bg-muted/30 p-1 rounded-lg w-full mb-2 border border-border">
          <Link to="/users" className="flex-1 text-center py-2 px-4 rounded-md bg-background shadow-sm font-bold text-sm text-foreground">Usuarios</Link>
          <Link to="/roles" className="flex-1 text-center py-2 px-4 rounded-md hover:bg-muted/80 text-muted-foreground font-bold text-sm transition-colors">Roles</Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2 w-full">
        <div className="flex-1 w-full min-w-[250px]">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground font-semibold mt-1">Administra accesos, roles y áreas del personal.</p>
        </div>
        <PermissionGate permission="users.create">
          <Button onClick={openCreateForm} size="lg" className="font-bold shadow-sm w-full md:w-auto h-12 text-sm shrink-0">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </Button>
        </PermissionGate>
      </div>

      <div className="space-y-4">
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
                  placeholder="Nómina, Nombre, Correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-10 font-medium"
                />
              </div>
              
              <div className="md:col-span-6 lg:col-span-3">
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
              </div>

              <div className="md:col-span-6 lg:col-span-3">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inactivos</option>
                  <option value="PENDING">Pendientes</option>
                </select>
              </div>
            </div>
            
            <div className={`${showFilters ? 'block' : 'hidden'} md:block text-xs text-muted-foreground text-right mt-3 md:mt-0`}>
              Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuarios.
            </div>
          </section>

          {isFormOpen && (
            <UserForm user={selectedUser} roles={roles} onClose={closeForm} />
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
            <div className="space-y-8">
              {Object.entries(groupedUsers).map(([area, groupUsers]) => (
                <div key={area} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-2">
                    <h2 className="text-xl font-bold text-foreground m-0">{area}</h2>
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      {groupUsers.length}
                    </span>
                  </div>
                  <UsersGrid users={groupUsers} onEdit={openEditForm} />
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
};

export default UsersPage;
