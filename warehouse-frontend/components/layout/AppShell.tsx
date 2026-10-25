"use client";

// components/layout/AppShell.tsx
// Client shell that owns sidebar open/close state.
// Kept separate from layout.tsx so that file stays a server component.

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTitleHeader } from "@/components/layout/PageTitleHeader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f8f9fa" }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <PageTitleHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
