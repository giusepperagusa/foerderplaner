import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateToGerman, normalizeGermanDate, germanDateToIso } from '../utils/dateUtils';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const GermanDateInput: React.FC<Props> = ({
  id,
  value,
  onChange,
  placeholder = 'TT/MM/JJJJ',
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Formatted display value: ensure any stored legacy ISO format (YYYY-MM-DD) is displayed as DD/MM/YYYY
  const displayValue = formatDateToGerman(value);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw) {
      const normalized = normalizeGermanDate(raw);
      if (normalized !== raw) {
        onChange(normalized);
      }
    }
  };

  const handleOpenPicker = () => {
    if (disabled) return;
    const picker = hiddenDateInputRef.current;
    if (picker) {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const germanFormatted = formatDateToGerman(isoVal);
      onChange(germanFormatted);
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden text-slate-900 font-sans tracking-wide"
      />

      {/* Calendar Picker Button */}
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={disabled}
        tabIndex={-1}
        title="Datum aus Kalender auswählen"
        aria-label="Kalender öffnen"
        className="absolute right-1.5 p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer disabled:opacity-40"
      >
        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {/* Visually hidden native date picker to provide calendar dialog popup */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={germanDateToIso(displayValue)}
        onChange={handlePickerChange}
        className="sr-only pointer-events-none absolute -bottom-2 right-0 opacity-0 w-0 h-0"
      />
    </div>
  );
};
