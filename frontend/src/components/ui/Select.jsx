const Select = ({
  label,
  name,
  error,
  helperText,
  options = [],
  placeholder = 'Selecciona una opción',
  className = '',
  ...props
}) => {
  return (
    <label className={`ui-field ${className}`}>
      {label && <span className="ui-field-label">{label}</span>}

      <div className={`ui-select-wrapper ${error ? 'ui-input-error' : ''}`}>
        <select
          name={name}
          className="ui-select"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

export default Select;