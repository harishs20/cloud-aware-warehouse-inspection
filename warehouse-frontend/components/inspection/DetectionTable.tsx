// components/inspection/DetectionTable.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Detection } from "@/lib/types";
import { formatClassName, formatConfidence, formatRackName } from "@/lib/utils";

interface DetectionTableProps {
  detections: Detection[];
}

export function DetectionTable({ detections }: DetectionTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (detections.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No detections recorded.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 group"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronUp size={15} className="text-gray-400 group-hover:text-gray-600" aria-hidden="true" />
        ) : (
          <ChevronDown size={15} className="text-gray-400 group-hover:text-gray-600" aria-hidden="true" />
        )}
        {expanded ? "Hide" : "Show"} Detection Details ({detections.length} items)
      </button>

      {expanded && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 animate-fade-in">
          <table aria-label="Detection details table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Object</th>
                <th scope="col">Rack</th>
                <th scope="col" className="text-center">Confidence</th>
                <th scope="col" className="text-center">Center (x, y)</th>
                <th scope="col" className="text-right">Bounding Box</th>
              </tr>
            </thead>
            <tbody>
              {detections.map((det, i) => (
                <tr key={i}>
                  <td className="text-gray-400 font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="font-medium text-gray-800">
                    {formatClassName(det.class_name)}
                  </td>
                  <td className="text-gray-600 whitespace-nowrap">
                    {formatRackName(det.rack)}
                  </td>
                  <td className="text-center">
                    <span
                      className={`text-sm font-semibold ${
                        det.confidence >= 0.9
                          ? "text-green-600"
                          : det.confidence >= 0.7
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatConfidence(det.confidence)}
                    </span>
                  </td>
                  <td className="text-center text-gray-500 font-mono text-xs">
                    {det.center.x.toFixed(2)}, {det.center.y.toFixed(2)}
                  </td>
                  <td className="text-right text-gray-400 font-mono text-xs whitespace-nowrap">
                    ({Math.round(det.bbox.x1)}, {Math.round(det.bbox.y1)}) →
                    ({Math.round(det.bbox.x2)}, {Math.round(det.bbox.y2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
