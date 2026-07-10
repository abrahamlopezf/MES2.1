import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title, description }) => {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <Construction size={46} />
      </div>

      <h2>{title}</h2>
      <p>{description}</p>

      <div className="placeholder-note">
        Este módulo ya tiene ruta protegida y está preparado para desarrollarse en el siguiente sprint.
      </div>
    </section>
  );
};

export default PlaceholderPage;