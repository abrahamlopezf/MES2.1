const Input = ({
  label,
  name,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <label className={`ui-field ${className}`}>
      {label && <span className="ui-field-label">{label}</span>}

      <div className={`ui-input-wrapper ${error ? 'ui-input-error' : ''}`}>
        {Icon && <Icon size={24} />}

        <input
          name={name}
          className="ui-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
      </div>

      {error && (
        <span id={`${name}-error`} className="ui-field-error">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span className="ui-field-helper">
          {helperText}
        </span>
      )}
    </label>
  );
};

export default Input;