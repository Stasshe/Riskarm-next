"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
}

const Input = ({ label, error, className = "", inputClassName = "", id, ...props }: InputProps) => {
  const inputBaseStyles = `w-full px-3 py-2.5 bg-dark-card bg-opacity-80 backdrop-filter backdrop-blur-sm border border-dark-border rounded-md shadow-sm text-light-text placeholder-medium-text focus:outline-none focus:ring-2 focus:ring-accent-gray focus:ring-opacity-70 focus:border-accent-gray focus:border-opacity-70 transition-all duration-200
    disabled:bg-dark-card disabled:bg-opacity-50 disabled:border-dark-border disabled:border-opacity-50 disabled:text-dark-text disabled:placeholder-dark-text disabled:cursor-not-allowed disabled:shadow-none
    ${error ? "border-danger-DEFAULT" : ""} ${inputClassName}`;

  const inputId = id || (label ? label.toLowerCase().replace(/\s/g, "-") : undefined);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-light-text mb-2" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={inputBaseStyles} {...props} />
      {error && <p className="text-danger-DEFAULT text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Input;
