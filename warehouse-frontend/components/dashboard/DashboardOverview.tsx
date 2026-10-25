// components/dashboard/DashboardOverview.tsx
import { Clock, CheckCircle2, XCircle, Package, Boxes, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { InspectionResponse } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

interface DashboardOverviewProps {
  lastResult: InspectionResponse | null;
  lastTimestamp: string | null;
}

export function DashboardOverview({
  lastResult,
  lastTimestamp,
}: DashboardOverviewProps) {
  const totalDetections = lastResult?.detections?.length ?? 0;
  const racksInspected = lastResult
    ? Object.keys(lastResult.comparison ?? {}).length
    : 0;

  const stats = [
    {
      label: "Last Inspection",
      value: lastTimestamp ? formatTimestamp(lastTimestamp) : "—",
      sub: lastTimestamp ? null : "No inspections yet",
      icon: Clock,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      label: "Overall Status",
      value: lastResult
        ? lastResult.overall_status === "PASS"
          ? "✓ PASS"
          : "✕ FAIL"
        : "—",
      sub: lastResult ? null : "No inspections yet",
      icon: lastResult?.overall_status === "FAIL" ? XCircle : CheckCircle2,
      iconColor:
        lastResult?.overall_status === "PASS"
          ? "text-green-500"
          : lastResult?.overall_status === "FAIL"
          ? "text-red-500"
          : "text-gray-400",
      iconBg:
        lastResult?.overall_status === "PASS"
          ? "bg-green-50"
          : lastResult?.overall_status === "FAIL"
          ? "bg-red-50"
          : "bg-gray-100",
      valueColor:
        lastResult?.overall_status === "PASS"
          ? "text-green-700"
          : lastResult?.overall_status === "FAIL"
          ? "text-red-700"
          : "text-gray-400",
    },
    {
      label: "Objects Detected",
      value: lastResult ? String(totalDetections) : "—",
      sub: lastResult ? null : "No inspections yet",
      icon: Package,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
    },
    {
      label: "Racks Inspected",
      value: lastResult ? `${racksInspected} / 3` : "—",
      sub: lastResult ? null : "No inspections yet",
      icon: Boxes,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg, valueColor }) => (
        <Card key={label} className="animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={15} className={iconColor} aria-hidden="true" />
            </div>
          </div>
          <p className={`text-lg font-semibold leading-tight ${valueColor ?? "text-gray-900"}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </Card>
      ))}
    </div>
  );
}

export function DashboardReadyCTA({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
        <ScanSearch size={24} className="text-blue-500" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Ready for Inspection
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        No inspection has been performed yet. Start an inspection to analyze rack inventory.
      </p>
      <button
        onClick={onNavigate}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        <ScanSearch size={15} aria-hidden="true" />
        Start Inspection
      </button>
    </Card>
  );
}
