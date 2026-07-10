import { Inbox } from 'lucide-react';

const EmptyState = ({
  title = 'Sin información',
  message = 'Aún no hay registros para mostrar.',
  action,
}) => {
  return (
    <section className="ui-state-card">
      <Inbox size={52} />
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

export default EmptyState;