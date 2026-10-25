// components/inspection/ImagePreview.tsx
"use client";

import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImagePreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
  alt?: string;
}

export function ImagePreview({
  imageUrl,
  isLoading,
  alt = "Inspection result image",
}: ImagePreviewProps) {
  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-200"
      style={{ minHeight: 320 }}
      role="img"
      aria-label={imageUrl ? alt : "No inspection image available"}
    >
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50">
          <Loader2 size={28} className="spinner text-blue-500 mb-3" aria-hidden="true" />
          <p className="text-sm text-gray-500 font-medium">Analyzing rack...</p>
        </div>
      )}

      {!isLoading && !imageUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <Camera size={24} className="text-gray-300" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-500">No inspection image</p>
          <p className="text-xs text-gray-400 mt-1 text-center px-8">
            Start an inspection to analyze the rack.
          </p>
        </div>
      )}

      {!isLoading && imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-auto object-contain max-h-[520px]"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
          }}
        />
      )}
    </div>
  );
}
