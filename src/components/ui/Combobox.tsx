import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  number: string;
  name?: string;
  breed?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options by number, name, or breed
  const filteredOptions = options.filter((option) => {
    const term = search.toLowerCase();
    const matchesNumber = option.number.toLowerCase().includes(term);
    const matchesName = option.name ? option.name.toLowerCase().includes(term) : false;
    const matchesBreed = option.breed ? option.breed.toLowerCase().includes(term) : false;
    return matchesNumber || matchesName || matchesBreed;
  });

  const openPopover = () => {
    setActiveIndex(-1);
    setSearch('');
    setIsOpen(true);
  };

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openPopover();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          onChange(filteredOptions[activeIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        // Let natural tab navigation close popover
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) {
            openPopover();
          } else {
            setIsOpen(false);
          }
        }}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 text-start focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 disabled:bg-slate-50 transition cursor-pointer"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[300px]">
          {/* Search Box */}
          <div className="flex items-center border-b border-slate-100 px-3 py-2 shrink-0">
            <Search className="h-4 w-4 text-slate-400 me-2" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none border-none p-0"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(-1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Option List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto py-1 divide-y divide-slate-50"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-400 font-medium">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer select-none transition ${
                      isActive ? 'bg-brand-50 text-brand-850' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className={`font-bold ${isSelected ? 'text-brand-700' : 'text-slate-800'}`}>
                        {option.number}
                      </span>
                      {(option.name || option.breed) && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {[option.name, option.breed].filter(Boolean).join(' - ')}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4.5 w-4.5 text-brand-600 shrink-0 ms-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
