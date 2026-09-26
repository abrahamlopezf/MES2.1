import React from 'react';
import { Edit3, Power, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, Badge, Button } from '../../../design-system';

const getRoleBadgeVariant = (roleCode) => {
  if (roleCode === 'SUPERADMIN') return 'default';
  if (roleCode === 'ADMIN') return 'secondary';
  if (roleCode === 'FINANCE') return 'outline';
  return 'secondary';
};

const RolesTable = ({
  roles = [],
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
}) => {
  const [expandedRoleId, setExpandedRoleId] = React.useState(null);

  const toggleExpand = (id) => {
    setExpandedRoleId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {roles.map((row) => {
        const canManageSystemRole = !row.is_system;
        const canDeactivate = canDelete && canManageSystemRole && row.is_active;
        const isExpanded = expandedRoleId === row.id;

        return (
          <Card 
            key={row.id} 
            className="relative group hover:border-primary/50 transition-colors bg-card shadow-sm cursor-pointer md:cursor-default"
            onClick={() => toggleExpand(row.id)}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-start mb-0 md:mb-4">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="font-black text-foreground text-xl leading-none tracking-tight">
                    {row.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {row.code}
                  </p>
                </div>
                
                <div className="md:hidden text-muted-foreground shrink-0 mt-1">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                <Badge variant={getRoleBadgeVariant(row.code)} className="hidden md:inline-flex font-bold shrink-0">
                  {row.code}
                </Badge>
              </div>

              {/* Collapsible Content for Mobile */}
              <div className={`${isExpanded ? 'block' : 'hidden'} md:block mt-4 md:mt-0 animate-in slide-in-from-top-2 fade-in duration-200`}>
                <div className="md:hidden mb-4">
                  <Badge variant={getRoleBadgeVariant(row.code)} className="font-bold">
                    {row.code}
                  </Badge>
                </div>

                <div className="bg-surface rounded-lg p-4 mb-5 space-y-2 border border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-semibold">Tipo</span>
                    <span className="font-bold text-foreground">
                      {row.is_system ? 'Base del sistema' : 'Personalizado'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-semibold">Permisos</span>
                    <div className="flex items-center gap-1 font-bold text-foreground">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <span>{row.permissions?.length || 0} asignados</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-y-4 gap-x-2 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 shrink-0 rounded-full ${row.is_active ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 shrink-0 w-full md:w-auto justify-end">
                    {canUpdate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold shadow-sm justify-center w-full md:w-auto"
                      >
                        <Edit3 className="h-4 w-4 mr-1.5 shrink-0" />
                        Editar
                      </Button>
                    )}
                    {canDeactivate && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold shadow-sm justify-center w-full md:w-auto"
                      >
                        <Power className="h-4 w-4 mr-1.5 shrink-0" />
                        Desactivar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RolesTable;