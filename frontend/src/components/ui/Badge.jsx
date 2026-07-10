const Badge = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;