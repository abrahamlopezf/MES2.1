const Card = ({
  children,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <section className={`ui-card ${className}`}>
      {(title || description || actions) && (
        <header className="ui-card-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>

          {actions && (
            <div className="ui-card-actions">
              {actions}
            </div>
          )}
        </header>
      )}

      <div className="ui-card-body">
        {children}
      </div>
    </section>
  );
};

export default Card;