import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Server } from 'lucide-react';
import { getHealthStatus } from '../services/healthApi';

const HealthPage = () => {
  const [status, setStatus] = useState({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    const loadHealthStatus = async () => {
      try {
        const response = await getHealthStatus();

        setStatus({
          loading: false,
          error: null,
          data: response,
        });
      } catch (error) {
        setStatus({
          loading: false,
          error: error.friendlyMessage || 'No se pudo conectar con el servidor.',
          data: null,
        });
      }
    };

    loadHealthStatus();
  }, []);

  if (status.loading) {
    return (
      <main className="page-container">
        <section className="status-card">
          <Loader2 size={54} className="spin" />
          <h1>Revisando conexión</h1>
          <p>Estamos validando que el sistema esté disponible.</p>
        </section>
      </main>
    );
  }

  if (status.error) {
    return (
      <main className="page-container">
        <section className="status-card status-card-error">
          <AlertTriangle size={58} />
          <h1>No hay conexión con el servidor</h1>
          <p>{status.error}</p>
          <p className="small-text">
            Verifica que el backend esté corriendo en http://localhost:4000
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="status-card status-card-success">
        <CheckCircle size={62} />
        <h1>Sistema conectado correctamente</h1>
        <p>{status.data?.message}</p>

        <div className="info-panel">
          <div className="info-row">
            <Server size={28} />
            <span>{status.data?.data?.service}</span>
          </div>

          <div className="status-badge">
            Estado: {status.data?.data?.status}
          </div>
        </div>
      </section>
    </main>
  );
};

export default HealthPage;