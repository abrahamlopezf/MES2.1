import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Badge } from '@/design-system';
import { apiClient } from '@/core/api/apiClient';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  Shield,
  UserCheck,
  UserX,
  X,
  Save,
  Hash,
  Phone,
  Mail,
  User,
  KeyRound,
} from 'lucide-react';
import { TejidoOperator } from '../../types/telares.types';

interface OperatorFormData {
  id?: number;
  first_name: string;
  last_name: string;
  username: string;
  numero_nomina: string;
  telefono: string;
  email: string;
  role_id: number;
  password?: string;
  is_active: boolean;
}

const defaultFormData: OperatorFormData = {
  first_name: '',
  last_name: '',
  username: '',
  numero_nomina: '',
  telefono: '',
  email: '',
  role_id: 28, // Operador de Telares por defecto
  password: '',
  is_active: true,
};

export const TelaresOperatorsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPERVISOR' | 'OPERADOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<TejidoOperator | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>(defaultFormData);

  // Queries
  const { data: operators = [], isLoading, isError, refetch } = useQuery<TejidoOperator[]>({
    queryKey: ['telares', 'operators', true],
    queryFn: async () => apiClient.get('/telares/operators?all=true'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: OperatorFormData) => apiClient.post('/telares/operators', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telares', 'operators'] });
      toast.success('Operador registrado exitosamente.');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al registrar operador.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OperatorFormData> }) =>
      apiClient.put(`/telares/operators/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telares', 'operators'] });
      toast.success('Datos del operador actualizados.');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Error al actualizar operador.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/telares/operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telares', 'operators'] });
      toast.success('Operador desactivado exitosamente.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al desactivar operador.');
    },
  });

  // Abrir modal nuevo
  const handleOpenCreate = () => {
    setEditingOperator(null);
    setFormData({ ...defaultFormData });
    setIsModalOpen(true);
  };

  // Abrir modal editar
  const handleOpenEdit = (op: TejidoOperator) => {
    setEditingOperator(op);
    setFormData({
      id: op.id,
      first_name: op.first_name,
      last_name: op.last_name,
      username: op.username,
      numero_nomina: op.numero_nomina || '',
      telefono: op.telefono || '',
      email: op.email || '',
      role_id: op.role_id || (op.role_name.toLowerCase().includes('supervisor') ? 27 : 28),
      password: '',
      is_active: op.is_active !== undefined ? op.is_active : true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOperator(null);
    setFormData({ ...defaultFormData });
  };

  const handleToggleStatus = (op: TejidoOperator) => {
    const newStatus = !op.is_active;
    updateMutation.mutate({
      id: op.id,
      data: { is_active: newStatus },
    });
  };

  const handleDelete = (op: TejidoOperator) => {
    if (window.confirm(`¿Confirma que desea desactivar al operador ${op.full_name || op.username} (Nómina: ${op.numero_nomina})?`)) {
      deleteMutation.mutate(op.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.username.trim() || !formData.numero_nomina.trim()) {
      toast.error('Nombre, usuario y número de nómina son obligatorios.');
      return;
    }

    if (editingOperator && editingOperator.id) {
      updateMutation.mutate({
        id: editingOperator.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filtrado de operadores
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      // Texto de búsqueda
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (op.full_name || '').toLowerCase().includes(search) ||
        (op.first_name || '').toLowerCase().includes(search) ||
        (op.last_name || '').toLowerCase().includes(search) ||
        (op.username || '').toLowerCase().includes(search) ||
        (op.numero_nomina || '').toLowerCase().includes(search);

      // Rol
      const roleStr = (op.role_name || '').toLowerCase();
      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'SUPERVISOR' && roleStr.includes('supervisor')) ||
        (roleFilter === 'OPERADOR' && !roleStr.includes('supervisor'));

      // Estado
      const isActive = op.is_active !== false;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'INACTIVE' && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [operators, searchTerm, roleFilter, statusFilter]);

  // Contadores
  const stats = useMemo(() => {
    const total = operators.length;
    const activos = operators.filter((o) => o.is_active !== false).length;
    const supervisores = operators.filter((o) => (o.role_name || '').toLowerCase().includes('supervisor')).length;
    return { total, activos, inactivos: total - activos, supervisores };
  }, [operators]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 p-4 pb-28 sm:p-6 lg:pr-24">
      {/* Header Industrial */}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-slate-700 bg-slate-800 p-5 shadow-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              Catálogo de Operadores de Tejido / Telares
            </h1>
            <p className="text-sm font-semibold text-slate-300">
              Personal operativo de piso, números de nómina y trazabilidad en códigos QR Viajeros
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenCreate}
            className="h-11 font-black uppercase text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            + Registrar Operador
          </Button>
        </div>
      </header>

      {/* Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border-2 border-slate-700 bg-slate-850 p-4 shadow">
          <div className="text-xs font-bold uppercase text-slate-400">Total Operadores</div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[11px] text-slate-400">Plantilla asignada a Telares</div>
        </div>
        <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-950/20 p-4 shadow">
          <div className="text-xs font-bold uppercase text-emerald-400">Activos en Piso</div>
          <div className="text-2xl font-black text-emerald-300">{stats.activos}</div>
          <div className="text-[11px] text-emerald-400/80">Habilitados para turnos</div>
        </div>
        <div className="rounded-xl border-2 border-purple-500/30 bg-purple-950/20 p-4 shadow">
          <div className="text-xs font-bold uppercase text-purple-400">Supervisores</div>
          <div className="text-2xl font-black text-purple-300">{stats.supervisores}</div>
          <div className="text-[11px] text-purple-400/80">Gestión de turnos y calidad</div>
        </div>
        <div className="rounded-xl border-2 border-slate-700 bg-slate-850 p-4 shadow">
          <div className="text-xs font-bold uppercase text-slate-400">Inactivos</div>
          <div className="text-2xl font-black text-slate-300">{stats.inactivos}</div>
          <div className="text-[11px] text-slate-400">Bajas o suspendidos</div>
        </div>
      </div>

      {/* Encabezado de Filtros */}
      <section className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Barra de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nómina, nombre de operador o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-slate-900 border-2 border-slate-700 text-white placeholder:text-slate-500 rounded-xl font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros de Rol */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                roleFilter === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos los Roles
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('OPERADOR')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                roleFilter === 'OPERADOR' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Operadores
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('SUPERVISOR')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                roleFilter === 'SUPERVISOR' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Supervisores
            </button>
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>
      </section>

      {/* Tabla de Operadores */}
      <section className="rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold">Cargando catálogo de operadores de tejido...</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-400 font-bold">
            Ocurrió un error al cargar el catálogo de operadores.
            <div className="mt-3">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Reintentar
              </Button>
            </div>
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold">
            No se encontraron operadores con los criterios de búsqueda seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead className="border-b-2 border-slate-700 bg-slate-900 text-xs font-black uppercase text-slate-300">
                <tr>
                  <th className="p-3.5 pl-5">Nómina (QR)</th>
                  <th className="p-3.5">Operador / Nombre Completo</th>
                  <th className="p-3.5">Usuario</th>
                  <th className="p-3.5">Rol en Planta</th>
                  <th className="p-3.5">Teléfono</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-semibold">
                {filteredOperators.map((op) => {
                  const isActive = op.is_active !== false;
                  const isSupervisor = (op.role_name || '').toLowerCase().includes('supervisor');

                  return (
                    <tr key={op.id} className="hover:bg-slate-750 transition-colors">
                      {/* Nómina */}
                      <td className="p-3.5 pl-5">
                        <span className="inline-flex items-center gap-1 font-mono font-black text-sm text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                          <Hash className="h-3.5 w-3.5 text-amber-400" />
                          {op.numero_nomina || '1200'}
                        </span>
                      </td>

                      {/* Nombre Completo */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${
                            isSupervisor ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {(op.first_name?.[0] || 'O').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {op.full_name || `${op.first_name} ${op.last_name}`}
                            </div>
                            <div className="text-xs text-slate-400">{op.email || 'Sin correo'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Usuario */}
                      <td className="p-3.5 font-mono text-slate-300 text-xs">
                        @{op.username}
                      </td>

                      {/* Rol */}
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`font-black text-xs uppercase px-2.5 py-0.5 rounded-lg border ${
                            isSupervisor
                              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                              : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                          }`}
                        >
                          <Shield className="mr-1 h-3 w-3 inline" />
                          {op.role_name || 'Operador de Telares'}
                        </Badge>
                      </td>

                      {/* Teléfono */}
                      <td className="p-3.5 text-xs text-slate-400">
                        {op.telefono || '—'}
                      </td>

                      {/* Estado */}
                      <td className="p-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/40 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(op)}
                            title="Editar operador"
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(op)}
                            title={isActive ? 'Desactivar operador' : 'Activar operador'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-600/30'
                                : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/30'
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(op)}
                            title="Eliminar de catálogo"
                            className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-600/30 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* MODAL DE REGISTRO / EDICIÓN DE OPERADOR                   */}
      {/* ========================================================= */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" style={{ isolation: 'isolate' }}>
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white">
                    {editingOperator ? 'Editar Operador de Telares' : 'Registrar Nuevo Operador'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingOperator
                      ? `Actualizando nómina y permisos de ${editingOperator.full_name || editingOperator.username}`
                      : 'El número de nómina es el identificador usado en la salida del código QR de Telares'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-300">Nombre(s) *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. Carlos"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-10 bg-slate-800 border-2 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-300">Apellidos</label>
                  <Input
                    type="text"
                    placeholder="Ej. Morales"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-10 bg-slate-800 border-2 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Usuario y Número de Nómina */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-300">Usuario de Sistema *</label>
                  <Input
                    type="text"
                    required
                    disabled={Boolean(editingOperator)}
                    placeholder="Ej. cmorales"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    className="h-10 bg-slate-800 border-2 border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-amber-300 flex items-center justify-between">
                    <span>Número de Nómina *</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">Para QR Viajero</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. 1200"
                    value={formData.numero_nomina}
                    onChange={(e) => setFormData({ ...formData, numero_nomina: e.target.value.trim() })}
                    className="h-10 bg-slate-800 border-2 border-amber-500/50 text-amber-300 font-mono font-black"
                  />
                </div>
              </div>

              {/* Rol en Telares */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-300">Rol Operativo *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                  className="w-full h-10 px-3 bg-slate-800 border-2 border-slate-700 rounded-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={28}>Operador de Telares (Producción de piso)</option>
                  <option value={27}>Supervisor de Telares (Líder de turno y ruteo)</option>
                </select>
              </div>

              {/* Teléfono y Correo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-300 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>Teléfono</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej. 5512345678"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="h-10 bg-slate-800 border-2 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-300 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>Correo Electrónico</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 bg-slate-800 border-2 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                    <span>Contraseña {editingOperator ? '(Dejar en blanco para conservar)' : '*'}</span>
                  </span>
                  {!editingOperator && <span className="text-[10px] text-slate-400 font-mono">Default: Admin123!</span>}
                </label>
                <Input
                  type="password"
                  placeholder={editingOperator ? '••••••••' : 'Admin123!'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-10 bg-slate-800 border-2 border-slate-700 text-white font-mono"
                />
              </div>

              {/* Estado Activo */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">Operador Activo</span>
                    <p className="text-xs text-slate-400">
                      Permite que este operador aparezca en las terminales de turno de tejeduría.
                    </p>
                  </div>
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="font-bold border-slate-700 text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingOperator
                    ? 'Actualizar Operador'
                    : 'Guardar Operador'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TelaresOperatorsPage;
