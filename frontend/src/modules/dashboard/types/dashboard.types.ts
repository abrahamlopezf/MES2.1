export type DashboardSeverity = 'GOOD' | 'WARNING' | 'CRITICAL' | 'DEFAULT';
export type RunStatus = 'EN_PROCESO' | 'PAUSADA' | 'DETENIDA' | 'FINALIZADA';

export interface DashboardKPI {
  label: string;
  value: string | number;
  unit?: string;
  status: DashboardSeverity;
}

export interface ActiveRun {
  id: string;
  code: string;
  process_name: string;
  status: RunStatus;
  production_current: string;
  alerts: number;
}

export interface DashboardAlert {
  id: string;
  severity: DashboardSeverity;
  message: string;
  timestamp: string;
}

export interface DashboardPayload {
  generated_at: string;
  last_update: string;
  kpis: {
    production: DashboardKPI;
    scrap: DashboardKPI;
    yield: DashboardKPI;
  };
  active_runs: ActiveRun[];
  alerts: DashboardAlert[];
}
