import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Search, ChevronDown, AlertTriangle } from 'lucide-react';

const TFSelect = React.forwardRef(
  (
    {
      className,
      label,
      helperText,
      error,
      options = [],
      placeholder = 'Selecciona una opción',
      name,
      value,
      onChange,
      disabled,
      isMulti = false,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
        });
      }
    };

    // Close on click outside & position update
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          containerRef.current && !containerRef.current.contains(event.target) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Filter options
    const filteredOptions = options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = isMulti 
      ? options.filter(opt => Array.isArray(value) && value.includes(String(opt.value)))
      : options.find(opt => String(opt.value) === String(value));

    const handleSelect = (optionValue) => {
      if (isMulti) {
        if (!optionValue) return; // Ignore empty selection for multi
        const currentValues = Array.isArray(value) ? [...value] : [];
        const strValue = String(optionValue);
        const index = currentValues.indexOf(strValue);
        
        let newValues;
        if (index > -1) {
          newValues = currentValues.filter(v => v !== strValue);
        } else {
          newValues = [...currentValues, strValue];
        }
        
        if (onChange) {
          onChange({ target: { name, value: newValues } });
        }
      } else {
        if (onChange) {
          onChange({ target: { name, value: optionValue } });
        }
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const portalTarget = typeof document !== 'undefined' ? document.body : null;

    return (
      <label className={cn('grid gap-2 w-full', containerClassName)} ref={containerRef}>
        {label && (
          <span className="text-sm font-bold text-foreground ml-1">
            {label}
          </span>
        )}

        <div className="relative w-full">
          {/* Native select for form libraries that might rely on it */}
          <select
            ref={ref}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            multiple={isMulti}
            className="hidden"
            {...props}
          >
            {!isMulti && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Custom Trigger */}
          <div
            ref={triggerRef}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              "flex min-h-[48px] w-full items-center justify-between rounded-2xl border bg-background px-4 text-base font-bold text-foreground transition-all duration-200 ease-out focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 cursor-pointer",
              error ? "border-destructive focus:border-destructive focus:shadow-destructive/20 animate-shake" : "border-border hover:border-primary",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            tabIndex={disabled ? -1 : 0}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            <span className={(isMulti ? selectedOption.length > 0 : selectedOption) ? "text-foreground truncate" : "text-muted-foreground truncate"}>
              {isMulti 
                ? (selectedOption.length > 0 ? `${selectedOption.length} seleccionad${selectedOption.length === 1 ? 'a' : 'as'}` : placeholder)
                : (selectedOption ? selectedOption.label : placeholder)}
            </span>
            <ChevronDown className="size-4 text-muted-foreground shrink-0 ml-2" />
          </div>

          {/* Dropdown Menu Portal */}
          {isOpen && portalTarget && createPortal(
            <div 
              ref={dropdownRef}
              style={dropdownStyle}
              className="bg-card text-card-foreground border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2"
            >
              <div className="p-2 border-b border-border flex items-center sticky top-0 bg-card z-10">
                <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                <input
                  type="text"
                  className="flex w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                {!isMulti && (
                  <div 
                    className={cn(
                      "px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
                      !value ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted font-medium text-foreground"
                    )}
                    onClick={() => handleSelect('')}
                  >
                    {placeholder}
                  </div>
                )}
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No se encontraron resultados
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = isMulti 
                      ? Array.isArray(value) && value.includes(String(option.value))
                      : String(option.value) === String(value);
                      
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          "px-3 py-2 text-sm rounded-md cursor-pointer transition-colors break-words flex items-center justify-between gap-2",
                          option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted",
                          isSelected ? "bg-primary/10 text-primary font-bold" : "font-medium text-foreground"
                        )}
                        onClick={() => !option.disabled && handleSelect(option.value)}
                      >
                        <span>{option.label}</span>
                        {isMulti && isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            portalTarget
          )}
        </div>

        {error && (
          <span id={`${name}-error`} className="text-[0.8rem] font-medium text-destructive flex items-center gap-1.5 mt-1">
            <AlertTriangle className="size-4" />
            {error}
          </span>
        )}

        {!error && helperText && (
          <span className="text-sm font-bold text-muted-foreground">
            {helperText}
          </span>
        )}
      </label>
    );
  }
);

TFSelect.displayName = 'TFSelect';

export { TFSelect };