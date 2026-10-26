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

  if (isLoading) return <div className="p-8 text-foreground text-base">Cargando solicitudes...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 overflow-x-hidden">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Solicitudes Pendientes</h2>
      
      <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="md:hidden divide-y divide-border">
          {(!requests || requests.length === 0) ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-base">
              No hay solicitudes pendientes.
            </p>
          ) : (
            requests.map((req) => (
              <article key={req.id} className="p-4 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">Solicitud</p>
                    <p className="text-base font-bold text-foreground break-words">{req.id}</p>
                  </div>
                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full bg-warning/10 text-warning border border-warning/30 shrink-0">
                    {req.status}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Área</dt>
                    <dd className="mt-1 font-semibold text-foreground break-words">{req.areaId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cantidad solicitada</dt>
                    <dd className="mt-1 font-semibold text-foreground">{req.requestedQuantity}</dd>
                  </div>
                </dl>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="min-h-12 rounded-md border border-success/40 px-3 text-base font-bold text-success hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="min-h-12 rounded-md border border-danger/40 px-3 text-base font-bold text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <table className="hidden md:table min-w-full divide-y divide-border text-left">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 sm:px-6 py-4 text-sm font-bold text-secondary-foreground uppercase">ID</th>
              <th className="px-4 sm:px-6 py-4 text-sm font-bold text-secondary-foreground uppercase">Área</th>
              <th className="px-4 sm:px-6 py-4 text-sm font-bold text-secondary-foreground uppercase">Cantidad</th>
              <th className="px-4 sm:px-6 py-4 text-sm font-bold text-secondary-foreground uppercase">Estado</th>
              <th className="px-4 sm:px-6 py-4 text-right text-sm font-bold text-secondary-foreground uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {(!requests || requests.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-muted-foreground text-base">
                  No hay solicitudes pendientes.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-base font-semibold text-foreground">{req.id}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-base text-foreground">{req.areaId}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-base text-foreground">{req.requestedQuantity}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full bg-warning/10 text-warning border border-warning/30">
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleApprove(req.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="inline-flex min-h-11 items-center px-3 text-base font-bold text-success hover:text-success/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleReject(req.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="inline-flex min-h-11 items-center px-3 text-base font-bold text-danger hover:text-danger/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md disabled:opacity-50"
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
