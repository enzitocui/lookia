import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SelectOption = {
  id: string | number;
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  ariaLabel: string;
  required?: boolean;
  disabled?: boolean;
};

const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

export default function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder = 'Buscar por nombre…',
  ariaLabel,
  required = false,
  disabled = false
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = options.filter(option => normalize(option.label).includes(normalize(query)));
  const displayValue = query || selectedOption?.label || '';

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !selectedOption ? 'Elegí una opción de la lista.' : '');
  }, [required, selectedOption]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const selectOption = (option: SelectOption) => {
    onChange(option.value);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      if (filteredOptions.length) {
        setActiveIndex(current => event.key === 'ArrowDown'
          ? (current + 1) % filteredOptions.length
          : (current - 1 + filteredOptions.length) % filteredOptions.length);
      }
      return;
    }

    if (event.key === 'Enter' && isOpen && filteredOptions.length) {
      event.preventDefault();
      selectOption(filteredOptions[Math.min(activeIndex, filteredOptions.length - 1)]);
    }
  };

  return (
    <div className={`searchable-select${isOpen ? ' searchable-select--open' : ''}`} ref={rootRef}>
      <div className="searchable-select-control">
        <Search className="searchable-select-search-icon" size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={displayValue}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          onFocus={event => {
            if (disabled) return;
            setIsOpen(true);
            setActiveIndex(Math.max(0, filteredOptions.findIndex(option => option.value === value)));
            event.currentTarget.select();
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={event => {
            setQuery(event.target.value);
            onChange('');
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={event => {
            if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
          }}
        />
        <ChevronDown className="searchable-select-chevron" size={17} aria-hidden="true" />
      </div>
      {isOpen && !disabled && (
        <div className="searchable-select-menu" id={listboxId} role="listbox" aria-label={`${ariaLabel}: opciones`}>
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              type="button"
              role="option"
              id={`${listboxId}-option-${index}`}
              aria-selected={option.value === value}
              className={`searchable-select-option${option.value === value ? ' searchable-select-option--selected' : ''}${activeIndex === index ? ' searchable-select-option--active' : ''}`}
              key={option.id}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} aria-hidden="true" />}
            </button>
          )) : (
            <p className="searchable-select-empty" role="status">No se encontraron opciones.</p>
          )}
        </div>
      )}
    </div>
  );
}
