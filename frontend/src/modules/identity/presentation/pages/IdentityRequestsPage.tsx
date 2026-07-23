import React from 'react';
import { usePendingRequestsQuery, useApproveRequestMutation, useRejectRequestMutation } from '../hooks/useIdentityRequests';

export function IdentityRequestsPage() {
  const { data: requests, isLoading } = usePendingRequestsQuery();
  const approveMutation = useApproveRequestMutation();
  const rejectMutation = useRejectRequestMutation();

  const handleApprove = (requestId: string) => {
    approveMutation.mutate({ requestId, approverId: 'admin-1' });
  };

  const handleReject = (requestId: string) => {
    rejectMutation.mutate({ requestId, rejectorId: 'admin-1', reason: 'Rechazado manualmente' });
  };

  if (isLoading) return <div className="p-8">Cargando solicitudes...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Solicitudes Pendientes</h2>
      
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Área</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {(!requests || requests.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay solicitudes pendientes.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.areaId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.requestedQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleApprove(req.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleReject(req.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
