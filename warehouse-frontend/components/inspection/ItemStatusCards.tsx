"use client";

import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  MapPin,
  Target,
} from "lucide-react";
import { InspectionResponse } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import { computeItemAnalysis, formatRackName } from "@/lib/utils";

interface ItemStatusCardsProps {
  result: InspectionResponse | null;
}

export function ItemStatusCards({ result }: ItemStatusCardsProps) {
  const itemAnalyses = computeItemAnalysis(result);

  if (itemAnalyses.length === 0) {
    return (
      <div className="card p-6 text-center text-gray-400 text-sm">
        No inspection item data available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {itemAnalyses.map((item) => {
        const isPass = item.status === "PASS";
        const isMissing = item.status.includes("MISSING");
        const isMisplaced = item.status.includes("MISPLACED");
        const isExtra = item.status.includes("EXTRA");

        const borderColor = isPass
          ? "border-green-200"
          : isMissing
          ? "border-red-200"
          : isMisplaced
          ? "border-amber-200"
          : isExtra
          ? "border-blue-200"
          : "border-gray-200";

        return (
          <div
            key={item.classId}
            className={`card p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${borderColor}`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                    <Package size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-none">
                      {item.displayName}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
                      Class ID: {item.classId}
                    </span>
                  </div>
                </div>

                <StatusBadge status={item.status} />
              </div>

              {/* Quantity Stat Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                    Needed
                  </span>
                  <p className="text-lg font-extrabold text-gray-800">
                    {item.totalExpected}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-2 border ${
                    isPass
                      ? "bg-green-50 border-green-100 text-green-800"
                      : isMissing
                      ? "bg-red-50 border-red-100 text-red-800"
                      : isMisplaced
                      ? "bg-amber-50 border-amber-100 text-amber-800"
                      : "bg-blue-50 border-blue-100 text-blue-800"
                  }`}
                >
                  <span className="text-[10px] opacity-75 uppercase tracking-wider font-bold block mb-0.5">
                    Found
                  </span>
                  <p className="text-lg font-extrabold">
                    {item.totalDetected}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                    Balance
                  </span>
                  <p
                    className={`text-xs font-bold mt-1 ${
                      item.extraCount > 0
                        ? "text-blue-600"
                        : item.missingCount > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {item.extraCount > 0
                      ? `+${item.extraCount} Excess`
                      : item.missingCount > 0
                      ? `-${item.missingCount} Missing`
                      : "Matched"}
                  </p>
                </div>
              </div>

              {/* Rack Placement Locations */}
              <div className="space-y-1.5 mb-3.5 text-xs bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                {/* Expected Racks */}
                <div className="flex items-start gap-1.5 text-gray-600">
                  <Target size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-[11px] text-gray-500 font-medium">Target Rack: </span>
                    <span className="font-semibold text-gray-800">
                      {item.expectedRacks.length > 0
                        ? item.expectedRacks
                            .map((r) => `${formatRackName(r.rack)} (${r.count}x)`)
                            .join(", ")
                        : "None expected"}
                    </span>
                  </div>
                </div>

                {/* Detected Racks */}
                <div className="flex items-start gap-1.5 text-gray-600">
                  <MapPin size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-[11px] text-gray-500 font-medium">Found On: </span>
                    <span className="font-semibold text-gray-800">
                      {item.detectedRacks.length > 0
                        ? item.detectedRacks
                            .map((r) => `${formatRackName(r.rack)} (${r.count}x)`)
                            .join(", ")
                        : "None detected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Misplacement / Diagnostic Highlight Pills if issue */}
              {item.misplacedCount > 0 && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 w-full">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    <span>{item.misplacedCount} item(s) found in unexpected rack(s)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Status Description */}
            <div className="pt-2.5 border-t border-gray-100 mt-auto flex items-center gap-1.5 text-[11px] text-gray-500">
              {isPass ? (
                <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
              ) : isMissing ? (
                <XCircle size={13} className="text-red-500 flex-shrink-0" />
              ) : isMisplaced ? (
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
              ) : (
                <PlusCircle size={13} className="text-blue-500 flex-shrink-0" />
              )}
              <span className="leading-tight">{item.statusDescription}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
