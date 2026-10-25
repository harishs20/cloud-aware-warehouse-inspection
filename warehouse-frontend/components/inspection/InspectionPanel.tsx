// components/inspection/InspectionPanel.tsx
"use client";

import { useRef, useState } from "react";
import { Upload, ScanSearch, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadInspection, getResultImageUrl } from "@/lib/api";
import { InspectionResponse } from "@/lib/types";

interface InspectionPanelProps {
  onResult: (result: InspectionResponse, imageUrl: string, ts: string) => void;
  onError: (msg: string) => void;
  onStart: () => void;
  isLoading: boolean;
  hasResult: boolean;
}

const STEPS = [
  "Uploading image...",
  "Running YOLO detection...",
  "Comparing inventory...",
  "Finalizing results...",
];

export function InspectionPanel({
  onResult,
  onError,
  onStart,
  isLoading,
  hasResult,
}: InspectionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
  };

  const advanceStep = (index: number) => {
    setStepIndex(index);
  };

  const runInspection = async (file: File) => {
    onStart();
    setStepIndex(0);

    try {
      // Simulate step progress for UX while waiting for backend
      const timer1 = setTimeout(() => advanceStep(1), 800);
      const timer2 = setTimeout(() => advanceStep(2), 2000);
      const timer3 = setTimeout(() => advanceStep(3), 3500);

      const result = await uploadInspection(file);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const imageUrl = getResultImageUrl(result.result_image, Date.now());
      const ts = new Date().toISOString();
      onResult(result, imageUrl, ts);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("[InspectionPanel] Error:", err);
      onError(msg);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }
    runInspection(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="card p-5">
      {/* Upload drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-8 mb-5 transition-colors cursor-pointer ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : selectedFile
            ? "border-green-300 bg-green-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
        }`}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload inspection image"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center mb-3">
          <Upload size={18} className="text-gray-500" aria-hidden="true" />
        </div>

        {selectedFile ? (
          <>
            <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Upload Inspection Image
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag & drop or click to select · JPG, PNG
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
        />
      </div>

      {/* Loading steps */}
      {isLoading && (
        <div className="mb-5 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="spinner text-blue-500" aria-hidden="true" />
            <span className="text-sm font-medium text-blue-700">
              {STEPS[stepIndex]}
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= stepIndex ? "bg-blue-500" : "bg-blue-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="primary"
          size="md"
          loading={isLoading}
          leftIcon={<ScanSearch size={15} />}
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1"
          id="start-inspection-btn"
        >
          {isLoading ? "Analyzing rack..." : selectedFile ? "Start Inspection" : "Select Image"}
        </Button>

        {hasResult && !isLoading && (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw size={14} />}
            onClick={handleSubmit}
            id="refresh-inspection-btn"
          >
            Re-run
          </Button>
        )}
      </div>

      <p className="text-[11px] text-gray-400 mt-3 text-center leading-relaxed">
        The image will be sent to the FastAPI backend for YOLO analysis.
        The annotated result will appear below.
      </p>
    </div>
  );
}
