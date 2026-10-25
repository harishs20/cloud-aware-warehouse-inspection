// components/inspection/InspectionStatus.tsx
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { OverallStatus } from "@/lib/types";

interface InspectionStatusProps {
  status: OverallStatus;
}

export function InspectionStatus({ status }: InspectionStatusProps) {
  const isPass = status === "PASS";

  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 rounded-lg border ${
        isPass
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
      role="status"
      aria-live="polite"
    >
      {isPass ? (
        <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" aria-hidden="true" />
      ) : (
        <XCircle size={22} className="text-red-600 flex-shrink-0" aria-hidden="true" />
      )}
      <div>
        <p className={`text-sm font-semibold ${isPass ? "text-green-800" : "text-red-800"}`}>
          {isPass ? "Inspection Passed" : "Inspection Failed"}
        </p>
        <p className={`text-xs mt-0.5 ${isPass ? "text-green-600" : "text-red-600"}`}>
          {isPass
            ? "All expected inventory was detected."
            : "Inventory mismatch detected."}
        </p>
      </div>
    </div>
  );
}

interface InspectionErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InspectionError({ message, onRetry }: InspectionErrorProps) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-lg border bg-red-50 border-red-200"
      role="alert"
    >
      <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-800">Inspection Failed</p>
        <p className="text-xs text-red-600 mt-1 break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 text-xs font-medium text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}
