import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosClient from '@/api/axiosClient';
import { RefreshCw } from '@/design-system/components/Icon/googleIconCompat';

type ClockSync = { serverAtSync: number; clientAtSync: number };

const TIME_ZONE = 'America/Mexico_City';
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const compactTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

async function getServerClock(): Promise<ClockSync> {
  const requestStartedAt = Date.now();
  const response = await axiosClient.get('/health');
  const responseReceivedAt = Date.now();
  const timestamp = response.data?.data?.timestamp || response.data?.timestamp;
  const serverAtSync = Date.parse(timestamp);

  if (!Number.isFinite(serverAtSync)) {
    throw new Error('El servidor no devolvió una hora válida.');
  }

  return {
    serverAtSync,
    // Midpoint reduces the effect of network latency on the displayed offset.
    clientAtSync: requestStartedAt + (responseReceivedAt - requestStartedAt) / 2,
  };
}

export const SystemClock: React.FC = () => {
  const [clientNow, setClientNow] = useState(() => Date.now());
  const clockQuery = useQuery({
    queryKey: ['system', 'server-clock'],
    queryFn: getServerClock,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 0,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setClientNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const synced = clockQuery.data;
  const serverNow = synced
    ? synced.serverAtSync + (clientNow - synced.clientAtSync)
    : null;
  const stale = Date.now() - clockQuery.dataUpdatedAt > 180_000;
  const isReliable = serverNow != null && !stale;

  if (!isReliable) {
    return (
      <button
        type="button"
        onClick={() => { void clockQuery.refetch(); }}
        disabled={clockQuery.isFetching}
        title="La hora del servidor no está sincronizada. Selecciona para reintentar."
        aria-label="Hora del servidor no sincronizada. Reintentar"
        className="flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-warning hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 sm:px-3"
      >
        <RefreshCw className={`size-3.5 shrink-0 ${clockQuery.isFetching ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Hora sin sincronizar</span>
        <span className="sm:hidden">Sin hora</span>
      </button>
    );
  }

  const iso = new Date(serverNow).toISOString();
  const date = dateFormatter.format(serverNow).replace('.', '');
  const time = timeFormatter.format(serverNow);
  const compactTime = compactTimeFormatter.format(serverNow);

  return (
    <div
      role="group"
      title={`Hora del servidor · ${new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, dateStyle: 'full', timeStyle: 'long' }).format(serverNow)}`}
      aria-label={`Hora del servidor: ${date} ${time}, Ciudad de México`}
      className="flex min-h-10 items-center gap-2 rounded-full px-2 text-foreground sm:gap-2.5 sm:px-3"
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success" />
      <time dateTime={iso} className="hidden text-xs font-semibold capitalize text-muted-foreground sm:inline">{date}</time>
      <time dateTime={iso} className="font-mono text-sm font-bold tabular-nums tracking-tight sm:hidden">{compactTime}</time>
      <time dateTime={iso} className="hidden font-mono text-sm font-bold tabular-nums tracking-tight sm:inline sm:text-base">{time}</time>
      <span className="hidden text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:inline">CDMX</span>
    </div>
  );
};

export default SystemClock;
