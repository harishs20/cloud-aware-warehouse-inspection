// components/dashboard/RecentInspection.tsx
import { Package, CheckCircle2, XCircle, AlertTriangle, PlusCircle, Target, MapPin } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { InspectionResponse } from "@/lib/types";
import { computeItemAnalysis, formatRackName } from "@/lib/utils";

interface RecentInspectionProps {
  result: InspectionResponse | null;
}

export function RecentInspection({ result }: RecentInspectionProps) {
  if (!result) return null;

  const itemAnalyses = computeItemAnalysis(result);

  return (
    <Card padding="none" className="animate-fade-in overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <CardHeader
          title="Item Stock & Placement Status"
          subtitle="Inventory, designated shelves, and placement analysis across the 3 items"
          icon={<Package size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {itemAnalyses.map((item) => {
          const isPass = item.status === "PASS";
          const isMissing = item.status.includes("MISSING");
          const isMisplaced = item.status.includes("MISPLACED");
          const isExtra = item.status.includes("EXTRA");

          return (
            <div key={item.classId} className="px-5 py-5 flex flex-col justify-between">
              <div>
                {/* Item header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-700">
                      <Package size={12} aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-800 block leading-tight">
                        {item.displayName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Class {item.classId}
                      </span>
                    </div>
                  </div>

                  {isPass && <CheckCircle2 size={16} className="text-green-500" aria-label="Pass" />}
                  {isMisplaced && !isMissing && <AlertTriangle size={16} className="text-amber-500" aria-label="Misplaced" />}
                  {isMissing && <XCircle size={16} className="text-red-500" aria-label="Missing" />}
                  {isExtra && !isMisplaced && <PlusCircle size={16} className="text-blue-500" aria-label="Extra" />}
                </div>

                {/* Counts */}
                <div className="flex gap-4 text-xs text-gray-500 mb-3 bg-gray-50/75 p-2 rounded-md border border-gray-100">
                  <span>
                    Total Needed: <strong className="text-gray-800">{item.totalExpected}</strong>
                  </span>
                  <span>
                    Total Found: <strong className="text-gray-800">{item.totalDetected}</strong>
                  </span>
                </div>

                {/* Shelf Locations */}
                <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                  <div className="flex items-start gap-1">
                    <Target size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Target:{" "}
                      <strong className="text-gray-700">
                        {item.expectedRacks.length > 0
                          ? item.expectedRacks
                              .map((r) => `${formatRackName(r.rack)} (${r.count})`)
                              .join(", ")
                          : "None"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-start gap-1">
                    <MapPin size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Found:{" "}
                      <strong className="text-gray-700">
                        {item.detectedRacks.length > 0
                          ? item.detectedRacks
                              .map((r) => `${formatRackName(r.rack)} (${r.count})`)
                              .join(", ")
                          : "None"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 truncate max-w-[150px]" title={item.statusDescription}>
                  {item.statusDescription}
                </span>
                <StatusBadge status={item.status} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
