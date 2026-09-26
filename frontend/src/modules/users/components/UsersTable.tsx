import React, { useState } from 'react';
import { Edit3, ChevronDown, ChevronUp } from 'lucide-react';

import { Card, CardContent, Badge, Button } from '../../../design-system';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { User } from '../types/user';

interface UsersGridProps {
  users: User[];
  onEdit: (user: User) => void;
}

const UsersGrid: React.FC<UsersGridProps> = ({ users = [], onEdit }) => {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.map((user) => {
        const isSuperadmin = user.rolNombre.toUpperCase().includes('ADMIN');
        const status = user.status;
        
        return (
          <Card key={user.id} className="relative group hover:border-primary/50 transition-colors bg-card shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex justify-between items-start mb-2 md:mb-4 gap-2">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h3 className="font-black text-foreground text-lg md:text-xl leading-none tracking-tight truncate">
                    {user.nombres} {user.apellidos}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground font-semibold truncate">{user.username}</p>
                </div>
                <Badge variant={isSuperadmin ? 'default' : 'secondary'} className="font-bold shrink-0">
                  {user.rolNombre}
                </Badge>
              </div>

              {/* Accordion toggle on mobile, hidden on desktop */}
              <div className="md:hidden mt-2 border-t border-border pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary/20 flex justify-between items-center px-2 py-1.5 h-auto"
                  onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                    </span>
                  </div>
                  {expandedUserId === user.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </div>

              {/* Collapsible Content */}
              <div className={`${expandedUserId === user.id ? 'block' : 'hidden'} md:block animate-in fade-in slide-in-from-top-2 duration-200`}>
                <div className="bg-surface rounded-lg p-3 md:p-4 mt-3 mb-4 md:mb-5 space-y-2 border border-border">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-muted-foreground font-semibold">Nómina</span>
                    <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border shadow-sm">
                      {user.numeroNomina || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-muted-foreground font-semibold">Área</span>
                    <span className="font-bold text-foreground">
                      {user.areaNombre || 'Global'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-border">
                  <div className="hidden md:flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'ACTIVE' ? 'bg-success' : status === 'PENDING' ? 'bg-warning' : 'bg-danger'}`} />
                    <span className="text-sm font-bold text-foreground">
                      {status === 'ACTIVE' ? 'Activo' : status === 'PENDING' ? 'Pendiente' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="md:hidden flex-1" />

                  <PermissionGate permission="users.update">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(user)}
                      className="w-full md:w-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold shadow-sm"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UsersGrid;
