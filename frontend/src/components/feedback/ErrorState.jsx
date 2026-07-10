import { AlertTriangle } from 'lucide-react';

const ErrorState = ({
  title = 'No pudimos cargar la información',
  message = 'Ocurrió un problema. Intenta nuevamente.',
  action,
}) => {
  return (
    <section className="ui-state-card ui-state-error">
      <AlertTriangle size={52} />
      <h2>{title}</h2>
      <p>{message}</p>

      {action && (
        <div className="ui-state-action">
          {action}
        </div>
      )}
    </section>
  );
};

export default ErrorState;