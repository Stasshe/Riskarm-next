"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "info";
  size?: "small" | "medium" | "large";
  outline?: boolean;
  className?: string;
}

const Button = ({
  children,
  variant = "primary",
  size = "medium",
  outline = false,
  className = "",
  ...props
}: ButtonProps) => {
  const baseStyles =
    "font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-gray focus:ring-opacity-70 transition duration-150 ease-in-out";

  const variantStyles = {
    primary: outline
      ? "bg-transparent hover:bg-primary-light text-primary-DEFAULT border border-primary-DEFAULT"
      : "bg-primary-DEFAULT hover:bg-primary-light text-light-text",
    secondary: outline
      ? "bg-transparent hover:bg-secondary-light text-secondary-DEFAULT border border-secondary-DEFAULT"
      : "bg-secondary-DEFAULT hover:bg-secondary-light text-light-text",
    success:
      "bg-transparent text-success-DEFAULT border border-success-DEFAULT hover:bg-success-light text-light-text",
    danger:
      "bg-transparent text-danger-DEFAULT border border-danger-DEFAULT hover:bg-danger-light text-light-text",
    info: "bg-transparent text-info-DEFAULT border border-info-DEFAULT hover:bg-info-ligh text-light-text",
    warning:
      "bg-transparent text-warning-DEFAULT border border-warning-DEFAULT hover:bg-warning-light text-light-text",
  };

  const sizeStyles = {
    small: "text-sm py-1 px-2",
    medium: "text-base py-2 px-4",
    large: "text-lg py-3 px-6",
  };

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button className={combinedStyles} {...props}>
      {children}
    </button>
  );
};

export default Button;
