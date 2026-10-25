"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanSearch,
  History,
  Boxes,
  Server,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { BackendStatus } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inspection", label: "Inspection", icon: ScanSearch },
  { href: "/history", label: "History", icon: History },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [modelName, setModelName] = useState<string>("");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const health = await checkHealth();
        setBackendStatus(
          health.status === "healthy" ? "connected" : "offline"
        );
        setModelName(health.model ?? "");
      } catch {
        setBackendStatus("offline");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full flex flex-col
          bg-white border-r border-gray-200 transition-transform duration-200
          w-[240px]
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Boxes size={15} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold text-gray-900 tracking-wide">
                WAREHOUSE
              </div>
              <div className="text-xs font-bold text-gray-900 tracking-wide">
                INSPECTOR
              </div>
            </div>
          </Link>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Site navigation">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Navigation
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-100
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-blue-600" : "text-gray-400"}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          {/* Backend status */}
          <div className="flex items-center gap-2 mb-3">
            <Server size={13} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  backendStatus === "connected"
                    ? "bg-green-500"
                    : backendStatus === "checking"
                    ? "bg-amber-400 pulse-dot"
                    : "bg-red-500"
                }`}
                aria-hidden="true"
              />
              <span className="text-xs text-gray-500 truncate">
                {backendStatus === "connected"
                  ? "Backend connected"
                  : backendStatus === "checking"
                  ? "Connecting..."
                  : "Backend offline"}
              </span>
            </div>
          </div>

          {/* Model info */}
          {modelName && backendStatus === "connected" && (
            <p className="text-[11px] text-gray-400 font-mono truncate">
              Model: {modelName}
            </p>
          )}

          <p className="text-[11px] text-gray-400 mt-1">v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
