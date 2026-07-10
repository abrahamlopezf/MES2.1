const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const buttonClassName = [
    'ui-button',
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth ? 'ui-button-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {Icon && <Icon size={24} />}
      <span>{isLoading ? 'Procesando...' : children}</span>
    </button>
  );
};

export default Button;