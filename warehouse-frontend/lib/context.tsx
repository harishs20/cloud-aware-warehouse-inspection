"use client";

// ─── Inspection Result Context ───────────────────────────────
// Shares the last inspection result across Dashboard and History pages
// without server-side persistence (session-only).

import React, { createContext, useContext, useState, useCallback } from "react";
import { HistoryEntry, InspectionResponse } from "@/lib/types";

interface AppContextValue {
  lastResult: InspectionResponse | null;
  lastTimestamp: string | null;
  lastImageUrl: string | null;
  history: HistoryEntry[];
  setInspectionResult: (
    result: InspectionResponse,
    imageUrl: string,
    timestamp: string
  ) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lastResult, setLastResult] = useState<InspectionResponse | null>(null);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const setInspectionResult = useCallback(
    (result: InspectionResponse, imageUrl: string, timestamp: string) => {
      setLastResult(result);
      setLastTimestamp(timestamp);
      setLastImageUrl(imageUrl);

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        timestamp,
        overall_status: result.overall_status,
        total_detections: result.detections?.length ?? 0,
        racks_inspected: Object.keys(result.comparison ?? {}).length,
        result,
      };

      setHistory((prev) => [entry, ...prev].slice(0, 20)); // keep last 20
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        lastResult,
        lastTimestamp,
        lastImageUrl,
        history,
        setInspectionResult,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}
