'use client';

import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  className?: string;
  selectClassName?: string;
}

const Select = ({
  label,
  options,
  error,
  className = '',
  selectClassName = '',
  id,
  ...props
}: SelectProps) => {
  const selectBaseStyles = `w-full px-3 py-2.5 bg-dark-card bg-opacity-80 backdrop-filter backdrop-blur-sm border border-dark-border rounded-md shadow-sm text-light-text placeholder-medium-text focus:outline-none focus:ring-2 focus:ring-accent-gray focus:ring-opacity-70 focus:border-accent-gray focus:border-opacity-70 transition-all duration-200 appearance-none
    ${error ? 'border-danger-DEFAULT' : ''} ${selectClassName}`;

  const selectId = id || (label ? label.toLowerCase().replace(/\s/g, '-') : undefined);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-light-text mb-2" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="relative">
        <select id={selectId} className={selectBaseStyles} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-light-text">
          <svg
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && <p className="text-danger-DEFAULT text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Select;
