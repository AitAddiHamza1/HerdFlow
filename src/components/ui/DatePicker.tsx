import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/date';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'
];

const DAYS_FR = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
const DAYS_AR = ['أح', 'اث', 'ثلا', 'أر', 'خم', 'جم', 'سب'];

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial selected date or default to today
  const selectedDate = value ? new Date(value) : new Date();
  
  // States for calendar navigation month and year
  const [viewDate, setViewDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [focusedDate, setFocusedDate] = useState<Date>(new Date(selectedDate));

  const containerRef = useRef<HTMLDivElement>(null);

  const openDatePicker = () => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        setFocusedDate(new Date(parsed));
      }
    } else {
      const parsed = new Date();
      setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      setFocusedDate(new Date(parsed));
    }
    setIsOpen(true);
  };

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

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0, Monday = 1, etc.
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const selectDay = (day: number, isCurrentMonth: 'prev' | 'current' | 'next') => {
    let year = currentYear;
    let month = currentMonth;

    if (isCurrentMonth === 'prev') {
      month = currentMonth - 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    } else if (isCurrentMonth === 'next') {
      month = currentMonth + 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    const targetDate = new Date(year, month, day);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Keyboard navigation inside popover
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDatePicker();
      }
      return;
    }

    const nextFocus = new Date(focusedDate);
    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        nextFocus.setDate(focusedDate.getDate() + (isAr ? 1 : -1));
        break;
      case 'ArrowRight':
        nextFocus.setDate(focusedDate.getDate() + (isAr ? -1 : 1));
        break;
      case 'ArrowUp':
        nextFocus.setDate(focusedDate.getDate() - 7);
        break;
      case 'ArrowDown':
        nextFocus.setDate(focusedDate.getDate() + 7);
        break;
      case 'PageUp':
        nextFocus.setMonth(focusedDate.getMonth() - 1);
        break;
      case 'PageDown':
        nextFocus.setMonth(focusedDate.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectDay(focusedDate.getDate(), 'current');
        return;
      case 'Escape':
        setIsOpen(false);
        return;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      setFocusedDate(nextFocus);
      setViewDate(new Date(nextFocus.getFullYear(), nextFocus.getMonth(), 1));
    }
  };

  // Render month names and weekdays in chosen language
  const monthLabel = isAr ? MONTHS_AR[currentMonth] : MONTHS_FR[currentMonth];
  const weekdays = isAr ? DAYS_AR : DAYS_FR;

  // Build grid of days
  const gridCells = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    gridCells.push({
      day,
      type: 'prev' as const,
      dateObj: new Date(currentYear, currentMonth - 1, day)
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      day: d,
      type: 'current' as const,
      dateObj: new Date(currentYear, currentMonth, d)
    });
  }

  // Next month padding days to round up to complete rows
  const remaining = 42 - gridCells.length; // standard 6-row grid
  for (let n = 1; n <= remaining; n++) {
    gridCells.push({
      day: n,
      type: 'next' as const,
      dateObj: new Date(currentYear, currentMonth + 1, n)
    });
  }

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isFocused = (date: Date) => {
    return (
      date.getDate() === focusedDate.getDate() &&
      date.getMonth() === focusedDate.getMonth() &&
      date.getFullYear() === focusedDate.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) {
            openDatePicker();
          } else {
            setIsOpen(false);
          }
        }}
        className="w-full flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 text-start focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 disabled:bg-slate-50 transition cursor-pointer"
      >
        <span className="truncate">
          {value ? formatDate(value) : isAr ? 'اختر التاريخ...' : 'Choisir la date...'}
        </span>
        <CalendarIcon className="h-4.5 w-4.5 shrink-0 text-slate-400" />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-[285px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col gap-3 left-0 sm:left-auto right-0 sm:right-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={isAr ? handleNextMonth : handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <span className="text-sm font-bold text-slate-800 font-display">
              {monthLabel} {currentYear}
            </span>
            <button
              type="button"
              onClick={isAr ? handlePrevMonth : handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {weekdays.map((day, idx) => (
              <div key={idx} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {gridCells.map((cell, idx) => {
              const daySelected = isSelected(cell.dateObj);
              const dayFocused = isFocused(cell.dateObj);
              const dayToday = isToday(cell.dateObj);
              const isCurr = cell.type === 'current';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDay(cell.day, cell.type)}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition cursor-pointer select-none ${
                    daySelected 
                      ? 'bg-brand-600 text-white font-bold' 
                      : dayFocused 
                      ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200' 
                      : dayToday 
                      ? 'bg-slate-100 text-slate-900 border border-slate-200' 
                      : isCurr 
                      ? 'text-slate-800 hover:bg-slate-50' 
                      : 'text-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
