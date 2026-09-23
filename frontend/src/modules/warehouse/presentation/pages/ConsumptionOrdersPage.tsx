import React, { useState, useEffect } from 'react';
import { Package, Clock, Eye, CheckCircle2, XCircle, Search, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../../api/axiosClient';
import { useAuthStore } from '../../../../store/authStore';
import { ConsumptionOrderDetailsModal } from '../components/ConsumptionOrderDetailsModal';
import { CreateConsumptionOrderModal } from '../components/CreateConsumptionOrderModal';

interface Order {
  uuid: string;
  order_number: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  requester: { name: string; last_name: string };
  requesting_area?: { name: string };
}

export const ConsumptionOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore() as any;
  const isWarehouseUser = ['ADMIN_ALM', 'OPERATOR_ALM', 'SUPERADMIN'].includes(user?.role?.code);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>(''); // empty means all
  
  const [selectedOrderUuid, setSelectedOrderUuid] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (orderId) {
      setSelectedOrderUuid(orderId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = selectedStatus ? `/warehouse/consumption-orders?status=${selectedStatus}` : '/warehouse/consumption-orders';
      const response = await axiosClient.get(url);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'PENDIENTE': return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Pendiente' };
      case 'PREPARANDO': return { color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', label: 'Preparando' };
      case 'SURTIDA': return { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', label: 'Surtida' };
      case 'CANCELADA': return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'Cancelada' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-muted/20', label: status };
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-x-hidden">
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 flex flex-col h-full">
        {/* Header */}
        <section className="bg-card rounded-xl border border-border shadow-sm p-5 w-full shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary/50 font-mono text-foreground">
                  Módulo de Almacén
                </span>
              </div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">Órdenes de Consumo</h1>
              <p className="text-muted-foreground font-semibold mt-1">Gestión y surtido de materiales solicitados por áreas</p>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus size={20} />
                <span>Nueva Orden</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tabs / Filters */}
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-2">
        {['', 'PENDIENTE', 'PREPARANDO', 'SURTIDA', 'CANCELADA'].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              selectedStatus === status 
                ? 'bg-card text-foreground border border-border shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
            }`}
          >
            {status === '' ? 'Todas' : getStatusConfig(status).label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando órdenes...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">No hay órdenes</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-2">No se encontraron órdenes de consumo con los filtros seleccionados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground">Orden</th>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground">Estatus</th>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground">Solicitante</th>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground">{isWarehouseUser ? 'Área Origen' : 'Área Destino'}</th>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground">Creación</th>
                  <th className="px-5 py-4 text-sm font-semibold text-muted-foreground text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(order => {
                  const conf = getStatusConfig(order.status);
                  return (
                    <tr key={order.uuid} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-primary">{order.order_number}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${conf.bg} ${conf.color} ${conf.border}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{order.requester?.name} {order.requester?.last_name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-muted-foreground text-sm">{isWarehouseUser ? (order.requesting_area?.name || 'N/A') : 'Almacén'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => setSelectedOrderUuid(order.uuid)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium hover:border-primary/50 hover:text-primary transition-all"
                        >
                          <Eye size={16} /> Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedOrderUuid && (
        <ConsumptionOrderDetailsModal 
          isOpen={!!selectedOrderUuid}
          orderUuid={selectedOrderUuid}
          onClose={() => {
            setSelectedOrderUuid(null);
            fetchOrders();
          }}
        />
      )}

      {isCreateModalOpen && (
        <CreateConsumptionOrderModal 
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            fetchOrders();
          }}
        />
      )}
    </div>
    </div>
  );
};
