"use client";

import { useEffect, useState } from "react";
import { Menu, RefreshCw, Server } from "lucide-react";
import { checkHealth } from "@/lib/api";
import { BackendStatus, HealthResponse } from "@/lib/types";

interface HeaderProps {
  pageTitle: string;
  onMenuClick: () => void;
}

export function Header({ pageTitle, onMenuClick }: HeaderProps) {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const h = await checkHealth();
      setHealth(h);
      setStatus(h.status === "healthy" ? "connected" : "offline");
    } catch {
      setStatus("offline");
      setHealth(null);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Left: Menu toggle + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      {/* Right: Backend status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Server size={13} className="text-gray-400" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "checking"
                  ? "bg-amber-400 pulse-dot"
                  : "bg-red-500"
              }`}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-600 hidden sm:block">
              {status === "connected"
                ? "Backend Connected"
                : status === "checking"
                ? "Connecting..."
                : "Backend Offline"}
            </span>
          </div>
          {health?.model && status === "connected" && (
            <span className="hidden md:inline text-[11px] text-gray-400 font-mono border border-gray-200 rounded px-1.5 py-0.5">
              {health.model}
            </span>
          )}
        </div>

        <button
          onClick={fetchStatus}
          disabled={refreshing}
          className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Refresh backend status"
          title="Refresh connection status"
        >
          <RefreshCw size={13} className={refreshing ? "spinner" : ""} />
        </button>
      </div>
    </header>
  );
}
