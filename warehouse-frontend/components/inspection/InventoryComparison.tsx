"use client";

import { InspectionResponse, Comparison } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";
import {
  computeItemAnalysis,
  formatRackName,
  formatDifference,
} from "@/lib/utils";
import { Package, Target, MapPin, AlertTriangle } from "lucide-react";

interface InventoryComparisonProps {
  result?: InspectionResponse | null;
  comparison?: Comparison;
}

export function InventoryComparison({ result }: InventoryComparisonProps) {
  const itemAnalyses = computeItemAnalysis(result ?? null);

  if (!result || itemAnalyses.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        No comparison data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table aria-label="Item-wise inventory comparison table" className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            <th scope="col" className="py-3.5 px-4">Item Name</th>
            <th scope="col" className="py-3.5 px-3">Target Rack(s)</th>
            <th scope="col" className="py-3.5 px-3">Found On Rack(s)</th>
            <th scope="col" className="py-3.5 px-3 text-center">Total Exp.</th>
            <th scope="col" className="py-3.5 px-3 text-center">Total Det.</th>
            <th scope="col" className="py-3.5 px-3 text-center">Misplaced</th>
            <th scope="col" className="py-3.5 px-3 text-center">Net Balance</th>
            <th scope="col" className="py-3.5 px-4 text-center">Item Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {itemAnalyses.map((item) => {
            const hasMisplaced = item.misplacedCount > 0;
            const isExcess = item.extraCount > 0;
            const isMissing = item.missingCount > 0;

            return (
              <tr key={item.classId} className="hover:bg-gray-50/75 transition-colors">
                {/* Item Name */}
                <td className="py-3.5 px-4 font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                      <Package size={13} aria-hidden="true" />
                    </div>
                    <div>
                      <span>{item.displayName}</span>
                      <span className="text-[10px] text-gray-400 block font-normal">
                        Class {item.classId}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Target Rack(s) */}
                <td className="py-3.5 px-3 text-gray-700 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Target size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium">
                      {item.expectedRacks.length > 0
                        ? item.expectedRacks
                            .map((r) => `${formatRackName(r.rack)} (${r.count})`)
                            .join(", ")
                        : "None"}
                    </span>
                  </div>
                </td>

                {/* Found On Rack(s) */}
                <td className="py-3.5 px-3 text-gray-700 text-xs">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                    <span className="font-medium">
                      {item.detectedRacks.length > 0
                        ? item.detectedRacks
                            .map((r) => `${formatRackName(r.rack)} (${r.count})`)
                            .join(", ")
                        : "Not Detected"}
                    </span>
                  </div>
                </td>

                {/* Expected Count */}
                <td className="py-3.5 px-3 text-center font-bold text-gray-800">
                  {item.totalExpected}
                </td>

                {/* Detected Count */}
                <td className="py-3.5 px-3 text-center font-bold text-gray-800">
                  {item.totalDetected}
                </td>

                {/* Misplaced Items Count */}
                <td className="py-3.5 px-3 text-center">
                  {hasMisplaced ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle size={11} />
                      {item.misplacedCount} misplaced
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">0</span>
                  )}
                </td>

                {/* Net Balance across Shelf */}
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                      isExcess
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : isMissing
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-gray-50 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {isExcess
                      ? `+${item.extraCount} Excess`
                      : isMissing
                      ? `-${item.missingCount} Missing`
                      : "Matched"}
                  </span>
                </td>

                {/* Final Status */}
                <td className="py-3.5 px-4 text-center">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
