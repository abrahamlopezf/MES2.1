import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils'; // Optional if available, otherwise just template literals

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
    return options.filter(opt => getLabel(opt)?.toLowerCase().includes(lowerTerm));
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
    <div ref={wrapperRef} className="relative w-full">
      {/* Trigger Button */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between px-4 py-3 min-h-[48px]
          bg-card border rounded-2xl transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer hover:border-primary'}
          ${isOpen ? 'border-primary shadow-[0_0_0_4px] shadow-ring/20' : 'border-border'}
        `}
      >
        <span className={`text-base font-semibold leading-tight line-clamp-2 pr-2 ${selectedOption ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-popover border border-border rounded-xl shadow-lg z-50 max-h-[300px] flex flex-col overflow-hidden">
          
          {searchable && (
            <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground placeholder:font-normal"
              />
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm font-medium">
                {loading ? 'Cargando...' : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = getValue(opt) === value;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    className={`
                      px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}
                    `}
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
