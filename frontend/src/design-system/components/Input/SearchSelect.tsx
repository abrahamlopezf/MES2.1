import React, { useState, useRef, useEffect, useMemo } from 'react';
import { tokens } from '../../foundation/tokens';
import { Search, ChevronDown, Loader2 } from 'lucide-react';

export interface SearchSelectProps<T> {
  options: T[];
  value: any;
  onChange: (value: any) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => any;
  searchable?: boolean;
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SearchSelect<T>({
  options = [],
  value,
  onChange,
  getLabel,
  getValue,
  searchable = true,
  placeholder = 'Seleccionar...',
  loading = false,
  emptyMessage = 'No hay opciones disponibles',
  disabled = false
}: SearchSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    const lowerTerm = searchTerm.toLowerCase();
    return options.filter(opt => getLabel(opt).toLowerCase().includes(lowerTerm));
  }, [options, searchable, searchTerm, getLabel]);

  const selectedOption = useMemo(() => {
    return options.find(opt => getValue(opt) === value);
  }, [options, value, getValue]);

  const handleSelect = (opt: T) => {
    onChange(getValue(opt));
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: tokens.primitive.spacing['12'] + ' ' + tokens.primitive.spacing['16'],
          backgroundColor: tokens.semantic.color.surface,
          border: `2px solid ${isOpen ? tokens.semantic.color.primary : tokens.semantic.color.borderDefault}`,
          borderRadius: tokens.primitive.spacing['8'],
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: selectedOption ? tokens.semantic.color.textHighEmphasis : tokens.semantic.color.textMediumEmphasis,
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.2s',
          minHeight: '48px'
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontSize: tokens.primitive.typography.sizes.md 
        }}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? (
          <Loader2 size={18} className="animate-spin" color={tokens.semantic.color.textMediumEmphasis} />
        ) : (
          <ChevronDown size={18} color={tokens.semantic.color.textMediumEmphasis} />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          backgroundColor: tokens.semantic.color.surface,
          border: `2px solid ${tokens.semantic.color.borderDefault}`,
          borderRadius: tokens.primitive.spacing['8'],
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          zIndex: 50,
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {searchable && (
            <div style={{ 
              padding: tokens.primitive.spacing['8'], 
              borderBottom: `2px solid ${tokens.semantic.color.borderDefault}`,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.primitive.spacing['8']
            }}>
              <Search size={16} color={tokens.semantic.color.textMediumEmphasis} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: tokens.semantic.color.textHighEmphasis,
                  fontSize: tokens.primitive.typography.sizes.sm
                }}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: tokens.primitive.spacing['12'],
                textAlign: 'center',
                color: tokens.semantic.color.textMediumEmphasis,
                fontSize: tokens.primitive.typography.sizes.sm
              }}>
                {loading ? 'Cargando...' : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = getValue(opt) === value;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: tokens.primitive.spacing['12'] + ' ' + tokens.primitive.spacing['16'],
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: isSelected ? tokens.semantic.color.primary : tokens.semantic.color.textHighEmphasis,
                      fontSize: tokens.primitive.typography.sizes.sm,
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                  >
                    {getLabel(opt)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
