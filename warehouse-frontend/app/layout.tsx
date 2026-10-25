// app/layout.tsx — SERVER COMPONENT (no "use client")
// Exports metadata for SEO. Client interactivity is in AppShell.

import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Warehouse Inspector",
  description:
    "ESP32-CAM + YOLO-powered warehouse rack inspection system for real-time inventory verification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
