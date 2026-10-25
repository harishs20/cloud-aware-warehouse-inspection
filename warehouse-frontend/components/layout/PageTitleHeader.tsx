"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/inspection": "Inspection",
  "/history": "History",
};

interface PageTitleHeaderProps {
  onMenuClick: () => void;
}

export function PageTitleHeader({ onMenuClick }: PageTitleHeaderProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Warehouse Inspector";
  return <Header pageTitle={title} onMenuClick={onMenuClick} />;
}
