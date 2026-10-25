// components/ui/Button.tsx
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary:
    "bg-blue-600 text-white border-transparent hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300",
  secondary:
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50",
  ghost:
    "bg-transparent text-gray-600 border-transparent hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50",
  danger:
    "bg-red-600 text-white border-transparent hover:bg-red-700 active:bg-red-800 disabled:opacity-50",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium border rounded-md
        transition-colors duration-150 cursor-pointer
        focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span aria-hidden="true">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
}
