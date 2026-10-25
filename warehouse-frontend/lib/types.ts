// ============================================================
// WAREHOUSE INSPECTOR — TYPE DEFINITIONS
// ============================================================

// Inventory: { RACK_1: { "2": 2 }, RACK_2: { "0": 2 }, ... }
// Keys may be string or number class IDs
export type InventoryRaw = Record<string, Record<string, number>>;

// Normalized inventory uses string keys for consistency
export type Inventory = Record<string, Record<string, number>>;

// ─── Detection ───────────────────────────────────────────────

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  rack: string;
  center: {
    x: number;
    y: number;
  };
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

// ─── Comparison Item ─────────────────────────────────────────

export type ItemStatus = "PASS" | "MISSING" | "EXTRA" | "MISPLACED" | "MISPLACED & MISSING" | "EXTRA & MISPLACED";

export interface ComparisonItem {
  class_id: number;
  expected: number;
  detected: number;
  difference: number;
  status: ItemStatus;
}

// ─── Item-Wise Analysis (3 items) ─────────────────────────────

export interface RackQuantity {
  rack: string;
  count: number;
}

export interface ItemAnalysis {
  classId: number;
  className: string;
  displayName: string;
  totalExpected: number;
  totalDetected: number;
  difference: number; // totalDetected - totalExpected
  extraCount: number; // Excess count across entire shelf unit
  missingCount: number; // Deficit count across entire shelf unit
  misplacedCount: number; // Total items found in unexpected racks
  expectedRacks: RackQuantity[];
  detectedRacks: RackQuantity[];
  status: ItemStatus;
  statusDescription: string;
}

// Comparison: { RACK_1: { earbud_container: ComparisonItem } }
export type Comparison = Record<string, Record<string, ComparisonItem>>;

// ─── Inspection Response ──────────────────────────────────────

export type OverallStatus = "PASS" | "FAIL";

export interface InspectionResponse {
  success: boolean;
  overall_status: OverallStatus;
  qr: {
    data: string;
  };
  expected_inventory: Inventory;
  detected_inventory: Inventory;
  detections: Detection[];
  comparison: Comparison;
  result_image: string;
}

// ─── Health Response ─────────────────────────────────────────

export interface HealthResponse {
  status: string;
  model: string;
  model_exists: boolean;
}

// ─── API Error ────────────────────────────────────────────────

export interface ApiError {
  error: string;
  success?: false;
}

// ─── Backend Connection Status ────────────────────────────────

export type BackendStatus = "connected" | "offline" | "checking";

// ─── Session History Entry ────────────────────────────────────

export interface HistoryEntry {
  id: string;
  timestamp: string;
  overall_status: OverallStatus;
  total_detections: number;
  racks_inspected: number;
  result: InspectionResponse;
}
