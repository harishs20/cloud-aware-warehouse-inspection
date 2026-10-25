// ============================================================
// WAREHOUSE INSPECTOR — UTILITY HELPERS
// ============================================================

import {
  InspectionResponse,
  ItemAnalysis,
  ItemStatus,
  RackQuantity,
} from "./types";

// ─── Class Name Mapping ──────────────────────────────────────

const CLASS_NAME_MAP: Record<string, string> = {
  cap: "Cap",
  charger_brick: "Charger Brick",
  earbud_container: "Earbud Container",
};

/**
 * Convert a raw class_name from the backend into a human-readable label.
 * Falls back gracefully for unknown classes.
 */
export function formatClassName(rawName: string): string {
  return CLASS_NAME_MAP[rawName] ?? toTitleCase(rawName.replace(/_/g, " "));
}

/**
 * Convert a class_id integer to a human-readable label.
 */
export function formatClassId(classId: number): string {
  const idMap: Record<number, string> = {
    0: "Cap",
    1: "Charger Brick",
    2: "Earbud Container",
  };
  return idMap[classId] ?? `Class ${classId}`;
}

// ─── Formatting Helpers ──────────────────────────────────────

/** Convert 0.987 → "98.7%" */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

/** Convert "RACK_1" → "Rack 1" */
export function formatRackName(rack: string): string {
  return rack.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Simple title-case helper */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a difference number as "+1", "-1", or "0" */
export function formatDifference(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

/** Format an ISO date string to a friendly display */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return isToday
    ? `Today, ${time}`
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + ` ${time}`;
}

// ─── Status Helpers ──────────────────────────────────────────

/** Status → CSS classes for badges */
export function getStatusClasses(status: ItemStatus | string): string {
  switch (status) {
    case "PASS":
      return "bg-green-50 text-green-700 border-green-200";
    case "MISPLACED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "MISSING":
      return "bg-red-50 text-red-700 border-red-200";
    case "EXTRA":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "MISPLACED & MISSING":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "EXTRA & MISPLACED":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

/** Status → accessible label with icon prefix */
export function getStatusLabel(status: ItemStatus | string): string {
  switch (status) {
    case "PASS":
      return "✓ PASS";
    case "MISPLACED":
      return "⚠ MISPLACED";
    case "MISSING":
      return "✕ MISSING";
    case "EXTRA":
      return "+ EXTRA";
    case "MISPLACED & MISSING":
      return "⚠ MISPLACED & MISSING";
    case "EXTRA & MISPLACED":
      return "⚠ EXTRA & MISPLACED";
    default:
      return status;
  }
}

// ─── Rack Utilities ──────────────────────────────────────────

export const RACK_KEYS = ["RACK_1", "RACK_2", "RACK_3"] as const;
export type RackKey = (typeof RACK_KEYS)[number];

// ─── Item-Wise Analysis (3 Fixed Classes) ─────────────────────

export const ITEM_CATALOG = [
  { classId: 0, className: "cap", displayName: "Cap" },
  { classId: 1, className: "charger_brick", displayName: "Charger Brick" },
  { classId: 2, className: "earbud_container", displayName: "Earbud Container" },
] as const;

/**
 * Compute item-wise warehouse status across all racks.
 * Analyzes target racks, found racks, misplaced items, and shelf-wide excess/shortage.
 */
export function computeItemAnalysis(
  result: InspectionResponse | null
): ItemAnalysis[] {
  if (!result) return [];

  const expectedInv = result.expected_inventory ?? {};
  const detectedInv = result.detected_inventory ?? {};

  return ITEM_CATALOG.map(({ classId, className, displayName }) => {
    const expectedRacks: RackQuantity[] = [];
    const detectedRacks: RackQuantity[] = [];

    let totalExpected = 0;
    let totalDetected = 0;

    // Aggregate expected & detected across racks
    for (const rackKey of RACK_KEYS) {
      const expCount =
        expectedInv[rackKey]?.[classId] ??
        expectedInv[rackKey]?.[String(classId)] ??
        0;
      if (expCount > 0) {
        expectedRacks.push({ rack: rackKey, count: expCount });
        totalExpected += expCount;
      }

      const detCount =
        detectedInv[rackKey]?.[classId] ??
        detectedInv[rackKey]?.[String(classId)] ??
        0;
      if (detCount > 0) {
        detectedRacks.push({ rack: rackKey, count: detCount });
        totalDetected += detCount;
      }
    }

    // Determine misplaced items
    let misplacedCount = 0;
    const misplacedDetails: string[] = [];
    const missingDetails: string[] = [];

    for (const rackKey of RACK_KEYS) {
      const expCount =
        expectedInv[rackKey]?.[classId] ??
        expectedInv[rackKey]?.[String(classId)] ??
        0;
      const detCount =
        detectedInv[rackKey]?.[classId] ??
        detectedInv[rackKey]?.[String(classId)] ??
        0;

      // Item found on rack where none was expected
      if (expCount === 0 && detCount > 0) {
        misplacedCount += detCount;
        misplacedDetails.push(`${detCount} on ${formatRackName(rackKey)}`);
      }
      // Item detected on expected rack but exceeds designated slot count
      else if (expCount > 0 && detCount > expCount) {
        const excessOnRack = detCount - expCount;
        misplacedCount += excessOnRack;
        misplacedDetails.push(`${excessOnRack} extra on ${formatRackName(rackKey)}`);
      }
      // Item missing from designated rack
      else if (expCount > 0 && detCount < expCount) {
        const shortage = expCount - detCount;
        missingDetails.push(`${shortage} missing from ${formatRackName(rackKey)}`);
      }
    }

    const difference = totalDetected - totalExpected;
    const extraCount = Math.max(0, difference);
    const missingCount = Math.max(0, -difference);

    // Status logic
    let status: ItemAnalysis["status"] = "PASS";
    let statusDescription = "Correctly placed on assigned shelf";

    if (totalExpected === 0 && totalDetected === 0) {
      status = "PASS";
      statusDescription = "No items scheduled or detected";
    } else if (totalDetected === totalExpected && misplacedCount === 0) {
      status = "PASS";
      statusDescription = `All ${totalDetected} item(s) placed correctly`;
    } else if (totalDetected === totalExpected && misplacedCount > 0) {
      status = "MISPLACED";
      statusDescription = `Found on wrong rack (${misplacedDetails.join(", ")})`;
    } else if (totalDetected < totalExpected && misplacedCount === 0) {
      status = "MISSING";
      statusDescription = `${missingCount} missing (${missingDetails.join(", ")})`;
    } else if (totalDetected < totalExpected && misplacedCount > 0) {
      status = "MISPLACED & MISSING";
      statusDescription = `${missingCount} missing overall; misplaced: ${misplacedDetails.join(", ")}`;
    } else if (totalDetected > totalExpected && misplacedCount === 0) {
      status = "EXTRA";
      statusDescription = `${extraCount} excess item(s) detected across shelf`;
    } else {
      status = "EXTRA & MISPLACED";
      statusDescription = `${extraCount} excess item(s); misplaced on ${misplacedDetails.join(", ")}`;
    }

    return {
      classId,
      className,
      displayName,
      totalExpected,
      totalDetected,
      difference,
      extraCount,
      missingCount,
      misplacedCount,
      expectedRacks,
      detectedRacks,
      status,
      statusDescription,
    };
  });
}
