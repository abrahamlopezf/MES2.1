import { Loader2 } from '@/design-system/components/Icon/googleIconCompat';

const LoadingState = ({
  title = 'Cargando información',
  message = 'Estamos preparando los datos. Por favor espera un momento.',
}) => {
  return (
    <section className="ui-state-card">
      <Loader2 size={52} className="spin" />
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
};

export default LoadingState;