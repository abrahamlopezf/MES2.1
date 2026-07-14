const Card = ({
  children,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <section className={`bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || description || actions) && (
        <header className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}

      <div className="p-6">
        {children}
      </div>
    </section>
  );
};

export default Card;