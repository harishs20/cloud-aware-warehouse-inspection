// ============================================================
// WAREHOUSE INSPECTOR — API LAYER
// ============================================================
// All backend communication is centralized here.
// Components should import from this file only.
// ============================================================

import { HealthResponse, InspectionResponse } from "./types";

// Base URL from environment — never hardcoded
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    console.warn(
      "[api] NEXT_PUBLIC_API_URL is not set. Falling back to http://localhost:8000"
    );
    return "http://localhost:8000";
  }
  return url.replace(/\/$/, ""); // strip trailing slash
}

// ─── Health Check ─────────────────────────────────────────────

/**
 * GET /health
 * Returns backend status and model info.
 * Throws on network error or non-200 response.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const url = `${getBaseUrl()}/health`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(5000), // 5 second timeout
  });

  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

// ─── Fetch Latest Inspection (ESP32 auto-sync) ────────────────

export interface LatestInspectionResponse {
  has_result: boolean;
  timestamp: string | null;
  result: InspectionResponse | null;
}

export async function fetchLatestInspection(): Promise<LatestInspectionResponse> {
  const url = `${getBaseUrl()}/api/latest-inspection`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest inspection: HTTP ${response.status}`);
  }

  return response.json() as Promise<LatestInspectionResponse>;
}

// ─── Upload Inspection Image ──────────────────────────────────

/**
 * POST /api/upload
 * Sends a multipart/form-data request with the inspection image.
 * Returns the full InspectionResponse from the backend.
 */
export async function uploadInspection(
  file: File
): Promise<InspectionResponse> {
  const url = `${getBaseUrl()}/api/upload`;

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type manually — fetch handles multipart boundary
  });

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const errData = data as { error?: string };
    throw new Error(
      errData?.error ?? `Upload failed with HTTP ${response.status}`
    );
  }

  const result = data as InspectionResponse;

  if (!result.success) {
    const errResult = data as { error?: string };
    throw new Error(errResult?.error ?? "Inspection returned success: false");
  }

  return result;
}

// ─── Result Image URL ────────────────────────────────────────

/**
 * Constructs the full URL for the annotated result image.
 * Appends a cache-busting timestamp so a fresh image is always fetched.
 *
 * @param resultImagePath - e.g. "/results/inspection_result.jpg"
 * @param cacheBust - timestamp to append (use Date.now())
 */
export function getResultImageUrl(
  resultImagePath: string,
  cacheBust?: number
): string {
  const base = getBaseUrl();
  const path = resultImagePath.startsWith("/")
    ? resultImagePath
    : `/${resultImagePath}`;
  const buster = cacheBust ?? Date.now();
  return `${base}${path}?t=${buster}`;
}

// ─── API URL Accessor ────────────────────────────────────────

/** Expose the configured base URL for display purposes. */
export function getApiBaseUrl(): string {
  return getBaseUrl();
}
