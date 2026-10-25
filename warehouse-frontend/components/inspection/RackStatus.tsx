// components/inspection/RackStatus.tsx
import { InspectionResponse, Comparison } from "@/lib/types";
import { ItemStatusCards } from "./ItemStatusCards";

interface RackStatusProps {
  result?: InspectionResponse | null;
  comparison?: Comparison;
  expectedInventory?: Record<string, Record<string, number>>;
  detectedInventory?: Record<string, Record<string, number>>;
}

export function RackStatus({
  result,
  comparison,
  expectedInventory,
  detectedInventory,
}: RackStatusProps) {
  // If full result is passed, use it directly
  if (result) {
    return <ItemStatusCards result={result} />;
  }

  // Fallback if individual pieces were passed
  const syntheticResult: InspectionResponse = {
    success: true,
    overall_status: "PASS",
    qr: { data: "" },
    expected_inventory: expectedInventory ?? {},
    detected_inventory: detectedInventory ?? {},
    detections: [],
    comparison: comparison ?? {},
    result_image: "",
  };

  return <ItemStatusCards result={syntheticResult} />;
}
