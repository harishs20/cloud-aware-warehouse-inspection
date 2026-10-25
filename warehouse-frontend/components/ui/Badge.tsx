// components/ui/Badge.tsx
import { ItemStatus } from "@/lib/types";
import { getStatusClasses, getStatusLabel } from "@/lib/utils";

interface BadgeProps {
  status: ItemStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusClasses(status)} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

interface SimpleBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "green" | "red" | "amber" | "gray";
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: SimpleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
