import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileSearch,
  ArrowLeft,
  Loader2,
  History,
  Clock,
  ArrowRight,
  User,
  CheckCircle2,
  XCircle,
  Warehouse,
  ClipboardList,
  FlaskConical,
  Factory,
  Layers,
  QrCode,
  ExternalLink,
  ShieldCheck,
} from '@/design-system/components/Icon/googleIconCompat';
import { lookupQrCodeRequest } from '../../../../modules/qrcodes/services/qrcodesApi';
import { useAuthStore } from '@/store/authStore';
import { getUserAreaCode, isAdminUser } from '@/utils/authHelpers';

const stageIconMap: Record<string, React.ReactNode> = {
  ALMACEN_INGRESO: <Warehouse size={20} className="text-emerald-400" />,
  ORDEN_CONSUMO_SURTIDO: <ClipboardList size={20} className="text-blue-400" />,
  MEZCLADO_PREPARACION: <FlaskConical size={20} className="text-amber-400" />,
  EXTRUSION_RACK_PTI: <Factory size={20} className="text-purple-400" />,
  TELARES_FILETA_CORRIDA: <Layers size={20} className="text-cyan-400" />,
  VIAJERO_ROLLO_RUTEO: <QrCode size={20} className="text-emerald-400" />,
  QR_IDENTIDAD: <QrCode size={20} className="text-primary" />,
};

export function TraceabilityTreePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenId = searchParams.get('tokenId');
  const { user } = useAuthStore();

  const userAreaCode = getUserAreaCode(user);
  const globalAdmin = isAdminUser(user);

  const { data: qrInfo, isLoading, isError, error } = useQuery({
    queryKey: ['traceability', tokenId],
    queryFn: async () => {
      const response = await lookupQrCodeRequest(tokenId);
      return response.data || response;
    },
    enabled: !!tokenId,
    retry: false,
  });

  if (!tokenId) {
    return (
      <div className="px-4 py-8 sm:p-8 max-w-5xl mx-auto text-center text-muted-foreground">
        No se especificó un código QR para analizar su trazabilidad.
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm mx-auto block font-bold"
        >
          Regresar
        </button>
      </div>
    );
  }

  const routing = qrInfo?.operational_routing;
  const actionsByArea = routing?.actions_by_area || {};
  const userAreaAction = userAreaCode ? actionsByArea[userAreaCode] : null;
  const treeStages: any[] = Array.isArray(qrInfo?.traceability_tree) ? qrInfo.traceability_tree : [];

  return (
    <div className="px-4 sm:px-8 pt-4 pb-28 sm:py-8 max-w-5xl mx-auto space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold"
        >
          <ArrowLeft size={16} />
          Regresar
        </button>

        {userAreaAction?.route && (
          <button
            onClick={() => navigate(userAreaAction.route)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black shadow-md hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={16} />
            {userAreaAction.label || `Ir a Acción de ${userAreaCode}`}
          </button>
        )}
      </div>

      {/* Encabezado Principal del QR */}
      <div className="bg-card text-card-foreground border-2 border-border rounded-2xl shadow-lg p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block">
              Árbol de Trazabilidad de Extremo a Extremo (Almacén → Ubicación Actual)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              {routing?.entity_title || 'Detalle y Genealogía del Código QR'}
            </h1>
          </div>
          <div className="p-3 bg-background border-2 border-border rounded-xl flex items-center gap-3 shrink-0">
            <FileSearch size={28} className="text-primary shrink-0" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Código QR Escaneado
              </span>
              <span className="text-lg font-mono font-black text-foreground break-all">
                {routing?.scanned_code || tokenId}
              </span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="animate-spin mb-3 text-primary" size={36} />
            <span className="font-bold text-base">
              Reconstruyendo árbol de trazabilidad desde el ingreso en Almacén...
            </span>
          </div>
        ) : isError ? (
          <div className="p-5 bg-destructive/10 border-2 border-destructive/30 rounded-xl shadow-sm">
            <h3 className="text-destructive font-black flex items-center gap-2 mb-1 text-base">
              <XCircle size={20} /> Código QR no localizado
            </h3>
            <p className="text-sm font-semibold text-foreground/90">
              {(error as any)?.response?.data?.message ||
                'No se encontró información de trazabilidad para el código QR escaneado.'}
            </p>
          </div>
        ) : qrInfo ? (
          <>
            {/* Resumen de Estado y Ubicación Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-background border border-border rounded-xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Ubicación / Etapa Actual
                </span>
                <span className="text-base font-black text-foreground mt-0.5">
                  {routing?.current_stage ||
                    qrInfo.qr?.assigned_area?.name ||
                    (qrInfo.inventory ? 'Almacén de Materia Prima' : 'Planta')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Estado Actual del QR
                </span>
                <span className="text-base font-black text-primary mt-0.5">
                  {routing?.current_status || qrInfo.qr?.status || qrInfo.status || 'ACTIVO'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Etapas Registradas en el Árbol
                </span>
                <span className="text-base font-black text-foreground mt-0.5">
                  {treeStages.length} {treeStages.length === 1 ? 'etapa verificada' : 'etapas verificadas'}
                </span>
              </div>
            </div>

            {/* Aviso de modo consulta cuando el usuario es de otra área */}
            {!userAreaAction && !globalAdmin && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold text-foreground">
                <ShieldCheck size={20} className="text-primary shrink-0" />
                <span>
                  Este código QR se encuentra en <strong>{routing?.current_stage || 'otra área'}</strong>. Como tu rol pertenece a <strong>{userAreaCode || 'consulta'}</strong>, se despliega el árbol de trazabilidad completo en modo lectura.
                </span>
              </div>
            )}

            {/* Acciones disponibles para Admin General */}
            {globalAdmin && Object.keys(actionsByArea).length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-primary block">
                  Acciones Operativas Disponibles por Área
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(actionsByArea).map(([areaKey, actionObj]: [string, any]) => (
                    <button
                      key={areaKey}
                      onClick={() => navigate(actionObj.route)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-black uppercase hover:opacity-90 transition-opacity"
                    >
                      <ExternalLink size={14} />
                      {areaKey}: {actionObj.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ÁRBOL DE TRAZABILIDAD COMPLETO (DESDE INGRESO EN ALMACÉN HASTA UBICACIÓN ACTUAL) */}
            {treeStages.length > 0 && (
              <div className="mt-2 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-lg font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                    <History size={20} className="text-primary" />
                    Recorrido Completo del Material (Paso a Paso)
                  </h2>
                  <span className="text-xs font-bold text-muted-foreground">
                    Orden cronológico: Almacén → Proceso Actual
                  </span>
                </div>

                <div className="relative border-l-4 border-primary/40 ml-4 pl-6 space-y-8">
                  {treeStages.map((stage: any) => (
                    <div key={stage.stage_key} className="relative space-y-4">
                      {/* Nodo de Etapa */}
                      <div className="absolute -left-[38px] top-1 w-7 h-7 rounded-full bg-card border-4 border-primary flex items-center justify-center text-xs font-black text-foreground shadow">
                        {stage.step_number}
                      </div>

                      {/* Cabecera de Etapa */}
                      <div className="bg-background border-2 border-border rounded-xl p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-border pb-3">
                          <div className="flex items-center gap-2.5">
                            {stageIconMap[stage.stage_key] || <CheckCircle2 size={20} className="text-primary" />}
                            <div>
                              <span className="text-[11px] font-black uppercase tracking-wider text-primary block">
                                Etapa {stage.step_number} · {stage.area_name}
                              </span>
                              <h3 className="text-base sm:text-lg font-black text-foreground">
                                {stage.title}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-black uppercase">
                              {stage.status}
                            </span>
                            {stage.timestamp && (
                              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(stage.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Elementos detallados dentro de la etapa */}
                        <div className="space-y-4">
                          {(stage.items || []).map((item: any, itemIdx: number) => (
                            <div
                              key={`${stage.stage_key}-item-${itemIdx}`}
                              className="rounded-xl border border-border bg-card p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-black text-sm sm:text-base text-foreground">
                                  {item.title}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.qr_code && (
                                    <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-mono text-xs font-bold border border-border">
                                      QR: {item.qr_code}
                                    </span>
                                  )}
                                  {item.status && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                                      {item.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {(item.details || []).map((detail: any, dIdx: number) => (
                                  <div
                                    key={dIdx}
                                    className="p-2.5 rounded-lg bg-background border border-border/70 flex flex-col"
                                  >
                                    <span className="text-[11px] font-bold uppercase text-muted-foreground">
                                      {detail.label}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5 break-words">
                                      {detail.value ?? 'N/D'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bitácora Puntual de Eventos sobre la Etiqueta QR */}
            {qrInfo.events && qrInfo.events.length > 0 && (
              <div className="mt-6 p-5 bg-background border-2 border-border rounded-xl shadow-sm">
                <h3 className="text-foreground font-black flex items-center gap-2 mb-5 text-base uppercase">
                  <History size={18} className="text-primary" /> Bitácora de Eventos del Código QR
                </h3>
                <div className="relative border-l-2 border-border ml-3 pl-6 space-y-5">
                  {qrInfo.events.map((event: any, idx: number) => (
                    <div key={event.id || idx} className="relative">
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <span className="font-black text-foreground text-xs sm:text-sm uppercase tracking-wide">
                            {event.event_type?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(event.created_at || event.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User size={14} className="opacity-70" />
                            <span className="font-bold text-foreground">
                              {event.performed_by
                                ? `${event.performed_by.first_name} ${event.performed_by.last_name || ''}`.trim()
                                : 'Sistema'}
                            </span>
                          </div>

                          {event.from_status && event.to_status && event.from_status !== event.to_status && (
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-bold">
                                {event.from_status}
                              </span>
                              <ArrowRight size={12} />
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">
                                {event.to_status}
                              </span>
                            </div>
                          )}
                        </div>

                        {event.notes && (
                          <p className="text-xs sm:text-sm text-foreground/90 bg-secondary/30 p-2.5 rounded-lg mt-1 border border-border/50 font-medium">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
