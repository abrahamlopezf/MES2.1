import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Search, ChevronDown, AlertTriangle, Plus, Sparkles } from 'lucide-react';

const TFSelect = React.forwardRef(
  (
    {
      className,
      label,
      hint,
      helperText,
      error,
      options = [],
      placeholder = 'Selecciona una opción',
      searchPlaceholder,
      name,
      value,
      onChange,
      disabled,
      isMulti = false,
      containerClassName,
      allowCreate = false,
      createLabel = 'Crear nuevo',
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
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 12;

        let targetWidth = rect.width;
        if (targetWidth > viewportWidth - (padding * 2)) {
          targetWidth = viewportWidth - (padding * 2);
        }

        let left = rect.left;
        if (left + targetWidth > viewportWidth - padding) {
          left = Math.max(padding, viewportWidth - targetWidth - padding);
        }
        if (left < padding) {
          left = padding;
        }

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedHeight = 260;
        const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

        setDropdownStyle({
          position: 'fixed',
          top: openUpward ? undefined : rect.bottom + 6,
          bottom: openUpward ? (viewportHeight - rect.top) + 6 : undefined,
          left,
          width: targetWidth,
          maxWidth: `calc(100vw - ${padding * 2}px)`,
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

    const isNewValue = typeof value === 'string' && value.startsWith('NEW:');
    const newDisplayLabel = isNewValue ? `✨ ${value.replace('NEW:', '')} (Nuevo)` : null;

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
        setSearchTerm('');
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
      <label className={cn('flex flex-col gap-1.5 w-full min-w-0 max-w-full', containerClassName)} ref={containerRef}>
        {label && (
          <div className="flex items-center justify-between gap-2 min-w-0 max-w-full ml-1">
            <span className="text-sm font-bold text-foreground truncate min-w-0">
              {label}
            </span>
            {hint && (
              <span className="text-[11px] font-semibold text-muted-foreground/80 shrink-0">
                {hint}
              </span>
            )}
          </div>
        )}

        <div className="relative w-full min-w-0 max-w-full">
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
            {isNewValue && <option value={value}>{newDisplayLabel}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Custom Trigger */}
          <div
            ref={triggerRef}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              "flex min-h-[48px] w-full min-w-0 max-w-full items-center justify-between rounded-2xl border bg-background px-3.5 sm:px-4 text-sm sm:text-base font-bold text-foreground transition-all duration-200 ease-out focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/20 cursor-pointer overflow-hidden box-border",
              error ? "border-destructive focus:border-destructive focus:shadow-destructive/20 animate-shake" : "border-border hover:border-primary",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            tabIndex={disabled ? -1 : 0}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            <span className={cn(
              "truncate min-w-0 flex-1 text-left",
              (isMulti ? (Array.isArray(value) && value.length > 0) : (selectedOption || isNewValue)) ? "text-foreground" : "text-muted-foreground"
            )}>
              {isMulti 
                ? (Array.isArray(value) && value.length > 0 ? `${value.length} seleccionad${value.length === 1 ? 'a' : 'as'}` : placeholder)
                : (isNewValue ? newDisplayLabel : (selectedOption ? selectedOption.label : placeholder))}
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
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                  placeholder={searchPlaceholder || "Buscar..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>

              {/* Create new option button */}
              {allowCreate && searchTerm.trim().length > 0 && !options.some(opt => opt.label.toLowerCase() === searchTerm.trim().toLowerCase()) && (
                <div 
                  className="mx-1.5 my-1.5 px-3 py-2 text-xs rounded-lg cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold flex items-center justify-between gap-2 transition-colors group"
                  onClick={() => handleSelect(`NEW:${searchTerm.trim()}`)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Plus size={14} className="shrink-0 text-primary group-hover:scale-110 transition-transform" />
                    <span className="truncate">{createLabel}: <strong className="underline underline-offset-2">"{searchTerm.trim()}"</strong></span>
                  </div>
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0">
                    Nuevo
                  </span>
                </div>
              )}
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 overflow-x-hidden">
                {isNewValue && (
                  <div
                    className="px-3 py-2 text-sm rounded-md cursor-pointer bg-primary/10 text-primary font-bold flex items-center justify-between gap-2 my-0.5 border border-primary/20"
                    onClick={() => handleSelect(value)}
                  >
                    <span className="truncate">✨ {value.replace('NEW:', '')} (Nuevo registro)</span>
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                      Seleccionado
                    </span>
                  </div>
                )}
                {isMulti && Array.isArray(value) && value.filter(v => typeof v === 'string' && v.startsWith('NEW:')).map(newVal => (
                  <div
                    key={newVal}
                    className="px-3 py-2 text-sm rounded-md cursor-pointer bg-primary/10 text-primary font-bold flex items-center justify-between gap-2 my-0.5 border border-primary/20"
                    onClick={() => handleSelect(newVal)}
                  >
                    <span className="truncate">✨ {newVal.replace('NEW:', '')} (Nuevo)</span>
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                      Seleccionado
                    </span>
                  </div>
                ))}
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
                  allowCreate && searchTerm.trim() ? null : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No se encontraron resultados
                    </div>
                  )
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
          <span className="text-xs font-medium text-muted-foreground ml-1 break-words leading-tight max-w-full">
            {helperText}
          </span>
        )}
      </label>
    );
  }
);

TFSelect.displayName = 'TFSelect';

export { TFSelect };