"use client";

import { useState, useEffect } from "react";
import { Boxes, Radio } from "lucide-react";
import { PageContainer, PageHeader, Section } from "@/components/layout/PageContainer";
import { InspectionPanel } from "@/components/inspection/InspectionPanel";
import { ImagePreview } from "@/components/inspection/ImagePreview";
import { InspectionStatus, InspectionError } from "@/components/inspection/InspectionStatus";
import { RackStatus } from "@/components/inspection/RackStatus";
import { DetectionTable } from "@/components/inspection/DetectionTable";
import { InspectionDetails } from "@/components/inspection/InspectionDetails";
import { Card, CardHeader } from "@/components/ui/Card";
import { useAppContext } from "@/lib/context";
import { InspectionResponse } from "@/lib/types";
import { fetchLatestInspection, getResultImageUrl } from "@/lib/api";

export default function InspectionPage() {
  const { setInspectionResult, lastResult, lastImageUrl, lastTimestamp } =
    useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<InspectionResponse | null>(
    lastResult
  );
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    lastImageUrl
  );
  const [error, setError] = useState<string | null>(null);

  // ── Auto-Sync with Backend (Captures from ESP32-CAM / Line Follower) ──
  useEffect(() => {
    let isMounted = true;

    const syncWithBackend = async () => {
      try {
        const latest = await fetchLatestInspection();
        if (latest.has_result && latest.result && latest.timestamp) {
          if (latest.timestamp !== lastTimestamp) {
            const imgUrl = getResultImageUrl(latest.result.result_image, Date.now());
            if (isMounted) {
              setCurrentResult(latest.result);
              setCurrentImageUrl(imgUrl);
              setInspectionResult(latest.result, imgUrl, latest.timestamp);
              setError(null);
            }
          }
        }
      } catch {
        // Silent fallback on background polling
      }
    };

    syncWithBackend();
    const interval = setInterval(syncWithBackend, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastTimestamp, setInspectionResult]);

  const handleStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleResult = (
    result: InspectionResponse,
    imageUrl: string,
    ts: string
  ) => {
    setIsLoading(false);
    setError(null);
    setCurrentResult(result);
    setCurrentImageUrl(imageUrl);
    setInspectionResult(result, imageUrl, ts);
  };

  const handleError = (msg: string) => {
    setIsLoading(false);
    setError(msg);
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Inspection"
        subtitle="Capture and analyze warehouse rack inventory."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <Radio size={13} className="animate-pulse text-emerald-600" />
            <span>ESP32 Live Auto-Sync</span>
          </div>
        }
      />

      {/* ── Upload panel ─────────────────────────────────────── */}
      <Section className="mb-6">
        <InspectionPanel
          onResult={handleResult}
          onError={handleError}
          onStart={handleStart}
          isLoading={isLoading}
          hasResult={!!currentResult}
        />
      </Section>

      {/* ── Result image ──────────────────────────────────────── */}
      <Section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Inspection Image
        </h2>
        <ImagePreview
          imageUrl={currentImageUrl}
          isLoading={isLoading}
          alt="YOLO annotated rack inspection image"
        />
      </Section>

      {/* ── Inspection result ──────────────────────────────────── */}
      {error && (
        <Section className="mb-6">
          <InspectionError message={error} onRetry={handleRetry} />
        </Section>
      )}

      {currentResult && !isLoading && (
        <>
          {/* Overall status banner */}
          <Section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Inspection Result
            </h2>
            <InspectionStatus status={currentResult.overall_status} />
          </Section>

          {/* Item Status */}
          <Section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Boxes size={15} className="text-gray-400" aria-hidden="true" />
              Item Status & Stock Breakdown
            </h2>
            <RackStatus
              result={currentResult}
              comparison={currentResult.comparison}
              expectedInventory={currentResult.expected_inventory}
              detectedInventory={currentResult.detected_inventory}
            />
          </Section>

          {/* Detection Details (collapsible) */}
          <Section className="mb-6">
            <Card>
              <CardHeader
                title="Detection Details"
                subtitle="Individual YOLO detections with confidence and position"
              />
              <DetectionTable detections={currentResult.detections} />
            </Card>
          </Section>

          {/* QR / Inventory Source */}
          <Section className="mb-6">
            <InspectionDetails qrData={currentResult.qr?.data ?? null} />
          </Section>
        </>
      )}
    </PageContainer>
  );
}
