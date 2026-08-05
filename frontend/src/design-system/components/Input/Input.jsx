import React, { forwardRef, useState } from 'react';
import { ComponentHealth } from '../../foundation/ComponentHealth';
import { createComponentMetadata } from '../../foundation/ComponentMetadata';
import { tokens } from '../../foundation/tokens';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  ComponentHealth.check('Input');
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.primitive.spacing['4'],
    width: '100%',
    fontFamily: tokens.primitive.typography.sans,
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: error ? tokens.semantic.color.danger : tokens.semantic.color.textHighEmphasis,
  };

  const inputStyle = {
    minHeight: tokens.primitive.spacing['48'], // Touch zone priority
    backgroundColor: tokens.semantic.color.surface,
    color: tokens.semantic.color.textHighEmphasis,
    border: `2px solid ${error ? tokens.semantic.color.danger : (isFocused ? tokens.semantic.color.primary : tokens.semantic.color.borderDefault)}`,
    borderRadius: tokens.primitive.spacing['8'],
    padding: `0 ${tokens.primitive.spacing['16']}`,
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 150ms ease',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  };

  const helperStyle = {
    fontSize: '12px',
    color: error ? tokens.semantic.color.danger : tokens.semantic.color.textMediumEmphasis,
  };

  return (
    <div style={containerStyle} className={className}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        ref={ref}
        disabled={disabled}
        style={inputStyle}
        onFocus={(e) => {
          setIsFocused(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (props.onBlur) props.onBlur(e);
        }}
        {...props}
      />
      {(error || helperText) && (
        <span style={helperStyle}>{error || helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.metadata = createComponentMetadata({
  component: "Input",
  touchTarget: 48,
});
